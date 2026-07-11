/**
 * Outcome classifier for Milestone 1.1I
 */

export function classifyOutcome({
  dispatchStatus,
  crmSyncStatus,
  signal = "no_response",
  error = null
}) {
  if (error) {
    return { classification: "DISQUALIFIED", reason: `Error occurred during execution: ${error}` };
  }

  if (signal === "meeting_booked") {
    return { classification: "MEETING_BOOKED", reason: "Meeting successfully scheduled" };
  }

  if (signal === "replied") {
    return { classification: "OWNER_REVIEW_REQUIRED", reason: "Recipient replied to outreach" };
  }

  if (signal === "unsubscribed" || signal === "bounced") {
    return { classification: "DISQUALIFIED", reason: `Recipient unsubscribed or email bounced (signal: ${signal})` };
  }

  if (dispatchStatus === "BLOCKED_BY_TRIGGER_DECISION" || dispatchStatus === "BLOCKED_CALENDAR_CONFLICT") {
    return { classification: "BLOCKED_SAFELY", reason: `Safety block triggered: ${dispatchStatus}` };
  }

  return { classification: "WAITING_FOR_REPLY", reason: "Outreach delivered, waiting for recipient response" };
}
