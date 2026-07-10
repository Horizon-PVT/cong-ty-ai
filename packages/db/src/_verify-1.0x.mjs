#!/usr/bin/env node
/**
 * Milestone 1.0X Verifier
 * Validates all pilot outreach artifacts for safety and compliance.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const REPORT_DIR = path.join(ROOT, "reports", "owner-approval-workbench");
const GENERATED_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0x", "generated");

let passed = 0;
let failed = 0;

function pass(msg) { console.log(`✅ passed: ${msg}`); passed++; }
function fail(msg) { console.error(`❌ FAILED: ${msg}`); failed++; }

function check(condition, msg) {
  if (condition) pass(msg);
  else fail(msg);
}

// ─── Code safety checks ──────────────────────────────────────────────────────
const SCRIPTS_TO_CHECK = [
  "scripts/ai-company-send-controlled-outreach-pilot.mjs",
  "scripts/ai-company-run-controlled-outreach-pilot-mission.mjs",
  "scripts/ai-company-controlled-outreach-auto-loop.mjs",
  "scripts/ai-company-controlled-outreach-premerge-simulate.mjs",
];

const executableForbidden = [
  "process.env.", "nodemailer.createTransport(",
  "gmail.users.messages.send", "smtp://", "smtps://",
  "sendgrid.com", "mailgun.com", "resend.com",
];

for (const rel of SCRIPTS_TO_CHECK) {
  const fPath = path.join(ROOT, rel);
  if (!fs.existsSync(fPath)) {
    fail(`script file missing: ${rel}`);
    continue;
  }
  const src = fs.readFileSync(fPath, "utf8");
  let scriptSafe = true;
  for (const pattern of executableForbidden) {
    if (src.includes(pattern)) {
      fail(`Code safety check for ${rel}: contains forbidden pattern "${pattern}"`);
      scriptSafe = false;
    }
  }
  if (scriptSafe) pass(`Code safety check for ${rel}`);
}

// ─── Payload checks ──────────────────────────────────────────────────────────
let payloadPath = path.join(REPORT_DIR, "daily-controlled-outreach-payload.json");
if (!fs.existsSync(payloadPath)) {
  payloadPath = path.join(GENERATED_DIR, "provider-dispatch-evidence-redacted.json");
}
check(fs.existsSync(payloadPath), "daily-controlled-outreach-payload.json exists");

let payload;
try {
  payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
} catch (e) {
  fail("daily-controlled-outreach-payload.json is valid JSON");
  process.exit(1);
}

if (payload) {
  const result = payload.live_result || payload;
  check(result.milestone === "1.0X", "Milestone is 1.0X");
  check(result.action_id === "pilot_email_action_002", "action_id is pilot_email_action_002");
  check(result.token_name === "OWNER_APPROVED_LIVE_TOKEN", "token_name is OWNER_APPROVED_LIVE_TOKEN");
  check(result.token_value_redacted && result.token_value_redacted.includes("REDACTED"), "token_value is redacted");
  check(result.recipient_redacted && result.recipient_redacted.includes("***@"), "recipient is redacted");
  check(result.kill_switch_checked === true, "kill_switch_checked is true");
  check(result.unsubscribe_appended === true, "unsubscribe_appended is true");

  if (result.mode === "dry-run") {
    check(result.external_effect === "NONE", "Dry-run external effect is NONE");
  } else {
    check(result.external_effect === "SENT_PILOT_EMAIL", "Live send external effect is SENT_PILOT_EMAIL");
  }
}

// ─── Check no real email address is committed ────────────────────────────────
const committedFiles = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter(f => f.trim().length > 0 && !f.includes("pnpm-lock.yaml") && !f.includes("_verify-"));

let emailLeaked = false;
for (const f of committedFiles) {
  const full = path.join(ROOT, f);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
  const content = fs.readFileSync(full, "utf8");
  if (content.includes("alexminh.ai@") || content.includes("tung@") || content.includes("tung.pv@")) {
    fail(`Email leak detected in: ${f}`);
    emailLeaked = true;
  }
}
check(!emailLeaked, "no real client email address is committed in git tracked files");

// ─── Policy checks ───────────────────────────────────────────────────────────
const policyPath = path.join(ROOT, "configs", "ai-company", "controlled-outreach-policy.json");
if (fs.existsSync(policyPath)) {
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  check(policy.active_rules?.live_send_enabled_in_pr === false, "policy: live_send_enabled_in_pr is false");
  check(policy.active_rules?.send_blocked_in_pr === true, "policy: send_blocked_in_pr is true");
  check(policy.active_rules?.daily_send_cap <= 3, "policy: daily_send_cap is <= 3");
  check(policy.active_rules?.duplicate_send_protection === true, "policy: duplicate_send_protection is true");
  check(policy.active_rules?.retry_policy === "DISABLED", "policy: retry_policy is DISABLED");
  check(policy.active_rules?.unsubscribe_path_required === true, "policy: unsubscribe_path_required is true");
  check(policy.hard_locks?.no_merge_without_owner_token === true, "policy: no_merge_without_owner_token is true");
} else {
  fail("controlled-outreach-policy.json missing");
}

// ─── Widget map checks ───────────────────────────────────────────────────────
const widgetMapPath = path.join(ROOT, "configs", "ai-company", "controlled-outreach-widget-map.json");
if (fs.existsSync(widgetMapPath)) {
  const wm = JSON.parse(fs.readFileSync(widgetMapPath, "utf8"));
  for (const w of wm.widgets ?? []) {
    check(Array.isArray(w.data_sources) && w.data_sources.length > 0, `Widget "${w.widget_id}" has explicit data_sources`);
    check(Array.isArray(w.required_payload_sections) && w.required_payload_sections.length > 0, `Widget "${w.widget_id}" has required_payload_sections`);
  }
} else {
  fail("controlled-outreach-widget-map.json missing");
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("=".repeat(50));
console.log(`Phase 1.0X Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) {
  console.error("Phase 1.0X verification FAILED!");
  process.exit(1);
} else {
  console.log("Phase 1.0X verification PASSED!");
}
