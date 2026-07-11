/**
 * Redaction utility for Milestone 1.1C
 */

const REDACTED = "[REDACTED]";

export function redactEmail(email) {
  if (!email || typeof email !== "string") return REDACTED;
  return REDACTED;
}

export function redactCalendarUrl(url) {
  if (!url || typeof url !== "string") return "";
  // strip private tokens or details
  if (url.includes("private_token=") || url.includes("key=")) {
    return url.split("?")[0] + "?token=" + REDACTED;
  }
  return url;
}

export function redactPii(data) {
  if (!data) return data;
  if (typeof data === "string") {
    // Redact basic email pattern
    return data.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, REDACTED);
  }
  if (Array.isArray(data)) {
    return data.map(redactPii);
  }
  if (typeof data === "object") {
    const redacted = {};
    for (const [key, val] of Object.entries(data)) {
      if (key.includes("email") || key.includes("phone")) {
        redacted[key] = REDACTED;
      } else {
        redacted[key] = redactPii(val);
      }
    }
    return redacted;
  }
  return data;
}

export function looksLikeSecret(val) {
  if (!val || typeof val !== "string") return false;
  return (
    /pat-[a-zA-Z0-9-]{10,}/.test(val) ||
    /re_[A-Za-z0-9]{20,}/.test(val) ||
    /sk-[A-Za-z0-9]{20,}/.test(val) ||
    /Bearer [A-Za-z0-9._-]{20,}/.test(val)
  );
}
