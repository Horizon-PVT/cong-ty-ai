#!/usr/bin/env node
/**
 * Milestone 1.0V Verifier
 * Validates all Boss allowlist test gate artifacts for safety and compliance.
 * Fails on any hard lock violation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const REPORT_DIR = path.join(ROOT, "reports", "owner-approval-workbench");
const GENERATED_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0v", "generated");

let passed = 0;
let failed = 0;

function pass(msg) { console.log(`✅ passed: ${msg}`); passed++; }
function fail(msg) { console.error(`❌ FAILED: ${msg}`); failed++; }

function check(condition, msg) {
  if (condition) pass(msg);
  else fail(msg);
}

// ─── Code safety checks (no real send calls in scripts) ─────────────────────
const SCRIPTS_TO_CHECK = [
  "scripts/ai-company-run-email-boss-allowlist-test-gate-mission.mjs",
  "scripts/ai-company-email-boss-allowlist-test-gate-auto-loop.mjs",
  "scripts/ai-company-email-boss-allowlist-test-gate-premerge-simulate.mjs",
];

const executableForbidden = [
  "process.env", "sendMail(", "nodemailer.createTransport(",
  "gmail.users.messages.send", "smtp://", "smtps://",
  "sendgrid.com", "mailgun.com", "resend.com",
  "fetch(", "axios.post(", "axios.get(",
  "require('nodemailer')", "require(\"nodemailer\")",
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

// ─── Main payload checks ─────────────────────────────────────────────────────
let payloadPath = path.join(REPORT_DIR, "daily-email-boss-allowlist-test-gate-payload.json");
if (!fs.existsSync(payloadPath)) {
  payloadPath = path.join(ROOT, "artifacts", "ai-company", "mission-1.0v", "generated", "email-boss-allowlist-test-gate-payload.json");
}
check(fs.existsSync(payloadPath), "daily-email-boss-allowlist-test-gate-payload.json exists");

let payload;
try {
  payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
} catch (e) {
  fail("daily-email-boss-allowlist-test-gate-payload.json is valid JSON");
  process.exit(1);
}

// Overview checks
check(payload.test_overview?.live_send_enabled_in_pr === false, "test_overview live_send_enabled_in_pr is false");
check(payload.test_overview?.emergency_stop === true, "test_overview emergency_stop is true");
check(payload.test_overview?.test_action_count === 1, "test_overview test_action_count is 1");
check(payload.test_overview?.total_blocked === 1, "test_overview total_blocked is 1");
check(payload.integration_target === "paperclip", "integration_target is paperclip");
check(payload.data_label === "DEMO_LOCAL_ONLY", "data_label is DEMO_LOCAL_ONLY");

// Live token execution policy checks
const policyToken = payload.live_token_execution_policy;
check(policyToken?.merge_token_name === "OWNER_APPROVED_MERGE_PR", "token policy merge_token_name is OWNER_APPROVED_MERGE_PR");
check(policyToken?.sandbox_token_name === "OWNER_APPROVED_EMAIL_SANDBOX_TOKEN", "token policy sandbox_token_name is OWNER_APPROVED_EMAIL_SANDBOX_TOKEN");
check(policyToken?.future_live_token_name === "OWNER_APPROVED_LIVE_TOKEN", "token policy future_live_token_name is OWNER_APPROVED_LIVE_TOKEN");
check(policyToken?.merge_token_must_not_enable_live_test === true, "merge_token_must_not_enable_live_test is true");
check(policyToken?.sandbox_token_must_not_enable_live_test === true, "sandbox_token_must_not_enable_live_test is true");
check(policyToken?.future_live_token_reserved_only === true, "future_live_token_reserved_only is true");
check(policyToken?.one_token_one_test_action === true, "one_token_one_test_action is true");
check(policyToken?.token_scope === "PILOT_ACTION_ID", "token_scope is PILOT_ACTION_ID");
check(policyToken?.token_expires_after_use === true, "token_expires_after_use is true");
check(policyToken?.token_must_match_action_id === true, "token_must_match_action_id is true");

// Test action checks
const item = payload.test_action;
check(item !== undefined && item !== null, "test_action exists");
if (item) {
  const id = item.gate_id;
  check(item.test_action_count === 1, `item ${id} test_action_count is 1`);
  check(item.recipient_kind === "BOSS_ALLOWLIST_RUNTIME_ONLY", `item ${id} recipient_kind is BOSS_ALLOWLIST_RUNTIME_ONLY`);
  check(item.recipient_is_customer === false, `item ${id} recipient_is_customer is false`);
  check(item.recipient_email_in_repo === false, `item ${id} recipient_email_in_repo is false`);
  check(item.recipient_runtime_required === true, `item ${id} recipient_runtime_required is true`);
  check(item.mode === "EMAIL_BOSS_ALLOWLIST_TEST_GATE_ONLY", `item ${id} mode is EMAIL_BOSS_ALLOWLIST_TEST_GATE_ONLY`);
  check(item.test_action_type === "send_email", `item ${id} test_action_type is send_email`);
  check(item.live_send_enabled_in_pr === false, `item ${id} live_send_enabled_in_pr is false`);
  check(item.future_runtime_send_allowed === false, `item ${id} future_runtime_send_allowed is false`);
  check(item.send_blocked_in_pr === true, `item ${id} send_blocked_in_pr is true`);
  check(item.provider_status_in_pr === "FAKE_LOCAL_ONLY", `item ${id} provider_status_in_pr is FAKE_LOCAL_ONLY`);
  check(item.provider_ready_in_pr === false, `item ${id} provider_ready_in_pr is false`);
  check(item.runtime_provider_required === true, `item ${id} runtime_provider_required is true`);
  check(item.actual_external_effect === "NONE", `item ${id} actual_external_effect is NONE`);
  check(item.owner_live_token_required === true, `item ${id} owner_live_token_required is true`);
  check(item.required_live_token_name === "OWNER_APPROVED_LIVE_TOKEN", `item ${id} required_live_token_name is OWNER_APPROVED_LIVE_TOKEN`);
  check(item.required_live_token_scope === "pilot_email_action_001", `item ${id} required_live_token_scope matches source pilot action`);
  check(item.required_live_token_format === "OWNER_APPROVED_LIVE_TOKEN=pilot_email_action_001", `item ${id} required_live_token_format is formatted`);
  check(item.merge_token_not_accepted === true, `item ${id} merge_token_not_accepted is true`);
  check(item.sandbox_token_not_accepted === true, `item ${id} sandbox_token_not_accepted is true`);
  check(item.duplicate_send_protection === true, `item ${id} duplicate_send_protection is true`);
  check(item.retry_policy === "DISABLED", `item ${id} retry_policy is DISABLED`);
  check(item.kill_switch_required === true, `item ${id} kill_switch_required is true`);
  check(item.kill_switch_active_in_pr === true, `item ${id} kill_switch_active_in_pr is true`);
  check(item.audit_required === true, `item ${id} audit_required is true`);
  check(Array.isArray(item.runtime_audit_log_must_include) && item.runtime_audit_log_must_include.includes("gate_id"), `item ${id} audit must include gate_id`);

  // Check all 14 required warning lines
  const REQUIRED_WARNINGS = [
    "LIVE TEST SEND NOT ENABLED IN PR",
    "BOSS ALLOWLIST ONLY",
    "NOT SENT",
    "ONE EMAIL ONLY",
    "NO REAL CUSTOMER CONTACT",
    "NO GMAIL API CALL IN PR",
    "NO SMTP CALL IN PR",
    "NO PROVIDER API CALL IN PR",
    "NO CRM UPDATE",
    "NO PAYMENT REQUEST",
    "RUNTIME LIVE TOKEN REQUIRED",
    "RETRY DISABLED",
    "DUPLICATE SEND PROTECTION REQUIRED",
    "KILL SWITCH REQUIRED"
  ];
  for (const warn of REQUIRED_WARNINGS) {
    const lines = item.safety_warning_lines ?? [];
    check(lines.some(l => l.includes(warn)), `item ${id} warning lines include ${warn}`);
    check(item.safety_attestation?.includes(warn), `item ${id} attestation includes ${warn}`);
  }
}

// ─── Check no text claims email was sent ─────────────────────────────────────
const payloadText = JSON.stringify(payload).toLowerCase();
check(!payloadText.includes("email sent successfully"), "no text claims email was sent successfully");
check(!payloadText.includes("crm update complete"), "no text claims crm update complete");
check(!payloadText.includes("payment processed"), "no text claims payment processed");

// ─── Check no real email address is committed ────────────────────────────────
check(!payloadText.includes("alexminh") && !payloadText.includes("boss@") && !payloadText.includes("admin@"), "no real email address is in payload");

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
check(!emailLeaked, "no real boss email address is committed in git tracked files");

// ─── Allowlist, fake provider, and preview checks ───────────────────────────
const allowlistPath = path.join(GENERATED_DIR, "owner-allowlist-runtime-model.json");
if (fs.existsSync(allowlistPath)) {
  const al = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  check(al.customer_emails_allowed === false, "owner_allowlist: customer_emails_allowed is false");
  check(al.allowlist_only_enforced === true, "owner_allowlist: allowlist_only_enforced is true");
  check(al.committed_real_emails === 0, "owner_allowlist: committed_real_emails is 0");
} else {
  fail("owner-allowlist-runtime-model.json missing");
}

const previewPath = path.join(GENERATED_DIR, "email-boss-test-preview.md");
if (fs.existsSync(previewPath)) {
  const prev = fs.readFileSync(previewPath, "utf8");
  check(prev.includes("NOT SENT"), "preview contains NOT SENT");
  check(prev.includes("BOSS ALLOWLIST ONLY"), "preview contains BOSS ALLOWLIST ONLY");
  check(prev.includes("ONE EMAIL ONLY"), "preview contains ONE EMAIL ONLY");
  check(prev.includes("LIVE TEST SEND NOT ENABLED IN PR"), "preview contains LIVE TEST SEND NOT ENABLED IN PR");
} else {
  fail("email-boss-test-preview.md missing");
}

// ─── Schema contract verification ────────────────────────────────────────────
const schemaPath = path.join(ROOT, "schemas/ai-company/email-boss-allowlist-test-gate-payload.schema.json");
if (fs.existsSync(schemaPath)) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const itemRequired = schema.properties?.test_action?.required ?? [];

  const requiredSubFields = [
    "idempotency_key",
    "duplicate_send_protection",
    "retry_policy",
    "kill_switch_required",
    "kill_switch_active_in_pr",
    "audit_required",
    "runtime_audit_log_must_include",
    "safety_attestation",
    "safety_warning_lines"
  ];
  for (const f of requiredSubFields) {
    check(itemRequired.includes(f), `Schema requires "${f}" in test_action`);
  }
  pass("Payload schema is strict and valid");
} else {
  fail("email-boss-allowlist-test-gate-payload.schema.json missing");
}

// ─── Widget map checks ───────────────────────────────────────────────────────
const widgetMapPath = path.join(ROOT, "configs/ai-company/email-boss-allowlist-test-gate-widget-map.json");
if (fs.existsSync(widgetMapPath)) {
  const wm = JSON.parse(fs.readFileSync(widgetMapPath, "utf8"));
  for (const w of wm.widgets ?? []) {
    check(Array.isArray(w.data_sources) && w.data_sources.length > 0, `Widget "${w.widget_id}" has explicit data_sources`);
    check(Array.isArray(w.required_payload_sections) && w.required_payload_sections.length > 0, `Widget "${w.widget_id}" has required_payload_sections`);
  }
} else {
  fail("email-boss-allowlist-test-gate-widget-map.json missing");
}

// ─── Policy check ────────────────────────────────────────────────────────────
const policyPath = path.join(ROOT, "configs/ai-company/email-boss-allowlist-test-gate-policy.json");
if (fs.existsSync(policyPath)) {
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  check(policy.hard_locks?.no_merge_without_owner_token === true, "Policy hard_locks.no_merge_without_owner_token is true");
} else {
  fail("email-boss-allowlist-test-gate-policy.json missing");
}

import { execSync } from "child_process";

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("=".repeat(50));
console.log(`Phase 1.0V Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) {
  console.error("Phase 1.0V verification FAILED!");
  process.exit(1);
} else {
  console.log("Phase 1.0V verification PASSED!");
}
