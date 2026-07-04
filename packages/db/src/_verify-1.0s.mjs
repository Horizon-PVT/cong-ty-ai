import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");

console.log("Starting Phase 1.0S verification...");

function check(cond, msg) {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ passed: ${msg}`);
}

// 1. Operating Model & Policy
const opModel = JSON.parse(fs.readFileSync(path.join(ROOT, "configs/ai-company/email-sandbox-operating-model.json"), "utf8"));
check(opModel.stages.length >= 15, "operating model contains >= 15 execution stages");

const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "configs/ai-company/email-sandbox-policy.json"), "utf8"));
check(policy.default_mode === "EMAIL_SANDBOX_ONLY", "default policy mode is EMAIL_SANDBOX_ONLY");
check(policy.token_separation_policy.merge_token_name === "OWNER_APPROVED_MERGE_PR", "policy token separation merge_token_name is OWNER_APPROVED_MERGE_PR");
check(policy.token_separation_policy.live_action_token_name === "OWNER_APPROVED_LIVE_TOKEN", "policy token separation live_action_token_name is OWNER_APPROVED_LIVE_TOKEN");
check(policy.token_separation_policy.sandbox_token_name === "OWNER_APPROVED_EMAIL_SANDBOX_TOKEN", "policy token separation sandbox_token_name is OWNER_APPROVED_EMAIL_SANDBOX_TOKEN");
check(policy.token_separation_policy.merge_token_must_not_enable_live_actions === true, "policy restricts merge token from enabling live actions");
check(policy.token_separation_policy.live_action_token_must_not_merge_code === true, "policy restricts live action token from merging code");

check(policy.sandbox_token_model.sandbox_token_name === "OWNER_APPROVED_EMAIL_SANDBOX_TOKEN", "sandbox token model specifies sandbox token name");
check(policy.sandbox_token_model.required_token_scope === "ACTION_ID", "sandbox token scope is ACTION_ID");
check(policy.sandbox_token_model.one_token_one_email_action === true, "sandbox token model specifies one_token_one_email_action");
check(policy.sandbox_token_model.token_expires_after_use === true, "sandbox token model specifies token_expires_after_use");
check(policy.sandbox_token_model.merge_token_not_accepted === true, "sandbox token model specifies merge_token_not_accepted");
check(policy.sandbox_token_model.live_token_not_accepted_for_sending === true, "sandbox token model specifies live_token_not_accepted_for_sending");

// 2. Widget Map
const widgetMap = JSON.parse(fs.readFileSync(path.join(ROOT, "configs/ai-company/email-sandbox-widget-map.json"), "utf8"));
check(widgetMap.widgets.length === 5, "widget map declares exactly 5 widgets");
for (const w of widgetMap.widgets) {
  check(w.requires_safety_warning === true, `widget ${w.widget_id} requires safety warning`);
}

// 3. Payload Schema
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "schemas/ai-company/email-sandbox-payload.schema.json"), "utf8"));
check(!schema.properties.sandbox_queue.properties.items.items.required.includes("required_live_token_name"), "schema does not require required_live_token_name");
check(!schema.properties.sandbox_queue.properties.items.items.required.includes("required_live_token_scope"), "schema does not require required_live_token_scope");
check(schema.properties.sandbox_queue.properties.items.items.required.includes("live_token_not_accepted_for_sending"), "schema requires live_token_not_accepted_for_sending");
check(schema.properties.sandbox_queue.properties.items.items.required.includes("merge_token_not_accepted"), "schema requires merge_token_not_accepted");
check(schema.properties.sandbox_queue.properties.items.items.required.includes("required_sandbox_token_name"), "schema requires required_sandbox_token_name");
check(schema.properties.sandbox_queue.properties.items.items.required.includes("required_sandbox_token_scope"), "schema requires required_sandbox_token_scope");

// Also check outbox message required fields
check(schema.properties.sandbox_outbox.properties.messages.items.required.includes("recipient_is_demo"), "schema requires recipient_is_demo in outbox");
check(schema.properties.sandbox_outbox.properties.messages.items.required.includes("actual_external_effect"), "schema requires actual_external_effect in outbox");
check(schema.properties.sandbox_outbox.properties.messages.items.required.includes("demo_badge"), "schema requires demo_badge in outbox");
check(schema.properties.sandbox_outbox.properties.messages.items.required.includes("safety_note"), "schema requires safety_note in outbox");
check(schema.properties.sandbox_outbox.properties.messages.items.required.includes("safety_warning_lines"), "schema requires safety_warning_lines in outbox");
check(schema.properties.sandbox_outbox.properties.messages.items.required.includes("safety_attestation"), "schema requires safety_attestation in outbox");


// 4. Generated Payload & Deliverables
const payloadFile = path.join(ROOT, "artifacts/ai-company/mission-1.0s/generated/daily-email-sandbox-payload.json");
check(fs.existsSync(payloadFile), "daily-email-sandbox-payload.json exists");
const payload = JSON.parse(fs.readFileSync(payloadFile, "utf8"));

check(payload.data_label === "DEMO_LOCAL_ONLY", "payload data label is DEMO_LOCAL_ONLY");
check(payload.sandbox_overview.live_actions_enabled === false, "sandbox overview live_actions_enabled is false");
check(payload.sandbox_overview.emergency_stop === true, "sandbox overview emergency_stop is true");

check(payload.sandbox_queue.items.length >= 3, "sandbox queue has at least 3 items");

const requiredWarnings = [
  "EMAIL SANDBOX ONLY",
  "NOT SENT",
  "NO REAL CUSTOMER CONTACT",
  "NO GMAIL API CALL",
  "NO SMTP CALL",
  "NO CRM UPDATE",
  "NO PAYMENT REQUEST",
  "OWNER SANDBOX TOKEN REQUIRED",
  "LIVE SEND NOT ENABLED"
];

for (const item of payload.sandbox_queue.items) {
  check(item.recipient_is_demo === true, `item ${item.action_id} recipient_is_demo is true`);
  check(item.recipient_email_demo.includes("-demo@"), `item ${item.action_id} recipient email contains -demo@`);
  check(item.allowed_or_blocked === "BLOCKED", `item ${item.action_id} is BLOCKED by default`);
  check(item.risk_score >= 1 && item.risk_score <= 100, `item ${item.action_id} risk_score is valid`);
  check(item.actual_external_effect === "NONE", `item ${item.action_id} actual_external_effect is NONE`);
  check(item.required_sandbox_token_name === "OWNER_APPROVED_EMAIL_SANDBOX_TOKEN", `item ${item.action_id} required_sandbox_token_name is correct`);
  check(item.required_sandbox_token_scope === item.action_id, `item ${item.action_id} required_sandbox_token_scope matches action_id`);
  check(item.required_live_token_name === undefined, `item ${item.action_id} must not contain required_live_token_name`);
  check(item.required_live_token_scope === undefined, `item ${item.action_id} must not contain required_live_token_scope`);
  check(item.live_token_not_accepted_for_sending === true, `item ${item.action_id} live_token_not_accepted_for_sending is true`);
  check(item.merge_token_not_accepted === true, `item ${item.action_id} merge_token_not_accepted is true`);

  for (const w of requiredWarnings) {
    check(item.safety_warning_lines.includes(w), `item ${item.action_id} warning lines include ${w}`);
    check(item.safety_attestation.includes(w), `item ${item.action_id} attestation includes ${w}`);
  }
}

// 5. Connectors
const connectorsFile = path.join(ROOT, "artifacts/ai-company/mission-1.0s/generated/mock-email-connector.json");
check(fs.existsSync(connectorsFile), "mock-email-connector.json exists");
const conns = JSON.parse(fs.readFileSync(connectorsFile, "utf8"));
check(conns.connectors.length >= 2, "connectors file lists at least 2 connectors");
for (const c of conns.connectors) {
  check(c.is_mock === true, `connector ${c.connector_id} is mock-only`);
}

// 6. Outbox
check(payload.sandbox_outbox.messages.length >= 1, "sandbox outbox lists at least 1 message");
for (const msg of payload.sandbox_outbox.messages) {
  check(msg.recipient_is_demo === true, `outbox message ${msg.message_id} recipient_is_demo is true`);
  check(msg.actual_external_effect === "NONE", `outbox message ${msg.message_id} actual_external_effect is NONE`);
  check(msg.delivery_status === "SANDBOX_OUTBOX_WRITE_ONLY", `outbox message ${msg.message_id} status is SANDBOX_OUTBOX_WRITE_ONLY`);
  check(msg.demo_badge === "DEMO / SIMULATION", `outbox message ${msg.message_id} demo_badge is correct`);
  check(msg.safety_note !== undefined, `outbox message ${msg.message_id} has safety_note`);
  check(msg.safety_attestation !== undefined, `outbox message ${msg.message_id} has safety_attestation`);
  
  for (const w of requiredWarnings) {
    check(msg.safety_warning_lines.includes(w), `outbox message ${msg.message_id} warning lines include ${w}`);
    check(msg.safety_attestation.includes(w), `outbox message ${msg.message_id} attestation includes ${w}`);
  }
  
  check(msg.eml_content_preview.includes("Chào Anh/Chị Cafe Thanh Hóa"), `outbox message ${msg.message_id} preview has correct body`);
}

// Assert no text implies real email send
const rawText = fs.readFileSync(payloadFile, "utf8");
check(!rawText.includes("\"delivery_status\": \"SENT\""), "no outbox message status is SENT");
check(!rawText.includes("real email was sent") && !rawText.includes("real customer email sent"), "no text implies real email was sent");


// 7. Code/Keywords Safety & Hard Locks Checks
const filesToCheck = [
  "scripts/ai-company-run-email-sandbox-mission.mjs",
  "scripts/ai-company-email-sandbox-auto-loop.mjs",
  "scripts/ai-company-email-sandbox-premerge-simulate.mjs"
];

const forbiddenKeywords = [
  "fetch(",
  "axios",
  "sendMail",
  "Date.now()",
  "Math.random()",
  "process.env.",
  "new Date()",
  "crypto.randomUUID"
];

for (const rel of filesToCheck) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, "utf8");

  // Check for forbidden keywords (strict checks)
  for (const kw of forbiddenKeywords) {
    if (content.includes(kw)) {
      // Allow new Date(var) or similar if it's not the exact literal "new Date()" without arguments
      if (kw === "new Date()" && !content.includes("new Date()")) {
        continue;
      }
      console.error(`❌ FAILED: File ${rel} contains forbidden keyword: "${kw}"`);
      process.exit(1);
    }
  }
  console.log(`✅ passed: Code safety check for ${rel}`);
}

// 8. Integration payload exists for Paperclip
const paperclipPayloadFile = path.join(ROOT, "reports/owner-approval-workbench/daily-email-sandbox-payload.json");
check(fs.existsSync(paperclipPayloadFile), "reports/owner-approval-workbench/daily-email-sandbox-payload.json exists");

console.log("==================================================");
console.log("Phase 1.0S Verification Summary: All passed!");
console.log("Phase 1.0S verification PASSED!");
process.exit(0);
