/**
 * Redaction utility for Milestone 1.1G
 */

const REDACTED = "[REDACTED]";

export function redactEmail(email) {
  return REDACTED;
}

export function redactPii(data) {
  if (!data) return data;
  if (typeof data === "string") {
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
