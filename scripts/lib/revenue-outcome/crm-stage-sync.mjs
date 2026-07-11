/**
 * CRM stage synchronizer utility for Milestone 1.1I
 */

export function buildCrmStagePatch({
  recipientId,
  classification,
  nextAction
}) {
  return {
    recipient_id: recipientId,
    last_revenue_outcome: classification,
    next_recommended_action: nextAction,
    owner_review_status: classification === "OWNER_REVIEW_REQUIRED" ? "PENDING" : "NOT_REQUIRED",
    last_outcome_at: new Date().toISOString()
  };
}
