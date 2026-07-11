/**
 * Secure OAuth state verification gate.
 */
import crypto from "node:crypto";

/**
 * Generates a cryptographically secure random state parameter.
 */
export function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Validates that the received state parameter matches the expected state parameter.
 */
export function verifyState(received, expected) {
  if (!received || !expected) return false;
  return received === expected;
}
