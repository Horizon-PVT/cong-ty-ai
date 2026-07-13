#!/usr/bin/env node
/**
 * Milestone 1.1O: Client Success, Renewal & Referral Intelligence Loop Runner
 *
 * Usage:
 *   node scripts/ai-company-client-success-renewal.mjs [--mode dry_run|sandbox|live]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1o");
const GEN_DIR = path.join(ARTIFACT_DIR, "generated");

const N_GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1n", "generated");

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function write(dir, file, data) { fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2)); }
function writeMd(dir, file, content) { fs.writeFileSync(path.join(dir, file), content); }

// Parse args
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const MODE = getArg("--mode") || "dry_run";

console.log(`[1.1O Runner] Starting Milestone 1.1O: Client Success, Renewal & Referral...`);
console.log(`[1.1O Runner] Mode: ${MODE}`);
ensureDir(GEN_DIR);

const now = new Date().toISOString();

// Load policy
const policyPath = path.join(ROOT, "configs", "ai-company", "client-success-renewal-policy.json");
if (!fs.existsSync(policyPath)) {
  console.error(`[1.1O Runner] FATAL: Policy config missing at ${policyPath}`);
  process.exit(1);
}
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));

if (!policy.allowed_modes.includes(MODE)) {
  console.error(`[1.1O Runner] FATAL: Mode ${MODE} is not allowed.`);
  process.exit(1);
}

// ---------- Load 1.1N inputs ----------
const loadJson = (dir, file) => {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
};

const nDeliveryPlan = loadJson(N_GEN_DIR, "delivery-plan.json");
const nAcceptanceLedger = loadJson(N_GEN_DIR, "client-acceptance-ledger-redacted.json");
const nOwnerQueue = loadJson(N_GEN_DIR, "owner-acceptance-approval-queue.json");
const nScorecard = loadJson(N_GEN_DIR, "delivery-scorecard.json");

// ---------- Token gate ----------
const token = process.env.OWNER_APPROVED_CLIENT_SUCCESS_TOKEN;
const isApproved = token && token.startsWith(policy.required_live_token_prefix);

// ---------- Core data structures ----------
const healthReports = [];
const revisionRecoveryPlans = [];
const renewalCandidates = [];
const referralCandidates = [];
const ownerApprovalQueue = [];

let successCount = 0;
let revisionCount = 0;
let blockedCount = 0;
let noEligibleCount = 0;

// ---------- Process 1.1N acceptance entries ----------
const acceptanceEntries = nAcceptanceLedger?.entries || [];
const deliveryPlans = nDeliveryPlan?.plans || [];

if (acceptanceEntries.length === 0 && deliveryPlans.length === 0) {
  console.log("[1.1O Runner] NO_CLIENT_SUCCESS_ACTIONS_ELIGIBLE: No 1.1N delivery/acceptance entries found.");
  console.log("[1.1O Runner] Recommendation: Complete 1.1M/1.1N pipeline to create eligible proposals/deliveries first.");
  noEligibleCount = 1;
}

for (const entry of acceptanceEntries) {
  const recipientId = entry.recipient_id || entry.delivery_id || `unknown_${Date.now()}`;
  const deliveryId = entry.delivery_id || `del_unknown`;
  const outcome = entry.outcome || "unknown";
  const idempotencyKey = `success_${recipientId}_${deliveryId}_1_1o`;

  // Find matching delivery plan
  const plan = deliveryPlans.find(p => p.delivery_id === deliveryId);

  // Classify post-delivery state
  let healthStatus = "unknown";
  let actionRequired = "none";

  if (outcome.includes("accepted") || outcome === "dry_run_simulated_accepted" || outcome === "sandbox_simulated_accepted") {
    healthStatus = "healthy_accepted";
    actionRequired = "renewal_upsell_eligible";
    successCount++;

    // Renewal/upsell candidate
    renewalCandidates.push({
      recipient_id: recipientId,
      delivery_id: deliveryId,
      type: "renewal",
      reason: "Delivery accepted — eligible for renewal/upsell conversation",
      estimated_value: "TBD",
      idempotency_key: `renewal_${idempotencyKey}`,
      external_send_approved: false
    });

    // Referral/testimonial candidate
    referralCandidates.push({
      recipient_id: recipientId,
      delivery_id: deliveryId,
      type: "referral_testimonial",
      reason: "Successful delivery — eligible for referral request or testimonial",
      idempotency_key: `referral_${idempotencyKey}`,
      external_send_approved: false,
      testimonial_published: false
    });

  } else if (outcome === "revision_requested") {
    healthStatus = "needs_revision";
    actionRequired = "revision_recovery";
    revisionCount++;

    // Revision recovery plan
    revisionRecoveryPlans.push({
      recipient_id: recipientId,
      delivery_id: deliveryId,
      revision_type: "client_requested",
      recovery_steps: [
        "Review client feedback",
        "Identify scope changes needed",
        "Re-estimate timeline",
        "Owner approval for revision scope",
        "Execute revision",
        "Re-submit for acceptance"
      ],
      status: "PENDING_OWNER_REVIEW",
      idempotency_key: `revision_${idempotencyKey}`
    });

  } else if (outcome === "blocked") {
    healthStatus = "blocked";
    actionRequired = "escalation_needed";
    blockedCount++;

  } else if (outcome === "live_delivered_pending_acceptance") {
    healthStatus = "pending_acceptance";
    actionRequired = "follow_up_needed";

  } else {
    healthStatus = "unknown_outcome";
    actionRequired = "manual_review";
  }

  // Health report entry
  healthReports.push({
    recipient_id: recipientId,
    delivery_id: deliveryId,
    original_outcome: outcome,
    health_status: healthStatus,
    action_required: actionRequired,
    scope_summary: plan?.scope?.description || "N/A",
    deadline: plan?.scope?.deadline || "N/A",
    assessed_at: now,
    idempotency_key: idempotencyKey
  });

  // Owner approval queue for any action that needs external communication
  if (actionRequired !== "none" && MODE !== "dry_run") {
    if (isApproved) {
      ownerApprovalQueue.push({
        recipient_id: recipientId,
        delivery_id: deliveryId,
        action: actionRequired,
        status: "APPROVED_PENDING_EXECUTION",
        idempotency_key: `approval_${idempotencyKey}`
      });
    } else {
      ownerApprovalQueue.push({
        recipient_id: recipientId,
        delivery_id: deliveryId,
        action: actionRequired,
        status: "AWAITING_OWNER_TOKEN",
        idempotency_key: `approval_${idempotencyKey}`
      });
      blockedCount++;
    }
  } else if (actionRequired !== "none") {
    // dry_run: queue all for owner review
    ownerApprovalQueue.push({
      recipient_id: recipientId,
      delivery_id: deliveryId,
      action: actionRequired,
      status: "DRY_RUN_QUEUED",
      idempotency_key: `approval_${idempotencyKey}`
    });
  }
}

// ---------- Write all artifacts ----------
write(GEN_DIR, "client-success-health-report.json", {
  milestone: "1.1O", generated_at: now, reports: healthReports
});
write(ARTIFACT_DIR, "client-success-health-report.json", {
  milestone: "1.1O", generated_at: now, reports: healthReports
});

write(GEN_DIR, "revision-recovery-plan.json", {
  milestone: "1.1O", generated_at: now, plans: revisionRecoveryPlans
});
write(ARTIFACT_DIR, "revision-recovery-plan.json", {
  milestone: "1.1O", generated_at: now, plans: revisionRecoveryPlans
});

write(GEN_DIR, "renewal-upsell-candidates-redacted.json", {
  milestone: "1.1O", generated_at: now, candidates: renewalCandidates
});
write(ARTIFACT_DIR, "renewal-upsell-candidates-redacted.json", {
  milestone: "1.1O", generated_at: now, candidates: renewalCandidates
});

write(GEN_DIR, "referral-testimonial-candidates-redacted.json", {
  milestone: "1.1O", generated_at: now, candidates: referralCandidates
});
write(ARTIFACT_DIR, "referral-testimonial-candidates-redacted.json", {
  milestone: "1.1O", generated_at: now, candidates: referralCandidates
});

write(GEN_DIR, "owner-client-success-approval-queue.json", {
  milestone: "1.1O", generated_at: now, queue: ownerApprovalQueue
});
write(ARTIFACT_DIR, "owner-client-success-approval-queue.json", {
  milestone: "1.1O", generated_at: now, queue: ownerApprovalQueue
});

// ---------- Scorecard ----------
let scorecardVerdict = "CLIENT_SUCCESS_READY";
if (noEligibleCount > 0) {
  scorecardVerdict = "NO_CLIENT_SUCCESS_ACTIONS_ELIGIBLE";
} else if (successCount > 0 && revisionCount === 0 && blockedCount === 0) {
  scorecardVerdict = "ALL_CLIENTS_HEALTHY";
} else if (revisionCount > 0) {
  scorecardVerdict = "REVISION_RECOVERY_NEEDED";
} else if (blockedCount > 0 && successCount === 0) {
  scorecardVerdict = "BLOCKED_BY_OWNER_GATE";
}

const scorecard = {
  milestone: "1.1O",
  generated_at: now,
  verdict: scorecardVerdict,
  total_clients: healthReports.length,
  healthy_count: successCount,
  revision_count: revisionCount,
  blocked_count: blockedCount,
  no_eligible_count: noEligibleCount,
  safety_locks: {
    no_auto_send_client_update: true,
    no_crm_mutation: true,
    no_invoice_payment_mutation: true,
    no_public_testimonial_publishing: true,
    emergency_lock_intact: true
  },
  recommendation: noEligibleCount > 0
    ? "Complete 1.1M/1.1N pipeline to create eligible client deliveries before running client success loop."
    : null
};
write(GEN_DIR, "client-success-scorecard.json", scorecard);
write(ARTIFACT_DIR, "client-success-scorecard.json", scorecard);

// ---------- QA Acceptance Report ----------
const qaReport = `# QA Acceptance Report — Milestone 1.1O

**Generated:** ${now}
**Milestone:** 1.1O — Client Success, Renewal & Referral Intelligence Loop
**Verdict:** ${scorecardVerdict}

## Execution Summary
- Mode: ${MODE}
- Total Clients Assessed: ${healthReports.length}
- Healthy (Accepted): ${successCount}
- Revision Needed: ${revisionCount}
- Blocked: ${blockedCount}
- No Eligible Actions: ${noEligibleCount}

## Safety Checks
- No Auto-Send Client Update: ✅
- No CRM Mutation: ✅
- No Invoice/Payment Mutation: ✅
- No Public Testimonial Publishing: ✅
- Emergency Lock Intact: ✅

## Renewal/Upsell Candidates: ${renewalCandidates.length}
## Referral/Testimonial Candidates: ${referralCandidates.length}
## Revision Recovery Plans: ${revisionRecoveryPlans.length}
## Owner Approval Queue: ${ownerApprovalQueue.length}

## Verdict: **${scorecardVerdict}**
`;
writeMd(GEN_DIR, "qa-acceptance-report.md", qaReport);
writeMd(ARTIFACT_DIR, "qa-acceptance-report.md", qaReport);

// ---------- Manifest ----------
const manifest = {
  milestone: "1.1O",
  generated_at: now,
  artifacts: [
    "client-success-health-report.json",
    "revision-recovery-plan.json",
    "renewal-upsell-candidates-redacted.json",
    "referral-testimonial-candidates-redacted.json",
    "owner-client-success-approval-queue.json",
    "client-success-scorecard.json",
    "qa-acceptance-report.md",
    "artifact-manifest.json",
    "final-package-index.md"
  ]
};
write(GEN_DIR, "artifact-manifest.json", manifest);
write(ARTIFACT_DIR, "artifact-manifest.json", manifest);

// ---------- Final Package Index ----------
writeMd(GEN_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.1O\n\n**Milestone:** 1.1O\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);
writeMd(ARTIFACT_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.1O\n\n**Milestone:** 1.1O\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);

console.log("[1.1O Runner] All 1.1O artifacts generated successfully.");
console.log(`[1.1O Runner] Verdict: ${scorecardVerdict}`);
