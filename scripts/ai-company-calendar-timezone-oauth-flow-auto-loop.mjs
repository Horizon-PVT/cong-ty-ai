#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = 2;
let passes = 0;

console.log("[1.1E Auto-Loop] Starting Calendar Timezone & OAuth Flow auto-loop...");

for (let i = 1; i <= REQUIRED; i++) {
  console.log(`\n[Auto-Loop] Attempt ${i} (dry_run)...`);
  try {
    execSync("node scripts/ai-company-calendar-timezone-oauth-flow.mjs --provider dry_run --mode dry_run --timezone America/New_York", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.1e.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (dry_run) FAILED: ${e.message}`);
    process.exit(1);
  }

  console.log(`\n[Auto-Loop] Attempt ${i} (oauth_simulated)...`);
  try {
    execSync("node scripts/ai-company-calendar-timezone-oauth-flow.mjs --provider google_calendar --mode oauth_simulated --timezone America/New_York", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, CALENDAR_FAKE_OAUTH: "true", CALENDAR_FAKE_HTTP: "true" }
    });
    execSync("node packages/db/src/_verify-1.1e.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (oauth_simulated) FAILED: ${e.message}`);
    process.exit(1);
  }
}

console.log(`\n[Auto-Loop] Stable passes achieved: ${passes}/${REQUIRED * 2}`);
console.log("[Auto-Loop] Auto-loop completed successfully!");
process.exit(0);
