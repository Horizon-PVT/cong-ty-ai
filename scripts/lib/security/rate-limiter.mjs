/**
 * Rate Limiter Service — Shared library for Milestone 1.3B
 *
 * Provides sliding-window rate limiting with per-agent, per-company, and global tiers.
 * Supports throttle penalties, auto-unblock, soft-limit warnings, and admin exemptions.
 *
 * All state is in-memory (Map-based) — suitable for dry_run and single-process validation.
 */

export class RateLimiterService {
  /**
   * @param {object} policy — The rate-limit-throttle-policy.json content
   */
  constructor(policy) {
    this.policy = policy;
    /** @type {Map<string, number[]>} sliding window: actorKey -> timestamps[] */
    this._windows = new Map();
    /** @type {Map<string, {until: number, multiplier: number}>} throttle state */
    this._throttled = new Map();
    /** @type {string[]} warning log */
    this._warnings = [];
  }

  // ── Tier config lookup ────────────────────────────────────────────────

  _tierConfig(tier) {
    const t = this.policy.rate_limits[tier];
    if (!t) throw new Error(`Unknown rate limit tier: ${tier}`);
    return t;
  }

  // ── Sliding window helpers ────────────────────────────────────────────

  _windowKey(actorKey, tier) {
    return `${tier}::${actorKey}`;
  }

  _pruneWindow(key) {
    const now = Date.now();
    const cutoff = now - 60_000; // 1-minute sliding window
    const timestamps = this._windows.get(key) || [];
    const pruned = timestamps.filter((ts) => ts > cutoff);
    this._windows.set(key, pruned);
    return pruned;
  }

  // ── Core API ──────────────────────────────────────────────────────────

  /**
   * Record a request in the sliding window for the given actor and tier.
   */
  recordRequest(actorKey, tier) {
    const key = this._windowKey(actorKey, tier);
    const timestamps = this._windows.get(key) || [];
    timestamps.push(Date.now());
    this._windows.set(key, timestamps);
  }

  /**
   * Check whether the actor has exceeded the rate limit for the given tier.
   * Returns { allowed: boolean, currentCount: number, limit: number }
   */
  checkLimit(actorKey, tier) {
    const cfg = this._tierConfig(tier);
    const key = this._windowKey(actorKey, tier);
    const timestamps = this._pruneWindow(key);
    const count = timestamps.length;

    return {
      allowed: count < cfg.requests_per_minute,
      currentCount: count,
      limit: cfg.requests_per_minute,
    };
  }

  /**
   * Check whether the actor has hit the burst limit (requests in a very short window).
   * Burst window = 1 second.
   */
  checkBurst(actorKey, tier) {
    const cfg = this._tierConfig(tier);
    const key = this._windowKey(actorKey, tier);
    const now = Date.now();
    const timestamps = this._windows.get(key) || [];
    const burstCount = timestamps.filter((ts) => ts > now - 1000).length;

    return {
      allowed: burstCount < cfg.burst_limit,
      burstCount,
      burstLimit: cfg.burst_limit,
    };
  }

  /**
   * Check if the actor is currently throttled (penalty applied).
   */
  isThrottled(actorKey) {
    const state = this._throttled.get(actorKey);
    if (!state) return false;
    return Date.now() < state.until;
  }

  /**
   * Apply a throttle penalty to the actor.
   * If already throttled, escalate by penalty_multiplier.
   */
  applyPenalty(actorKey, tier) {
    const cfg = this._tierConfig(tier);
    const tp = this.policy.throttle_policy;
    const existing = this._throttled.get(actorKey);

    let cooldown = cfg.cooldown_seconds * 1000;
    let multiplier = 1;

    if (existing && Date.now() < existing.until) {
      // Escalate penalty
      multiplier = Math.min(existing.multiplier * tp.penalty_multiplier, tp.penalty_multiplier * tp.penalty_multiplier);
      cooldown = cooldown * multiplier;
    }

    // Cap at max penalty duration
    cooldown = Math.min(cooldown, tp.max_penalty_duration_seconds * 1000);

    this._throttled.set(actorKey, {
      until: Date.now() + cooldown,
      multiplier: multiplier === 1 ? tp.penalty_multiplier : multiplier,
    });

    return {
      cooldownMs: cooldown,
      cooldownSeconds: cooldown / 1000,
      multiplier: multiplier === 1 ? tp.penalty_multiplier : multiplier,
    };
  }

  /**
   * Attempt to auto-unblock an actor if their cooldown has expired.
   * Returns true if unblocked, false if still throttled.
   */
  tryAutoUnblock(actorKey) {
    const state = this._throttled.get(actorKey);
    if (!state) return true; // Not throttled
    if (Date.now() >= state.until) {
      this._throttled.delete(actorKey);
      return true;
    }
    return false;
  }

  /**
   * Force-expire a throttle for testing purposes (simulates time passing).
   */
  forceExpireThrottle(actorKey) {
    const state = this._throttled.get(actorKey);
    if (state) {
      state.until = Date.now() - 1;
    }
  }

  /**
   * Check if an actor is exempt from rate limiting.
   */
  isExempt(actor) {
    const ex = this.policy.exemptions;
    if (ex.local_implicit_bypass && actor.type === "board" && actor.source === "local_implicit") {
      return true;
    }
    if (ex.instance_admin_bypass && actor.isInstanceAdmin === true) {
      return true;
    }
    return false;
  }

  /**
   * Get Retry-After header value in seconds for a throttled actor.
   */
  getRetryAfter(actorKey) {
    const state = this._throttled.get(actorKey);
    if (!state) return 0;
    const remaining = Math.max(0, Math.ceil((state.until - Date.now()) / 1000));
    return remaining;
  }

  /**
   * Check if the actor is at the soft limit warning threshold.
   * Returns { warning: boolean, ratio: number, message: string|null }
   */
  getSoftLimitWarning(actorKey, tier) {
    const cfg = this._tierConfig(tier);
    const key = this._windowKey(actorKey, tier);
    const timestamps = this._pruneWindow(key);
    const count = timestamps.length;
    const ratio = count / cfg.requests_per_minute;
    const softRatio = this.policy.throttle_policy.soft_limit_ratio;

    if (ratio >= softRatio && ratio < 1.0) {
      const msg = `[SOFT LIMIT WARNING] ${actorKey} at ${(ratio * 100).toFixed(1)}% of ${tier} limit (${count}/${cfg.requests_per_minute} req/min)`;
      this._warnings.push(msg);
      return { warning: true, ratio, message: msg };
    }
    return { warning: false, ratio, message: null };
  }

  /**
   * Get all accumulated warnings.
   */
  getWarnings() {
    return [...this._warnings];
  }

  /**
   * Full request evaluation: checks exemption → throttle → burst → rate limit.
   * Returns { status: 200|429, retryAfter?: number, warning?: string, reason: string }
   */
  evaluateRequest(actor, actorKey, tier) {
    // 1. Check exemption
    if (this.isExempt(actor)) {
      return { status: 200, reason: "exempt" };
    }

    // 2. Check throttle
    if (this.isThrottled(actorKey)) {
      return {
        status: 429,
        retryAfter: this.getRetryAfter(actorKey),
        reason: "throttled",
      };
    }

    // 3. Check burst
    const burst = this.checkBurst(actorKey, tier);
    if (!burst.allowed) {
      const penalty = this.applyPenalty(actorKey, tier);
      return {
        status: 429,
        retryAfter: penalty.cooldownSeconds,
        reason: "burst_exceeded",
      };
    }

    // 4. Check rate limit
    const limit = this.checkLimit(actorKey, tier);
    if (!limit.allowed) {
      const penalty = this.applyPenalty(actorKey, tier);
      return {
        status: 429,
        retryAfter: penalty.cooldownSeconds,
        reason: "rate_limit_exceeded",
      };
    }

    // 5. Record request and check soft limit
    this.recordRequest(actorKey, tier);
    const softWarning = this.getSoftLimitWarning(actorKey, tier);

    return {
      status: 200,
      reason: "allowed",
      warning: softWarning.warning ? softWarning.message : undefined,
    };
  }

  /**
   * Reset all state (for testing between runs).
   */
  resetAll() {
    this._windows.clear();
    this._throttled.clear();
    this._warnings = [];
  }
}
