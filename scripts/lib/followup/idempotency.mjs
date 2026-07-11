/**
 * Idempotency gate checks for follow-ups.
 */
import crypto from "node:crypto";

export function generateFollowupIdempotencyKey({ milestone, dispatchId, recipientId, attempt, mode }) {
  const raw = `${milestone}:${dispatchId}:${recipientId}:${attempt}:${mode}`;
  return `idemp_${milestone.replace(/\./g, "_")}_fup_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}
