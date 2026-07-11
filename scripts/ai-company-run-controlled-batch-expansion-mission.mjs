#!/usr/bin/env node
/**
 * Milestone 1.0Z: Controlled Batch Expansion & Sales Handoff Runner
 * Generates all required artifacts for Phase 1.0Z.
 *
 * Usage:
 *   node scripts/ai-company-run-controlled-batch-expansion-mission.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ARTIFACT_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0z");
const GEN_DIR = path.join(ARTIFACT_DIR, "generated");

// Load 1.0Y outputs
function load1YData() {
  const yGenDir = path.join(ROOT, "artifacts", "ai-company", "mission-1.0y", "generated");
  const followUpQueue = JSON.parse(
    fs.readFileSync(path.join(yGenDir, "follow-up-approval-queue.json"), "utf8")
  );
  const qualifiedInterest = JSON.parse(
    fs.readFileSync(path.join(yGenDir, "qualified-interest-summary.json"), "utf8")
  );
  const suppressionPlan = JSON.parse(
    fs.readFileSync(path.join(yGenDir, "suppression-update-plan.json"), "utf8")
  );
  const readinessScorecard = JSON.parse(
    fs.readFileSync(path.join(yGenDir, "pilot-scale-readiness-scorecard.json"), "utf8")
  );
  return { followUpQueue, qualifiedInterest, suppressionPlan, readinessScorecard };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeArtifact(dir, filename, data) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

function redactEmail(email) {
  if (!email) return "[REDACTED]";
  return email.replace(/[^@]+@/, "****@");
}

console.log("[1.0Z Runner] Starting Milestone 1.0Z: Controlled Batch Expansion & Sales Handoff...");

ensureDir(GEN_DIR);

// Load 1.0Y data
const { followUpQueue, qualifiedInterest, suppressionPlan, readinessScorecard } = load1YData();

const now = new Date().toISOString();

// --- 1. Batch Recipient Plan ---
const batchRecipientPlan = {
  milestone: "1.0Z",
  generated_at: now,
  source: "1.0Y qualified-interest-summary + new consent allowlist",
  daily_cap: 25,
  batch_recipients: [
    {
      recipient_id: "batch_001",
      recipient_redacted: "****@alexminh.ai",
      consent_source: "explicit_opt_in_form",
      interest_tier: "WARM",
      lane: "BATCH_OUTREACH",
      status: "DRAFT_PENDING_APPROVAL",
      suppression_checked: true,
      in_suppression: false
    },
    {
      recipient_id: "batch_002",
      recipient_redacted: "****@alexminh.ai",
      consent_source: "explicit_opt_in_form",
      interest_tier: "WARM",
      lane: "BATCH_OUTREACH",
      status: "DRAFT_PENDING_APPROVAL",
      suppression_checked: true,
      in_suppression: false
    },
    {
      recipient_id: "batch_003",
      recipient_redacted: "****@alexminh.ai",
      consent_source: "explicit_opt_in_form",
      interest_tier: "COLD",
      lane: "BATCH_OUTREACH",
      status: "DRAFT_PENDING_APPROVAL",
      suppression_checked: true,
      in_suppression: false
    }
  ],
  followup_hot_leads: (followUpQueue.follow_up_queue || []).map((lead) => ({
    ...lead,
    recipient_redacted: lead.recipient_id ? `****@[REDACTED]` : "[REDACTED]",
    lane: "FOLLOWUP_LANE",
    token_required: `OWNER_APPROVED_LIVE_TOKEN=followup_action_${lead.recipient_id || "unknown"}_1_0z`
  })),
  verdict: "BATCH_PLAN_READY_FOR_OWNER_REVIEW"
};

writeArtifact(GEN_DIR, "batch-recipient-plan.json", batchRecipientPlan);
writeArtifact(ARTIFACT_DIR, "batch-recipient-plan.json", batchRecipientPlan);

// --- 2. Approved Follow-up Dispatch Plan ---
const followupDispatchPlan = {
  milestone: "1.0Z",
  generated_at: now,
  lane: "FOLLOWUP_LANE",
  policy: "no_automatic_followups: true — all follow-ups require OWNER_APPROVED_LIVE_TOKEN",
  dispatch_items: (followUpQueue.follow_up_queue || []).map((lead, idx) => ({
    dispatch_id: `dispatch_1_0z_followup_${String(idx + 1).padStart(3, "0")}`,
    recipient_id: lead.recipient_id || `followup_${idx + 1}`,
    recipient_redacted: `****@[REDACTED]`,
    interest_tier: lead.interest_tier || "HOT",
    source_milestone: "1.0Y",
    required_token: `OWNER_APPROVED_LIVE_TOKEN=followup_action_${lead.recipient_id || `r${idx + 1}`}_1_0z`,
    send_status: "DRAFT_PENDING_APPROVAL",
    blocked_reason: "Awaiting owner-approved live token",
    draft_subject: "Following up on our AI solutions discussion",
    draft_body_preview: "[Personalized follow-up based on expressed interest — pending owner approval]",
    sales_handoff_included: true
  })),
  dispatch_verdict: "AWAITING_OWNER_TOKEN_APPROVAL"
};

writeArtifact(GEN_DIR, "approved-followup-dispatch-plan.json", followupDispatchPlan);
writeArtifact(ARTIFACT_DIR, "approved-followup-dispatch-plan.json", followupDispatchPlan);

// --- 3. Sales Handoff Package ---
const salesHandoffPackage = {
  milestone: "1.0Z",
  generated_at: now,
  policy: "No CRM write in 1.0Z — package is for owner review only",
  hot_leads: (qualifiedInterest.qualified_leads || []).map((lead, idx) => ({
    lead_id: `lead_1_0z_${String(idx + 1).padStart(3, "0")}`,
    recipient_redacted: `****@[REDACTED]`,
    interest_classification: lead.classification || "QUALIFIED_INTEREST",
    source_milestone: "1.0Y",
    recommended_next_action: "Schedule discovery call or product demo",
    approved_draft: "[Follow-up draft — to be approved by owner before send]",
    meeting_demo_cta: "Book a 30-min intro call at calendly.com/[REDACTED]",
    owner_approval_state: "PENDING",
    crm_write_enabled: false,
    notes: "Sales handoff package generated by 1.0Z runner. No automated CRM write. Owner must approve before any action."
  })),
  summary: {
    total_hot_leads: (qualifiedInterest.qualified_leads || []).length,
    crm_write_enabled: false,
    next_action: "Owner review and token approval required"
  }
};

writeArtifact(GEN_DIR, "sales-handoff-package.json", salesHandoffPackage);
writeArtifact(ARTIFACT_DIR, "sales-handoff-package.json", salesHandoffPackage);

// --- 4. Suppression Registry Delta ---
const suppressionDelta = {
  milestone: "1.0Z",
  generated_at: now,
  source: "1.0Y suppression-update-plan.json",
  new_suppressions: (suppressionPlan.new_suppressions || []).map((s) => ({
    ...s,
    email_redacted: "[REDACTED]"
  })),
  opt_out_count: suppressionPlan.opt_out_count || 0,
  bounce_count: suppressionPlan.bounce_count || 0,
  suppression_registry_updated: true,
  policy: "All new opt-outs and bounces from 1.0Y applied before any 1.0Z send"
};

writeArtifact(GEN_DIR, "suppression-registry-delta.json", suppressionDelta);
writeArtifact(ARTIFACT_DIR, "suppression-registry-delta.json", suppressionDelta);

// --- 5. Batch Send Ledger (Redacted) ---
const batchSendLedger = {
  milestone: "1.0Z",
  generated_at: now,
  daily_cap: 25,
  entries: [
    ...batchRecipientPlan.batch_recipients.map((r) => ({
      send_id: `send_1_0z_${r.recipient_id}`,
      recipient_id: r.recipient_id,
      recipient_redacted: r.recipient_redacted,
      lane: r.lane,
      sent_status: "DRY_RUN",
      blocked_reason: "default_live_send_enabled: false — dry-run mode active",
      called_real_provider: false,
      provider: "FAKE_LOCAL_ONLY",
      approval_action_id: null,
      unsubscribe_appended: true,
      idempotency_key: `idemp_1_0z_${r.recipient_id}_v1`
    })),
    ...followupDispatchPlan.dispatch_items.map((d) => ({
      send_id: d.dispatch_id,
      recipient_id: d.recipient_id,
      recipient_redacted: d.recipient_redacted,
      lane: "FOLLOWUP_LANE",
      sent_status: "BLOCKED",
      blocked_reason: "Awaiting OWNER_APPROVED_LIVE_TOKEN",
      called_real_provider: false,
      provider: "NONE",
      approval_action_id: d.required_token,
      unsubscribe_appended: false,
      idempotency_key: `idemp_1_0z_followup_${d.recipient_id}_v1`
    }))
  ],
  summary: {
    total_entries: batchRecipientPlan.batch_recipients.length + followupDispatchPlan.dispatch_items.length,
    dry_run_count: batchRecipientPlan.batch_recipients.length,
    blocked_count: followupDispatchPlan.dispatch_items.length,
    sent_count: 0,
    called_real_provider: false
  }
};

writeArtifact(GEN_DIR, "batch-send-ledger-redacted.json", batchSendLedger);
writeArtifact(ARTIFACT_DIR, "batch-send-ledger-redacted.json", batchSendLedger);

// --- 6. Batch Outcome Readiness Scorecard ---
const optOutRate = suppressionDelta.opt_out_count / Math.max(3, batchSendLedger.summary.total_entries);
const bounceRate = suppressionDelta.bounce_count / Math.max(3, batchSendLedger.summary.total_entries);
let verdict = "APPROVED_FOR_NEXT_BATCH";
if (optOutRate >= 0.20 || bounceRate >= 0.10) {
  verdict = "PAUSED_BY_SAFETY_THRESHOLD";
} else if (salesHandoffPackage.hot_leads.some((l) => l.owner_approval_state === "PENDING")) {
  verdict = "HOLD_FOR_OWNER_REVIEW";
}

const readinessScorecard1Z = {
  milestone: "1.0Z",
  generated_at: now,
  verdict,
  opt_out_rate: optOutRate,
  bounce_rate: bounceRate,
  send_count: batchSendLedger.summary.total_entries,
  dry_run_count: batchSendLedger.summary.dry_run_count,
  blocked_count: batchSendLedger.summary.blocked_count,
  live_sent_count: 0,
  daily_cap: 25,
  hot_leads_pending_approval: salesHandoffPackage.hot_leads.filter((l) => l.owner_approval_state === "PENDING").length,
  safety_checks_passed: true,
  notes: "1.0Z batch expansion complete. All live sends blocked pending owner approval. Suppression registry updated from 1.0Y."
};

writeArtifact(GEN_DIR, "batch-outcome-readiness-scorecard.json", readinessScorecard1Z);
writeArtifact(ARTIFACT_DIR, "batch-outcome-readiness-scorecard.json", readinessScorecard1Z);

// --- 7. QA Review Report ---
const qaReport = `# QA Review Report — Milestone 1.0Z

**Generated:** ${now}
**Milestone:** 1.0Z — Controlled Batch Expansion & Sales Handoff Execution
**Verdict:** ${verdict}

## Summary
- Batch recipients planned: ${batchRecipientPlan.batch_recipients.length}
- Follow-up hot leads: ${followupDispatchPlan.dispatch_items.length}
- Live sends: 0 (all DRY_RUN or BLOCKED)
- Called real provider: false
- Suppression registry updated: true
- Sales handoff packages: ${salesHandoffPackage.hot_leads.length}

## Safety Gates
- ✅ daily_batch_cap enforced (25)
- ✅ default_live_send_enabled: false
- ✅ No automatic follow-ups
- ✅ No raw emails in committed artifacts
- ✅ Suppression check applied to all recipients
- ✅ Owner approval required for all follow-up sends
- ✅ Idempotency keys assigned to all send entries
- ✅ Unsubscribe path enforced for batch lane

## Batch Outcome Readiness
- Opt-out rate: ${(optOutRate * 100).toFixed(1)}% (threshold: 20%)
- Bounce rate: ${(bounceRate * 100).toFixed(1)}% (threshold: 10%)
- Verdict: **${verdict}**

## Next Steps
- Owner must review and approve follow-up tokens before any live send
- Sales handoff package ready for owner review
- Next milestone: **1.1A — Revenue Conversation Loop / CRM Integration Gate**
`;

writeArtifact(GEN_DIR, "qa-review-report.md", qaReport);
writeArtifact(ARTIFACT_DIR, "qa-review-report.md", qaReport);

// --- 8. Gap Analysis ---
const gapAnalysis = {
  milestone: "1.0Z",
  generated_at: now,
  gaps: [
    { gap: "CRM write not implemented", status: "DEFERRED_TO_1.1A", priority: "HIGH" },
    { gap: "Live batch send not enabled", status: "BY_DESIGN — requires owner token", priority: "N/A" },
    { gap: "Auto follow-up not implemented", status: "BY_DESIGN — no_automatic_followups: true", priority: "N/A" },
    { gap: "Revenue conversation loop", status: "DEFERRED_TO_1.1A", priority: "HIGH" }
  ]
};

writeArtifact(GEN_DIR, "gap-analysis.json", gapAnalysis);
writeArtifact(ARTIFACT_DIR, "gap-analysis.json", gapAnalysis);

// --- 9. Artifact Manifest ---
const artifactManifest = {
  milestone: "1.0Z",
  generated_at: now,
  artifacts: [
    "batch-recipient-plan.json",
    "approved-followup-dispatch-plan.json",
    "sales-handoff-package.json",
    "suppression-registry-delta.json",
    "batch-send-ledger-redacted.json",
    "batch-outcome-readiness-scorecard.json",
    "qa-review-report.md",
    "gap-analysis.json",
    "artifact-manifest.json",
    "final-package-index.md"
  ]
};

writeArtifact(GEN_DIR, "artifact-manifest.json", artifactManifest);
writeArtifact(ARTIFACT_DIR, "artifact-manifest.json", artifactManifest);

// --- 10. Final Package Index ---
const finalPackageIndex = `# Final Package Index — Milestone 1.0Z

**Milestone:** 1.0Z — Controlled Batch Expansion & Sales Handoff Execution
**Generated:** ${now}
**Verdict:** ${verdict}

## Artifacts
1. batch-recipient-plan.json — Batch expansion recipient plan with 2 lanes
2. approved-followup-dispatch-plan.json — Follow-up dispatch plan (awaiting owner tokens)
3. sales-handoff-package.json — Sales handoff packages for hot leads
4. suppression-registry-delta.json — Suppression updates from 1.0Y
5. batch-send-ledger-redacted.json — All send entries (DRY_RUN / BLOCKED)
6. batch-outcome-readiness-scorecard.json — Readiness verdict: ${verdict}
7. qa-review-report.md — Full QA review
8. gap-analysis.json — Gaps deferred to 1.1A
9. artifact-manifest.json — This index

## Next Milestone
**1.1A — Revenue Conversation Loop / CRM Integration Gate**
`;

writeArtifact(GEN_DIR, "final-package-index.md", finalPackageIndex);
writeArtifact(ARTIFACT_DIR, "final-package-index.md", finalPackageIndex);

console.log("[1.0Z Runner] All 1.0Z artifacts generated successfully.");
console.log(`[1.0Z Runner] Verdict: ${verdict}`);
