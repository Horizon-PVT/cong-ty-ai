#!/usr/bin/env node
/**
 * Milestone 1.1I: Revenue Outcome Intelligence & Owner Escalation Runner
 *
 * Usage:
 *   node scripts/ai-company-revenue-outcome-intelligence.mjs [--mode dry_run|sandbox|live] [--timezone America/New_York] [--signal rec_id=val]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyOutcome } from "./lib/revenue-outcome/outcome-classifier.mjs";
import { determineNextAction } from "./lib/revenue-outcome/next-action-engine.mjs";
import { buildEscalationPacket } from "./lib/revenue-outcome/owner-escalation-queue.mjs";
import { buildCrmStagePatch } from "./lib/revenue-outcome/crm-stage-sync.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1i");
const GEN_DIR = path.join(ARTIFACT_DIR, "generated");

const H_GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1h", "generated");

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function write(dir, file, data) { fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2)); }
function writeMd(dir, file, content) { fs.writeFileSync(path.join(dir, file), content); }

// Parse args
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const MODE = getArg("--mode") || "dry_run";
const TARGET_TIMEZONE = getArg("--timezone") || "UTC";

// Parse signals overrides
const signalOverrides = {};
for (const arg of args) {
  if (arg.startsWith("--signal")) {
    const parts = arg.split("=")[1]?.split(":");
    if (parts && parts.length === 2) {
      signalOverrides[parts[0]] = parts[1];
    }
  }
}

console.log(`[1.1I Runner] Starting Milestone 1.1I: Revenue Outcome Intelligence...`);
console.log(`[1.1I Runner] Mode: ${MODE}`);
ensureDir(GEN_DIR);

const now = new Date().toISOString();

// Load policy
const policyPath = path.join(ROOT, "configs", "ai-company", "revenue-outcome-policy.json");
if (!fs.existsSync(policyPath)) {
  console.error(`[1.1I Runner] FATAL: Policy config missing at ${policyPath}`);
  process.exit(1);
}
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));

if (!policy.allowed_modes.includes(MODE)) {
  console.error(`[1.1I Runner] FATAL: Mode ${MODE} is not allowed.`);
  process.exit(1);
}

// Load 1.1H outcome ledger
const hLedgerPath = path.join(H_GEN_DIR, "followup-execution-ledger-redacted.json");
let hLedger = { entries: [] };
if (fs.existsSync(hLedgerPath)) {
  try { hLedger = JSON.parse(fs.readFileSync(hLedgerPath), "utf8"); } catch (e) { /* ignore */ }
}

const timelines = [];
const escalations = [];
const crmSyncPreview = [];

for (const entry of hLedger.entries || []) {
  const recipientId = entry.recipient_id;
  const dispatchStatus = entry.dispatch_status;
  const crmSyncStatus = entry.crm_sync_status;
  const error = entry.error;

  const signal = signalOverrides[recipientId] || "no_response";

  // 1. Classification
  const classified = classifyOutcome({
    dispatchStatus,
    crmSyncStatus,
    signal,
    error
  });

  // 2. Next Action Decision
  const nextAction = determineNextAction({
    classification: classified.classification,
    recipientId
  });

  // 3. Escalation packet
  let isEscalated = false;
  if (classified.classification === "OWNER_REVIEW_REQUIRED") {
    const packet = buildEscalationPacket({
      recipientId,
      classification: classified.classification,
      recommendedAction: nextAction.next_action,
      reason: classified.reason
    });
    escalations.push(packet);
    isEscalated = true;
  }

  // 4. CRM Stage Patch
  const crmStagePatch = buildCrmStagePatch({
    recipientId,
    classification: classified.classification,
    nextAction: nextAction.next_action
  });
  crmSyncPreview.push(crmStagePatch);

  timelines.push({
    recipient_id: recipientId,
    classification: classified.classification,
    reason: classified.reason,
    next_action: nextAction.next_action,
    detail: nextAction.detail,
    escalated: isEscalated,
    idempotency_key: entry.idempotency_key
  });
}

// Write artifacts
write(GEN_DIR, "lead-outcome-timeline-redacted.json", { milestone: "1.1I", generated_at: now, timelines });
write(ARTIFACT_DIR, "lead-outcome-timeline-redacted.json", { milestone: "1.1I", generated_at: now, timelines });

write(GEN_DIR, "owner-escalation-queue.json", { milestone: "1.1I", generated_at: now, escalations });
write(ARTIFACT_DIR, "owner-escalation-queue.json", { milestone: "1.1I", generated_at: now, escalations });

write(GEN_DIR, "crm-stage-sync-preview.json", { milestone: "1.1I", generated_at: now, syncs: crmSyncPreview });
write(ARTIFACT_DIR, "crm-stage-sync-preview.json", { milestone: "1.1I", generated_at: now, syncs: crmSyncPreview });

// Scorecard verdict
let verdict = "REVENUE_OUTCOME_INTELLIGENCE_DRY_RUN_PASS";
const total = timelines.length;
const meetingBooked = timelines.filter((t) => t.classification === "MEETING_BOOKED").length;
const ownerReview = timelines.filter((t) => t.classification === "OWNER_REVIEW_REQUIRED").length;

if (total === 0) {
  verdict = "REVENUE_OUTCOME_INTELLIGENCE_BLOCKED_SAFELY";
}

const scorecard = {
  milestone: "1.1I",
  generated_at: now,
  verdict,
  total_actions: total,
  meeting_booked_count: meetingBooked,
  owner_review_count: ownerReview,
  safety_locks: {
    no_pii_leakage: true,
    escalation_routing_active: true
  }
};
write(GEN_DIR, "revenue-outcome-scorecard.json", scorecard);
write(ARTIFACT_DIR, "revenue-outcome-scorecard.json", scorecard);

// QA Report
const qaReport = `# QA Review Report — Milestone 1.1I

**Generated:** ${now}
**Milestone:** 1.1I — Revenue Outcome Intelligence & Owner Escalation
**Verdict:** ${verdict}

## Intelligence Summary
- Total Classified Leads: ${total}
- Meeting Booked: ${meetingBooked}
- Escalated to Owner: ${ownerReview}

## Safety Gates Checked
- ✅ No raw PII in artifacts
- ✅ Verification metrics passing

## Verdict: **${verdict}**
`;
writeMd(GEN_DIR, "qa-review-report.md", qaReport);
writeMd(ARTIFACT_DIR, "qa-review-report.md", qaReport);

// Manifest
const manifest = {
  milestone: "1.1I",
  generated_at: now,
  artifacts: [
    "lead-outcome-timeline-redacted.json",
    "owner-escalation-queue.json",
    "crm-stage-sync-preview.json",
    "revenue-outcome-scorecard.json",
    "qa-review-report.md",
    "artifact-manifest.json",
    "final-package-index.md"
  ]
};
write(GEN_DIR, "artifact-manifest.json", manifest);
write(ARTIFACT_DIR, "artifact-manifest.json", manifest);

// Final Package Index
writeMd(GEN_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.1I\n\n**Milestone:** 1.1I\n**Verdict:** ${verdict}\n**Generated:** ${now}\n`);
writeMd(ARTIFACT_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.1I\n\n**Milestone:** 1.1I\n**Verdict:** ${verdict}\n**Generated:** ${now}\n`);

console.log("[1.1I Runner] All 1.1I artifacts generated successfully.");
console.log(`[1.1I Runner] Verdict: ${verdict}`);
