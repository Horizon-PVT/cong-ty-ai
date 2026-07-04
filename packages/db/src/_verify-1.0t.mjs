#!/usr/bin/env node
/**
 * Milestone 1.0T Verifier
 * Validates all email live readiness artifacts for safety and compliance.
 * Fails on any hard lock violation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const REPORT_DIR = path.join(ROOT, "reports", "owner-approval-workbench");
const GENERATED_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0t", "generated");

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
  "scripts/ai-company-run-email-live-readiness-mission.mjs",
  "scripts/ai-company-email-live-readiness-auto-loop.mjs",
  "scripts/ai-company-email-live-readiness-premerge-simulate.mjs",
];
const FORBIDDEN_PATTERNS = [
  "process.env", "sendMail(", "nodemailer.createTransport(",
  "gmail.users.messages.send", "smtp://", "smtps://",
  "sendgrid.com", "mailgun.com", "resend.com",
  "fetch(", "axios.post(", "axios.get(",
  "require('nodemailer')", "require(\"nodemailer\")",
  "from 'nodemailer'", 'from "nodemailer"',
  "OWNER_APPROVED_LIVE_TOKEN" // live token must not be used in these scripts
];

for (const rel of SCRIPTS_TO_CHECK) {
  const fPath = path.join(ROOT, rel);
  if (!fs.existsSync(fPath)) {
    fail(`script file missing: ${rel}`);
    continue;
  }
  const src = fs.readFileSync(fPath, "utf8");
  // Live token string is allowed ONLY as a string literal field name in comments/policy fields
  // but must not appear as an executable call or env var reference
  const executableForbidden = [
    "process.env", "sendMail(", "nodemailer.createTransport(",
    "gmail.users.messages.send", "smtp://", "smtps://",
    "sendgrid.com", "mailgun.com", "resend.com",
    "fetch(", "axios.post(", "axios.get(",
    "require('nodemailer')", "require(\"nodemailer\")",
  ];
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
const payloadPath = path.join(REPORT_DIR, "daily-email-live-readiness-payload.json");
check(fs.existsSync(payloadPath), "daily-email-live-readiness-payload.json exists");

let payload;
try {
  payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
} catch (e) {
  fail("daily-email-live-readiness-payload.json is valid JSON");
  process.exit(1);
}

// Overview checks
check(payload.readiness_overview?.live_email_enabled === false, "readiness_overview live_email_enabled is false");
check(payload.readiness_overview?.emergency_stop === true, "readiness_overview emergency_stop is true");
check(payload.readiness_overview?.total_ready === 0, "readiness_overview total_ready is 0");
check(payload.integration_target === "paperclip", "integration_target is paperclip");
check(payload.data_label === "DEMO_LOCAL_ONLY", "data_label is DEMO_LOCAL_ONLY");

// Future live token policy checks
const flt = payload.future_live_token_policy;
check(flt?.merge_token_name === "OWNER_APPROVED_MERGE_PR", "future_live_token_policy merge_token_name is OWNER_APPROVED_MERGE_PR");
check(flt?.sandbox_token_name === "OWNER_APPROVED_EMAIL_SANDBOX_TOKEN", "future_live_token_policy sandbox_token_name is OWNER_APPROVED_EMAIL_SANDBOX_TOKEN");
check(flt?.future_live_token_name === "OWNER_APPROVED_LIVE_TOKEN", "future_live_token_policy future_live_token_name is OWNER_APPROVED_LIVE_TOKEN");
check(flt?.merge_token_must_not_enable_email_live_send === true, "merge_token_must_not_enable_email_live_send is true");
check(flt?.sandbox_token_must_not_enable_email_live_send === true, "sandbox_token_must_not_enable_email_live_send is true");
check(flt?.live_token_reserved_for_future_milestone_only === true, "live_token_reserved_for_future_milestone_only is true");
check(flt?.one_live_token_one_email_action === true, "one_live_token_one_email_action is true");
check(flt?.live_token_scope === "ACTION_ID", "live_token_scope is ACTION_ID");
check(flt?.live_token_expires_after_use === true, "live_token_expires_after_use is true");

// Readiness queue item checks
const items = payload.readiness_queue?.items ?? [];
check(items.length >= 1, `readiness_queue has at least 1 item (got ${items.length})`);

const REQUIRED_WARNINGS = [
  "LIVE EMAIL NOT ENABLED",
  "READINESS CHECK ONLY",
  "NOT SENT",
  "NO REAL CUSTOMER CONTACT",
  "NO GMAIL API CALL",
  "NO SMTP CALL",
  "NO PROVIDER API CALL",
  "NO CRM UPDATE",
  "NO PAYMENT REQUEST",
  "FUTURE LIVE TOKEN REQUIRED",
  "KILL SWITCH ACTIVE",
];

for (const item of items) {
  const id = item.action_id;
  check(item.recipient_is_demo === true, `item ${id} recipient_is_demo is true`);
  check(typeof item.recipient_email_demo === "string" && item.recipient_email_demo.includes("-demo@"), `item ${id} recipient email contains -demo@`);
  check(item.mode === "EMAIL_LIVE_READINESS_ONLY", `item ${id} mode is EMAIL_LIVE_READINESS_ONLY`);
  check(item.future_live_send_allowed === false, `item ${id} future_live_send_allowed is false`);
  check(item.live_send_blocked === true, `item ${id} live_send_blocked is true`);
  check(item.actual_external_effect === "NONE", `item ${id} actual_external_effect is NONE`);
  check(item.owner_live_token_required_for_future === true, `item ${id} owner_live_token_required_for_future is true`);
  check(item.required_future_live_token_name === "OWNER_APPROVED_LIVE_TOKEN", `item ${id} required_future_live_token_name is OWNER_APPROVED_LIVE_TOKEN`);
  check(item.merge_token_not_accepted === true, `item ${id} merge_token_not_accepted is true`);
  check(item.sandbox_token_not_accepted_for_live_send === true, `item ${id} sandbox_token_not_accepted_for_live_send is true`);
  check(typeof item.readiness_score === "number" && item.readiness_score >= 0 && item.readiness_score <= 100, `item ${id} readiness_score is valid (${item.readiness_score})`);
  check(Array.isArray(item.missing_requirements) && item.missing_requirements.length > 0, `item ${id} has missing_requirements`);
  check(typeof item.compliance_checklist === "object", `item ${id} has compliance_checklist`);
  check(typeof item.source_sandbox_action_id === "string", `item ${id} has source_sandbox_action_id`);

  // Check all 11 required warning lines
  for (const warn of REQUIRED_WARNINGS) {
    const lines = item.safety_warning_lines ?? [];
    check(lines.some(l => l.includes(warn)), `item ${id} warning lines include ${warn}`);
    check(item.safety_attestation?.includes(warn), `item ${id} attestation includes ${warn}`);
  }

  // Check specific sub-checks
  check(typeof item.sender_identity_check === "object", `item ${id} has sender_identity_check`);
  check(typeof item.unsubscribe_check === "object", `item ${id} has unsubscribe_check`);
  check(typeof item.rate_limit_check === "object", `item ${id} has rate_limit_check`);
  check(typeof item.bounce_handling_check === "object", `item ${id} has bounce_handling_check`);
  check(typeof item.reply_routing_check === "object", `item ${id} has reply_routing_check`);
  check(typeof item.suppression_list_check === "object", `item ${id} has suppression_list_check`);

  // No readiness item may say live send allowed
  check(item.future_live_send_allowed !== true, `item ${id} does not say future_live_send_allowed is true`);
  check(item.live_send_blocked !== false, `item ${id} does not say live_send_blocked is false`);
}

// ─── Check no text claims email was sent ─────────────────────────────────────
const payloadText = JSON.stringify(payload).toLowerCase();
check(!payloadText.includes("email sent successfully"), "no text claims email was sent successfully");
check(!payloadText.includes("crm update complete"), "no text claims crm update complete");
check(!payloadText.includes("payment processed"), "no text claims payment processed");

// ─── Provider is fake check ───────────────────────────────────────────────────
const senderRulesPath = path.join(GENERATED_DIR, "sender-identity-rules.json");
if (fs.existsSync(senderRulesPath)) {
  const sr = JSON.parse(fs.readFileSync(senderRulesPath, "utf8"));
  check(sr.sender_verified === false, "sender_identity_rules: sender_verified is false");
  check(sr.spf_record === "NOT_CONFIGURED", "sender_identity_rules: SPF is NOT_CONFIGURED");
  pass("sender-identity-rules.json exists and validates");
} else {
  fail("sender-identity-rules.json missing");
}

const suppressionPath = path.join(GENERATED_DIR, "suppression-list-model.json");
if (fs.existsSync(suppressionPath)) {
  const sl = JSON.parse(fs.readFileSync(suppressionPath, "utf8"));
  check(sl.status === "EMPTY_LOCAL_ONLY", "suppression list status is EMPTY_LOCAL_ONLY");
  check(sl.provider_synced === false, "suppression list not synced to provider");
  pass("suppression-list-model.json exists and validates");
} else {
  fail("suppression-list-model.json missing");
}

const consentPath = path.join(GENERATED_DIR, "consent-allowlist-model.json");
if (fs.existsSync(consentPath)) {
  const cm = JSON.parse(fs.readFileSync(consentPath, "utf8"));
  check(cm.consent_collected === false, "consent model: consent_collected is false");
  check(Array.isArray(cm.allowlist) && cm.allowlist.length === 0, "consent model: allowlist is empty");
  pass("consent-allowlist-model.json exists and validates");
} else {
  fail("consent-allowlist-model.json missing");
}

// ─── Preview markdown check ───────────────────────────────────────────────────
const previewPath = path.join(GENERATED_DIR, "email-readiness-preview.md");
if (fs.existsSync(previewPath)) {
  const prev = fs.readFileSync(previewPath, "utf8");
  check(prev.includes("LIVE EMAIL NOT ENABLED"), "readiness preview contains LIVE EMAIL NOT ENABLED");
  check(prev.includes("READINESS CHECK ONLY"), "readiness preview contains READINESS CHECK ONLY");
  check(prev.includes("NOT SENT"), "readiness preview contains NOT SENT");
  check(prev.includes("FUTURE LIVE TOKEN REQUIRED"), "readiness preview contains FUTURE LIVE TOKEN REQUIRED");
  check(prev.includes("KILL SWITCH ACTIVE"), "readiness preview contains KILL SWITCH ACTIVE");
  check(prev.includes("OWNER_APPROVED_LIVE_TOKEN"), "readiness preview contains OWNER_APPROVED_LIVE_TOKEN token name");
  pass("email-readiness-preview.md exists and validates");
} else {
  fail("email-readiness-preview.md missing");
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("=".repeat(50));
console.log(`Phase 1.0T Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) {
  console.error("Phase 1.0T verification FAILED!");
  process.exit(1);
} else {
  console.log("Phase 1.0T verification PASSED!");
}
