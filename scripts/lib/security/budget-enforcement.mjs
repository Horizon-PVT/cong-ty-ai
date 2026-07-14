/**
 * Budget Enforcement Simulator — Shared library for Milestone 1.3D
 *
 * Simulates the budget enforcement engine from server/src/services/budgets.ts:
 * - Budget policies with scope hierarchy (company → agent → project)
 * - Cost event tracking and spend accumulation
 * - Soft warning at configurable threshold
 * - Hard-stop with scope pausing and invocation blocking
 * - Budget incident creation with approval workflow
 * - Resolution actions (raise_budget_and_resume, dismiss)
 * - Invocation preflight blocking at all execution entry points
 * - Subscription-included usage exemption
 * - Incident deduplication within budget windows
 */

export class BudgetEnforcementService {
  /**
   * @param {object} policy — The budget-enforcement-policy.json content
   */
  constructor(policy) {
    this.policy = policy;
    /** @type {Map<string, object>} scopeKey -> budget policy */
    this._policies = new Map();
    /** @type {Map<string, number>} scopeKey -> current spend (cents) */
    this._spend = new Map();
    /** @type {Map<string, object>} scopeKey -> pause state */
    this._paused = new Map();
    /** @type {object[]} budget incidents */
    this._incidents = [];
    /** @type {object[]} approval records */
    this._approvals = [];
    /** @type {string[]} warnings emitted */
    this._warnings = [];
    /** @type {Set<string>} invocation-blocked scope keys */
    this._blocked = new Set();
  }

  // ── Budget Policy Management ──────────────────────────────────────────

  /**
   * Create a budget policy for a scope.
   * @param {object} p — { scopeType, scopeId, metric, windowKind, amountCents, warnPercent, hardStopEnabled }
   */
  createPolicy(p) {
    const key = `${p.scopeType}::${p.scopeId}`;
    const record = {
      id: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      scopeType: p.scopeType,
      scopeId: p.scopeId,
      metric: p.metric || "money",
      windowKind: p.windowKind || "monthly",
      amountCents: p.amountCents,
      warnPercent: p.warnPercent ?? this.policy.budget_enforcement.thresholds.soft_warn_percent,
      hardStopEnabled: p.hardStopEnabled ?? true,
      createdAt: new Date().toISOString(),
    };
    this._policies.set(key, record);
    this._spend.set(key, 0);
    return record;
  }

  /**
   * Get budget policy for a scope.
   */
  getPolicy(scopeType, scopeId) {
    return this._policies.get(`${scopeType}::${scopeId}`) || null;
  }

  // ── Cost Events & Spend Tracking ──────────────────────────────────────

  /**
   * Record a cost event and evaluate budget thresholds.
   * Returns { status, warning?, incident?, blocked? }
   */
  recordCostEvent(event) {
    const { scopeType, scopeId, costCents, isSubscriptionIncluded } = event;
    const key = `${scopeType}::${scopeId}`;

    // Subscription-included usage is exempt from money budget enforcement
    if (isSubscriptionIncluded && this.policy.budget_enforcement.subscription_included_exempt) {
      return {
        status: "recorded",
        exempt: true,
        reason: "subscription-included usage exempt from money budget"
      };
    }

    // Accumulate spend
    const currentSpend = (this._spend.get(key) || 0) + costCents;
    this._spend.set(key, currentSpend);

    // Evaluate thresholds
    return this.evaluateBudget(scopeType, scopeId);
  }

  /**
   * Evaluate budget thresholds for a scope.
   */
  evaluateBudget(scopeType, scopeId) {
    const key = `${scopeType}::${scopeId}`;
    const pol = this._policies.get(key);
    if (!pol) return { status: "no_policy", reason: "no budget policy for this scope" };

    const spend = this._spend.get(key) || 0;
    const ratio = spend / pol.amountCents;
    const percentUsed = Math.round(ratio * 100);

    // Hard stop check
    if (ratio >= 1.0 && pol.hardStopEnabled) {
      return this._triggerHardStop(key, pol, spend, percentUsed);
    }

    // Soft warning check
    if (percentUsed >= pol.warnPercent && ratio < 1.0) {
      const warning = `[BUDGET WARNING] ${key}: ${percentUsed}% of budget used (${spend}/${pol.amountCents} cents)`;
      this._warnings.push(warning);
      return {
        status: "warning",
        percentUsed,
        spend,
        limit: pol.amountCents,
        warning,
        reason: "soft warning threshold reached"
      };
    }

    return {
      status: "ok",
      percentUsed,
      spend,
      limit: pol.amountCents,
      reason: "within budget"
    };
  }

  // ── Hard Stop & Pause ─────────────────────────────────────────────────

  _triggerHardStop(key, policy, spend, percentUsed) {
    // Pause the scope
    this._paused.set(key, {
      pausedAt: new Date().toISOString(),
      reason: "budget_hard_stop",
      policyId: policy.id,
      spend,
      limit: policy.amountCents,
    });

    // Block invocations
    this._blocked.add(key);

    // Create incident (with deduplication)
    const incident = this._createIncident(key, policy, spend, percentUsed);

    return {
      status: "hard_stop",
      percentUsed,
      spend,
      limit: policy.amountCents,
      paused: true,
      blocked: true,
      incident,
      reason: "budget hard-stop triggered — scope paused and invocations blocked"
    };
  }

  /**
   * Pause a scope explicitly.
   */
  pauseScope(scopeType, scopeId, reason) {
    const key = `${scopeType}::${scopeId}`;
    this._paused.set(key, {
      pausedAt: new Date().toISOString(),
      reason: reason || "manual_pause",
    });
    this._blocked.add(key);
    return { paused: true, key };
  }

  /**
   * Resume a scope from pause.
   */
  resumeScope(scopeType, scopeId) {
    const key = `${scopeType}::${scopeId}`;
    this._paused.delete(key);
    this._blocked.delete(key);
    return { resumed: true, key };
  }

  /**
   * Check if a scope is paused.
   */
  isPaused(scopeType, scopeId) {
    return this._paused.has(`${scopeType}::${scopeId}`);
  }

  // ── Invocation Preflight Block ────────────────────────────────────────

  /**
   * Preflight check for invocation. Checks all scopes in hierarchy.
   * Returns { allowed: boolean, blockedBy?: string, reason?: string }
   */
  getInvocationBlock(companyId, agentId, projectId) {
    // Check in hierarchy order: company → agent → project
    const checkpoints = [
      { scopeType: "company", scopeId: companyId },
      { scopeType: "agent", scopeId: agentId },
    ];
    if (projectId) {
      checkpoints.push({ scopeType: "project", scopeId: projectId });
    }

    for (const { scopeType, scopeId } of checkpoints) {
      const key = `${scopeType}::${scopeId}`;
      if (this._blocked.has(key)) {
        const pause = this._paused.get(key);
        return {
          allowed: false,
          blockedBy: key,
          reason: `Invocation blocked: ${scopeType} "${scopeId}" is paused due to ${pause?.reason || "budget enforcement"}`,
          checkpoint: scopeType,
        };
      }
    }

    return { allowed: true, reason: "all scopes clear" };
  }

  /**
   * Simulate invocation preflight at a specific checkpoint.
   */
  checkInvocationAt(checkpoint, companyId, agentId, projectId) {
    const validCheckpoints = this.policy.invocation_block_checkpoints;
    if (!validCheckpoints.includes(checkpoint)) {
      throw new Error(`Unknown checkpoint: ${checkpoint}. Valid: ${validCheckpoints.join(", ")}`);
    }
    return this.getInvocationBlock(companyId, agentId, projectId);
  }

  // ── Budget Incidents ──────────────────────────────────────────────────

  _createIncident(key, policy, spend, percentUsed) {
    // Deduplication: check if an open incident already exists for this scope+window
    const existing = this._incidents.find(
      i => i.scopeKey === key && i.policyId === policy.id && i.status === "open"
    );
    if (existing) {
      existing.lastEvaluatedAt = new Date().toISOString();
      existing.currentSpend = spend;
      return { ...existing, deduplicated: true };
    }

    // Create new incident
    const incident = {
      id: `bi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      scopeKey: key,
      policyId: policy.id,
      thresholdType: "hard_stop",
      status: "open",
      spend,
      limit: policy.amountCents,
      percentUsed,
      createdAt: new Date().toISOString(),
      lastEvaluatedAt: new Date().toISOString(),
    };
    this._incidents.push(incident);

    // Create approval record
    const approval = {
      id: `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      incidentId: incident.id,
      approvalType: "budget_override_required",
      status: "pending",
      availableActions: ["raise_budget_and_resume", "dismiss"],
      createdAt: new Date().toISOString(),
    };
    this._approvals.push(approval);
    incident.approvalId = approval.id;

    return incident;
  }

  // ── Resolution Actions ────────────────────────────────────────────────

  /**
   * Resolve a budget incident.
   * @param {string} incidentId
   * @param {string} action — "raise_budget_and_resume" | "dismiss"
   * @param {object} params — { newAmountCents? } for raise_budget_and_resume
   */
  resolveIncident(incidentId, action, params = {}) {
    const incident = this._incidents.find(i => i.id === incidentId);
    if (!incident) return { status: 404, error: "Incident not found" };
    if (incident.status !== "open") return { status: 400, error: "Incident already resolved" };

    const validActions = ["raise_budget_and_resume", "dismiss"];
    if (!validActions.includes(action)) {
      return { status: 400, error: `Invalid action: ${action}. Valid: ${validActions.join(", ")}` };
    }

    const approval = this._approvals.find(a => a.incidentId === incidentId);

    if (action === "raise_budget_and_resume") {
      // Raise the budget limit
      const policy = this._policies.get(incident.scopeKey);
      if (policy && params.newAmountCents) {
        policy.amountCents = params.newAmountCents;
      }

      // Resume the scope
      const [scopeType, scopeId] = incident.scopeKey.split("::");
      this.resumeScope(scopeType, scopeId);

      incident.status = "resolved";
      incident.resolution = "raise_budget_and_resume";
      incident.resolvedAt = new Date().toISOString();

      if (approval) {
        approval.status = "approved";
        approval.resolvedAt = new Date().toISOString();
      }

      return {
        status: 200,
        action: "raise_budget_and_resume",
        resumed: true,
        newLimit: params.newAmountCents || policy?.amountCents,
        reason: "budget raised and scope resumed"
      };
    }

    if (action === "dismiss") {
      // Keep scope paused, just close the incident
      incident.status = "dismissed";
      incident.resolution = "dismiss";
      incident.resolvedAt = new Date().toISOString();

      if (approval) {
        approval.status = "dismissed";
        approval.resolvedAt = new Date().toISOString();
      }

      return {
        status: 200,
        action: "dismiss",
        resumed: false,
        reason: "incident dismissed — scope remains paused"
      };
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────

  getIncidents(scopeKey = null) {
    if (scopeKey) return this._incidents.filter(i => i.scopeKey === scopeKey);
    return [...this._incidents];
  }

  getApprovals(incidentId = null) {
    if (incidentId) return this._approvals.filter(a => a.incidentId === incidentId);
    return [...this._approvals];
  }

  getWarnings() { return [...this._warnings]; }

  getSpend(scopeType, scopeId) {
    return this._spend.get(`${scopeType}::${scopeId}`) || 0;
  }

  // ── Reset ─────────────────────────────────────────────────────────────

  resetAll() {
    this._policies.clear();
    this._spend.clear();
    this._paused.clear();
    this._incidents = [];
    this._approvals = [];
    this._warnings = [];
    this._blocked.clear();
  }
}
