/**
 * Idempotency gate checks for email dispatches.
 */
import crypto from "node:crypto";

export function generateEmailDispatchIdempotencyKey({ milestone, dispatchId, recipientId, provider, mode }) {
  const raw = `${milestone}:${dispatchId}:${recipientId}:${provider}:${mode}`;
  return `idemp_${milestone.replace(/\./g, "_")}_email_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}

export function buildEmailActionHash({ dispatchId, meetingActionId, recipientId, subject }) {
  const raw = JSON.stringify({ dispatchId, meetingActionId, recipientId, subject });
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function isEmailAlreadySent(ledgerEntries = [], idempotencyKey) {
  return ledgerEntries.some(
    (e) => e.idempotency_key === idempotencyKey &&
      ["SENT_SANDBOX", "SENT_LIVE", "DRY_RUN"].includes(e.write_status)
  );
}
