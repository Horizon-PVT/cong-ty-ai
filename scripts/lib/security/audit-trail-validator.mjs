/**
 * Audit Trail Validator Service — Shared library for Milestone 1.3C
 *
 * Simulates and validates the audit trail infrastructure:
 * - Activity log entries with actor/action/entity attribution
 * - Secret access event logging with outcomes
 * - Redaction pipeline for PII and secrets
 * - Cross-company audit isolation
 * - Audit log immutability (non-admin deletion/modification prevention)
 * - Cost event attribution validation
 * - Log retention policy enforcement
 * - Real-time SSE event type mapping
 */

export class AuditTrailService {
  /**
   * @param {object} policy — The audit-trail-policy.json content
   */
  constructor(policy) {
    this.policy = policy;
    /** @type {Map<string, object[]>} companyId -> audit entries */
    this._activityLogs = new Map();
    /** @type {object[]} secret access events */
    this._secretAccessEvents = [];
    /** @type {object[]} cost events */
    this._costEvents = [];
    /** @type {object[]} SSE events published */
    this._sseEvents = [];
    /** @type {string[]} redaction warnings */
    this._warnings = [];
  }

  // ── Activity Log ──────────────────────────────────────────────────────

  /**
   * Log an activity entry. Simulates the activity_log table insert.
   * @param {object} entry — { companyId, actorType, actorId, action, entityType, entityId, details }
   */
  logActivity(entry) {
    if (!entry.companyId || !entry.actorType || !entry.action) {
      throw new Error("Missing required fields: companyId, actorType, action");
    }

    const record = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      companyId: entry.companyId,
      actorType: entry.actorType, // "agent" | "user" | "system" | "plugin"
      actorId: entry.actorId || null,
      action: entry.action,
      entityType: entry.entityType || null,
      entityId: entry.entityId || null,
      agentId: entry.agentId || null,
      runId: entry.runId || null,
      details: this._redactDetails(entry.details || {}),
      createdAt: new Date().toISOString(),
      _immutable: true, // Flag for immutability enforcement
    };

    const logs = this._activityLogs.get(entry.companyId) || [];
    logs.push(record);
    this._activityLogs.set(entry.companyId, logs);

    // Publish SSE event
    this._publishSSE(entry.companyId, record);

    return record;
  }

  /**
   * Query activity logs with company scoping.
   * Returns 403 error object if cross-company access attempted.
   */
  queryActivityLogs(actor, targetCompanyId, filters = {}) {
    // Cross-company isolation check
    if (actor.type === "agent" && actor.companyId !== targetCompanyId) {
      return { status: 403, error: "Agent cannot access another company's audit trail" };
    }

    if (actor.type === "board" && actor.source !== "local_implicit") {
      const allowedCompanies = actor.companyIds || [];
      if (!allowedCompanies.includes(targetCompanyId)) {
        return { status: 403, error: "User does not have access to this company's audit trail" };
      }
    }

    const logs = this._activityLogs.get(targetCompanyId) || [];
    let filtered = [...logs];

    if (filters.actorType) {
      filtered = filtered.filter(l => l.actorType === filters.actorType);
    }
    if (filters.action) {
      filtered = filtered.filter(l => l.action === filters.action);
    }
    if (filters.entityType) {
      filtered = filtered.filter(l => l.entityType === filters.entityType);
    }

    return { status: 200, data: filtered, count: filtered.length };
  }

  /**
   * Attempt to delete an audit log entry. Only instance admins should be allowed.
   */
  deleteAuditEntry(actor, companyId, entryId) {
    if (!actor.isInstanceAdmin && actor.source !== "local_implicit") {
      return { status: 403, error: "Only instance admins can delete audit entries" };
    }

    const logs = this._activityLogs.get(companyId) || [];
    const idx = logs.findIndex(l => l.id === entryId);
    if (idx === -1) return { status: 404, error: "Audit entry not found" };

    logs.splice(idx, 1);
    this._activityLogs.set(companyId, logs);
    return { status: 200, deleted: true };
  }

  /**
   * Attempt to modify an audit log entry. Should always be denied (immutability).
   */
  modifyAuditEntry(actor, companyId, entryId, updates) {
    // Audit entries are immutable — always reject modification
    if (!actor.isInstanceAdmin && actor.source !== "local_implicit") {
      return { status: 403, error: "Audit entries are immutable — modification denied" };
    }

    // Even admins get a warning about immutability
    this._warnings.push(`[IMMUTABILITY WARNING] Admin ${actor.actorId || "unknown"} attempted to modify audit entry ${entryId}`);
    return { status: 403, error: "Audit entries are immutable by design — even admin modification is blocked" };
  }

  // ── Secret Access Events ──────────────────────────────────────────────

  /**
   * Log a secret access event.
   * @param {object} event — { companyId, actorType, actorId, secretName, outcome }
   * outcome: "granted" | "denied" | "redacted"
   */
  logSecretAccess(event) {
    if (!event.secretName || !event.outcome) {
      throw new Error("Missing required fields: secretName, outcome");
    }

    const validOutcomes = ["granted", "denied", "redacted"];
    if (!validOutcomes.includes(event.outcome)) {
      throw new Error(`Invalid outcome: ${event.outcome}. Must be one of: ${validOutcomes.join(", ")}`);
    }

    const record = {
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      companyId: event.companyId,
      actorType: event.actorType,
      actorId: event.actorId,
      secretName: event.secretName,
      outcome: event.outcome,
      accessedAt: new Date().toISOString(),
      // Never store the actual secret value
      secretValueStored: false,
    };

    this._secretAccessEvents.push(record);
    return record;
  }

  /**
   * Query secret access events for a company.
   */
  querySecretAccessEvents(companyId) {
    return this._secretAccessEvents.filter(e => e.companyId === companyId);
  }

  // ── Cost Event Attribution ────────────────────────────────────────────

  /**
   * Log a cost event with full attribution.
   */
  logCostEvent(event) {
    const record = {
      id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      companyId: event.companyId,
      agentId: event.agentId,
      runId: event.runId,
      issueId: event.issueId || null,
      model: event.model,
      inputTokens: event.inputTokens || 0,
      outputTokens: event.outputTokens || 0,
      costUsd: event.costUsd || 0,
      createdAt: new Date().toISOString(),
    };

    this._costEvents.push(record);
    return record;
  }

  /**
   * Validate cost event attribution completeness.
   */
  validateCostAttribution(event) {
    const required = ["companyId", "agentId", "runId", "model"];
    const missing = required.filter(f => !event[f]);
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  // ── Redaction Pipeline ────────────────────────────────────────────────

  /**
   * Redact sensitive data from details object.
   */
  _redactDetails(details) {
    const redacted = JSON.parse(JSON.stringify(details));
    const placeholder = this.policy.redaction_requirements.allowed_placeholder;

    const sensitivePatterns = [
      { key: "api_keys", regex: /(?:sk-|pat-|re_)[A-Za-z0-9\-_]{10,}/g },
      { key: "jwt_tokens", regex: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g },
      { key: "passwords", regex: /"(?:password|secret|token|apiKey|api_key)":\s*"[^"]+"/gi },
      { key: "os_username", regex: /(?:\/home\/|C:\\Users\\)[A-Za-z0-9._-]+/gi },
    ];

    const jsonStr = JSON.stringify(redacted);
    let cleanStr = jsonStr;

    for (const { regex } of sensitivePatterns) {
      cleanStr = cleanStr.replace(regex, placeholder);
    }

    try {
      return JSON.parse(cleanStr);
    } catch {
      return { _redacted: true, _original_keys: Object.keys(details) };
    }
  }

  /**
   * Scan a text blob for un-redacted sensitive data.
   * Returns { clean: boolean, leaks: string[] }
   */
  scanForLeaks(text) {
    const leaks = [];
    const patterns = [
      { name: "API Key (sk-)", regex: /sk-[A-Za-z0-9]{20,}/ },
      { name: "API Key (pat-)", regex: /pat-[A-Za-z0-9\-]{10,}/ },
      { name: "API Key (re_)", regex: /re_[A-Za-z0-9]{20,}/ },
      { name: "JWT Token", regex: /eyJ[A-Za-z0-9\-_]{20,}\.eyJ[A-Za-z0-9\-_]{20,}/ },
      { name: "Password field", regex: /"password":\s*"(?!\[REDACTED\])[^"]{3,}"/ },
      { name: "Real email", regex: /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
    ];

    for (const { name, regex } of patterns) {
      if (regex.test(text)) {
        leaks.push(name);
      }
    }

    return { clean: leaks.length === 0, leaks };
  }

  // ── Log Retention ─────────────────────────────────────────────────────

  /**
   * Check if an entry should be retained based on retention policy.
   * @param {string} logType — "activity_log" | "plugin_log" | "cost_event" | "secret_access_event"
   * @param {string} createdAt — ISO timestamp
   */
  shouldRetain(logType, createdAt) {
    const retentionDays = this.policy.retention_policy[`${logType}_days`];
    if (!retentionDays) return true; // No retention policy = keep forever

    const entryDate = new Date(createdAt);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return entryDate > cutoffDate;
  }

  /**
   * Simulate retention sweep — returns entries that would be pruned.
   */
  simulateRetentionSweep(logType, entries) {
    const pruned = [];
    const retained = [];

    for (const entry of entries) {
      const timestamp = entry.createdAt || entry.accessedAt || entry.timestamp;
      if (this.shouldRetain(logType, timestamp)) {
        retained.push(entry);
      } else {
        pruned.push(entry);
      }
    }

    return { pruned, retained, prunedCount: pruned.length, retainedCount: retained.length };
  }

  // ── SSE Event Publishing ──────────────────────────────────────────────

  _publishSSE(companyId, record) {
    // Map action to SSE event type (matching server/src/services/activity-log.ts)
    const actionToEventType = {
      "issue_comment_added": "activity.logged",
      "issue_document_created": "activity.logged",
      "issue_document_updated": "activity.logged",
      "issue_document_deleted": "activity.logged",
      "approval_approved": "activity.logged",
      "approval_rejected": "activity.logged",
      "approval_revision_requested": "activity.logged",
      "budget_soft_threshold_crossed": "budget.warning",
      "budget_hard_threshold_crossed": "budget.critical",
      "budget_incident_resolved": "budget.resolved",
      "secret_accessed": "security.audit",
      "rate_limit_exceeded": "security.audit",
      "auth_failed": "security.audit",
    };

    const eventType = actionToEventType[record.action] || "activity.logged";

    this._sseEvents.push({
      companyId,
      eventType,
      action: record.action,
      actorType: record.actorType,
      timestamp: record.createdAt,
    });
  }

  /**
   * Get SSE events for a specific company and event type.
   */
  getSSEEvents(companyId, eventType = null) {
    let events = this._sseEvents.filter(e => e.companyId === companyId);
    if (eventType) {
      events = events.filter(e => e.eventType === eventType);
    }
    return events;
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  getWarnings() { return [...this._warnings]; }

  resetAll() {
    this._activityLogs.clear();
    this._secretAccessEvents = [];
    this._costEvents = [];
    this._sseEvents = [];
    this._warnings = [];
  }
}
