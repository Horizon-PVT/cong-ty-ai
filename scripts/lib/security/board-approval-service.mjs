/**
 * Board Approval Flows Simulator — Shared library for Milestone 1.3F
 *
 * Simulates:
 * - Board approval/rejection workflow for hires, strategies, review gates, budget overrides
 * - Role-based permission enforcement (owner > admin > member)
 * - Execution blocking on pending approvals
 * - Approval expiration
 * - Audit trail for approval actions
 */

export class BoardApprovalService {
  constructor(policy) {
    this.policy = policy;
    /** @type {Map<string, object>} approvalId -> approval */
    this._approvals = new Map();
    /** @type {Set<string>} blocked scope keys */
    this._blocked = new Set();
    /** @type {object[]} audit trail */
    this._auditTrail = [];
    /** @type {string[]} warnings */
    this._warnings = [];
  }

  // ── Approval Creation ─────────────────────────────────────────────────

  createApproval(params) {
    const { companyId, approvalType, requestedBy, scopeKey, details, expiresInMs } = params;

    const validTypes = this.policy.board_approval_flows.approval_types;
    if (!validTypes.includes(approvalType)) {
      throw new Error(`Invalid approval type: ${approvalType}. Valid: ${validTypes.join(", ")}`);
    }

    const approval = {
      id: `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      companyId,
      approvalType,
      requestedBy,
      scopeKey: scopeKey || `${approvalType}::${companyId}`,
      status: "pending",
      details: details || {},
      createdAt: new Date().toISOString(),
      expiresAt: expiresInMs ? new Date(Date.now() + expiresInMs).toISOString() : null,
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
    };

    this._approvals.set(approval.id, approval);

    this._recordAudit({
      action: "approval_created",
      approvalId: approval.id,
      approvalType,
      companyId,
      actor: requestedBy,
    });

    return { ...approval };
  }

  // ── Approval Resolution ───────────────────────────────────────────────

  /**
   * Resolve an approval (approve/reject).
   * @param {object} actor — { role, userId, companyId }
   * @param {string} approvalId
   * @param {string} action — one of the resolution actions for this type
   */
  resolveApproval(actor, approvalId, action) {
    const approval = this._approvals.get(approvalId);
    if (!approval) return { status: 404, error: "Approval not found" };

    // Eagerly check and process expiration before allowing resolution
    if (approval.status === "pending" && approval.expiresAt && new Date(approval.expiresAt) <= new Date()) {
      this.checkExpiration(approvalId);
    }

    if (approval.status !== "pending") return { status: 400, error: `Approval already ${approval.status}` };

    // Company check
    if (actor.companyId !== approval.companyId) {
      return { status: 403, error: "Cannot resolve approvals from another company" };
    }

    // Role permission check
    const allowedRoles = this._getRolesForType(approval.approvalType);
    if (!allowedRoles.includes(actor.role)) {
      return {
        status: 403,
        error: `Role "${actor.role}" cannot resolve "${approval.approvalType}" approvals. Required: ${allowedRoles.join(", ")}`,
        requiredRoles: allowedRoles,
      };
    }

    // Validate action
    const validActions = this.policy.board_approval_flows.resolution_actions[approval.approvalType] || [];
    if (!validActions.includes(action)) {
      return { status: 400, error: `Invalid action "${action}" for type "${approval.approvalType}"` };
    }

    // Determine if this is an approve or reject action
    const mapping = this.policy.board_approval_flows.approval_action_mapping || {};
    const isApproval = mapping[action] === "approve";
    const newStatus = isApproval ? "approved" : "rejected";

    approval.status = newStatus;
    approval.resolvedBy = actor.userId;
    approval.resolvedAt = new Date().toISOString();
    approval.resolution = action;

    this._recordAudit({
      action: `approval_${newStatus}`,
      approvalId: approval.id,
      approvalType: approval.approvalType,
      companyId: approval.companyId,
      actor: actor.userId,
      resolution: action,
    });

    return {
      status: 200,
      approval: { ...approval },
      executionUnblocked: isApproval,
    };
  }

  // ── Expiration ────────────────────────────────────────────────────────

  /**
   * Check and expire pending approvals past their deadline.
   */
  checkExpiration(approvalId) {
    const approval = this._approvals.get(approvalId);
    if (!approval) return { expired: false, reason: "not found" };
    if (approval.status !== "pending") return { expired: false, reason: "already resolved" };
    if (!approval.expiresAt) return { expired: false, reason: "no expiration set" };

    if (new Date(approval.expiresAt) <= new Date()) {
      approval.status = "expired";
      approval.resolvedAt = new Date().toISOString();
      approval.resolution = "auto_expired";

      // Keep blocked on expiration (same as rejection)
      this._recordAudit({
        action: "approval_expired",
        approvalId: approval.id,
        approvalType: approval.approvalType,
        companyId: approval.companyId,
        actor: "system",
      });

      return { expired: true, approval: { ...approval } };
    }

    return { expired: false, reason: "not yet expired" };
  }

  /**
   * Force-expire for testing.
   */
  forceExpire(approvalId) {
    const approval = this._approvals.get(approvalId);
    if (!approval) return null;
    approval.expiresAt = new Date(Date.now() - 1000).toISOString();
    return this.checkExpiration(approvalId);
  }

  isBlocked(scopeKey) {
    const apps = [...this._approvals.values()].filter(a => a.scopeKey === scopeKey);
    if (apps.length === 0) return false;
    return apps.some(a => ["pending", "rejected", "expired"].includes(a.status));
  }

  getBlockedScopes() {
    const blocked = new Set();
    for (const a of this._approvals.values()) {
      if (["pending", "rejected", "expired"].includes(a.status)) {
        blocked.add(a.scopeKey);
      }
    }
    return [...blocked];
  }

  // ── Queries ───────────────────────────────────────────────────────────

  getApproval(approvalId) {
    const a = this._approvals.get(approvalId);
    return a ? { ...a } : null;
  }

  getApprovalsByCompany(companyId) {
    return [...this._approvals.values()]
      .filter(a => a.companyId === companyId)
      .map(a => ({ ...a }));
  }

  getAuditTrail(companyId) {
    if (companyId) return this._auditTrail.filter(e => e.companyId === companyId);
    return [...this._auditTrail];
  }

  getWarnings() { return [...this._warnings]; }

  // ── Internal ──────────────────────────────────────────────────────────

  _getRolesForType(approvalType) {
    const perms = this.policy.board_approval_flows.approval_permissions;
    const roles = [];
    for (const [role, types] of Object.entries(perms)) {
      if (types.includes(approvalType)) roles.push(role);
    }
    return roles;
  }

  _recordAudit(event) {
    this._auditTrail.push({
      ...event,
      timestamp: new Date().toISOString(),
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });
  }

  resetAll() {
    this._approvals.clear();
    this._auditTrail = [];
    this._warnings = [];
  }
}
