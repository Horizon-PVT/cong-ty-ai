/**
 * Dry-run Meeting/Calendar scheduling provider.
 * Simulates calendar writes and conflict checks without making external API calls.
 */
import { MEETING_STATUSES } from "../revenue-conversation/types.mjs";
import { generateDeterministicSlots } from "../revenue-conversation/meeting-slots.mjs";

export const dryRunMeetingProvider = {
  id: "dry_run",

  validateConfig(_config) {
    return { valid: true };
  },

  async preview(action) {
    const slots = generateDeterministicSlots(action.recipient_id);
    return {
      meeting_action_id: action.meeting_action_id,
      recipient_id: action.recipient_id,
      provider: "dry_run",
      mode: "dry_run",
      operation: action.operation || "PROPOSE_SLOTS",
      proposed_slots: slots,
      write_status: MEETING_STATUSES.DRY_RUN,
      idempotency_key: action.idempotency_key,
      called_real_provider: false
    };
  },

  async schedule(action, _config) {
    const preview = await this.preview(action);
    return {
      ...preview,
      write_status: MEETING_STATUSES.DRY_RUN,
      calendar_event_id: null,
      meeting_link: "https://calendar.google.com/calendar/event?eid=" + Buffer.from(action.recipient_id).toString("base64").slice(0, 12),
      called_real_provider: false,
      created_at: new Date().toISOString()
    };
  }
};
