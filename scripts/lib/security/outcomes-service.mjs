/**
 * Enforced Outcomes & Planning Lifecycle Simulator — Shared library for Milestone 3.1B
 *
 * Simulates:
 * - Task status transitions (blocking done if outcome is missing)
 * - Outcome type validation (merged_pr format, registered_artifact lookup, justification checks for no-op)
 * - SSRF checks for outcome URLs
 * - Planning document lifecycle (draft, under_review, approved, rejected, and revision paths)
 * - Plan decomposition into child tasks
 * - Bidirectional parent-child traceability links
 * - Cross-tenant security checks
 * - PII & Secrets scrubbing
 */

export class OutcomesService {
  constructor(policy, deliverablesService = null) {
    this.policy = policy;
    this.deliverablesService = deliverablesService;
    this._tasks = new Map();
    this._plans = new Map();
    this._outcomes = new Map(); // taskId -> outcome
    this._auditTrail = [];
  }

  // ── Seed Helpers ──────────────────────────────────────────────────────

  createTask(t) {
    this._tasks.set(t.id, { ...t, status: t.status || "todo" });
  }

  // ── Input Sanitization ───────────────────────────────────────────────

  sanitizeInput(str) {
    if (typeof str !== "string") return str;
    let clean = str;
    clean = clean.replace(/sk-[a-zA-Z0-9_-]{32,}/g, "[REDACTED_API_KEY]");
    clean = clean.replace(/pat-[a-zA-Z0-9-]{10,}/g, "[REDACTED_PAT]");
    clean = clean.replace(/re_[a-zA-Z0-9]{20,}/g, "[REDACTED_REF]");
    clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
    return clean;
  }

  // ── SSRF check helper ───────────────────────────────────────────────

  isSafeUrl(urlStr) {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return false;
      }
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]" || host === "0.0.0.0") {
        return false;
      }
      if (
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        host.startsWith("169.254.") ||
        (host.startsWith("172.") && host.split(".").length === 4 && Number(host.split(".")[1]) >= 16 && Number(host.split(".")[1]) <= 31)
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // ── Outcomes & Done State Enforcement ───────────────────────────────

  attachOutcome(actor, taskId, outcomePayload) {
    const task = this._tasks.get(taskId);
    if (!task) return { status: 404, error: "Task not found" };

    // Tenant check
    if (task.companyId !== actor.companyId) {
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    const { type, url, artifactId, metadata = {} } = outcomePayload;

    // 1. Whitelist Outcome Type
    if (!this.policy.outcomes.required_outcome_types.includes(type)) {
      return { status: 400, error: `Invalid outcome type "${type}"` };
    }

    // 2. Validate Outcome Specific Rules
    if (type === "merged_pr") {
      if (!url || !this.isSafeUrl(url)) {
        return { status: 400, error: "Invalid or unsafe URL format for merged_pr outcome" };
      }
      const prPattern = /^https?:\/\/(www\.)?(github|gitlab)\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/pull\/[0-9]+(\/|\?|#|$)/i;
      if (!prPattern.test(url)) {
        return { status: 400, error: "Invalid pull request link format" };
      }
    }

    if (type === "registered_artifact") {
      if (!artifactId) {
        return { status: 400, error: "Missing artifactId for registered_artifact outcome" };
      }
      // If deliverables service is connected, check presence
      if (this.deliverablesService) {
        const check = this.deliverablesService.getDeliverable(actor, artifactId);
        if (check.status !== 200) {
          return { status: 400, error: `Artifact "${artifactId}" not found in registry` };
        }
      }
    }

    if (type === "no_op_disposition") {
      const justification = metadata.justification || "";
      if (justification.trim().length < 15) {
        return { status: 400, error: "no_op_disposition requires a justification of at least 15 characters" };
      }
    }

    // Scrub metadata
    const cleanMeta = {};
    for (const [k, v] of Object.entries(metadata || {})) {
      cleanMeta[k] = this.sanitizeInput(v);
    }

    const outcome = {
      taskId,
      type,
      url: url ? this.sanitizeInput(url) : null,
      artifactId,
      metadata: cleanMeta,
      attachedBy: actor.userId,
      attachedAt: new Date().toISOString(),
    };

    this._outcomes.set(taskId, outcome);
    this._recordAudit({ action: "outcome_attached", taskId, companyId: actor.companyId, actor: actor.userId });

    return { status: 200, outcome };
  }

  updateTaskStatus(actor, taskId, newStatus) {
    const task = this._tasks.get(taskId);
    if (!task) return { status: 404, error: "Task not found" };

    if (task.companyId !== actor.companyId) {
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    // Block transition to done if no outcome is attached
    if (newStatus === "done" && !this._outcomes.has(taskId)) {
      return { status: 400, error: "Cannot set task status to done: No valid outcome is attached" };
    }

    const oldStatus = task.status;
    task.status = newStatus;

    this._recordAudit({
      action: "task_status_updated",
      taskId,
      companyId: actor.companyId,
      actor: actor.userId,
      oldStatus,
      newStatus,
    });

    return { status: 200, task };
  }

  // ── Planning Lifecycle & Traceability ───────────────────────────────

  createPlan(actor, planPayload) {
    const { id, title, description, subtasks = [] } = planPayload;

    if (!id || !title) {
      return { status: 400, error: "Plan ID and title are required" };
    }

    const plan = {
      id,
      companyId: actor.companyId,
      title: this.sanitizeInput(title),
      description: this.sanitizeInput(description),
      subtasks: subtasks.map(t => ({ title: this.sanitizeInput(t.title), assignee: t.assignee })),
      state: "draft",
      childTaskIds: [],
      createdBy: actor.userId,
      createdAt: new Date().toISOString(),
    };

    this._plans.set(id, plan);
    this._recordAudit({ action: "plan_created", planId: id, companyId: actor.companyId, actor: actor.userId });

    return { status: 200, plan };
  }

  getPlan(actor, planId) {
    const plan = this._plans.get(planId);
    if (!plan) return { status: 404, error: "Plan not found" };

    if (plan.companyId !== actor.companyId) {
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    return { status: 200, plan };
  }

  transitionPlanState(actor, planId, newState) {
    const plan = this._plans.get(planId);
    if (!plan) return { status: 404, error: "Plan not found" };

    if (plan.companyId !== actor.companyId) {
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    const oldState = plan.state;

    // State machine check
    let allowed = false;
    if (oldState === "draft" && newState === "under_review") allowed = true;
    if (oldState === "under_review" && (newState === "approved" || newState === "rejected")) allowed = true;
    if (oldState === "rejected" && newState === "draft") allowed = true; // revision path

    if (!allowed) {
      return { status: 400, error: `Invalid plan state transition from "${oldState}" to "${newState}"` };
    }

    plan.state = newState;
    this._recordAudit({ action: "plan_state_transitioned", planId, companyId: actor.companyId, actor: actor.userId, oldState, newState });

    // Auto decomposition on approval
    if (newState === "approved") {
      this._decomposePlan(plan);
    }

    return { status: 200, plan };
  }

  _decomposePlan(plan) {
    const generatedTaskIds = [];
    for (const [idx, subtask] of plan.subtasks.entries()) {
      const taskId = `task_${plan.id}_child_${idx}`;
      const task = {
        id: taskId,
        companyId: plan.companyId,
        title: subtask.title,
        status: "todo",
        parentId: plan.id,
        assigneeAgentId: subtask.assignee || null,
      };
      this._tasks.set(taskId, task);
      generatedTaskIds.push(taskId);
    }
    plan.childTaskIds = generatedTaskIds;
  }

  _recordAudit(event) {
    this._auditTrail.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  resetAll() {
    this._tasks.clear();
    this._plans.clear();
    this._outcomes.clear();
    this._auditTrail = [];
  }
}
