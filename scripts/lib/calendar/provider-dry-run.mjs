/**
 * Calendar Dry-run provider for 1.1D
 */
import { generateEventIdempotencyKey } from "./event-idempotency.mjs";

export const dryRunCalendarProvider = {
  id: "dry_run",

  verifyAuth(_config) {
    return { valid: true };
  },

  async listBusySlots(_params) {
    // Return empty busy list for dry-run
    return [];
  },

  async createEvent(params) {
    const key = generateEventIdempotencyKey({
      milestone: "1.1D",
      meetingActionId: params.meetingActionId,
      provider: "dry_run",
      mode: "dry_run"
    });
    return {
      write_status: "DRY_RUN",
      idempotency_key: key,
      calendar_event_id: `cal_event_dry_${params.meetingActionId}`,
      htmlLink: "https://calendar.google.com/calendar/event?eid=dry_" + params.meetingActionId,
      called_real_provider: false,
      created_at: new Date().toISOString()
    };
  }
};
