/**
 * Dashboard & DB Adaptability Simulator — Shared library for Milestone 1.4A
 *
 * Simulates:
 * - Dynamic dashboard spend, task, agent, and approval aggregations
 * - Company boundary validation for dashboard stats
 * - DB Mode selection (external-postgres vs embedded-postgres)
 * - Health-check endpoint DB probing & migration check
 */

export class DashboardDbService {
  constructor(policy) {
    this.policy = policy;
    /** @type {Map<string, object>} companyId -> company */
    this._companies = new Map();
    /** @type {Map<string, object>} agentId -> agent */
    this._agents = new Map();
    /** @type {Map<string, object>} taskId -> task */
    this._tasks = new Map();
    /** @type {object[]} cost events */
    this._costEvents = [];
    /** @type {object[]} approvals */
    this._approvals = [];
    /** @type {string[]} log/audit entries */
    this._audit = [];
    /** @type {string[]} warnings */
    this._warnings = [];
  }

  // ── Seed Helpers ──────────────────────────────────────────────────────

  createCompany(c) {
    this._companies.set(c.id, { ...c, budgetMonthlyCents: c.budgetMonthlyCents || 100000 });
  }

  createAgent(a) {
    this._agents.set(a.id, { ...a });
  }

  createTask(t) {
    this._tasks.set(t.id, { ...t });
  }

  recordCostEvent(e) {
    this._costEvents.push({ ...e, occurredAt: e.occurredAt || new Date().toISOString() });
  }

  createApproval(ap) {
    this._approvals.push({ ...ap });
  }

  // ── Dashboard Live Aggregations ───────────────────────────────────────

  /**
   * Computes live dashboard summary for a company with strict company boundary check.
   */
  getDashboardSummary(actor, companyId) {
    // Company boundary assertion
    if (actor.companyId !== companyId) {
      return { status: 403, error: "Access denied: company boundary violation" };
    }

    const company = this._companies.get(companyId);
    if (!company) {
      return { status: 404, error: "Company not found" };
    }

    // 1. Agent counts by status
    const agentCounts = { active: 0, running: 0, paused: 0, error: 0 };
    for (const agent of this._agents.values()) {
      if (agent.companyId === companyId) {
        const status = agent.status === "idle" ? "active" : agent.status;
        if (agentCounts[status] !== undefined) {
          agentCounts[status]++;
        }
      }
    }

    // 2. Task counts by status
    const taskCounts = { open: 0, inProgress: 0, blocked: 0, done: 0 };
    for (const task of this._tasks.values()) {
      if (task.companyId === companyId) {
        if (task.status === "in_progress") taskCounts.inProgress++;
        else if (task.status === "blocked") taskCounts.blocked++;
        else if (task.status === "done") taskCounts.done++;
        if (task.status !== "done" && task.status !== "cancelled") taskCounts.open++;
      }
    }

    // 3. Spend calculation from cost events
    let monthSpendCents = 0;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    for (const event of this._costEvents) {
      if (event.companyId === companyId) {
        const occurred = new Date(event.occurredAt);
        if (occurred >= monthStart && occurred <= now) {
          monthSpendCents += event.costCents;
        }
      }
    }

    // 4. Pending approvals count
    let pendingApprovals = 0;
    for (const app of this._approvals) {
      if (app.companyId === companyId && app.status === "pending") {
        pendingApprovals++;
      }
    }

    const utilization = company.budgetMonthlyCents > 0
      ? (monthSpendCents / company.budgetMonthlyCents) * 100
      : 0;

    return {
      status: 200,
      companyId,
      agents: agentCounts,
      tasks: taskCounts,
      costs: {
        monthSpendCents,
        monthBudgetCents: company.budgetMonthlyCents,
        monthUtilizationPercent: Number(utilization.toFixed(2)),
      },
      pendingApprovals,
      runActivity: [],
    };
  }

  // ── PostgreSQL & Embedded PostgreSQL Adaptability ─────────────────────

  /**
   * Probes connection and determines database mode based on configuration.
   */
  probeDatabaseConnection(dbUrl, dbModeConfig) {
    if (dbUrl) {
      // Validate connection string format
      try {
        const parsed = new URL(dbUrl);
        if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
          return {
            connected: true,
            mode: "external-postgres",
            host: parsed.hostname,
            port: Number(parsed.port) || 5432,
            database: parsed.pathname.substring(1),
            reason: "DATABASE_URL connects successfully to PostgreSQL instance",
          };
        }
      } catch {
        return {
          connected: false,
          mode: "postgres",
          error: "Invalid database connection string format",
        };
      }
    }

    // Fallback to embedded PostgreSQL
    if (dbModeConfig === "postgres") {
      this._warnings.push("Database mode is postgres but no connection string was set; falling back to embedded PostgreSQL");
    }

    return {
      connected: true,
      mode: "embedded-postgres",
      dataDir: "./.postgres-data",
      port: 54329,
      reason: "Successful local fallback to Embedded PostgreSQL instance",
    };
  }

  /**
   * Health Check probing endpoint details.
   */
  getHealthCheckDetails(dbUrl, dbModeConfig, autoApplyMigrations = true) {
    const probe = this.probeDatabaseConnection(dbUrl, dbModeConfig);
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: probe.connected,
        mode: probe.mode,
        migrationStatus: autoApplyMigrations ? "upToDate" : "needsMigrations",
        pendingMigrationsCount: autoApplyMigrations ? 0 : 3,
        error: probe.error || null,
      },
    };
  }

  getWarnings() {
    return [...this._warnings];
  }

  resetAll() {
    this._companies.clear();
    this._agents.clear();
    this._tasks.clear();
    this._costEvents = [];
    this._approvals = [];
    this._audit = [];
    this._warnings = [];
  }
}
