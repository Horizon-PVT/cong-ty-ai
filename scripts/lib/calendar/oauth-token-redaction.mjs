/**
 * Redaction utility for OAuth tokens and secret configurations.
 */

const REDACTED = "[REDACTED]";

/**
 * Redacts secrets from OAuth credentials or config objects.
 */
export function redactOauthConfig(cfg) {
  if (!cfg) return {};
  const redacted = { ...cfg };
  
  if (redacted.client_secret) redacted.client_secret = REDACTED;
  if (redacted.client_id) redacted.client_id = REDACTED;
  if (redacted.access_token) redacted.access_token = REDACTED;
  if (redacted.refresh_token) redacted.refresh_token = REDACTED;
  if (redacted.code) redacted.code = REDACTED;
  if (redacted.code_verifier) redacted.code_verifier = REDACTED;

  return redacted;
}

/**
 * Redacts raw credentials values from any debug string.
 */
export function redactRawToken(str) {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/access_token=[a-zA-Z0-9._-]+/g, `access_token=${REDACTED}`)
    .replace(/refresh_token=[a-zA-Z0-9._-]+/g, `refresh_token=${REDACTED}`)
    .replace(/client_secret=[a-zA-Z0-9._-]+/g, `client_secret=${REDACTED}`);
}
