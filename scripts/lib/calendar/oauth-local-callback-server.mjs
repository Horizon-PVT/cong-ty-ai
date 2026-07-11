/**
 * Loopback HTTP server to receive authorization code callbacks on localhost.
 */
import http from "node:http";
import { parse } from "node:url";

/**
 * Starts the local callback server and waits for the authorization code.
 * If CALENDAR_FAKE_OAUTH is set, returns simulated callback immediately.
 *
 * @param {object} params
 * @param {number} params.port - callback server port (e.g. 3000)
 * @param {string} params.expectedState - secure state to check
 * @returns {Promise<{code: string, state: string}>}
 */
export function startLocalCallbackServer({ port = 3000, expectedState }) {
  if (process.env.CALENDAR_FAKE_OAUTH === "true") {
    console.log("[OAuth Callback Server] Simulated mode: returning fake auth code...");
    return Promise.resolve({
      code: "mock_auth_code_1.1e_xyz789",
      state: expectedState
    });
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      const { code, state } = parsedUrl.query;

      if (parsedUrl.pathname === "/oauth/callback") {
        if (!code || state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h3>OAuth Failed: invalid code or state mismatch.</h3>");
          server.close();
          reject(new Error("OAuth callback verification failed (state mismatch or missing code)"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h3>OAuth authorization completed successfully! You can close this window now.</h3>");
        
        server.close(() => {
          console.log("[OAuth Callback Server] Loopback server closed.");
        });
        
        resolve({ code, state });
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(port, "127.0.0.1", (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`[OAuth Callback Server] Listening on http://localhost:${port}/oauth/callback`);
    });

    // Enforce a timeout of 60 seconds
    setTimeout(() => {
      server.close();
      reject(new Error("Timeout waiting for OAuth callback authorization code"));
    }, 60000);
  });
}
