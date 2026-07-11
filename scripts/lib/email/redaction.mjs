/**
 * Redaction utility for Milestone 1.1F
 */

const REDACTED = "[REDACTED]";

export function redactEmail(email) {
  if (!email || typeof email !== "string") return REDACTED;
  return REDACTED;
}

export function redactUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.includes("private_token=") || url.includes("key=")) {
    return url.split("?")[0] + "?token=" + REDACTED;
  }
  return url;
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

export function redactProviderResponse(resp) {
  if (!resp) return null;
  const safe = {};
  const SAFE_KEYS = ["id", "status", "message_id", "created_at"];
  for (const k of SAFE_KEYS) {
    if (resp[k] !== undefined) safe[k] = resp[k];
  }
  return safe;
}
