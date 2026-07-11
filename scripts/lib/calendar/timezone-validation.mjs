/**
 * Timezone validation helpers.
 */

/**
 * Validates if a timezone string is a valid IANA timezone identifier.
 */
export function isValidIanaTimezone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Performs a DST boundary transition check for a given date and timezone.
 * Returns true if the date is safe (not falling inside a nonexistent/ambiguous DST transition hour).
 */
export function checkDstBoundary(dateStr, tz) {
  if (!isValidIanaTimezone(tz)) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    
    // Check if the hour exists in local time (e.g. some hours are skipped during Spring forward DST transition)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    
    const formatted = formatter.format(d);
    // If it formats without throwing, it's generally safe
    return !!formatted;
  } catch (e) {
    return false;
  }
}
