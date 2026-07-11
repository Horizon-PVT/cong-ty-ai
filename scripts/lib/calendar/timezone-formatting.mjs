/**
 * Timezone formatting helpers.
 */
import { isValidIanaTimezone } from "./timezone-validation.mjs";

/**
 * Formats a UTC ISO string into a display date/time in the specified timezone.
 *
 * @param {string} utcIso - ISO UTC timestamp
 * @param {string} tz - IANA timezone ID
 * @returns {string} formatted string (e.g. "Wed, Jul 15, 2026, 10:00 AM EDT")
 */
export function formatTimezone(utcIso, tz) {
  if (!isValidIanaTimezone(tz)) {
    throw new Error(`Invalid IANA timezone: ${tz}`);
  }

  const date = new Date(utcIso);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid UTC ISO date: ${utcIso}`);
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
    hour12: true
  }).format(date);
}

/**
 * Calculates local date representation and offset for specified timezone.
 */
export function getLocalRepresentation(utcIso, tz) {
  if (!isValidIanaTimezone(tz)) return null;
  const d = new Date(utcIso);
  
  // Format to local parts
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  
  const parts = formatter.formatToParts(d);
  const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
  
  // Construct local ISO-like string
  const localStr = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}`;
  
  // Get timezone offset offset offset
  // We can calculate offset by subtracting epoch times
  const tzFormatter = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hour12: false });
  const utcFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hour12: false });
  
  const parseFormatterDate = (formatter, date) => {
    const parts = formatter.formatToParts(date);
    const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return new Date(Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second)).getTime();
  };

  const localEpoch = parseFormatterDate(tzFormatter, d);
  const utcEpoch = parseFormatterDate(utcFormatter, d);
  const offsetMinutes = Math.round((localEpoch - utcEpoch) / 60000);
  
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMin = String(absOffset % 60).padStart(2, "0");
  const sign = offsetMinutes >= 0 ? "+" : "-";
  
  return `${localStr}${sign}${offsetHours}:${offsetMin}`;
}
