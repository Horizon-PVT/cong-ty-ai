/**
 * Task Conflict & Agent Permissions Simulator — Shared library for Milestone 1.3E
 *
 * Simulates:
 * - Task checkout/claim with optimistic locking (version-based)
 * - Concurrent claim conflict detection (409)
 * - Status transition validation
 * - Agent API key permission enforcement
 * - Company-scoped access control
 */

export class TaskConflictService {
  constructor(policy) {
    this.policy = policy;
    /** @type {Map<string, object>} taskId -> task */
    this._tasks = new Map();
    /** @type {Map<string, object>} agentId -> agent profile */
    this._agents = new Map();
    /** @type {object[]} comments */
    this._comments = [];
    /** @type {object[]} cost reports */
    this._costReports = [];
    /** @type {string[]} warnings */
    this._warnings = [];
  }

  // ── Task Management ───────────────────────────────────────────────────

  createTask(task) {
    const record = {
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      companyId: task.companyId,
      title: task.title || "Untitled task",
      status: task.status || "open",
      assigneeAgentId: null,
      checkedOutAt: null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this._tasks.set(record.id, record);
    return { ...record };
  }

  getTask(taskId) {
    const t = this._tasks.get(taskId);
    return t ? { ...t } : null;
  }

  // ── Task Checkout / Claim ─────────────────────────────────────────────

  /**
   * Attempt to claim/checkout a task for an agent.
   * Returns { status, task? } — 200 on success, 409 on conflict.
   */
  claimTask(actor, taskId) {
    const task = this._tasks.get(taskId);
    if (!task) return { status: 404, error: "Task not found" };

    // Company scope check
    if (actor.companyId !== task.companyId) {
      return { status: 403, error: "Cannot access tasks from another company" };
    }

    // Conflict: already assigned to another agent
    if (task.assigneeAgentId && task.assigneeAgentId !== actor.agentId) {
      return {
        status: 409,
        error: "Task already claimed by another agent",
        conflictWith: task.assigneeAgentId,
        checkedOutAt: task.checkedOutAt,
      };
    }

    // Claim the task
    task.assigneeAgentId = actor.agentId;
    task.checkedOutAt = new Date().toISOString();
    task.status = "in_progress";
    task.version += 1;
    task.updatedAt = new Date().toISOString();

    return { status: 200, task: { ...task } };
  }

  // ── Optimistic Locking Update ─────────────────────────────────────────

  /**
   * Update a task with version check (optimistic locking).
   * @param {object} actor
   * @param {string} taskId
   * @param {object} updates — { status?, version (required for conflict check) }
   */
  updateTask(actor, taskId, updates) {
    const task = this._tasks.get(taskId);
    if (!task) return { status: 404, error: "Task not found" };

    // Company scope check
    if (actor.companyId !== task.companyId) {
      return { status: 403, error: "Cannot modify tasks from another company" };
    }

    // Agent can only update their own assigned tasks
    if (actor.type === "agent" && task.assigneeAgentId !== actor.agentId) {
      return { status: 403, error: "Agent can only update tasks assigned to them" };
    }

    // Version conflict check (optimistic locking)
    if (updates.version !== undefined && updates.version !== task.version) {
      return {
        status: 409,
        error: "Stale version — task was updated by another process",
        yourVersion: updates.version,
        currentVersion: task.version,
      };
    }

    // Status transition validation
    if (updates.status) {
      const validTransitions = this.policy.task_conflict_safety.valid_transitions[task.status] || [];
      if (!validTransitions.includes(updates.status)) {
        return {
          status: 422,
          error: `Invalid status transition: ${task.status} → ${updates.status}`,
          validTransitions,
        };
      }
      task.status = updates.status;
    }

    task.version += 1;
    task.updatedAt = new Date().toISOString();
    return { status: 200, task: { ...task } };
  }

  // ── Agent API Permissions ─────────────────────────────────────────────

  /**
   * Register an agent with API key.
   */
  registerAgent(agent) {
    const record = {
      agentId: agent.agentId,
      companyId: agent.companyId,
      apiKeyPrefix: agent.apiKeyPrefix || `ak_${agent.agentId}`,
      permissions: this.policy.agent_api_permissions.allowed_operations,
      denied: this.policy.agent_api_permissions.denied_operations,
    };
    this._agents.set(record.agentId, record);
    return record;
  }

  /**
   * Check if an agent has a specific permission.
   */
  hasPermission(agentId, operation) {
    const agent = this._agents.get(agentId);
    if (!agent) return { allowed: false, reason: "Agent not registered" };

    if (agent.denied.includes(operation)) {
      return { allowed: false, reason: `Operation "${operation}" is explicitly denied` };
    }

    if (agent.permissions.includes(operation)) {
      return { allowed: true, reason: `Operation "${operation}" is allowed` };
    }

    return { allowed: false, reason: `Operation "${operation}" is not in allowed list` };
  }

  // ── Agent Operations ──────────────────────────────────────────────────

  /**
   * Agent reads their assigned tasks.
   */
  readAssignedTasks(actor) {
    if (!this.hasPermission(actor.agentId, "read_assigned_tasks").allowed) {
      return { status: 403, error: "No permission to read tasks" };
    }

    const tasks = [];
    for (const t of this._tasks.values()) {
      if (t.companyId === actor.companyId && t.assigneeAgentId === actor.agentId) {
        tasks.push({ ...t });
      }
    }
    return { status: 200, tasks, count: tasks.length };
  }

  /**
   * Agent adds a comment to an assigned task.
   */
  addComment(actor, taskId, content) {
    if (!this.hasPermission(actor.agentId, "add_comment").allowed) {
      return { status: 403, error: "No permission to add comments" };
    }

    const task = this._tasks.get(taskId);
    if (!task) return { status: 404, error: "Task not found" };
    if (task.companyId !== actor.companyId) return { status: 403, error: "Cross-company access denied" };
    if (task.assigneeAgentId !== actor.agentId) {
      return { status: 403, error: "Can only comment on assigned tasks" };
    }

    const comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      agentId: actor.agentId,
      companyId: actor.companyId,
      content,
      createdAt: new Date().toISOString(),
    };
    this._comments.push(comment);
    return { status: 201, comment };
  }

  /**
   * Agent reports a cost event.
   */
  reportCost(actor, costEvent) {
    if (!this.hasPermission(actor.agentId, "report_cost").allowed) {
      return { status: 403, error: "No permission to report costs" };
    }

    if (actor.companyId !== costEvent.companyId) {
      return { status: 403, error: "Cannot report costs for another company" };
    }

    const report = {
      id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId: actor.agentId,
      companyId: actor.companyId,
      model: costEvent.model,
      inputTokens: costEvent.inputTokens || 0,
      outputTokens: costEvent.outputTokens || 0,
      costCents: costEvent.costCents,
      createdAt: new Date().toISOString(),
    };
    this._costReports.push(report);
    return { status: 201, report };
  }

  /**
   * Agent attempts to delete a task (should be denied).
   */
  deleteTask(actor, taskId) {
    if (actor.type === "agent") {
      return { status: 403, error: "Agents cannot delete tasks" };
    }

    const task = this._tasks.get(taskId);
    if (!task) return { status: 404, error: "Task not found" };
    if (task.companyId !== actor.companyId) return { status: 403, error: "Cross-company access denied" };

    this._tasks.delete(taskId);
    return { status: 200, deleted: true };
  }

  // ── Queries ───────────────────────────────────────────────────────────

  getComments(taskId) { return this._comments.filter(c => c.taskId === taskId); }
  getCostReports(agentId) { return this._costReports.filter(r => r.agentId === agentId); }
  getWarnings() { return [...this._warnings]; }

  resetAll() {
    this._tasks.clear();
    this._agents.clear();
    this._comments = [];
    this._costReports = [];
    this._warnings = [];
  }
}
