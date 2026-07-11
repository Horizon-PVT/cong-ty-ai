/**
 * Owner escalation queue helpers for Milestone 1.1I
 */

export function buildEscalationPacket({
  recipientId,
  classification,
  recommendedAction,
  reason
}) {
  return {
    recipient_id: recipientId,
    latest_outcome: classification,
    recommended_action: recommendedAction,
    reason,
    escalated_at: new Date().toISOString()
  };
}
