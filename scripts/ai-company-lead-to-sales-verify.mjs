#!/usr/bin/env node
// scripts/ai-company-lead-to-sales-verify.mjs
// Milestone 1.0O — Lead-to-Sales Pipeline Verifier

import fs from "fs";
import path from "path";

const WORKSPACE = process.cwd();
const ARTIFACTS_DIR = "artifacts/ai-company/mission-1.0o";
const GENERATED_DIR = `${ARTIFACTS_DIR}/generated`;

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`✅ ${label}`);
    passed++;
  } else {
    console.log(`❌ ${label}`);
    failed++;
  }
}

function exists(relPath) {
  return fs.existsSync(path.join(WORKSPACE, relPath));
}

function readJSON(relPath) {
  try { return JSON.parse(fs.readFileSync(path.join(WORKSPACE, relPath), "utf8")); } catch { return null; }
}

function readText(relPath) {
  try { return fs.readFileSync(path.join(WORKSPACE, relPath), "utf8"); } catch { return ""; }
}

console.log("Starting Phase 1.0O Lead-to-Sales Pipeline Verification...");

// Config files
check("mission-1.0o-lead-to-sales.json exists", exists("missions/ai-company/mission-1.0o-lead-to-sales.json"));
check("lead-to-sales-policy.json exists", exists("configs/ai-company/lead-to-sales-policy.json"));
check("lead-to-sales-operating-model.json exists", exists("configs/ai-company/lead-to-sales-operating-model.json"));

const mission = readJSON("missions/ai-company/mission-1.0o-lead-to-sales.json");
const policy = readJSON("configs/ai-company/lead-to-sales-policy.json");
const opModel = readJSON("configs/ai-company/lead-to-sales-operating-model.json");

check("mission JSON parses", mission !== null);
check("policy JSON parses", policy !== null);
check("operating model JSON parses", opModel !== null);

// Policy checks
check("policy: department_led is true", policy?.department_led === true);
check("policy: departments_select_artifacts is true", policy?.departments_select_artifacts === true);
check("policy: fixed_artifact_list_allowed is false", policy?.fixed_artifact_list_allowed === false);
check("policy blocks real_customer_messaging", policy?.blocked_actions?.real_customer_messaging === true);
check("policy blocks browser_automation", policy?.blocked_actions?.browser_automation === true);
check("policy blocks scraping_credentials", policy?.blocked_actions?.scraping_credentials === true);
check("policy blocks deploy", policy?.blocked_actions?.deploy === true);
check("policy blocks publish", policy?.blocked_actions?.publish === true);
check("policy blocks spend", policy?.blocked_actions?.spend === true);
check("policy blocks secrets_read", policy?.blocked_actions?.secrets_read === true);
check("policy blocks env_read", policy?.blocked_actions?.env_read === true);
check("policy blocks production_mutation", policy?.blocked_actions?.production_mutation === true);
check("policy blocks crm_update", policy?.blocked_actions?.crm_update === true);
check("policy allows local_pipeline_board", policy?.allowed_actions?.local_pipeline_board === true);
check("policy allows local_demo_pipeline_data", policy?.allowed_actions?.local_demo_pipeline_data === true);
check("policy allows manual_sales_angle_mapping", policy?.allowed_actions?.manual_sales_angle_mapping === true);
check("lead_safety_rules: demo_leads_only is true", policy?.lead_safety_rules?.demo_leads_only === true);

// Operating model stages
const requiredStages = [
  "owner_goal_intake", "ceo_mission_interpretation", "department_briefing",
  "department_artifact_proposals", "cross_department_negotiation", "artifact_manifest_creation",
  "worker_assignment", "artifact_generation", "qa_review", "gap_analysis", "gap_closure",
  "final_packaging", "kpi_scoring", "learning_update", "paperclip_update",
  "auto_verification", "premerge_simulation"
];
const stageIds = opModel?.stages?.map(s => s.stage_id) || [];
for (const s of requiredStages) {
  check(`operating model includes stage: ${s}`, stageIds.includes(s));
}

// Mission no fixed artifact list
const missionStr = JSON.stringify(mission || {});
check("mission input does not contain fixed artifact list (required_sales_artifacts)", !missionStr.includes("required_sales_artifacts"));
check("mission input does not contain fixed artifact list (fixed_artifact_list)", !missionStr.includes("fixed_artifact_list"));

// Script files
check("run script exists", exists("scripts/ai-company-run-lead-to-sales-mission.mjs"));
check("verify script exists", exists("scripts/ai-company-lead-to-sales-verify.mjs"));
check("loop script exists", exists("scripts/ai-company-lead-to-sales-auto-loop.mjs"));
check("premerge script exists", exists("scripts/ai-company-lead-to-sales-premerge-simulate.mjs"));

// Artifact outputs
check("department-decision-log.json exists", exists(`${ARTIFACTS_DIR}/department-decision-log.json`));
check("artifact-manifest.json exists", exists(`${ARTIFACTS_DIR}/artifact-manifest.json`));
check("final-package-index.md exists", exists(`${ARTIFACTS_DIR}/final-package-index.md`));
check("qa-review-report.md exists", exists(`${ARTIFACTS_DIR}/qa-review-report.md`));
check("gap-analysis.json exists", exists(`${ARTIFACTS_DIR}/gap-analysis.json`));
check("kpi-scorecard.json exists", exists(`${ARTIFACTS_DIR}/kpi-scorecard.json`));
check("paperclip-department-update.json exists", exists(`${ARTIFACTS_DIR}/paperclip-department-update.json`));

// Generated deliverables
const deliverables = [
  "lead-prioritization-matrix.json",
  "sales-angle-mapping.md",
  "14-day-sales-pipeline-schedule.md",
  "consultation-scripts-drafts.md",
  "deposit-and-roi-framework.json",
  "handoff-readiness-checklist.md",
  "demo-pipeline-board-dataset.json",
  "pipeline-safety-locks.md"
];
for (const d of deliverables) {
  check(`deliverable ${d} exists`, exists(`${GENERATED_DIR}/${d}`));
}

// Manifest integrity
const manifest = readJSON(`${ARTIFACTS_DIR}/artifact-manifest.json`);
check("manifest has >= 6 self-selected artifacts", (manifest?.artifacts?.length || 0) >= 6);
check("manifest fixed_artifact_list_used is false", manifest?.fixed_artifact_list_used === false);
const arts = manifest?.artifacts || [];
check("every artifact in manifest has owning department and rationale",
  arts.every(a => a.owning_department && a.rationale));

// Decision log dept coverage
const decLog = readJSON(`${ARTIFACTS_DIR}/department-decision-log.json`);
const depts = decLog?.decisions?.map(d => d.department) || [];
check("department decision log includes >= 7 departments", depts.length >= 7);

// QA, gap, KPI, Paperclip
const qa = readJSON(`${ARTIFACTS_DIR}/qa-review-report.md`);
check("QA report exists and includes completion verdict", qa?.completion_verdict?.includes("QA_PASS") || false);
const gap = readJSON(`${ARTIFACTS_DIR}/gap-analysis.json`);
check("gap analysis exists and all critical gaps are closed", (gap?.critical_gaps_open ?? 1) === 0);
const kpi = readJSON(`${ARTIFACTS_DIR}/kpi-scorecard.json`);
check("KPI scorecard includes required KPI fields", kpi?.kpis?.total_pipeline_leads !== undefined);
check("KPI: total pipeline leads equals 50", (kpi?.kpis?.total_pipeline_leads?.value ?? 0) === 50);
check("KPI: won leads count equals 3", (kpi?.kpis?.won_leads_count?.value ?? 0) === 3);
const ppu = readJSON(`${ARTIFACTS_DIR}/paperclip-department-update.json`);
check("Paperclip update includes required fields", ppu?.capability_added !== undefined && ppu?.safety_status !== undefined);

// Demo pipeline dataset checks
const dataset = readJSON(`${GENERATED_DIR}/demo-pipeline-board-dataset.json`);
check("demo-pipeline-board-dataset total leads equals 50", (dataset?.pipeline_stats?.total ?? 0) === 50);
check("demo-pipeline-board-dataset has 3 Won leads", (dataset?.pipeline_stats?.won ?? 0) === 3);
check("demo-pipeline-board-dataset warning mentions DEMO", typeof dataset?.warning === "string" && dataset.warning.includes("DEMO"));

// Safety: no fetch/axios/sendMail in scripts
const scriptFiles = [
  "scripts/ai-company-run-lead-to-sales-mission.mjs",
  "scripts/ai-company-lead-to-sales-auto-loop.mjs",
  "scripts/ai-company-lead-to-sales-premerge-simulate.mjs"
];
const forbiddenPatterns = [
  ["fetch(", "no fetch() calls"],
  ["axios", "no axios"],
  ["sendMail", "no sendMail"],
  [".post(", "no .post("],
  ["Date.now()", "no Date.now()"],
  ["Math.random()", "no Math.random()"],
  ["new Date()", "no new Date()"],
  ["crypto.randomUUID", "no crypto.randomUUID"],
  ["process.env.", "no process.env."]
];
for (const sf of scriptFiles) {
  const scriptName = path.basename(sf);
  const content = readText(sf);
  for (const [pattern, label] of forbiddenPatterns) {
    check(`${scriptName}: ${label}`, !content.includes(pattern));
  }
}

// No fixed artifact filenames in runner
const forbiddenNames = ["client-proposal.md", "objection-handling.md", "follow-up-plan.md", "package-comparison.md"];
const runnerContent = readText("scripts/ai-company-run-lead-to-sales-mission.mjs");
for (const name of forbiddenNames) {
  check(`runner script does not hardcode: ${name}`, !runnerContent.includes(name));
}

// Integration checks
const gateContent = readText("scripts/ai-dev-factory-self-test-gate.mjs");
check("self-test gate includes verify-1.0o", gateContent.includes("verify-1.0o") || gateContent.includes("1.0o"));
const statusContent = readText("docs/ai-dev-factory-execution-status.md");
check("execution status doc mentions Milestone 1.0O", statusContent.includes("1.0O"));

console.log("\n" + "=".repeat(50));
console.log(`Phase 1.0O Verification: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("Phase 1.0O verification PASSED!");
} else {
  console.log("Phase 1.0O verification FAILED.");
  process.exit(1);
}

// Write report
const reportDir = path.join(WORKSPACE, "reports/lead-to-sales-verify");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "latest.json"),
  JSON.stringify({ milestone: "1.0O", passed, failed, timestamp: "2026-07-03" }, null, 2)
);
console.log("[Verify] Report saved to reports/lead-to-sales-verify/latest.json");
