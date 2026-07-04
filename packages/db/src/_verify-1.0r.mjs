import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");

console.log("Starting Phase 1.0R verification...");

function check(cond, msg) {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ passed: ${msg}`);
}

// 1. Operating Model & Policy
const opModel = JSON.parse(fs.readFileSync(path.join(ROOT, "configs/ai-company/live-action-gateway-operating-model.json"), "utf8"));
check(opModel.stages.length >= 15, "operating model contains >= 15 execution stages");

const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "configs/ai-company/live-action-gateway-policy.json"), "utf8"));
check(policy.default_mode === "LEVEL_0_LOCAL_ONLY", "default policy mode is LEVEL_0_LOCAL_ONLY");
check(policy.kill_switch.live_actions_enabled === false, "policy kill switch live_actions_enabled is false");
check(policy.kill_switch.emergency_stop === true, "policy kill switch emergency_stop is true");
check(policy.kill_switch.max_daily_messages === 0, "policy kill switch max_daily_messages is 0");
check(policy.kill_switch.max_daily_crm_writes === 0, "policy kill switch max_daily_crm_writes is 0");
check(policy.kill_switch.max_daily_payment_requests === 0, "policy kill switch max_daily_payment_requests is 0");

// 2. Widget Map
const widgetMap = JSON.parse(fs.readFileSync(path.join(ROOT, "configs/ai-company/live-action-gateway-widget-map.json"), "utf8"));
check(widgetMap.widgets.length === 5, "widget map declares exactly 5 widgets");
for (const w of widgetMap.widgets) {
  check(w.requires_safety_warning === true, `widget ${w.widget_id} requires safety warning`);
}

// 3. Payload Schema
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "schemas/ai-company/live-action-gateway-payload.schema.json"), "utf8"));
check(schema.properties.gateway_queue.required.includes("safety_warning_lines"), "schema requires safety_warning_lines in gateway_queue");
check(schema.properties.gateway_queue.properties.items.items.required.includes("safety_warning_lines"), "schema requires safety_warning_lines in queue items");
check(schema.properties.gateway_queue.properties.items.items.required.includes("safety_attestation"), "schema requires safety_attestation in queue items");
check(schema.properties.gateway_kill_switch.properties.live_actions_enabled.const === false, "schema requires live_actions_enabled to be const false");
check(schema.properties.gateway_kill_switch.properties.emergency_stop.const === true, "schema requires emergency_stop to be const true");

// 4. Generated Payloads & Deliverables
const payloadFile = path.join(ROOT, "artifacts/ai-company/mission-1.0r/generated/daily-live-action-gateway-payload.json");
check(fs.existsSync(payloadFile), "daily-live-action-gateway-payload.json exists");
const payload = JSON.parse(fs.readFileSync(payloadFile, "utf8"));

check(payload.data_label === "DEMO_LOCAL_ONLY", "payload data label is DEMO_LOCAL_ONLY");
check(!!payload.demo_warning, "payload contains demo warning string");

// Answers checks
const answers = payload.gateway_answers || {};
check(!!answers.q1_actions_eligible_live, "answers Q1: Which actions are eligible for future live execution?");
check(!!answers.q2_actions_blocked_reason, "answers Q2: Which actions are blocked and why?");
check(!!answers.q3_autonomy_level_required, "answers Q3: What autonomy level is required?");
check(!!answers.q4_future_live_effect, "answers Q4: What would happen if this action became live?");
check(!!answers.q5_owner_token_required, "answers Q5: Which owner token would be required?");
check(!!answers.q6_connector_used, "answers Q6: Which connector would be used?");
check(!!answers.q7_risk_score, "answers Q7: What is the risk score?");
check(!!answers.q8_kill_switch_active, "answers Q8: Is the kill switch active?");
check(!!answers.q9_audit_trail, "answers Q9: What is the audit trail?");
check(!!answers.q10_pre_live_fixes, "answers Q10: What must be fixed before live mode can be enabled?");

// Overview checks
check(payload.gateway_overview.live_actions_enabled === false, "gateway_overview: live_actions_enabled is false");
check(payload.gateway_overview.emergency_stop === true, "gateway_overview: emergency_stop is true");
check(payload.gateway_overview.demo_badge === "DEMO / SIMULATION", "gateway_overview: demo_badge is correct");
check(payload.gateway_overview.safety_note === "No real customers contacted. No real revenue. No real conversion.", "gateway_overview: safety_note is correct");

// Queue safety checks
const queue = payload.gateway_queue || {};
check(queue.total_eligible === 5, "queue lists 5 simulated actions");
const qSafetyLines = queue.safety_warning_lines || [];
check(qSafetyLines.includes("LIVE ACTION NOT ENABLED"), "queue safety: LIVE ACTION NOT ENABLED");
check(qSafetyLines.includes("DRY RUN ONLY"), "queue safety: DRY RUN ONLY");
check(qSafetyLines.includes("NO REAL CUSTOMER CONTACT"), "queue safety: NO REAL CUSTOMER CONTACT");
check(qSafetyLines.includes("NO CRM UPDATE"), "queue safety: NO CRM UPDATE");
check(qSafetyLines.includes("NO PAYMENT REQUEST"), "queue safety: NO PAYMENT REQUEST");
check(qSafetyLines.includes("OWNER TOKEN REQUIRED FOR FUTURE LIVE MODE"), "queue safety: OWNER TOKEN REQUIRED FOR FUTURE LIVE MODE");
check(qSafetyLines.includes("KILL SWITCH ACTIVE"), "queue safety: KILL SWITCH ACTIVE");

for (const item of queue.items) {
  check(item.target.startsWith("[DEMO]"), `item target ${item.target} is prefixed with [DEMO]`);
  check(item.demo_badge === "DEMO / SIMULATION", `item ${item.action_id} demo_badge is correct`);
  check(item.safety_note === "No real customers contacted. No real revenue. No real conversion.", `item ${item.action_id} safety_note is correct`);
  check(item.allowed_or_blocked === "BLOCKED", `item ${item.action_id} is marked BLOCKED`);
  check(!!item.block_reason, `item ${item.action_id} has block reason: ${item.block_reason}`);
  check(item.risk_score >= 10 && item.risk_score <= 100, `item ${item.action_id} has valid risk score: ${item.risk_score}`);

  // Safety wording on attestation
  const att = item.safety_attestation || "";
  check(att.includes("LIVE ACTION NOT ENABLED"), `item ${item.action_id} attestation includes LIVE ACTION NOT ENABLED`);
  check(att.includes("DRY RUN ONLY"), `item ${item.action_id} attestation includes DRY RUN ONLY`);
  check(att.includes("NO REAL CUSTOMER CONTACT"), `item ${item.action_id} attestation includes NO REAL CUSTOMER CONTACT`);
  check(att.includes("NO CRM UPDATE"), `item ${item.action_id} attestation includes NO CRM UPDATE`);
  check(att.includes("NO PAYMENT REQUEST"), `item ${item.action_id} attestation includes NO PAYMENT REQUEST`);
  check(att.includes("OWNER TOKEN REQUIRED FOR FUTURE LIVE MODE"), `item ${item.action_id} attestation includes OWNER TOKEN REQUIRED FOR FUTURE LIVE MODE`);
  check(att.includes("KILL SWITCH ACTIVE"), `item ${item.action_id} attestation includes KILL SWITCH ACTIVE`);

  const itemLines = item.safety_warning_lines || [];
  check(itemLines.includes("LIVE ACTION NOT ENABLED"), `item ${item.action_id} lines includes LIVE ACTION NOT ENABLED`);
  check(itemLines.includes("DRY RUN ONLY"), `item ${item.action_id} lines includes DRY RUN ONLY`);
  check(itemLines.includes("NO REAL CUSTOMER CONTACT"), `item ${item.action_id} lines includes NO REAL CUSTOMER CONTACT`);
  check(itemLines.includes("NO CRM UPDATE"), `item ${item.action_id} lines includes NO CRM UPDATE`);
  check(itemLines.includes("NO PAYMENT REQUEST"), `item ${item.action_id} lines includes NO PAYMENT REQUEST`);
  check(itemLines.includes("OWNER TOKEN REQUIRED FOR FUTURE LIVE MODE"), `item ${item.action_id} lines includes OWNER TOKEN REQUIRED FOR FUTURE LIVE MODE`);
  check(itemLines.includes("KILL SWITCH ACTIVE"), `item ${item.action_id} lines includes KILL SWITCH ACTIVE`);
}

// Connectors checks
const connData = payload.gateway_connectors || {};
check(connData.connectors.length === 4, "connectors status lists 4 connectors");
for (const c of connData.connectors) {
  check(c.is_mock === true, `connector ${c.connector_id} has is_mock = true`);
}

// Kill Switch checks
const ks = payload.gateway_kill_switch || {};
check(ks.live_actions_enabled === false, "kill switch: live_actions_enabled is false");
check(ks.emergency_stop === true, "kill switch: emergency_stop is true");
check(ks.max_daily_messages === 0, "kill switch: max_daily_messages is 0");
check(ks.max_daily_crm_writes === 0, "kill switch: max_daily_crm_writes is 0");
check(ks.max_daily_payment_requests === 0, "kill switch: max_daily_payment_requests is 0");
check(ks.allowed_channels.length === 0, "kill switch: allowed_channels is empty");
check(ks.allowed_connectors.length === 0, "kill switch: allowed_connectors is empty");
check(ks.live_mode_requires_owner_token === true, "kill switch: live_mode_requires_owner_token is true");

// 5. Script safety checks (no fetch, axios, sendMail, Date.now, Math.random, process.env, new Date, crypto)
const scripts = [
  "scripts/ai-company-run-live-action-gateway-mission.mjs",
  "scripts/ai-company-live-action-gateway-auto-loop.mjs",
  "scripts/ai-company-live-action-gateway-premerge-simulate.mjs"
];

const forbiddenKeywords = ["fetch(", "axios", "sendMail", "Date.now()", "Math.random()", "process.env.", "new Date()", "crypto.randomUUID"];

for (const s of scripts) {
  const sPath = path.join(ROOT, s);
  if (fs.existsSync(sPath)) {
    const src = fs.readFileSync(sPath, "utf8");
    for (const keyword of forbiddenKeywords) {
      if (src.includes(keyword)) {
        console.error(`❌ FAILED: Script ${s} contains forbidden keyword: ${keyword}`);
        process.exit(1);
      }
    }
  }
}
console.log("✅ passed: No forbidden keywords in runner/auto-loop/premerge scripts");

// 6. Reports existence
check(fs.existsSync(path.join(ROOT, "reports/owner-approval-workbench/daily-live-action-gateway-payload.json")), "reports/owner-approval-workbench/daily-live-action-gateway-payload.json exists for Paperclip");

console.log("\n==================================================");
console.log("Phase 1.0R Verification Summary: All passed!");
console.log("Phase 1.0R verification PASSED!");
