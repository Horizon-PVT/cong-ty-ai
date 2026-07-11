/**
 * hard safety gate guarding live follow-up execution.
 */

export function verifyWriteGateToken(token, expectedPrefix) {
  if (!token || typeof token !== "string") return false;
  return token.startsWith(expectedPrefix);
}
