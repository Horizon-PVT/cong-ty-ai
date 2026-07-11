/**
 * Redaction utilities — strips PII and secrets before writing to artifacts.
 */

const REDACTED = "[REDACTED]";

/** Redact email addresses */
export function redactEmail(val) {
  if (!val || typeof val !== "string") return REDACTED;
  return REDACTED;
}

/** Redact provider response — keep only safe structural keys */
export function redactProviderResponse(resp) {
  if (!resp) return null;
  const safe = {};
  const SAFE_KEYS = ["id", "status", "objectType", "objectId", "createdAt", "updatedAt", "action", "idempotencyKey"];
  for (const k of SAFE_KEYS) {
    if (resp[k] !== undefined) safe[k] = resp[k];
  }
  return safe;
}

/** Redact provider config — remove all secrets */
export function redactConfig(cfg) {
  if (!cfg) return {};
  const { accessToken: _a, apiKey: _b, clientSecret: _c, refreshToken: _d, ...rest } = cfg;
  return { ...rest, accessToken: REDACTED, apiKey: REDACTED, clientSecret: REDACTED, refreshToken: REDACTED };
}

/** Detect if a string looks like a secret */
export function looksLikeSecret(val) {
  if (!val || typeof val !== "string") return false;
  return (
    /pat-[a-zA-Z0-9-]{10,}/.test(val) ||         // HubSpot PAT
    /hapikey=[a-zA-Z0-9-]+/.test(val) ||          // HubSpot legacy
    /00D[a-zA-Z0-9]{15}/.test(val) ||             // Salesforce org ID as token
    /re_[A-Za-z0-9]{20,}/.test(val) ||            // Resend
    /sk-[A-Za-z0-9]{20,}/.test(val) ||            // OpenAI
    /Bearer [A-Za-z0-9._-]{20,}/.test(val) ||     // Generic Bearer
    val.length > 40 && /^[A-Za-z0-9+/=]{40,}$/.test(val)  // Base64-looking
  );
}
