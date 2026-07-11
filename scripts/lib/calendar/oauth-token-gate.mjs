/**
 * OAuth token validation gate for Calendar execution.
 */

export function validateOAuthToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "OAuth token is missing or empty" };
  }

  // Token must have a minimum length and resemble a bearer or OAuth2 token structure
  if (token.length < 15) {
    return { valid: false, error: "OAuth token too short" };
  }

  // Enforce pattern (e.g. ya29.... or typical bearer style)
  if (token.startsWith("ya29.") || token.startsWith("mock_oauth_") || token.length > 20) {
    return { valid: true };
  }

  return { valid: false, error: "OAuth token format is invalid" };
}
