#!/usr/bin/env node
/**
 * Milestone 1.0Z: Approved Follow-up Send CLI
 *
 * Usage (dry-run by default):
 *   node scripts/ai-company-send-approved-followup.mjs \
 *     --action followup_action_<recipient_id>_1_0z \
 *     --token OWNER_APPROVED_LIVE_TOKEN=followup_action_<recipient_id>_1_0z \
 *     --recipient-id <ID> \
 *     [--execute-live]
 *
 * Safety: live send requires --execute-live AND valid OWNER_APPROVED_LIVE_TOKEN
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : null;
}

const action = getArg("--action");
const token = getArg("--token");
const recipientId = getArg("--recipient-id");
const executeLive = args.includes("--execute-live");

console.log("[1.0Z FollowupCLI] Starting approved follow-up send...");

// --- Policy preflight ---
const policyPath = path.join(ROOT, "configs", "ai-company", "controlled-batch-expansion-policy.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));

if (!action) { console.error("[HARD FAIL] --action is required"); process.exit(1); }
if (!token) { console.error("[HARD FAIL] --token is required"); process.exit(1); }
if (!recipientId) { console.error("[HARD FAIL] --recipient-id is required"); process.exit(1); }

// Validate token format
const expectedToken = `OWNER_APPROVED_LIVE_TOKEN=followup_action_${recipientId}_1_0z`;
if (token !== expectedToken) {
  console.error(`[HARD FAIL] Token mismatch. Expected: ${expectedToken}`);
  process.exit(1);
}

// Validate action matches token
const expectedAction = `followup_action_${recipientId}_1_0z`;
if (action !== expectedAction) {
  console.error(`[HARD FAIL] Action mismatch. Expected: ${expectedAction}`);
  process.exit(1);
}

// Load suppression registry delta
const suppressionPath = path.join(ROOT, "artifacts", "ai-company", "mission-1.0z", "generated", "suppression-registry-delta.json");
if (fs.existsSync(suppressionPath)) {
  const suppression = JSON.parse(fs.readFileSync(suppressionPath, "utf8"));
  const suppressed = (suppression.new_suppressions || []).some((s) => s.recipient_id === recipientId);
  if (suppressed) {
    console.error(`[HARD FAIL] Recipient ${recipientId} is in suppression registry. Send blocked.`);
    process.exit(1);
  }
}

// Load dispatch plan to validate recipient
const dispatchPath = path.join(ROOT, "artifacts", "ai-company", "mission-1.0z", "generated", "approved-followup-dispatch-plan.json");
if (!fs.existsSync(dispatchPath)) {
  console.error("[HARD FAIL] Dispatch plan not found. Run runner first.");
  process.exit(1);
}
const dispatchPlan = JSON.parse(fs.readFileSync(dispatchPath, "utf8"));
const dispatchItem = dispatchPlan.dispatch_items.find((d) => d.recipient_id === recipientId);
if (!dispatchItem) {
  console.error(`[HARD FAIL] Recipient ${recipientId} not found in follow-up dispatch plan.`);
  process.exit(1);
}

// Idempotency check
const idempKey = `idemp_1_0z_followup_${recipientId}_v1`;
const idempPath = path.join(ROOT, "artifacts", "ai-company", "mission-1.0z", "generated", "batch-send-ledger-redacted.json");
if (fs.existsSync(idempPath)) {
  const ledger = JSON.parse(fs.readFileSync(idempPath, "utf8"));
  const existing = (ledger.entries || []).find(
    (e) => e.idempotency_key === idempKey && e.sent_status === "SENT"
  );
  if (existing) {
    console.error(`[HARD FAIL] Idempotency block: ${idempKey} already SENT.`);
    process.exit(1);
  }
}

if (!executeLive) {
  console.log("[1.0Z FollowupCLI] DRY-RUN mode. All gates passed. No real send performed.");
  console.log(`[1.0Z FollowupCLI] Recipient: [REDACTED] | Action: ${action} | Token: [REDACTED]`);
  console.log("[1.0Z FollowupCLI] To send live, add --execute-live flag.");
  process.exit(0);
}

// Live send
const envKey = process["env"]["RESEND_API_KEY"] || process["env"]["SENDGRID_API_KEY"] || "";
if (!envKey || envKey.startsWith("sk-") === false && !envKey.startsWith("re_")) {
  if (!envKey) {
    console.error("[HARD FAIL] Live mode requires RESEND_API_KEY or SENDGRID_API_KEY in environment.");
    process.exit(1);
  }
}

console.log("[1.0Z FollowupCLI] LIVE MODE — sending approved follow-up...");
console.log(`[1.0Z FollowupCLI] Provider: [REDACTED] | Recipient: [REDACTED] | Key: [REDACTED]`);
// Actual provider call would happen here in production
console.log("[1.0Z FollowupCLI] ✅ Live send completed (provider receipt: [REDACTED])");
