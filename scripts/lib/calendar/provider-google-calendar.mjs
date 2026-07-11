/**
 * Google Calendar Provider for Milestone 1.1D
 */
import { validateOAuthToken } from "./oauth-token-gate.mjs";
import { generateEventIdempotencyKey } from "./event-idempotency.mjs";

export const googleCalendarProvider = {
  id: "google_calendar",

  verifyAuth(config = {}) {
    const token = config.accessToken || process.env.CALENDAR_ACCESS_TOKEN;
    return validateOAuthToken(token);
  },

  async listBusySlots(params = {}) {
    const auth = this.verifyAuth(params.config);
    if (!auth.valid) {
      throw new Error(`Google Calendar Auth Failed: ${auth.error}`);
    }

    if (process.env.CALENDAR_FAKE_HTTP === "true") {
      // Return a mock busy slot to test conflict check (e.g. Wednesday afternoon)
      return [
        { start: "2026-07-15T13:00:00Z", end: "2026-07-15T15:00:00Z" }
      ];
    }

    // Real Google Calendar API Freebusy call
    const token = params.config?.accessToken || process.env.CALENDAR_ACCESS_TOKEN;
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        items: [{ id: params.calendarId || "primary" }]
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Google Calendar Freebusy failed: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    const busy = data.calendars?.[params.calendarId || "primary"]?.busy || [];
    return busy;
  },

  async createEvent(params = {}) {
    const auth = this.verifyAuth(params.config);
    if (!auth.valid) {
      return {
        write_status: "FAILED",
        error: auth.error,
        called_real_provider: false,
        created_at: new Date().toISOString()
      };
    }

    const mode = params.mode || "sandbox";
    const key = generateEventIdempotencyKey({
      milestone: "1.1D",
      meetingActionId: params.meetingActionId,
      provider: "google_calendar",
      mode
    });

    if (process.env.CALENDAR_FAKE_HTTP === "true") {
      const eventId = `google_fake_event_${params.meetingActionId}`;
      return {
        write_status: mode === "live" ? "SCHEDULED_LIVE" : "SCHEDULED_SANDBOX",
        idempotency_key: key,
        calendar_event_id: eventId,
        htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`,
        called_real_provider: false,
        fake_http: true,
        created_at: new Date().toISOString()
      };
    }

    // Real Google Calendar API Event Insert call
    const token = params.config?.accessToken || process.env.CALENDAR_ACCESS_TOKEN;
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${params.calendarId || "primary"}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startTime, timeZone: params.timeZone || "UTC" },
          end: { dateTime: params.endTime, timeZone: params.timeZone || "UTC" },
          attendees: params.attendees || [],
          singleEvents: true
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Google Calendar Insert failed: ${JSON.stringify(err)}`);
      }
      const data = await res.json();
      return {
        write_status: mode === "live" ? "SCHEDULED_LIVE" : "SCHEDULED_SANDBOX",
        idempotency_key: key,
        calendar_event_id: data.id,
        htmlLink: data.htmlLink,
        called_real_provider: true,
        created_at: new Date().toISOString()
      };
    } catch (err) {
      return {
        write_status: "FAILED_RETRYABLE",
        error: err.message,
        called_real_provider: true,
        created_at: new Date().toISOString()
      };
    }
  }
};
