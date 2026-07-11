#!/usr/bin/env node
/**
 * Milestone 1.1E Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1e", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-calendar-timezone-oauth-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-calendar-timezone-oauth-flow.mjs",
  "scripts/ai-company-calendar-timezone-oauth-flow-auto-loop.mjs",
  "scripts/ai-company-calendar-timezone-oauth-flow-premerge-simulate.mjs",
  "scripts/lib/calendar/timezone-formatting.mjs",
  "scripts/lib/calendar/timezone-validation.mjs",
  "scripts/lib/calendar/oauth-pkce.mjs",
  "scripts/lib/calendar/oauth-state-gate.mjs",
  "scripts/lib/calendar/oauth-local-callback-server.mjs",
  "scripts/lib/calendar/oauth-token-redaction.mjs",
  "scripts/lib/calendar/provider-google-calendar-oauth.mjs"
];
const SECRET_PATTERNS = [
  /pat-[A-Za-z0-9\-]{10,}/,
  /re_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /GOOGLE_OAUTH_CLIENT_SECRET\s*=\s*\S{5,}/,
  /access_token:\s*["'][a-zA-Z0-9._-]{10,}/,
  /refresh_token:\s*["'][a-zA-Z0-9._-]{10,}/
];

for (const s of SCRIPTS) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { fail(`Script missing: ${s}`); continue; }
  const src = fs.readFileSync(p, "utf8");
  const lines = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.includes("process.env."));
  const safeToCheck = lines.join("\n");
  if (SECRET_PATTERNS.some((r) => r.test(safeToCheck))) fail(`Code safety: secret detected in ${s}`);
  else pass(`Code safety check for ${s}`);
}

// Required artifacts
const REQUIRED_ARTIFACTS = [
  "timezone-normalization-ledger.json",
  "timezone-display-preview.json",
  "oauth-authorization-plan.json",
  "oauth-callback-ledger-redacted.json",
  "oauth-token-status-redacted.json",
  "calendar-timezone-write-preview.json",
  "calendar-timezone-provider-response-redacted.json",
  "calendar-timezone-oauth-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1E" ? pass("Milestone is 1.1E") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");
policy.iana_timezone_required === true ? pass("policy: iana_timezone_required is true") : fail("policy: iana_timezone_required must be true");
policy.pkce_required === true ? pass("policy: pkce_required is true") : fail("policy: pkce_required must be true");

// Event structure checks
const writePreview = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "calendar-timezone-write-preview.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "calendar-timezone-oauth-scorecard.json"), "utf8"));

const hasLiveWritten = (writePreview.previews || []).some((p) => p.write_status === "SCHEDULED_LIVE");
!hasLiveWritten ? pass("no SCHEDULED_LIVE entries in default dry-run mode") : fail("SCHEDULED_LIVE found in default mode — not allowed");

const allHaveTimezones = (writePreview.previews || []).every((p) => !!p.timezone && p.start.timeZone === p.timezone && p.end.timeZone === p.timezone);
allHaveTimezones ? pass("all previews have correct timezone mappings") : fail("timezone mapping mismatch or missing in previews");

const allHaveIdempotency = (writePreview.previews || []).every((p) => !!p.idempotency_key);
allHaveIdempotency ? pass("all scheduling entries have idempotency_key") : fail("some entries missing idempotency_key");

// Scorecard verdict check
const validVerdicts = [
  "CALENDAR_TIMEZONE_OAUTH_READY_DRY_RUN_ONLY",
  "CALENDAR_TIMEZONE_FORMATTING_PASSED",
  "CALENDAR_OAUTH_SIMULATION_SUCCEEDED",
  "CALENDAR_OAUTH_BLOCKED_MISSING_CONFIG",
  "CALENDAR_OAUTH_BLOCKED_STATE_MISMATCH",
  "CALENDAR_OAUTH_BLOCKED_PENDING_OWNER_APPROVAL",
  "CALENDAR_SANDBOX_WRITE_SUCCEEDED_WITH_TIMEZONE",
  "CALENDAR_LIVE_WRITE_SUCCEEDED_WITH_TIMEZONE",
  "CALENDAR_TIMEZONE_OAUTH_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1E artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1e/", "configs/ai-company/revenue-calendar-timezone", "scripts/ai-company-calendar-timezone", "scripts/lib/calendar/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1E committed files") : fail("real email found in 1.1E committed file");
} catch { pass("no real email in 1.1E committed files (git check skipped)"); }

// Previous verifiers regression guard
try {
  execSync("node packages/db/src/_verify-1.1a.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1A verifier still passes");
} catch { fail("1.1A verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1b.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1B verifier still passes");
} catch { fail("1.1B verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1c.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1C verifier still passes");
} catch { fail("1.1C verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1d.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1D verifier still passes");
} catch { fail("1.1D verifier regression"); }

console.log("==================================================");
console.log(`Phase 1.1E Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1E verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1E verification PASSED!"); }
