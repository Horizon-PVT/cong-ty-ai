/**
 * Response signals mapping and lookup.
 */

export const RESPONSE_SIGNALS = {
  NO_RESPONSE: "no_response",
  OPENED: "opened",
  CLICKED_CALENDAR: "clicked_calendar",
  REPLIED: "replied",
  MEETING_BOOKED: "meeting_booked",
  BOUNCED: "bounced",
  UNSUBSCRIBED: "unsubscribed"
};

/**
 * Gets the simulated client response signal for a given recipient.
 * Defaults to "no_response".
 */
export function getResponseSignal(recipientId, overrides = {}) {
  return overrides[recipientId] || RESPONSE_SIGNALS.NO_RESPONSE;
}
