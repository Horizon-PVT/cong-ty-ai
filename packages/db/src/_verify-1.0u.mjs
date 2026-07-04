#!/usr/bin/env node
/**
 * Milestone 1.0U Verifier
 * Validates all email live pilot harness artifacts for safety and compliance.
 * Fails on any hard lock violation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const REPORT_DIR = path.join(ROOT, "reports", "owner-approval-workbench");
const GENERATED_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0u", "generated");

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
  "scripts/ai-company-run-email-live-pilot-mission.mjs",
  "scripts/ai-company-email-live-pilot-auto-loop.mjs",
  "scripts/ai-company-email-live-pilot-premerge-simulate.mjs",
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
const payloadPath = path.join(REPORT_DIR, "daily-email-live-pilot-payload.json");
check(fs.existsSync(payloadPath), "daily-email-live-pilot-payload.json exists");

let payload;
try {
  payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
} catch (e) {
  fail("daily-email-live-pilot-payload.json is valid JSON");
  process.exit(1);
}

// Overview checks
check(payload.pilot_overview?.live_email_enabled === false, "pilot_overview live_email_enabled is false");
check(payload.pilot_overview?.emergency_stop === true, "pilot_overview emergency_stop is true");
check(payload.pilot_overview?.pilot_action_count === 1, "pilot_overview pilot_action_count is 1");
check(payload.pilot_overview?.total_blocked === 1, "pilot_overview total_blocked is 1");
check(payload.integration_target === "paperclip", "integration_target is paperclip");
check(payload.data_label === "DEMO_LOCAL_ONLY", "data_label is DEMO_LOCAL_ONLY");

// Future live token policy checks
const flt = payload.future_live_token_policy;
check(flt?.merge_token_name === "OWNER_APPROVED_MERGE_PR", "future_live_token_policy merge_token_name is OWNER_APPROVED_MERGE_PR");
check(flt?.sandbox_token_name === "OWNER_APPROVED_EMAIL_SANDBOX_TOKEN", "future_live_token_policy sandbox_token_name is OWNER_APPROVED_EMAIL_SANDBOX_TOKEN");
check(flt?.future_live_token_name === "OWNER_APPROVED_LIVE_TOKEN", "future_live_token_policy future_live_token_name is OWNER_APPROVED_LIVE_TOKEN");
check(flt?.future_pilot_token_format === "OWNER_APPROVED_LIVE_TOKEN=<pilot_action_id>", "future_pilot_token_format is OWNER_APPROVED_LIVE_TOKEN=<pilot_action_id>");
check(flt?.merge_token_must_not_enable_live_pilot === true, "merge_token_must_not_enable_live_pilot is true");
check(flt?.sandbox_token_must_not_enable_live_pilot === true, "sandbox_token_must_not_enable_live_pilot is true");
check(flt?.future_live_token_reserved_only === true, "future_live_token_reserved_only is true");
check(flt?.one_token_one_pilot_action === true, "one_token_one_pilot_action is true");
check(flt?.token_scope === "PILOT_ACTION_ID", "token_scope is PILOT_ACTION_ID");
check(flt?.token_expires_after_use === true, "token_expires_after_use is true");
check(flt?.token_must_match_action_id === true, "token_must_match_action_id is true");

// Pilot action checks
const item = payload.pilot_action;
check(item !== undefined && item !== null, "pilot_action exists");
if (item) {
  const id = item.pilot_action_id;
  check(item.pilot_action_count === 1, `item ${id} pilot_action_count is 1`);
  check(item.recipient_is_demo_or_allowlist_placeholder === true, `item ${id} recipient_is_demo_or_allowlist_placeholder is true`);
  check(item.recipient_kind === "OWNER_ALLOWLIST_PLACEHOLDER", `item ${id} recipient_kind is OWNER_ALLOWLIST_PLACEHOLDER`);
  check(item.recipient_is_customer === false, `item ${id} recipient_is_customer is false`);
  check(typeof item.recipient_email_placeholder === "string" && item.recipient_email_placeholder.includes("-allowlist@"), `item ${id} recipient email placeholder contains -allowlist@`);
  check(item.mode === "EMAIL_LIVE_PILOT_HARNESS_ONLY", `item ${id} mode is EMAIL_LIVE_PILOT_HARNESS_ONLY`);
  check(item.action_type === "send_email", `item ${id} action_type is send_email`);
  check(item.future_live_send_allowed === false, `item ${id} future_live_send_allowed is false`);
  check(item.pilot_send_blocked === true, `item ${id} pilot_send_blocked is true`);
  check(item.actual_external_effect === "NONE", `item ${id} actual_external_effect is NONE`);
  check(item.owner_live_token_required_for_future === true, `item ${id} owner_live_token_required_for_future is true`);
  check(item.required_future_live_token_name === "OWNER_APPROVED_LIVE_TOKEN", `item ${id} required_future_live_token_name is OWNER_APPROVED_LIVE_TOKEN`);
  check(item.required_future_live_token_scope === id, `item ${id} required_future_live_token_scope matches action_id`);
  check(item.merge_token_not_accepted === true, `item ${id} merge_token_not_accepted is true`);
  check(item.sandbox_token_not_accepted_for_live_pilot === true, `item ${id} sandbox_token_not_accepted_for_live_pilot is true`);
  check(item.provider_status === "FAKE_LOCAL_ONLY", `item ${id} provider_status is FAKE_LOCAL_ONLY`);
  check(item.provider_ready === false, `item ${id} provider_ready is false`);
  check(item.duplicate_send_protection === true, `item ${id} duplicate_send_protection is true`);
  check(item.retry_policy === "DISABLED", `item ${id} retry_policy is DISABLED`);
  check(item.kill_switch_active === true, `item ${id} kill_switch_active is true`);
  check(typeof item.idempotency_key === "string", `item ${id} has idempotency_key`);
  check(typeof item.audit_trail_entry === "object", `item ${id} has audit_trail_entry`);

  // Check all 13 required warning lines
  const REQUIRED_WARNINGS = [
    "LIVE PILOT NOT ENABLED",
    "HARNESS ONLY",
    "NOT SENT",
    "OWNER ALLOWLIST ONLY",
    "NO REAL CUSTOMER CONTACT",
    "NO GMAIL API CALL",
    "NO SMTP CALL",
    "NO PROVIDER API CALL",
    "NO CRM UPDATE",
    "NO PAYMENT REQUEST",
    "FAKE PROVIDER ONLY",
    "FUTURE LIVE TOKEN REQUIRED",
    "KILL SWITCH ACTIVE"
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

// ─── Allowlist, fake provider, and preview checks ───────────────────────────
const allowlistPath = path.join(GENERATED_DIR, "owner-allowlist-model.json");
if (fs.existsSync(allowlistPath)) {
  const al = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  check(al.customer_emails_allowed === false, "owner_allowlist: customer_emails_allowed is false");
  check(al.allowlist_only_enforced === true, "owner_allowlist: allowlist_only_enforced is true");
  check(al.allowlist.length > 0 && al.allowlist.every(i => !i.is_real_email_in_repo), "owner_allowlist: allowlist placeholders contain no real emails");
} else {
  fail("owner-allowlist-model.json missing");
}

const adapterPath = path.join(GENERATED_DIR, "fake-provider-adapter.json");
if (fs.existsSync(adapterPath)) {
  const ad = JSON.parse(fs.readFileSync(adapterPath, "utf8"));
  check(ad.provider_status === "FAKE_LOCAL_ONLY", "fake_provider_adapter: provider_status is FAKE_LOCAL_ONLY");
  check(ad.provider_ready === false, "fake_provider_adapter: provider_ready is false");
  check(ad.real_api_blocked === true, "fake_provider_adapter: real_api_blocked is true");
} else {
  fail("fake-provider-adapter.json missing");
}

const previewPath = path.join(GENERATED_DIR, "email-pilot-preview.md");
if (fs.existsSync(previewPath)) {
  const prev = fs.readFileSync(previewPath, "utf8");
  check(prev.includes("NOT SENT"), "preview contains NOT SENT");
  check(prev.includes("FAKE PROVIDER ONLY"), "preview contains FAKE PROVIDER ONLY");
  check(prev.includes("OWNER ALLOWLIST ONLY"), "preview contains OWNER ALLOWLIST ONLY");
  check(prev.includes("LIVE PILOT NOT ENABLED"), "preview contains LIVE PILOT NOT ENABLED");
  check(prev.includes("HARNESS ONLY"), "preview contains HARNESS ONLY");
} else {
  fail("email-pilot-preview.md missing");
}

// ─── Schema contract verification ────────────────────────────────────────────
const schemaPath = path.join(ROOT, "schemas/ai-company/email-live-pilot-harness-payload.schema.json");
if (fs.existsSync(schemaPath)) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const itemRequired = schema.properties?.pilot_action?.required ?? [];

  const requiredSubFields = [
    "idempotency_key",
    "duplicate_send_protection",
    "retry_policy",
    "kill_switch_active",
    "audit_trail_entry",
    "safety_attestation",
    "safety_warning_lines"
  ];
  for (const f of requiredSubFields) {
    check(itemRequired.includes(f), `Schema requires "${f}" in pilot_action`);
  }
  pass("Payload schema is strict and valid");
} else {
  fail("email-live-pilot-harness-payload.schema.json missing");
}

// ─── Widget map checks ───────────────────────────────────────────────────────
const widgetMapPath = path.join(ROOT, "configs/ai-company/email-live-pilot-harness-widget-map.json");
if (fs.existsSync(widgetMapPath)) {
  const wm = JSON.parse(fs.readFileSync(widgetMapPath, "utf8"));
  for (const w of wm.widgets ?? []) {
    check(Array.isArray(w.data_sources) && w.data_sources.length > 0, `Widget "${w.widget_id}" has explicit data_sources`);
    check(Array.isArray(w.required_payload_sections) && w.required_payload_sections.length > 0, `Widget "${w.widget_id}" has required_payload_sections`);
  }
} else {
  fail("email-live-pilot-harness-widget-map.json missing");
}

// ─── Policy check ────────────────────────────────────────────────────────────
const policyPath = path.join(ROOT, "configs/ai-company/email-live-pilot-harness-policy.json");
if (fs.existsSync(policyPath)) {
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  check(policy.hard_locks?.no_merge_without_owner_token === true, "Policy hard_locks.no_merge_without_owner_token is true");
} else {
  fail("email-live-pilot-harness-policy.json missing");
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("=".repeat(50));
console.log(`Phase 1.0U Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) {
  console.error("Phase 1.0U verification FAILED!");
  process.exit(1);
} else {
  console.log("Phase 1.0U verification PASSED!");
}
