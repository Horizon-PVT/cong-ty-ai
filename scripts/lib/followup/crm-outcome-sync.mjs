/**
 * CRM followup execution sync helper.
 */

export function buildCrmSyncPayload({ recipientId, dispatchStatus, error = null }) {
  return {
    recipient_id: recipientId,
    last_followup_status: dispatchStatus,
    last_followup_error: error,
    sync_action: "UPDATE_LEAD_FOLLOWUP_STATE",
    synced_at: new Date().toISOString()
  };
}
