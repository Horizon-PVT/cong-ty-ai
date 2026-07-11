/**
 * Idempotency gate checks for calendar events.
 */
import crypto from "node:crypto";

export function generateEventIdempotencyKey({ milestone, meetingActionId, provider, mode }) {
  const raw = `${milestone}:${meetingActionId}:${provider}:${mode}`;
  return `idemp_${milestone.replace(/\./g, "_")}_cal_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}

export function isEventAlreadyWritten(ledgerEntries = [], idempotencyKey) {
  return ledgerEntries.some(
    (e) => e.idempotency_key === idempotencyKey &&
      ["SCHEDULED_SANDBOX", "SCHEDULED_LIVE", "DRY_RUN"].includes(e.write_status)
  );
}

export function buildActionHash(action) {
  const raw = JSON.stringify({
    recipient_id: action.recipient_id,
    meeting_action_id: action.meeting_action_id
  });
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
