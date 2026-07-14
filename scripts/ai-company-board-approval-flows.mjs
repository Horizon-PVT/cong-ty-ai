#!/usr/bin/env node
/**
 * Milestone 1.3F: Board Approval & Rejection Flows
 *
 * Validates:
 * - Owner can approve/reject agent hire requests
 * - Admin cannot approve hires (insufficient role)
 * - Pending approval blocks execution
 * - Approved status unblocks execution
 * - Rejected status keeps blocked
 * - Strategy proposals require owner
 * - Review gates can be approved by admin
 * - Expired approvals auto-reject
 * - Approval audit trail recorded
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BoardApprovalService } from "./lib/security/board-approval-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3f");
const GEN_DIR = path.join(ARTIFACT_DIR, "generated");

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function write(dir, file, data) { fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2)); }
function writeMd(dir, file, content) { fs.writeFileSync(path.join(dir, file), content); }

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const MODE = getArg("--mode") || "dry_run";

console.log(`[1.3F Runner] Starting Milestone 1.3F: Board Approval & Rejection Flows...`);
console.log(`[1.3F Runner] Mode: ${MODE}`);
ensureDir(GEN_DIR);

const now = new Date().toISOString();
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "configs", "ai-company", "board-approval-flows-policy.json"), "utf8"));

if (MODE === "live") {
  const token = process.env.OWNER_APPROVED_BOARD_FLOWS_TOKEN || "";
  if (!token.startsWith(policy.required_live_token_prefix)) {
    console.error("[1.3F Runner] Security Gate: Missing token."); process.exit(1);
  }
}

const service = new BoardApprovalService(policy);
const events = [];
const checks = {};

function logResult(name, success, details) {
  checks[name] = success;
  events.push({ test_case: name, verdict: success ? "PASS" : "FAIL", timestamp: new Date().toISOString(), ...details });
  console.log(`[1.3F Runner] ${name}: ${success ? "✅ PASS" : "❌ FAIL"}${details.reason ? ` (${details.reason})` : ""}`);
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 1: Owner can approve agent hire
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "hire_agent",
    requestedBy: "system", details: { agentName: "DevAgent-42" }
  });

  const result = service.resolveApproval(
    { role: "owner", userId: "owner_1", companyId: "comp_a" },
    approval.id, "approve_hire"
  );

  logResult("owner_approves_hire", result.status === 200 && result.approval.status === "approved" && result.executionUnblocked, {
    status: result.approval?.status,
    unblocked: result.executionUnblocked,
    reason: "owner approved hire, execution unblocked"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 2: Owner can reject agent hire
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "hire_agent", requestedBy: "system"
  });

  const result = service.resolveApproval(
    { role: "owner", userId: "owner_1", companyId: "comp_a" },
    approval.id, "reject_hire"
  );

  const stillBlocked = service.isBlocked(approval.scopeKey);

  logResult("owner_rejects_hire", result.status === 200 && result.approval.status === "rejected" && !result.executionUnblocked && stillBlocked, {
    status: result.approval?.status,
    still_blocked: stillBlocked,
    reason: "owner rejected hire, scope remains blocked"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 3: Admin cannot approve hire (insufficient role)
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "hire_agent", requestedBy: "system"
  });

  const result = service.resolveApproval(
    { role: "admin", userId: "admin_1", companyId: "comp_a" },
    approval.id, "approve_hire"
  );

  logResult("admin_cannot_approve_hire", result.status === 403, {
    response_status: result.status,
    required_roles: result.requiredRoles,
    reason: "admin blocked from hire approval (owner only)"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 4: Pending approval blocks execution
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "strategy_proposal",
    requestedBy: "agent_x", scopeKey: "strategy::q3_expansion"
  });

  const blocked = service.isBlocked("strategy::q3_expansion");
  const approvalStatus = service.getApproval(approval.id);

  logResult("pending_blocks_execution", blocked && approvalStatus.status === "pending", {
    is_blocked: blocked,
    approval_status: approvalStatus.status,
    reason: "pending approval blocks execution scope"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 5: Approved status unblocks execution
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "review_gate",
    requestedBy: "ci_system", scopeKey: "release::v1.3"
  });

  const blockedBefore = service.isBlocked("release::v1.3");

  service.resolveApproval(
    { role: "admin", userId: "admin_1", companyId: "comp_a" },
    approval.id, "approve_release"
  );

  const blockedAfter = service.isBlocked("release::v1.3");

  logResult("approved_unblocks_execution", blockedBefore && !blockedAfter, {
    blocked_before: blockedBefore,
    blocked_after: blockedAfter,
    reason: "approval unblocked execution"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 6: Rejected status keeps blocked
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "review_gate",
    requestedBy: "ci_system", scopeKey: "release::v1.3-rc2"
  });

  service.resolveApproval(
    { role: "admin", userId: "admin_1", companyId: "comp_a" },
    approval.id, "block_release"
  );

  const stillBlocked = service.isBlocked("release::v1.3-rc2");

  logResult("rejected_keeps_blocked", stillBlocked, {
    still_blocked: stillBlocked,
    reason: "rejection keeps scope blocked"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 7: Strategy proposal requires owner
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "strategy_proposal", requestedBy: "agent_planner"
  });

  const adminResult = service.resolveApproval(
    { role: "admin", userId: "admin_1", companyId: "comp_a" },
    approval.id, "approve_strategy"
  );

  const memberResult = service.resolveApproval(
    { role: "member", userId: "member_1", companyId: "comp_a" },
    approval.id, "approve_strategy"
  );

  const ownerResult = service.resolveApproval(
    { role: "owner", userId: "owner_1", companyId: "comp_a" },
    approval.id, "approve_strategy"
  );

  logResult("strategy_requires_owner", adminResult.status === 403 && memberResult.status === 403 && ownerResult.status === 200, {
    admin_status: adminResult.status,
    member_status: memberResult.status,
    owner_status: ownerResult.status,
    reason: "only owner can approve strategy proposals"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 8: Review gate admin can approve
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "review_gate", requestedBy: "ci"
  });

  const result = service.resolveApproval(
    { role: "admin", userId: "admin_qa", companyId: "comp_a" },
    approval.id, "approve_release"
  );

  logResult("review_gate_admin_approves", result.status === 200 && result.approval.status === "approved", {
    status: result.approval?.status,
    resolved_by: result.approval?.resolvedBy,
    reason: "admin can approve review gates"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 9: Expired approval auto-rejects
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "hire_agent",
    requestedBy: "system", expiresInMs: 1000
  });

  // Force-expire
  const expResult = service.forceExpire(approval.id);
  const afterExpire = service.getApproval(approval.id);
  const stillBlocked = service.isBlocked(approval.scopeKey);

  logResult("expired_auto_rejects", expResult.expired && afterExpire.status === "expired" && stillBlocked, {
    expired: expResult.expired,
    status: afterExpire.status,
    still_blocked: stillBlocked,
    reason: "expired approval auto-rejects, keeps blocked"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 10: Approval audit trail recorded
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  const approval = service.createApproval({
    companyId: "comp_a", approvalType: "hire_agent", requestedBy: "system"
  });

  service.resolveApproval(
    { role: "owner", userId: "owner_boss", companyId: "comp_a" },
    approval.id, "approve_hire"
  );

  const trail = service.getAuditTrail("comp_a");
  const hasCreate = trail.some(e => e.action === "approval_created");
  const hasApprove = trail.some(e => e.action === "approval_approved" && e.actor === "owner_boss");

  logResult("audit_trail_recorded", trail.length >= 2 && hasCreate && hasApprove, {
    trail_entries: trail.length,
    has_create: hasCreate,
    has_approve: hasApprove,
    reason: "create + approve events in audit trail"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Generate Artifacts
// ═══════════════════════════════════════════════════════════════════════
const allPassed = Object.values(checks).every(c => c === true);
const scorecardVerdict = allPassed ? "BOARD_APPROVAL_VERIFIED" : "FAILED_SAFE";

write(GEN_DIR, "board-approval-active-config.json", { schema_version: "1.3", milestone: "1.3F", generated_at: now, policy });
write(ARTIFACT_DIR, "board-approval-active-config.json", { schema_version: "1.3", milestone: "1.3F", generated_at: now, policy });

write(GEN_DIR, "board-approval-events.json", { milestone: "1.3F", generated_at: now, total_tests: events.length, passed: events.filter(e => e.verdict === "PASS").length, failed: events.filter(e => e.verdict === "FAIL").length, events });
write(ARTIFACT_DIR, "board-approval-events.json", { milestone: "1.3F", generated_at: now, total_tests: events.length, passed: events.filter(e => e.verdict === "PASS").length, failed: events.filter(e => e.verdict === "FAIL").length, events });

write(GEN_DIR, "board-approval-validation-details.json", { milestone: "1.3F", verdict: scorecardVerdict, generated_at: now, passed_cases: Object.values(checks).filter(c => c).length, failed_cases: Object.values(checks).filter(c => !c).length, test_coverage: checks });
write(ARTIFACT_DIR, "board-approval-validation-details.json", { milestone: "1.3F", verdict: scorecardVerdict, generated_at: now, passed_cases: Object.values(checks).filter(c => c).length, failed_cases: Object.values(checks).filter(c => !c).length, test_coverage: checks });

write(GEN_DIR, "board-approval-scorecard.json", { milestone: "1.3F", generated_at: now, verdict: scorecardVerdict, board_approval_checks: checks });
write(ARTIFACT_DIR, "board-approval-scorecard.json", { milestone: "1.3F", generated_at: now, verdict: scorecardVerdict, board_approval_checks: checks });

const qaReport = `# QA Acceptance Report — Milestone 1.3F\n\n**Generated:** ${now}\n**Milestone:** 1.3F — Board Approval & Rejection Flows\n**Verdict:** ${scorecardVerdict}\n\n## Test Results\n\n| # | Test Case | Result |\n|---|-----------|--------|\n${Object.entries(checks).map(([k, v], i) => `| ${i + 1} | ${k} | ${v ? "✅ PASS" : "❌ FAIL"} |`).join("\n")}\n\n## Verdict: **${scorecardVerdict}**\n`;
writeMd(GEN_DIR, "qa-acceptance-report.md", qaReport);
writeMd(ARTIFACT_DIR, "qa-acceptance-report.md", qaReport);

const manifest = { milestone: "1.3F", generated_at: now, artifacts: ["board-approval-active-config.json", "board-approval-events.json", "board-approval-validation-details.json", "board-approval-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"] };
write(GEN_DIR, "artifact-manifest.json", manifest);
write(ARTIFACT_DIR, "artifact-manifest.json", manifest);
writeMd(GEN_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.3F\n\n**Milestone:** 1.3F\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);
writeMd(ARTIFACT_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.3F\n\n**Milestone:** 1.3F\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);

console.log("[1.3F Runner] All 1.3F artifacts generated successfully.");
console.log(`[1.3F Runner] Verdict: ${scorecardVerdict}`);
if (!allPassed) process.exit(1);
