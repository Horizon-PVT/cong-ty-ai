/**
 * Local outcome ledger log manager.
 */

export function recordOutcomeEntry({
  recipientId,
  dispatchStatus,
  crmSyncStatus,
  idempotencyKey,
  error = null
}) {
  return {
    recipient_id: recipientId,
    dispatch_status: dispatchStatus,
    crm_sync_status: crmSyncStatus,
    idempotency_key: idempotencyKey,
    error,
    timestamp: new Date().toISOString()
  };
}
