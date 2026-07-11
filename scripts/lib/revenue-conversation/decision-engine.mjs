/**
 * Conversation Decision Engine for Milestone 1.1C.
 * Decides next action (e.g. propose slots vs send meeting link) based on notes.
 */
import { NEXT_ACTIONS } from "./types.mjs";

export function determineNextAction(candidate) {
  const notes = (candidate.notes || "").toLowerCase();
  
  if (notes.includes("unsubscribe") || notes.includes("opt-out") || notes.includes("stop")) {
    return {
      action: NEXT_ACTIONS.SUPPRESS_CONTACT,
      reason: "Opt-out requested in reply notes"
    };
  }

  if (notes.includes("demo") || notes.includes("meeting") || notes.includes("appointment") || notes.includes("call") || notes.includes("schedule")) {
    return {
      action: NEXT_ACTIONS.PROPOSE_TIME_SLOTS,
      reason: "Lead explicitly requested or expressed interest in scheduling a demo/meeting"
    };
  }

  if (notes.includes("how much") || notes.includes("price") || notes.includes("cost") || notes.includes("qualification")) {
    return {
      action: NEXT_ACTIONS.ASK_QUALIFICATION_QUESTION,
      reason: "Lead asked a pricing or product qualification question before meeting"
    };
  }

  // Fallback for positive/qualified interest
  return {
    action: NEXT_ACTIONS.SEND_MEETING_LINK,
    reason: "General positive reply — send calendar link for scheduling"
  };
}
