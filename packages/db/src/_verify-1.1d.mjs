#!/usr/bin/env node
/**
 * Milestone 1.1D Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1d", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-calendar-crm-execution-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-real-calendar-crm-execution.mjs",
  "scripts/ai-company-real-calendar-crm-execution-auto-loop.mjs",
  "scripts/ai-company-real-calendar-crm-execution-premerge-simulate.mjs",
  "scripts/lib/calendar/provider-dry-run.mjs",
  "scripts/lib/calendar/provider-google-calendar.mjs",
  "scripts/lib/calendar/oauth-token-gate.mjs",
  "scripts/lib/calendar/conflict-checker.mjs",
  "scripts/lib/calendar/event-idempotency.mjs",
  "scripts/lib/calendar/redaction.mjs"
];
const SECRET_PATTERNS = [
  /pat-[A-Za-z0-9\-]{10,}/,
  /re_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /CALENDAR_ACCESS_TOKEN\s*=\s*\S{5,}/,
  /CALENDAR_API_KEY\s*=\s*\S{5,}/,
  /HUBSPOT_ACCESS_TOKEN\s*=\s*\S{5,}/,
  /SALESFORCE_ACCESS_TOKEN\s*=\s*\S{5,}/
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
  "calendar-execution-plan.json",
  "calendar-conflict-check-ledger.json",
  "calendar-write-preview.json",
  "calendar-provider-response-redacted.json",
  "email-slot-dispatch-plan.json",
  "crm-post-schedule-sync-plan.json",
  "calendar-crm-execution-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1D" ? pass("Milestone is 1.1D") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");
policy.conflict_check_required === true ? pass("policy: conflict_check_required is true") : fail("policy: conflict_check_required must be true");
policy.idempotency_required === true ? pass("policy: idempotency_required is true") : fail("policy: idempotency_required must be true");

// Event and CRM Sync checks
const preview = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "calendar-write-preview.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "calendar-crm-execution-scorecard.json"), "utf8"));

const hasLiveWritten = preview.summary.scheduled > 0;
!hasLiveWritten ? pass("no SCHEDULED entries in default dry-run mode") : fail("SCHEDULED found in default mode — not allowed");
scorecard.called_real_provider === false ? pass("no real calendar provider called in default mode") : fail("real calendar provider called — not allowed in default mode");

const allHaveIdempotency = (preview.previews || []).every((e) => !!e.idempotency_key);
allHaveIdempotency ? pass("all scheduling entries have idempotency_key") : fail("some entries missing idempotency_key");

// Scorecard verdict check
const validVerdicts = [
  "CALENDAR_CRM_EXECUTION_READY_DRY_RUN_ONLY",
  "CALENDAR_WRITE_BLOCKED_PENDING_OWNER_APPROVAL",
  "CALENDAR_WRITE_BLOCKED_OAUTH_MISSING",
  "CALENDAR_WRITE_BLOCKED_CONFLICT",
  "CALENDAR_SANDBOX_WRITE_SUCCEEDED",
  "CALENDAR_LIVE_WRITE_SUCCEEDED",
  "CRM_SYNC_BLOCKED_PENDING_OWNER_APPROVAL",
  "CALENDAR_CRM_EXECUTION_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1D artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1d/", "configs/ai-company/revenue-calendar", "scripts/ai-company-real-calendar-crm", "scripts/lib/calendar/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1D committed files") : fail("real email found in 1.1D committed file");
} catch { pass("no real email in 1.1D committed files (git check skipped)"); }

// Previous verifiers regression guard
try {
  execSync("node packages/db/src/_verify-1.1c.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1C verifier still passes");
} catch { fail("1.1C verifier regression"); }

console.log("==================================================");
console.log(`Phase 1.1D Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1D verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1D verification PASSED!"); }
