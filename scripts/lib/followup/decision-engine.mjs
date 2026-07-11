/**
 * Core Decision Engine for Milestone 1.1G Follow-ups.
 */

export function evaluateFollowupEligibility({
  recipientId,
  signal,
  previousAttempts = 0,
  lastSentTime,
  isSuppressed = false,
  policy = {}
}) {
  const terminalSignals = policy.terminal_signals || ["replied", "meeting_booked", "bounced", "unsubscribed"];

  // 1. Suppression gate
  if (isSuppressed) {
    return { eligible: false, status: "FOLLOWUP_BLOCKED_SUPPRESSED", error: "Recipient is suppressed" };
  }

  // 2. Unsubscribe / Bounce specific check
  if (signal === "unsubscribed" || signal === "bounced") {
    return { eligible: false, status: "FOLLOWUP_BLOCKED_RECIPIENT_NOT_ALLOWED", error: "Recipient has unsubscribed or bounced" };
  }

  // 3. Terminal response signal gate
  if (terminalSignals.includes(signal)) {
    return { eligible: false, status: "FOLLOWUP_BLOCKED_TERMINAL_RESPONSE", error: `Terminal signal received: ${signal}` };
  }

  // 4. Frequency cap gate
  const maxFollowups = policy.max_followups_per_recipient || 2;
  if (previousAttempts >= maxFollowups) {
    return { eligible: false, status: "FOLLOWUP_BLOCKED_FREQUENCY_LIMIT", error: `Maximum follow-ups limit reached (${maxFollowups})` };
  }

  // 5. Cooldown gate
  if (lastSentTime) {
    const elapsedMs = Date.now() - new Date(lastSentTime).getTime();
    const cooldownHours = policy.minimum_cooldown_hours || 48;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      return { eligible: false, status: "FOLLOWUP_BLOCKED_COOLDOWN", error: `Within cooldown window of ${cooldownHours} hours` };
    }
  }

  return { eligible: true, status: "ELIGIBLE" };
}
