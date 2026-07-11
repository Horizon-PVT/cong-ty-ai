/**
 * Idempotency utilities for CRM actions.
 * Ensures no duplicate CRM writes across runs.
 */
import crypto from "node:crypto";

/**
 * Generate deterministic idempotency key from action fields.
 */
export function buildIdempotencyKey({ milestone, crmActionId, provider, mode }) {
  const raw = `${milestone}:${crmActionId}:${provider}:${mode}`;
  return `idemp_${milestone.replace(/\./g, "_")}_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
}

/**
 * Check if a ledger already contains this idempotency key → if so, skip write.
 */
export function isAlreadyProcessed(ledgerEntries = [], idempotencyKey) {
  return ledgerEntries.some(
    (e) => e.idempotency_key === idempotencyKey &&
      ["WRITTEN_SANDBOX", "WRITTEN_LIVE", "DRY_RUN"].includes(e.write_status)
  );
}

/**
 * Build action hash — used to verify write request matches preview.
 */
export function buildActionHash(action) {
  const raw = JSON.stringify({
    lead_id: action.lead_id,
    operation: action.operation,
    crm_action_id: action.crm_action_id,
  });
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
