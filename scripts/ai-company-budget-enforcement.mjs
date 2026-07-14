#!/usr/bin/env node
/**
 * Milestone 1.3D: Budget Enforcement & Real Cost Control Validation
 *
 * Validates the budget enforcement engine:
 * - Hard-stop pauses agents/projects/companies
 * - Invocation blocking at all execution entry points
 * - Soft warning at configurable threshold
 * - Budget incidents with approval workflow
 * - Resolution actions (raise_budget_and_resume, dismiss)
 * - Subscription-included usage exemption
 * - Incident deduplication within budget windows
 * - Multi-scope hierarchy enforcement
 * - Cost event → evaluation → incident → pause cascade
 * - Preflight block returns actionable reason
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BudgetEnforcementService } from "./lib/security/budget-enforcement.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3d");
const GEN_DIR = path.join(ARTIFACT_DIR, "generated");

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function write(dir, file, data) { fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2)); }
function writeMd(dir, file, content) { fs.writeFileSync(path.join(dir, file), content); }

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const MODE = getArg("--mode") || "dry_run";

console.log(`[1.3D Runner] Starting Milestone 1.3D: Budget Enforcement & Real Cost Control...`);
console.log(`[1.3D Runner] Mode: ${MODE}`);
ensureDir(GEN_DIR);

const now = new Date().toISOString();
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "configs", "ai-company", "budget-enforcement-policy.json"), "utf8"));

if (MODE === "live") {
  const token = process.env.OWNER_APPROVED_BUDGET_ENFORCEMENT_TOKEN || "";
  if (!token.startsWith(policy.required_live_token_prefix)) {
    console.error(`[1.3D Runner] Security Gate: Missing or invalid OWNER_APPROVED_BUDGET_ENFORCEMENT_TOKEN.`);
    process.exit(1);
  }
}

const service = new BudgetEnforcementService(policy);
const events = [];
const checks = {};

function logResult(name, success, details) {
  checks[name] = success;
  events.push({ test_case: name, verdict: success ? "PASS" : "FAIL", timestamp: new Date().toISOString(), ...details });
  console.log(`[1.3D Runner] ${name}: ${success ? "✅ PASS" : "❌ FAIL"}${details.reason ? ` (${details.reason})` : ""}`);
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 1: Hard-stop pauses agent when spend exceeds budget
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "agent", scopeId: "agent_1", amountCents: 10000 });

  // Spend up to 100% (10000 cents = $100)
  service.recordCostEvent({ scopeType: "agent", scopeId: "agent_1", costCents: 9000 });
  const result = service.recordCostEvent({ scopeType: "agent", scopeId: "agent_1", costCents: 1500 });

  const isPaused = service.isPaused("agent", "agent_1");

  logResult("hard_stop_pauses_agent", result.status === "hard_stop" && result.paused && isPaused, {
    spend: result.spend,
    limit: result.limit,
    percent: result.percentUsed,
    is_paused: isPaused,
    reason: "agent paused when spend exceeded budget"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 2: getInvocationBlock blocks execution at all checkpoints
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "company", scopeId: "comp_a", amountCents: 50000 });

  // Trigger hard-stop on company
  service.recordCostEvent({ scopeType: "company", scopeId: "comp_a", costCents: 55000 });

  // Check all 4 invocation checkpoints
  const checkpoints = policy.invocation_block_checkpoints;
  let allBlocked = true;
  const results = {};

  for (const cp of checkpoints) {
    const block = service.checkInvocationAt(cp, "comp_a", "agent_x", "proj_1");
    results[cp] = block;
    if (block.allowed) allBlocked = false;
  }

  logResult("invocation_block_all_checkpoints", allBlocked && Object.keys(results).length === 4, {
    checkpoints_tested: Object.keys(results).length,
    all_blocked: allBlocked,
    blocked_by: results.heartbeat_dispatch?.blockedBy,
    reason: "all 4 invocation checkpoints blocked"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 3: Soft warning at 80% threshold
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "agent", scopeId: "agent_warn", amountCents: 10000, warnPercent: 80 });

  // Spend 8500 cents (85% > 80%)
  const result = service.recordCostEvent({ scopeType: "agent", scopeId: "agent_warn", costCents: 8500 });

  const hasWarning = result.status === "warning" && result.warning && result.warning.includes("BUDGET WARNING");
  const notPaused = !service.isPaused("agent", "agent_warn");

  logResult("soft_warning_at_threshold", hasWarning && notPaused, {
    percent_used: result.percentUsed,
    warning_triggered: hasWarning,
    still_running: notPaused,
    reason: "soft warning triggered at 85%, agent still running"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 4: Budget incident creates approval record
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "project", scopeId: "proj_1", amountCents: 5000 });

  const result = service.recordCostEvent({ scopeType: "project", scopeId: "proj_1", costCents: 6000 });

  const incident = result.incident;
  const hasIncident = !!incident && incident.thresholdType === "hard_stop" && incident.status === "open";
  const approvals = service.getApprovals(incident?.id);
  const hasApproval = approvals.length === 1 && approvals[0].approvalType === "budget_override_required" && approvals[0].status === "pending";

  logResult("incident_creates_approval", hasIncident && hasApproval, {
    incident_id: incident?.id,
    incident_status: incident?.status,
    approval_type: approvals[0]?.approvalType,
    approval_status: approvals[0]?.status,
    available_actions: approvals[0]?.availableActions,
    reason: "incident created with pending approval"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 5: raise_budget_and_resume restores execution
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "agent", scopeId: "agent_resume", amountCents: 10000 });

  // Trigger hard-stop
  service.recordCostEvent({ scopeType: "agent", scopeId: "agent_resume", costCents: 12000 });
  const pausedBefore = service.isPaused("agent", "agent_resume");
  const blockedBefore = service.getInvocationBlock("comp_a", "agent_resume").allowed === false;

  // Get incident
  const incidents = service.getIncidents("agent::agent_resume");
  const incidentId = incidents[0]?.id;

  // Resolve with raise_budget_and_resume
  const resolution = service.resolveIncident(incidentId, "raise_budget_and_resume", { newAmountCents: 20000 });

  const pausedAfter = service.isPaused("agent", "agent_resume");
  const blockedAfter = service.getInvocationBlock("comp_a", "agent_resume").allowed;
  const newPolicy = service.getPolicy("agent", "agent_resume");

  logResult("raise_and_resume_restores", pausedBefore && blockedBefore && !pausedAfter && blockedAfter && resolution.resumed && newPolicy.amountCents === 20000, {
    paused_before: pausedBefore,
    blocked_before: blockedBefore,
    paused_after: pausedAfter,
    can_invoke_after: blockedAfter,
    new_limit: newPolicy?.amountCents,
    reason: "budget raised to $200, scope resumed, invocations unblocked"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 6: dismiss keeps scope paused
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "agent", scopeId: "agent_dismiss", amountCents: 5000 });

  service.recordCostEvent({ scopeType: "agent", scopeId: "agent_dismiss", costCents: 6000 });
  const incidents = service.getIncidents("agent::agent_dismiss");
  const incidentId = incidents[0]?.id;

  const resolution = service.resolveIncident(incidentId, "dismiss");

  const stillPaused = service.isPaused("agent", "agent_dismiss");
  const stillBlocked = service.getInvocationBlock("comp_a", "agent_dismiss").allowed === false;

  logResult("dismiss_keeps_paused", !resolution.resumed && stillPaused && stillBlocked, {
    resumed: resolution.resumed,
    still_paused: stillPaused,
    still_blocked: stillBlocked,
    reason: "incident dismissed — scope remains paused"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 7: Subscription-included usage exempt from money budget
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "agent", scopeId: "agent_sub", amountCents: 1000 });

  // Record subscription-included cost (should NOT count)
  const subResult = service.recordCostEvent({
    scopeType: "agent",
    scopeId: "agent_sub",
    costCents: 5000,
    isSubscriptionIncluded: true
  });

  // Spend should still be 0
  const spend = service.getSpend("agent", "agent_sub");
  const notPaused = !service.isPaused("agent", "agent_sub");

  logResult("subscription_included_exempt", subResult.exempt && spend === 0 && notPaused, {
    exempt: subResult.exempt,
    spend_after: spend,
    not_paused: notPaused,
    reason: "subscription-included usage exempt from money budget"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 8: Incident deduplication within budget window
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "agent", scopeId: "agent_dedup", amountCents: 5000 });

  // Trigger hard-stop twice
  service.recordCostEvent({ scopeType: "agent", scopeId: "agent_dedup", costCents: 6000 });
  const secondResult = service.recordCostEvent({ scopeType: "agent", scopeId: "agent_dedup", costCents: 1000 });

  const incidents = service.getIncidents("agent::agent_dedup");
  const deduplicated = secondResult.incident?.deduplicated === true;

  logResult("incident_deduplication", incidents.length === 1 && deduplicated, {
    total_incidents: incidents.length,
    second_deduplicated: deduplicated,
    reason: "second cost event reused existing open incident"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 9: Multi-scope hierarchy enforcement (company blocks agent)
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "company", scopeId: "comp_hierarchy", amountCents: 100000 });
  service.createPolicy({ scopeType: "agent", scopeId: "agent_hierarchy", amountCents: 50000 });

  // Company budget exceeded (agent budget still OK)
  service.recordCostEvent({ scopeType: "company", scopeId: "comp_hierarchy", costCents: 110000 });

  // Agent invocation should be blocked because COMPANY is paused
  const block = service.getInvocationBlock("comp_hierarchy", "agent_hierarchy", "proj_1");

  const blockedByCompany = !block.allowed && block.blockedBy === "company::comp_hierarchy";
  const agentNotPaused = !service.isPaused("agent", "agent_hierarchy");

  logResult("multi_scope_hierarchy", blockedByCompany && agentNotPaused, {
    blocked: !block.allowed,
    blocked_by: block.blockedBy,
    agent_own_budget_ok: agentNotPaused,
    reason: "company budget blocks agent invocation even though agent budget is OK"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 10: Full cascade — cost event → evaluation → incident → pause
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createPolicy({ scopeType: "agent", scopeId: "agent_cascade", amountCents: 10000 });

  // Step 1: Below threshold — OK
  const step1 = service.recordCostEvent({ scopeType: "agent", scopeId: "agent_cascade", costCents: 5000 });

  // Step 2: Hit soft warning (80%)
  const step2 = service.recordCostEvent({ scopeType: "agent", scopeId: "agent_cascade", costCents: 3500 });

  // Step 3: Exceed hard limit
  const step3 = service.recordCostEvent({ scopeType: "agent", scopeId: "agent_cascade", costCents: 2000 });

  const cascadeCorrect =
    step1.status === "ok" &&
    step2.status === "warning" &&
    step3.status === "hard_stop" &&
    step3.paused === true &&
    step3.blocked === true &&
    step3.incident?.status === "open";

  logResult("full_cost_cascade", cascadeCorrect, {
    step1_status: step1.status,
    step2_status: step2.status,
    step3_status: step3.status,
    final_spend: step3.spend,
    final_paused: step3.paused,
    incident_created: !!step3.incident,
    reason: "ok → warning → hard_stop cascade correct"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Generate Artifacts
// ═══════════════════════════════════════════════════════════════════════
const allPassed = Object.values(checks).every(c => c === true);
const scorecardVerdict = allPassed ? "BUDGET_ENFORCEMENT_VERIFIED" : "FAILED_SAFE";

write(GEN_DIR, "budget-active-config.json", { schema_version: "1.3", milestone: "1.3D", generated_at: now, budget_policy: policy });
write(ARTIFACT_DIR, "budget-active-config.json", { schema_version: "1.3", milestone: "1.3D", generated_at: now, budget_policy: policy });

write(GEN_DIR, "budget-enforcement-events.json", { milestone: "1.3D", generated_at: now, total_tests: events.length, passed: events.filter(e => e.verdict === "PASS").length, failed: events.filter(e => e.verdict === "FAIL").length, events });
write(ARTIFACT_DIR, "budget-enforcement-events.json", { milestone: "1.3D", generated_at: now, total_tests: events.length, passed: events.filter(e => e.verdict === "PASS").length, failed: events.filter(e => e.verdict === "FAIL").length, events });

write(GEN_DIR, "budget-validation-details.json", { milestone: "1.3D", verdict: scorecardVerdict, generated_at: now, passed_cases: Object.values(checks).filter(c => c).length, failed_cases: Object.values(checks).filter(c => !c).length, test_coverage: checks });
write(ARTIFACT_DIR, "budget-validation-details.json", { milestone: "1.3D", verdict: scorecardVerdict, generated_at: now, passed_cases: Object.values(checks).filter(c => c).length, failed_cases: Object.values(checks).filter(c => !c).length, test_coverage: checks });

write(GEN_DIR, "budget-enforcement-scorecard.json", { milestone: "1.3D", generated_at: now, verdict: scorecardVerdict, budget_checks: checks });
write(ARTIFACT_DIR, "budget-enforcement-scorecard.json", { milestone: "1.3D", generated_at: now, verdict: scorecardVerdict, budget_checks: checks });

const qaReport = `# QA Acceptance Report — Milestone 1.3D\n\n**Generated:** ${now}\n**Milestone:** 1.3D — Budget Enforcement & Real Cost Control Validation\n**Verdict:** ${scorecardVerdict}\n\n## Test Results\n\n| # | Test Case | Result |\n|---|-----------|--------|\n${Object.entries(checks).map(([k, v], i) => `| ${i + 1} | ${k} | ${v ? "✅ PASS" : "❌ FAIL"} |`).join("\n")}\n\n## Verdict: **${scorecardVerdict}**\n`;
writeMd(GEN_DIR, "qa-acceptance-report.md", qaReport);
writeMd(ARTIFACT_DIR, "qa-acceptance-report.md", qaReport);

const manifest = { milestone: "1.3D", generated_at: now, artifacts: ["budget-active-config.json", "budget-enforcement-events.json", "budget-validation-details.json", "budget-enforcement-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"] };
write(GEN_DIR, "artifact-manifest.json", manifest);
write(ARTIFACT_DIR, "artifact-manifest.json", manifest);

writeMd(GEN_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.3D\n\n**Milestone:** 1.3D\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);
writeMd(ARTIFACT_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.3D\n\n**Milestone:** 1.3D\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);

console.log("[1.3D Runner] All 1.3D artifacts generated successfully.");
console.log(`[1.3D Runner] Verdict: ${scorecardVerdict}`);
if (!allPassed) process.exit(1);
