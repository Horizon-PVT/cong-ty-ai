/**
 * Idempotency utilities for Milestone 1.1C.
 */
import crypto from "node:crypto";

export function buildIdempotencyKey({ milestone, actionId, provider, mode }) {
  const raw = `${milestone}:${actionId}:${provider}:${mode}`;
  return `idemp_${milestone.replace(/\./g, "_")}_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}

export function isAlreadyProcessed(ledgerEntries = [], idempotencyKey) {
  return ledgerEntries.some(
    (e) => e.idempotency_key === idempotencyKey &&
      ["SCHEDULED_SANDBOX", "SCHEDULED_LIVE", "DRY_RUN"].includes(e.write_status)
  );
}

export function buildActionHash(action) {
  const raw = JSON.stringify({
    recipient_id: action.recipient_id,
    operation: action.operation,
    meeting_action_id: action.meeting_action_id
  });
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
