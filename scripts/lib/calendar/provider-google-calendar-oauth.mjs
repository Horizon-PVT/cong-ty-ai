/**
 * Google Calendar Provider with OAuth PKCE & Timezone integrations.
 */
import { generateCodeChallenge, generateCodeVerifier } from "./oauth-pkce.mjs";
import { generateState } from "./oauth-state-gate.mjs";
import { redactOauthConfig } from "./oauth-token-redaction.mjs";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export const googleCalendarOauthProvider = {
  id: "google_calendar",

  /**
   * Generates authorization URL, PKCE credentials, and expected state parameter.
   */
  generateAuthRequest({ clientId, redirectUri }) {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const state = generateState();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
      access_type: "offline",
      prompt: "consent"
    });

    return {
      auth_url: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`,
      code_verifier: verifier,
      state
    };
  },

  /**
   * Exchanges an authorization code for access and refresh tokens.
   */
  async exchangeCode({ code, verifier, clientId, clientSecret, redirectUri }) {
    if (process.env.CALENDAR_FAKE_OAUTH === "true") {
      return {
        access_token: "mock_at",
        refresh_token: "mock_rt",
        expires_in: 3600
      };
    }

    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Token exchange failed: ${JSON.stringify(err)}`);
    }

    return res.json();
  },

  /**
   * Refreshes an expired access token using a refresh token.
   */
  async refreshAccessToken({ refreshToken, clientId, clientSecret }) {
    if (process.env.CALENDAR_FAKE_OAUTH === "true") {
      return {
        access_token: "mock_rat",
        expires_in: 3600
      };
    }

    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Token refresh failed: ${JSON.stringify(err)}`);
    }

    return res.json();
  }
};
