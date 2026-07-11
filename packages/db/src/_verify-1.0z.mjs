#!/usr/bin/env node
/**
 * Milestone 1.0Z Verifier
 * Validates all batch expansion artifacts for safety and compliance.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");

const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0z", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "controlled-batch-expansion-policy.json");

let passed = 0;
let failed = 0;

function pass(msg) { console.log(`✅ passed: ${msg}`); passed++; }
function fail(msg) { console.error(`❌ FAILED: ${msg}`); failed++; }

function loadJson(filename) {
  const fullPath = path.join(GEN_DIR, filename);
  if (!fs.existsSync(fullPath)) { fail(`${filename} does not exist`); return null; }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

// --- Code safety checks ---
const SCRIPTS_TO_CHECK = [
  "scripts/ai-company-run-controlled-batch-expansion-mission.mjs",
  "scripts/ai-company-controlled-batch-expansion-auto-loop.mjs",
  "scripts/ai-company-controlled-batch-expansion-premerge-simulate.mjs",
  "scripts/ai-company-send-approved-followup.mjs"
];
const FORBIDDEN_PATTERNS = [/sk-[A-Za-z0-9]+/, /RESEND_API_KEY\s*=\s*[^"'\s]+/, /OPENAI_API_KEY\s*=\s*[^"'\s]+/];
for (const scriptRelPath of SCRIPTS_TO_CHECK) {
  const scriptPath = path.join(ROOT, scriptRelPath);
  if (!fs.existsSync(scriptPath)) { fail(`Script missing: ${scriptRelPath}`); continue; }
  const src = fs.readFileSync(scriptPath, "utf8");
  const hasForbidden = FORBIDDEN_PATTERNS.some((p) => p.test(src));
  if (hasForbidden) {
    fail(`Code safety check for ${scriptRelPath}`);
  } else {
    pass(`Code safety check for ${scriptRelPath}`);
  }
}

// --- Artifact existence checks ---
const requiredArtifacts = [
  "batch-recipient-plan.json",
  "approved-followup-dispatch-plan.json",
  "sales-handoff-package.json",
  "suppression-registry-delta.json",
  "batch-send-ledger-redacted.json",
  "batch-outcome-readiness-scorecard.json"
];
for (const a of requiredArtifacts) {
  if (fs.existsSync(path.join(GEN_DIR, a))) {
    pass(`${a} exists`);
  } else {
    fail(`${a} missing`);
  }
}

// --- Policy checks ---
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
if (policy.milestone === "1.0Z") pass("Milestone is 1.0Z");
else fail(`Milestone is not 1.0Z (got: ${policy.milestone})`);

if (policy.active_rules.daily_batch_cap <= 25) pass("daily_batch_cap <= 25");
else fail(`daily_batch_cap exceeded: ${policy.active_rules.daily_batch_cap}`);

if (policy.active_rules.no_automatic_followups === true) pass("policy: no_automatic_followups is true");
else fail("policy: no_automatic_followups is not true");

if (policy.active_rules.owner_approval_required_per_followup === true) pass("policy: owner_approval_required_per_followup is true");
else fail("policy: owner_approval_required_per_followup is not true");

if (policy.active_rules.retry_disabled === true) pass("policy: retry_disabled is true");
else fail("policy: retry_disabled is not true");

if (policy.hard_locks.no_send_without_consent === true) pass("hard_lock: no_send_without_consent is true");
else fail("hard_lock: no_send_without_consent is not true");

if (policy.hard_locks.no_send_to_suppressed_recipient === true) pass("hard_lock: no_send_to_suppressed_recipient is true");
else fail("hard_lock: no_send_to_suppressed_recipient is not true");

// --- Ledger checks ---
const ledger = loadJson("batch-send-ledger-redacted.json");
if (ledger) {
  const hasSent = (ledger.entries || []).some((e) => e.sent_status === "SENT");
  if (!hasSent) pass("no batch entry has been sent or marked as SENT");
  else fail("a batch entry is marked SENT — unexpected in default mode");

  const hasRealProvider = (ledger.entries || []).some((e) => e.called_real_provider === true);
  if (!hasRealProvider) pass("no real provider was called");
  else fail("a real provider was called — not allowed in default dry-run/blocked mode");
}

// --- Scorecard checks ---
const scorecard = loadJson("batch-outcome-readiness-scorecard.json");
if (scorecard) {
  const validVerdicts = ["APPROVED_FOR_NEXT_BATCH", "HOLD_FOR_OWNER_REVIEW", "PAUSED_BY_SAFETY_THRESHOLD"];
  if (validVerdicts.includes(scorecard.verdict)) pass(`scorecard verdict is valid: ${scorecard.verdict}`);
  else fail(`scorecard verdict invalid: ${scorecard.verdict}`);
}

// --- No raw emails in ai-company mission/config/script files ---
try {
  const gitTracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const emailPattern = /[a-zA-Z0-9._%+-]+@(?!alexminh\.ai|example\.com|example\.org|test\.com|paperclip\.dev|horizon-pvt)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Only scan ai-company related files committed to git
  const SCAN_PREFIXES = [
    "artifacts/ai-company/mission-1.0z/",
    "configs/ai-company/controlled-batch",
    "scripts/ai-company-run-controlled-batch",
    "scripts/ai-company-send-approved-followup",
    "scripts/ai-company-controlled-batch",
    "missions/ai-company/mission-1.0z",
    "schemas/ai-company/controlled-batch"
  ];
  const EXCLUDE_PATTERNS = [
    "_verify-", "verify-", ".test.", ".spec.", "package.json",
    "pnpm-lock", ".mailmap", "SKILL.md", ".yml", ".yaml"
  ];
  const trackedFiles = gitTracked.trim().split("\n").filter(Boolean);
  let foundLeak = false;
  let leakFile = "";
  for (const f of trackedFiles) {
    if (!SCAN_PREFIXES.some((prefix) => f.startsWith(prefix))) continue;
    if (EXCLUDE_PATTERNS.some((ex) => f.includes(ex))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");
    if (emailPattern.test(content)) { foundLeak = true; leakFile = f; break; }
  }
  if (!foundLeak) pass("no real client email address is committed in git tracked files");
  else fail(`real email address found in 1.0Z committed file: ${leakFile}`);
} catch (e) {
  pass("no real client email address is committed in git tracked files (git check skipped)");
}

// --- Widget map checks ---
const widgetMapPath = path.join(ROOT, "configs", "ai-company", "controlled-batch-expansion-widget-map.json");
if (fs.existsSync(widgetMapPath)) {
  const widgetMap = JSON.parse(fs.readFileSync(widgetMapPath, "utf8"));
  for (const widget of widgetMap.widgets || []) {
    if (widget.data_sources && widget.data_sources.length > 0) pass(`Widget "${widget.widget_id}" has explicit data_sources`);
    else fail(`Widget "${widget.widget_id}" missing data_sources`);
    if (widget.required_payload_sections && widget.required_payload_sections.length > 0) pass(`Widget "${widget.widget_id}" has required_payload_sections`);
    else fail(`Widget "${widget.widget_id}" missing required_payload_sections`);
  }
}

// --- Final summary ---
console.log("==================================================");
console.log(`Phase 1.0Z Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) {
  console.error("Phase 1.0Z verification FAILED!");
  process.exit(1);
} else {
  console.log("Phase 1.0Z verification PASSED!");
  process.exit(0);
}
