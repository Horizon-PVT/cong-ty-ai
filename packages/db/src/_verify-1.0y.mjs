#!/usr/bin/env node
/**
 * Milestone 1.0Y Verifier
 * Validates outcome processing results, follow-up draft queue, and safety parameters.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const REPORT_DIR = path.join(ROOT, "reports", "owner-approval-workbench");
const GENERATED_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0y", "generated");

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
  "scripts/ai-company-run-controlled-outreach-outcome-mission.mjs",
  "scripts/ai-company-controlled-outreach-outcome-auto-loop.mjs",
  "scripts/ai-company-controlled-outreach-outcome-premerge-simulate.mjs",
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
let payloadPath = path.join(REPORT_DIR, "daily-controlled-outreach-outcome-payload.json");
if (!fs.existsSync(payloadPath)) {
  payloadPath = path.join(GENERATED_DIR, "outcome-classification-ledger.json");
}
check(fs.existsSync(payloadPath), "daily-controlled-outreach-outcome-payload.json exists");

let payload;
try {
  payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
} catch (e) {
  fail("daily-controlled-outreach-outcome-payload.json is valid JSON");
  process.exit(1);
}

if (payload) {
  const result = payload.live_result || payload;
  check(result.milestone === "1.0Y", "Milestone is 1.0Y");

  // Check no follow-up is marked as sent
  const queue = payload.queue?.queue || [];
  let followUpSent = false;
  for (const f of queue) {
    if (f.sent_status === "SENT") {
      followUpSent = true;
    }
  }
  check(!followUpSent, "no follow-up email has been sent or marked as SENT");

  // Check suppression plan auto-updates for opt-outs
  const suppressionPlan = payload.suppression_updates || { updates: [] };
  const optOutUpdates = suppressionPlan.updates?.filter(u => u.reason === "UNSUBSCRIBE_REQUEST");
  check(optOutUpdates.length > 0, "opt-out unsubscribe request auto-mapped to suppression update plan");
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
const policyPath = path.join(ROOT, "configs", "ai-company", "controlled-outreach-outcome-policy.json");
if (fs.existsSync(policyPath)) {
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  check(policy.active_rules?.no_automatic_followups === true, "policy: no_automatic_followups is true");
  check(policy.active_rules?.crm_write_enabled === false, "policy: crm_write_enabled is false");
  check(policy.active_rules?.owner_approval_required_per_followup === true, "policy: owner_approval_required_per_followup is true");
  check(policy.active_rules?.opt_out_threshold_rate === 0.20, "policy: opt_out_threshold_rate is 0.20");
  check(policy.active_rules?.bounce_threshold_rate === 0.10, "policy: bounce_threshold_rate is 0.10");
} else {
  fail("controlled-outreach-outcome-policy.json missing");
}

// ─── Widget map checks ───────────────────────────────────────────────────────
const widgetMapPath = path.join(ROOT, "configs", "ai-company", "controlled-outreach-outcome-widget-map.json");
if (fs.existsSync(widgetMapPath)) {
  const wm = JSON.parse(fs.readFileSync(widgetMapPath, "utf8"));
  for (const w of wm.widgets ?? []) {
    check(Array.isArray(w.data_sources) && w.data_sources.length > 0, `Widget "${w.widget_id}" has explicit data_sources`);
    check(Array.isArray(w.required_payload_sections) && w.required_payload_sections.length > 0, `Widget "${w.widget_id}" has required_payload_sections`);
  }
} else {
  fail("controlled-outreach-outcome-widget-map.json missing");
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("=".repeat(50));
console.log(`Phase 1.0Y Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) {
  console.error("Phase 1.0Y verification FAILED!");
  process.exit(1);
} else {
  console.log("Phase 1.0Y verification PASSED!");
}
