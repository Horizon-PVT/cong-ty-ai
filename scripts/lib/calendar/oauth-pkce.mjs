/**
 * PKCE (Proof Key for Code Exchange) cryptographic helper for OAuth authorization flows.
 */
import crypto from "node:crypto";

/**
 * Generates a random code verifier (base64url encoded).
 */
export function generateCodeVerifier() {
  return crypto.randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generates a PKCE code challenge derived from the code verifier using SHA-256.
 */
export function generateCodeChallenge(verifier) {
  const hash = crypto.createHash("sha256")
    .update(verifier)
    .digest();
    
  return hash.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
