/**
 * Deterministic Wake Gating & Circuit Breakers Simulator — Shared library for Milestone 4.1A
 *
 * Simulates:
 * - Idle gating (wake checks for whitelisted sources)
 * - Circuit breakers (3 consecutive failures, 3 consecutive no-progress runs)
 * - Token velocity limits (sliding window of 60 seconds)
 * - Budget warnings (80% warning) and blocks (100% hard stop)
 * - Input/Error log PII and secret scrubbing
 */

export class RuntimeSafetyService {
  constructor(policy) {
    this.policy = policy;
    this._consecutiveFailures = 0;
    this._consecutiveNoProgress = 0;
    this._tokenUsageWindow = []; // array of { tokens, timestamp }
    this._budgetSpent = 0;
    this._budgetLimit = policy.safety?.budget_limit || 1000; // in USD
    this._breakerTripped = false;
    this._breakerReason = null;
    this._auditTrail = [];
    this._whitelistTriggers = policy.safety?.whitelist_triggers || ["new_assignment", "new_comment", "mention", "schedule", "manual"];
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

  // ── Wake Gating ──────────────────────────────────────────────────────

  checkWakeGate(triggerSource) {
    if (!triggerSource) {
      return { allowed: false, error: "Wake blocked: Agent is idle with no trigger inputs" };
    }
    if (!this._whitelistTriggers.includes(triggerSource)) {
      return { allowed: false, error: `Wake blocked: Unsupported trigger source "${triggerSource}"` };
    }
    return { allowed: true };
  }

  // ── sliding window token velocity check ──────────────────────────────

  _pruneTokenWindow() {
    const now = Date.now();
    this._tokenUsageWindow = this._tokenUsageWindow.filter(
      item => now - item.timestamp <= 60000
    );
  }

  recordTokenUsage(tokens) {
    if (typeof tokens !== "number" || Number.isNaN(tokens) || tokens < 0) {
      throw new Error("Invalid tokens: token usage count must be a non-negative number");
    }
    this._pruneTokenWindow();
    this._tokenUsageWindow.push({ tokens, timestamp: Date.now() });

    // Sum token velocity
    const totalTokens = this._tokenUsageWindow.reduce((acc, curr) => acc + curr.tokens, 0);
    if (totalTokens > this.policy.safety.token_velocity_limit_per_minute) {
      this._tripBreaker("Token velocity spike detected: exceed limit of 100,000 tokens/min");
      return { tripped: true, totalTokens };
    }
    return { tripped: false, totalTokens };
  }

  // ── Circuit Breakers ────────────────────────────────────────────────

  recordExecution(status, hasProgress = true) {
    if (this._breakerTripped) {
      return { status: 400, error: `Execution blocked: Circuit breaker is tripped due to "${this._breakerReason}"` };
    }

    if (status !== "ok") {
      this._consecutiveFailures++;
    } else {
      this._consecutiveFailures = 0;
    }

    if (!hasProgress) {
      this._consecutiveNoProgress++;
    } else {
      this._consecutiveNoProgress = 0;
    }

    if (this._consecutiveFailures >= this.policy.safety.max_consecutive_failures) {
      this._tripBreaker(`Tripped due to 3 consecutive failures`);
      return { tripped: true, reason: this._breakerReason };
    }

    if (this._consecutiveNoProgress >= this.policy.safety.max_consecutive_no_progress) {
      this._tripBreaker(`Tripped due to 3 consecutive no-progress runs`);
      return { tripped: true, reason: this._breakerReason };
    }

    return { tripped: false };
  }

  _tripBreaker(reason) {
    this._breakerTripped = true;
    this._breakerReason = this.sanitizeInput(reason);
    this._recordAudit({ action: "breaker_tripped", reason: this._breakerReason });
  }

  resetBreaker() {
    this._breakerTripped = false;
    this._breakerReason = null;
    this._consecutiveFailures = 0;
    this._consecutiveNoProgress = 0;
    this._tokenUsageWindow = [];
    this._recordAudit({ action: "breaker_reset" });
    return { status: 200, message: "Circuit breaker reset successfully" };
  }

  // ── Budget Checkers ─────────────────────────────────────────────────

  recordBudgetSpent(amount) {
    if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
      throw new Error("Invalid budget spent amount: must be a non-negative number");
    }
    this._budgetSpent += amount;
    const consumedPct = (this._budgetSpent / this._budgetLimit) * 100;

    let status = "ok";
    let message = "";

    if (consumedPct >= 100) {
      status = "blocked";
      message = "Budget exhausted: Hard stop triggered at 100%";
      this._recordAudit({ action: "budget_hard_stop" });
    } else if (consumedPct >= this.policy.safety.budget_warning_threshold_pct) {
      status = "warning";
      message = `Budget warning: Consumed ${consumedPct.toFixed(1)}% of budget limit`;
      this._recordAudit({ action: "budget_warning", consumedPct });
    }

    return { status, consumedPct, message };
  }

  isBudgetExhausted() {
    return this._budgetSpent >= this._budgetLimit;
  }

  _recordAudit(event) {
    this._auditTrail.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  resetAll() {
    this._consecutiveFailures = 0;
    this._consecutiveNoProgress = 0;
    this._tokenUsageWindow = [];
    this._budgetSpent = 0;
    this._breakerTripped = false;
    this._breakerReason = null;
    this._auditTrail = [];
  }
}
