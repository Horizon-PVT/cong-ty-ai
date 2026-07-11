/**
 * Fake Calendar provider simulating Google Calendar / Calendly APIs.
 * Used for CI contract testing and sandbox simulations.
 */
import { MEETING_STATUSES } from "../revenue-conversation/types.mjs";
import { generateDeterministicSlots } from "../revenue-conversation/meeting-slots.mjs";

export const fakeMeetingProvider = {
  id: "fake_http",

  validateConfig(config = {}) {
    // Requires mock credentials to demonstrate key validation
    const token = config.apiKey || process.env.CALENDAR_API_KEY;
    if (!token && !process.env.CALENDAR_FAKE_HTTP) {
      return { valid: false, error: "CALENDAR_API_KEY not set" };
    }
    return { valid: true, token: token || "mock_token_123" };
  },

  async preview(action) {
    const slots = generateDeterministicSlots(action.recipient_id);
    return {
      meeting_action_id: action.meeting_action_id,
      recipient_id: action.recipient_id,
      provider: "google_calendar",
      mode: action.mode || "sandbox",
      operation: action.operation || "PROPOSE_SLOTS",
      proposed_slots: slots,
      write_status: MEETING_STATUSES.BLOCKED_PENDING_OWNER_APPROVAL,
      idempotency_key: action.idempotency_key,
      called_real_provider: false
    };
  },

  async schedule(action, config = {}) {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        meeting_action_id: action.meeting_action_id,
        recipient_id: action.recipient_id,
        provider: "google_calendar",
        write_status: MEETING_STATUSES.FAILED,
        error: validation.error,
        called_real_provider: false,
        created_at: new Date().toISOString()
      };
    }

    const mode = action.mode || "sandbox";
    const fakeEventId = `cal_fake_event_${action.meeting_action_id}`;
    
    return {
      meeting_action_id: action.meeting_action_id,
      recipient_id: action.recipient_id,
      provider: "google_calendar",
      mode,
      write_status: mode === "live" ? MEETING_STATUSES.SCHEDULED_LIVE : MEETING_STATUSES.SCHEDULED_SANDBOX,
      calendar_event_id: fakeEventId,
      meeting_link: `https://calendar.google.com/calendar/event?eid=${Buffer.from(fakeEventId).toString("base64").slice(0, 12)}`,
      called_real_provider: false, // fake provider does not call real google apis
      created_at: new Date().toISOString()
    };
  }
};
