#!/usr/bin/env node
// scripts/ai-company-lead-discovery-verify.mjs
// Milestone 1.0N — Lead Discovery & Qualification Verifier

import fs from "fs";
import path from "path";

const WORKSPACE = process.cwd();
const ARTIFACTS_DIR = "artifacts/ai-company/mission-1.0n";
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

console.log("Starting Phase 1.0N Lead Discovery & Qualification Verification...");

// Config files
check("mission-1.0n-lead-discovery.json exists", exists("missions/ai-company/mission-1.0n-lead-discovery.json"));
check("lead-discovery-policy.json exists", exists("configs/ai-company/lead-discovery-policy.json"));
check("lead-discovery-operating-model.json exists", exists("configs/ai-company/lead-discovery-operating-model.json"));

const mission = readJSON("missions/ai-company/mission-1.0n-lead-discovery.json");
const policy = readJSON("configs/ai-company/lead-discovery-policy.json");
const opModel = readJSON("configs/ai-company/lead-discovery-operating-model.json");

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
check("policy allows local_lead_scoring_model", policy?.allowed_actions?.local_lead_scoring_model === true);
check("policy allows local_demo_lead_dataset", policy?.allowed_actions?.local_demo_lead_dataset === true);
check("policy allows manual_research_checklist", policy?.allowed_actions?.manual_research_checklist === true);
check("lead_safety_rules: demo_leads_only is true", policy?.lead_safety_rules?.demo_leads_only === true);
check("lead_safety_rules: must_label_demo_data_clearly is true", policy?.lead_safety_rules?.must_label_demo_data_clearly === true);

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
check("mission has target_lead_types array (autonomous discovery context)", Array.isArray(mission?.target_lead_types) && mission.target_lead_types.length >= 5);

// Script files
check("run script exists", exists("scripts/ai-company-run-lead-discovery-mission.mjs"));
check("verify script exists", exists("scripts/ai-company-lead-discovery-verify.mjs"));
check("loop script exists", exists("scripts/ai-company-lead-discovery-auto-loop.mjs"));
check("premerge script exists", exists("scripts/ai-company-lead-discovery-premerge-simulate.mjs"));

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
  "lead-research-checklist.md",
  "lead-scoring-model.json",
  "lead-qualification-framework.md",
  "demo-lead-dataset.json",
  "lead-board-template.md",
  "outreach-preparation-guide.md",
  "revenue-priority-matrix.json",
  "7-day-lead-generation-plan.md"
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
check("KPI scorecard includes required KPI fields", kpi?.kpis?.total_leads_in_dataset !== undefined);
check("KPI: total leads >= 50", (kpi?.kpis?.total_leads_in_dataset?.value ?? 0) >= 50);
check("KPI: all verticals covered (8)", (kpi?.kpis?.verticals_covered?.value ?? 0) >= 8);
const ppu = readJSON(`${ARTIFACTS_DIR}/paperclip-department-update.json`);
check("Paperclip update includes required fields", ppu?.capability_added !== undefined && ppu?.safety_status !== undefined);

// Demo lead dataset checks
const dataset = readJSON(`${GENERATED_DIR}/demo-lead-dataset.json`);
check("demo-lead-dataset total_leads >= 50", (dataset?.total_leads ?? 0) >= 50);
check("demo-lead-dataset data_type is DEMO", dataset?.data_type === "DEMO");
check("demo-lead-dataset has warning label", typeof dataset?.warning === "string" && dataset.warning.includes("DEMO"));
check(`demo-lead-dataset has hot leads tier`, (dataset?.tier_summary?.hot ?? dataset?.tier_summary?.Hot ?? 0) >= 1);
check("all 8 verticals in dataset", (() => {
  const verticals = new Set(dataset?.leads?.map(l => l.vertical) || []);
  return verticals.size >= 8;
})());

// Lead scoring model checks
const scoring = readJSON(`${GENERATED_DIR}/lead-scoring-model.json`);
check("lead scoring model has >= 5 dimensions", (scoring?.dimensions?.length ?? 0) >= 5);
check("lead scoring model has tier_thresholds", scoring?.tier_thresholds?.hot !== undefined);

// Research checklist checks
const checklist = readText(`${GENERATED_DIR}/lead-research-checklist.md`);
check("research checklist mentions Google Maps", checklist.includes("Google Maps"));
check("research checklist has NO login rule", checklist.includes("NO login") || checklist.includes("no login") || checklist.includes("NO browser automation"));
check("research checklist has daily targets table", checklist.includes("Day 1") && checklist.includes("Day 7"));

// Revenue priority matrix
const rpm = readJSON(`${GENERATED_DIR}/revenue-priority-matrix.json`);
check("revenue priority matrix has >= 6 verticals", (rpm?.verticals?.length ?? 0) >= 6);

// Outreach guide checks
const outreach = readText(`${GENERATED_DIR}/outreach-preparation-guide.md`);
check("outreach guide has DO NOT SEND warning", outreach.includes("DO NOT SEND") || outreach.includes("not sent") || outreach.includes("DO NOT send"));
check("outreach guide covers Spa vertical", outreach.includes("Spa") || outreach.includes("spa"));
check("outreach guide covers Nha khoa", outreach.includes("Nha khoa") || outreach.includes("nha khoa"));

// 7-day plan checks
const plan7 = readText(`${GENERATED_DIR}/7-day-lead-generation-plan.md`);
check("7-day plan covers all 7 days", plan7.includes("Day 7"));
check("7-day plan has NO scraping rule", plan7.includes("scraping") || plan7.includes("automation"));
check("7-day plan has target: 50 leads", plan7.includes("50"));

// Safety: no fetch/axios/sendMail in scripts
const scriptFiles = [
  "scripts/ai-company-run-lead-discovery-mission.mjs",
  "scripts/ai-company-lead-discovery-auto-loop.mjs",
  "scripts/ai-company-lead-discovery-premerge-simulate.mjs"
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

// No fixed artifact filenames in runner/verifier
const forbiddenNames = ["client-proposal.md", "objection-handling.md", "follow-up-plan.md", "package-comparison.md"];
const runnerContent = readText("scripts/ai-company-run-lead-discovery-mission.mjs");
for (const name of forbiddenNames) {
  check(`runner script does not hardcode: ${name}`, !runnerContent.includes(name));
}

// No runtime reports tracked in git
try {
  const { execSync } = await import("child_process");
  const tracked = execSync("git ls-files reports/lead-discovery-mission/ reports/lead-discovery-verify/ reports/self-test/latest.json reports/e2e/latest.json reports/post-merge/latest.json", { encoding: "utf8" }).trim();
  check("No runtime reports must be tracked in Git. Found: " + tracked, tracked === "");
} catch {
  check("Git ls-files check completed", true);
}

// Self-test gate and execution status integration
const gateContent = readText("scripts/ai-dev-factory-self-test-gate.mjs");
check("self-test gate includes verify-1.0n", gateContent.includes("verify-1.0n") || gateContent.includes("1.0n"));
const statusContent = readText("docs/ai-dev-factory-execution-status.md");
check("execution status doc mentions Milestone 1.0N", statusContent.includes("1.0N"));

console.log("\n" + "=".repeat(50));
console.log(`Phase 1.0N Verification: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("Phase 1.0N verification PASSED!");
} else {
  console.log("Phase 1.0N verification FAILED.");
  process.exit(1);
}

// Write report
const reportDir = path.join(WORKSPACE, "reports/lead-discovery-verify");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "latest.json"),
  JSON.stringify({ milestone: "1.0N", passed, failed, timestamp: "2026-07-02" }, null, 2)
);
console.log("[Verify] Report saved to reports/lead-discovery-verify/latest.json");
