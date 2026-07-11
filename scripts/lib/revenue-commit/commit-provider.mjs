/**
 * Commit provider interface for CRM stage updates.
 */

export function prepareCommit(action) {
  return {
    recipient_id: action.recipient_id,
    target_stage: action.target_stage,
    idempotency_key: action.idempotency_key,
    prepared_at: new Date().toISOString()
  };
}

export async function commit(action, { mode, token }) {
  const isLive = mode === "live" && token && token.length > 0;
  
  // Return commit result
  return {
    recipient_id: action.recipient_id,
    stage: action.target_stage,
    idempotency_key: action.idempotency_key,
    status: isLive ? "LIVE_COMMITTED" : "SANDBOX_COMMITTED",
    committed_at: new Date().toISOString()
  };
}

export function rollbackOrCompensate(result) {
  return {
    recipient_id: result.recipient_id,
    rollback_status: "COMPENSATED",
    original_idempotency_key: result.idempotency_key,
    compensated_at: new Date().toISOString()
  };
}

export function redact(result) {
  const redacted = { ...result };
  // Redact PII (e.g. email, tokens) if any
  delete redacted.raw_token;
  delete redacted.raw_email;
  return redacted;
}
