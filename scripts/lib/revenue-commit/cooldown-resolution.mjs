/**
 * Cooldown resolution helper for deferred actions.
 */

export function resolveCooldown(action, context = {}) {
  const { isCooldownExpired = true, hasOptOut = false } = context;

  if (hasOptOut) {
    return {
      status: "BLOCKED_BY_POLICY",
      reason: "Recipient has opted out or bounced."
    };
  }

  if (action.owner_choice === "reject") {
    return {
      status: "BLOCKED_BY_POLICY",
      reason: "Owner explicitly rejected lead action."
    };
  }

  if (action.owner_choice === "request_revision") {
    return {
      status: "REQUIRES_REVISION",
      reason: "Revision requested by owner."
    };
  }

  if (action.owner_choice === "defer") {
    if (isCooldownExpired) {
      return {
        status: "READY_FOR_OWNER_COMMIT",
        reason: "Cooldown period expired. Ready to commit."
      };
    } else {
      return {
        status: "STILL_COOLDOWN",
        reason: "Deferred action is still within cooldown period."
      };
    }
  }

  return {
    status: "READY_FOR_OWNER_COMMIT",
    reason: "Directly approved or active."
  };
}
