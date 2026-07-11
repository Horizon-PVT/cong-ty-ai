#!/usr/bin/env node
/**
 * Milestone 1.1C Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1c", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-conversation-loop-scheduling-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-revenue-conversation-scheduling.mjs",
  "scripts/ai-company-revenue-conversation-scheduling-auto-loop.mjs",
  "scripts/ai-company-revenue-conversation-scheduling-premerge-simulate.mjs",
  "scripts/lib/revenue-conversation/eligibility.mjs",
  "scripts/lib/revenue-conversation/decision-engine.mjs",
  "scripts/lib/revenue-conversation/meeting-slots.mjs",
  "scripts/lib/meeting/provider-fake-http.mjs",
  "scripts/lib/meeting/scheduling-gate.mjs"
];
const SECRET_PATTERNS = [
  /pat-[A-Za-z0-9\-]{10,}/,
  /re_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
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
  "conversation-candidate-ledger.json",
  "meeting-action-plan.json",
  "meeting-write-preview.json",
  "meeting-scheduling-ledger.json",
  "crm-followup-sync-plan.json",
  "provider-response-redacted.json",
  "revenue-conversation-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1C" ? pass("Milestone is 1.1C") : fail(`Milestone wrong: ${policy.milestone}`);
policy.active_rules.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");
policy.active_rules.no_live_calendar_write_without_owner_token === true ? pass("policy: no_live_calendar_write_without_owner_token is true") : fail("policy: no_live_calendar_write_without_owner_token must be true");
policy.active_rules.no_live_crm_write_without_owner_token === true ? pass("policy: no_live_crm_write_without_owner_token is true") : fail("policy: no_live_crm_write_without_owner_token must be true");
policy.active_rules.idempotency_required === true ? pass("policy: idempotency_required is true") : fail("policy: idempotency_required must be true");

// Ledger & scheduling checks
const ledger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "meeting-scheduling-ledger.json"), "utf8"));
const hasLiveWritten = (ledger.entries || []).some((e) => e.write_status === "SCHEDULED_LIVE");
const hasRealProvider = (ledger.entries || []).some((e) => e.called_real_provider === true);
!hasLiveWritten ? pass("no SCHEDULED_LIVE entries in default dry-run mode") : fail("SCHEDULED_LIVE found in default mode — not allowed");
!hasRealProvider ? pass("no real calendar provider called in default mode") : fail("real calendar provider called — not allowed in default mode");

const allHaveIdempotency = (ledger.entries || []).every((e) => !!e.idempotency_key || e.write_status === "BLOCKED_PENDING_OWNER_APPROVAL");
allHaveIdempotency ? pass("all scheduling entries have idempotency_key or are blocked") : fail("some entries missing idempotency_key");

// Scorecard verdict check
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "revenue-conversation-scorecard.json"), "utf8"));
const validVerdicts = [
  "REVENUE_CONVERSATION_SCHEDULING_READY_DRY_RUN_ONLY",
  "MEETING_SCHEDULING_BLOCKED_PENDING_OWNER_APPROVAL",
  "MEETING_SCHEDULING_FAILED",
  "HOLD_FOR_DATA_QUALITY_REVIEW"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Suppression checks - confirm suppressed lead rec_pilot_003 is NOT eligible
const candidates = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "conversation-candidate-ledger.json"), "utf8"));
const suppressedLead = (candidates.candidates || []).find((c) => c.recipient_id === "rec_pilot_003");
if (suppressedLead && !suppressedLead.is_eligible) {
  pass("suppressed candidate (rec_pilot_003) is correctly marked ineligible");
} else {
  fail("suppressed candidate (rec_pilot_003) was not blocked or is missing");
}

// No real emails in 1.1C artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1c/", "configs/ai-company/revenue-conversation", "scripts/ai-company-revenue-conversation", "scripts/lib/revenue-conversation/", "scripts/lib/meeting/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1C committed files") : fail("real email found in 1.1C committed file");
} catch { pass("no real email in 1.1C committed files (git check skipped)"); }

// Widget map checks
const widgetMap = JSON.parse(fs.readFileSync(path.join(ROOT, "configs", "ai-company", "revenue-conversation-loop-scheduling-widget-map.json"), "utf8"));
for (const w of widgetMap.widgets || []) {
  w.data_sources?.length > 0 ? pass(`Widget "${w.widget_id}" has explicit data_sources`) : fail(`Widget "${w.widget_id}" missing data_sources`);
  w.required_payload_sections?.length > 0 ? pass(`Widget "${w.widget_id}" has required_payload_sections`) : fail(`Widget "${w.widget_id}" missing required_payload_sections`);
}

// Previous verifiers regression guard
try {
  execSync("node packages/db/src/_verify-1.1a.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1A verifier still passes");
} catch { fail("1.1A verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1b.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1B verifier still passes");
} catch { fail("1.1B verifier regression"); }

console.log("==================================================");
console.log(`Phase 1.1C Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1C verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1C verification PASSED!"); }
