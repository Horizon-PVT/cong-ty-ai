#!/usr/bin/env node
/**
 * Milestone 1.4A: Dashboard Live Aggregations & DB Adaptability (PostgreSQL)
 *
 * Validates:
 * - Spend counts aggregate cost_events dynamically
 * - Task counts segment correctly by status
 * - Pending approvals count matches live DB state
 * - Active agent status counts match current agent statuses
 * - DB connection check succeeds for PostgreSQL connection strings
 * - Fallback to embedded PostgreSQL when DATABASE_URL is empty
 * - Health-check endpoint DB probing and migration status details
 * - Dashboard checks company boundaries
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DashboardDbService } from "./lib/security/dashboard-db-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.4a");
const GEN_DIR = path.join(ARTIFACT_DIR, "generated");

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function write(dir, file, data) { fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2)); }
function writeMd(dir, file, content) { fs.writeFileSync(path.join(dir, file), content); }

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const MODE = getArg("--mode") || "dry_run";

console.log(`[1.4A Runner] Starting Milestone 1.4A: Live Dashboard Aggregations & DB Adaptability...`);
console.log(`[1.4A Runner] Mode: ${MODE}`);
ensureDir(GEN_DIR);

const now = new Date().toISOString();
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, "configs", "ai-company", "dashboard-db-policy.json"), "utf8"));

if (MODE === "live") {
  const token = process.env.OWNER_APPROVED_DASHBOARD_DB_TOKEN || "";
  if (!token.startsWith(policy.required_live_token_prefix)) {
    console.error("[1.4A Runner] Security Gate: Missing token."); process.exit(1);
  }
}

const service = new DashboardDbService(policy);
const events = [];
const checks = {};

function logResult(name, success, details) {
  checks[name] = success;
  events.push({ test_case: name, verdict: success ? "PASS" : "FAIL", timestamp: new Date().toISOString(), ...details });
  console.log(`[1.4A Runner] ${name}: ${success ? "✅ PASS" : "❌ FAIL"}${details.reason ? ` (${details.reason})` : ""}`);
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 1: Dashboard spend matches live cost events
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createCompany({ id: "comp_1", budgetMonthlyCents: 50000 });
  service.recordCostEvent({ companyId: "comp_1", costCents: 12000 });
  service.recordCostEvent({ companyId: "comp_1", costCents: 8500 });
  // Event from previous month should be ignored
  const past = new Date();
  past.setDate(1); // Protect against end-of-month overflows
  past.setMonth(past.getMonth() - 1);
  service.recordCostEvent({ companyId: "comp_1", costCents: 5000, occurredAt: past.toISOString() });

  const summary = service.getDashboardSummary({ companyId: "comp_1" }, "comp_1");

  logResult("dashboard_spend_matches_live_events", summary.costs.monthSpendCents === 20500 && summary.costs.monthUtilizationPercent === 41.0, {
    spend: summary.costs?.monthSpendCents,
    utilization: summary.costs?.monthUtilizationPercent,
    reason: "spend dynamically aggregated for the current month only"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 2: Dashboard agent counts are accurate
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createCompany({ id: "comp_1" });
  service.createAgent({ id: "a1", companyId: "comp_1", status: "running" });
  service.createAgent({ id: "a2", companyId: "comp_1", status: "paused" });
  service.createAgent({ id: "a3", companyId: "comp_1", status: "idle" }); // active
  service.createAgent({ id: "a4", companyId: "comp_1", status: "error" });
  service.createAgent({ id: "a5", companyId: "comp_2", status: "running" }); // foreign company

  const summary = service.getDashboardSummary({ companyId: "comp_1" }, "comp_1");

  const correct = summary.agents.running === 1 &&
                  summary.agents.paused === 1 &&
                  summary.agents.active === 1 &&
                  summary.agents.error === 1;

  logResult("dashboard_agent_counts_accurate", correct, {
    counts: summary.agents,
    reason: "agent counts segmented by status for own company only"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 3: Dashboard tasks by status are accurate
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createCompany({ id: "comp_1" });
  service.createTask({ id: "t1", companyId: "comp_1", status: "open" });
  service.createTask({ id: "t2", companyId: "comp_1", status: "in_progress" });
  service.createTask({ id: "t3", companyId: "comp_1", status: "blocked" });
  service.createTask({ id: "t4", companyId: "comp_1", status: "done" });
  service.createTask({ id: "t5", companyId: "comp_1", status: "cancelled" }); // cancelled doesn't count towards open

  const summary = service.getDashboardSummary({ companyId: "comp_1" }, "comp_1");

  const correct = summary.tasks.inProgress === 1 &&
                  summary.tasks.blocked === 1 &&
                  summary.tasks.done === 1 &&
                  summary.tasks.open === 3; // open = open + in_progress + blocked (statuses !== done/cancelled)

  logResult("dashboard_tasks_by_status_accurate", correct, {
    counts: summary.tasks,
    reason: "tasks segmented by status correctly"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 4: Dashboard pending approvals count matches live DB state
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createCompany({ id: "comp_1" });
  service.createApproval({ companyId: "comp_1", status: "pending" });
  service.createApproval({ companyId: "comp_1", status: "pending" });
  service.createApproval({ companyId: "comp_1", status: "approved" });
  service.createApproval({ companyId: "comp_2", status: "pending" }); // foreign company

  const summary = service.getDashboardSummary({ companyId: "comp_1" }, "comp_1");

  logResult("dashboard_pending_approvals_matches_db", summary.pendingApprovals === 2, {
    pending_approvals: summary.pendingApprovals,
    reason: "pending approvals count matches own company database entries"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 5: Dashboard summary enforces company boundary
// ═══════════════════════════════════════════════════════════════════════
{
  service.resetAll();
  service.createCompany({ id: "comp_1" });

  const result = service.getDashboardSummary({ companyId: "comp_2" }, "comp_1");

  logResult("dashboard_enforces_company_boundary", result.status === 403, {
    response_status: result.status,
    error: result.error,
    reason: "cross-company access blocked with 403 Forbidden"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 6: PostgreSQL connection check succeeds
// ═══════════════════════════════════════════════════════════════════════
{
  const dbUrl = "postgres://postgres:password@10.0.0.5:5432/paperclip_prod";
  const probe = service.probeDatabaseConnection(dbUrl, "postgres");

  const correct = probe.connected &&
                  probe.mode === "external-postgres" &&
                  probe.host === "10.0.0.5" &&
                  probe.port === 5432 &&
                  probe.database === "paperclip_prod";

  logResult("postgres_connection_success", correct, {
    probe,
    reason: "external postgres connection details verified"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 7: Malformed connection string is rejected
// ═══════════════════════════════════════════════════════════════════════
{
  const dbUrl = "invalid-db-connection-string";
  const probe = service.probeDatabaseConnection(dbUrl, "postgres");

  logResult("postgres_connection_invalid_format", !probe.connected && probe.mode === "postgres" && !!probe.error, {
    probe,
    reason: "invalid connection string returns connected=false"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 8: Fallback to embedded PostgreSQL succeeds
// ═══════════════════════════════════════════════════════════════════════
{
  const probe = service.probeDatabaseConnection(null, "postgres");

  logResult("embedded_postgres_fallback_success", probe.connected && probe.mode === "embedded-postgres" && probe.port === 54329, {
    probe,
    reason: "fallback to local embedded-postgres verified when url is missing"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 9: Health check returns correct DB status
// ═══════════════════════════════════════════════════════════════════════
{
  const dbUrl = "postgres://postgres:password@localhost:5432/db";
  const health = service.getHealthCheckDetails(dbUrl, "postgres", true);

  const correct = health.status === "healthy" &&
                  health.database.connected === true &&
                  health.database.mode === "external-postgres" &&
                  health.database.migrationStatus === "upToDate";

  logResult("health_check_endpoint_returns_db_status", correct, {
    health,
    reason: "health check endpoint payload structure verified"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Test Case 10: Health check detects pending migrations
// ═══════════════════════════════════════════════════════════════════════
{
  const dbUrl = "postgres://postgres:password@localhost:5432/db";
  const health = service.getHealthCheckDetails(dbUrl, "postgres", false);

  const correct = health.database.migrationStatus === "needsMigrations" &&
                  health.database.pendingMigrationsCount === 3;

  logResult("health_check_detects_pending_migrations", correct, {
    health,
    reason: "health check correctly flags pending database migrations"
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Generate Artifacts
// ═══════════════════════════════════════════════════════════════════════
const allPassed = Object.values(checks).every(c => c === true);
const scorecardVerdict = allPassed ? "DASHBOARD_DB_VERIFIED" : "FAILED_SAFE";

write(GEN_DIR, "dashboard-db-active-config.json", { schema_version: "1.3", milestone: "1.4A", generated_at: now, policy });
write(ARTIFACT_DIR, "dashboard-db-active-config.json", { schema_version: "1.3", milestone: "1.4A", generated_at: now, policy });

write(GEN_DIR, "dashboard-db-events.json", { milestone: "1.4A", generated_at: now, total_tests: events.length, passed: events.filter(e => e.verdict === "PASS").length, failed: events.filter(e => e.verdict === "FAIL").length, events });
write(ARTIFACT_DIR, "dashboard-db-events.json", { milestone: "1.4A", generated_at: now, total_tests: events.length, passed: events.filter(e => e.verdict === "PASS").length, failed: events.filter(e => e.verdict === "FAIL").length, events });

write(GEN_DIR, "dashboard-db-validation-details.json", { milestone: "1.4A", verdict: scorecardVerdict, generated_at: now, passed_cases: Object.values(checks).filter(c => c).length, failed_cases: Object.values(checks).filter(c => !c).length, test_coverage: checks });
write(ARTIFACT_DIR, "dashboard-db-validation-details.json", { milestone: "1.4A", verdict: scorecardVerdict, generated_at: now, passed_cases: Object.values(checks).filter(c => c).length, failed_cases: Object.values(checks).filter(c => !c).length, test_coverage: checks });

write(GEN_DIR, "dashboard-db-scorecard.json", { milestone: "1.4A", generated_at: now, verdict: scorecardVerdict, dashboard_db_checks: checks });
write(ARTIFACT_DIR, "dashboard-db-scorecard.json", { milestone: "1.4A", generated_at: now, verdict: scorecardVerdict, dashboard_db_checks: checks });

const qaReport = `# QA Acceptance Report — Milestone 1.4A\n\n**Generated:** ${now}\n**Milestone:** 1.4A — Live Dashboard Aggregations & DB Adaptability\n**Verdict:** ${scorecardVerdict}\n\n## Test Results\n\n| # | Test Case | Result |\n|---|-----------|--------|\n${Object.entries(checks).map(([k, v], i) => `| ${i + 1} | ${k} | ${v ? "✅ PASS" : "❌ FAIL"} |`).join("\n")}\n\n## Verdict: **${scorecardVerdict}**\n`;
writeMd(GEN_DIR, "qa-acceptance-report.md", qaReport);
writeMd(ARTIFACT_DIR, "qa-acceptance-report.md", qaReport);

const manifest = { milestone: "1.4A", generated_at: now, artifacts: ["dashboard-db-active-config.json", "dashboard-db-events.json", "dashboard-db-validation-details.json", "dashboard-db-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"] };
write(GEN_DIR, "artifact-manifest.json", manifest);
write(ARTIFACT_DIR, "artifact-manifest.json", manifest);
writeMd(GEN_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.4A\n\n**Milestone:** 1.4A\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);
writeMd(ARTIFACT_DIR, "final-package-index.md", `# Final Package Index — Milestone 1.4A\n\n**Milestone:** 1.4A\n**Verdict:** ${scorecardVerdict}\n**Generated:** ${now}\n`);

console.log("[1.4A Runner] All 1.4A artifacts generated successfully.");
console.log(`[1.4A Runner] Verdict: ${scorecardVerdict}`);
if (!allPassed) process.exit(1);
