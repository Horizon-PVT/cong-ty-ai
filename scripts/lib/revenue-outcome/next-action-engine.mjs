/**
 * Next-action engine for Milestone 1.1I
 */

export function determineNextAction({ classification, recipientId }) {
  switch (classification) {
    case "MEETING_BOOKED":
      return { next_action: "sync_crm_only", detail: "Update CRM lead stage to MEETING_BOOKED" };
    case "OWNER_REVIEW_REQUIRED":
      return { next_action: "escalate_to_owner", detail: "Queue for manual owner follow-up" };
    case "DISQUALIFIED":
      return { next_action: "mark_disqualified", detail: "Mark lead disqualified in CRM" };
    case "BLOCKED_SAFELY":
      return { next_action: "do_nothing_cooldown", detail: "Resolve conflict and recheck cooldown" };
    case "WAITING_FOR_REPLY":
    default:
      return { next_action: "schedule_followup", detail: "Continue automated follow-up sequence" };
  }
}
