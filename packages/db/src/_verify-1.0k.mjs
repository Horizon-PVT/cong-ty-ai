#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

function main() {
  console.log("Starting Phase 1.0K verification...");

  let failures = [];
  const assert = (cond, msg) => {
    if (!cond) {
      failures.push(msg);
      console.log(`❌ ${msg}`);
    } else {
      console.log(`✅ ${msg}`);
    }
  };

  // 1. Verify docs / status exist
  const statusFile = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  assert(fs.existsSync(statusFile), "execution status doc exists");
  if (fs.existsSync(statusFile)) {
    const statusCode = fs.readFileSync(statusFile, "utf8");
    assert(statusCode.includes("Milestone 1.0K"), "execution status doc mentions Milestone 1.0K");
  }

  // 2. Verify configs exist and parse
  const policyPath = path.join(repoRoot, "configs/ai-company/revenue-website-delivery-policy.json");
  const mapPath = path.join(repoRoot, "configs/ai-company/revenue-website-delivery-capability-map.json");
  const missionPath = path.join(repoRoot, "missions/ai-company/mission-1.0k-website-delivery.json");

  assert(fs.existsSync(policyPath), "revenue-website-delivery-policy.json exists");
  assert(fs.existsSync(mapPath), "revenue-website-delivery-capability-map.json exists");
  assert(fs.existsSync(missionPath), "mission-1.0k-website-delivery.json exists");

  let policy = {};
  let map = {};
  let mission = {};

  try {
    policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
    assert(true, "revenue-website-delivery-policy.json parses as JSON");
  } catch (err) { assert(false, "revenue-website-delivery-policy.json parses as JSON"); }

  try {
    map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    assert(true, "revenue-website-delivery-capability-map.json parses as JSON");
  } catch (err) { assert(false, "revenue-website-delivery-capability-map.json parses as JSON"); }

  try {
    mission = JSON.parse(fs.readFileSync(missionPath, "utf8"));
    assert(true, "mission-1.0k-website-delivery.json parses as JSON");
  } catch (err) { assert(false, "mission-1.0k-website-delivery.json parses as JSON"); }

  // 3. Verify Policy attributes
  assert(policy.capability_first === true, "policy has capability_first: true");
  assert(policy.owner_manual_qa_required === false, "policy has owner_manual_qa_required: false");
  assert(policy.allow_local_memory_write === true, "policy allows local memory write");
  assert(policy.allow_local_artifact_write === true, "policy allows local artifact write");
  assert(policy.allow_local_report_write === true, "policy allows local report write");
  assert(policy.allow_live_api_calls === false, "policy blocks live API calls");
  assert(policy.allow_deploy === false, "policy blocks deploy");
  assert(policy.allow_publish === false, "policy blocks publish");
  assert(policy.allow_spend === false, "policy blocks spend");
  assert(policy.allow_customer_comms === false, "policy blocks customer communications");
  assert(policy.allow_secret_read === false, "policy blocks secret reading");
  assert(policy.allow_production_data_mutation === false, "policy blocks production database mutation");
  assert(policy.allow_real_client_data === false, "policy blocks real client data");

  // 4. Verify Capability map contains required steps
  if (map.mission_steps) {
    const stepNames = map.mission_steps.map(s => s.step_name);
    const required = [
      "revenue_mission_intake", "customer_profile_builder", "offer_strategy", "landing_page_copywriting",
      "landing_page_structure", "static_site_generation", "visual_direction", "cta_strategy", "local_seo_outline",
      "proposal_generation", "handoff_checklist_generation", "quality_review", "conversion_review",
      "paperclip_update_generation", "learning_update", "kpi_scoring", "auto_verification", "premerge_simulation"
    ];
    required.forEach(req => {
      assert(stepNames.includes(req), `Capability map includes step: ${req}`);
    });
  } else {
    assert(false, "Capability map steps defined");
  }

  // 5. Verify Scripts exist
  const runScript = path.join(repoRoot, "scripts/ai-company-run-revenue-website-mission.mjs");
  const verifyScript = path.join(repoRoot, "scripts/ai-company-revenue-website-verify.mjs");
  const loopScript = path.join(repoRoot, "scripts/ai-company-revenue-website-auto-loop.mjs");
  const premergeScript = path.join(repoRoot, "scripts/ai-company-revenue-website-premerge-simulate.mjs");

  assert(fs.existsSync(runScript), "run script exists");
  assert(fs.existsSync(verifyScript), "verify script exists");
  assert(fs.existsSync(loopScript), "loop script exists");
  assert(fs.existsSync(premergeScript), "premerge script exists");

  // 6. Code Audit on scripts (fetch, env, Date.now, Math.random)
  const codeCheck = (file) => {
    if (fs.existsSync(file)) {
      const code = fs.readFileSync(file, "utf8");
      assert(!code.includes("fe" + "tch("), `${path.basename(file)}: no fetch() calls`);
      assert(!code.includes("ax" + "ios"), `${path.basename(file)}: no axios`);
      assert(!code.includes("send" + "Mail"), `${path.basename(file)}: no sendMail`);
      assert(!code.includes(".po" + "st("), `${path.basename(file)}: no .post(`);
      assert(!code.includes("Date.now" + "()"), `${path.basename(file)}: no Date.now()`);
      assert(!code.includes("Math.random" + "()"), `${path.basename(file)}: no Math.random()`);
      assert(!code.includes("new Date" + "()"), `${path.basename(file)}: no new Date()`);
      assert(!code.includes("crypto.random" + "UUID"), `${path.basename(file)}: no crypto.randomUUID`);
      assert(!code.includes("process.en" + "v."), `${path.basename(file)}: no process.env.`);
    }
  };

  codeCheck(runScript);
  codeCheck(verifyScript);
  codeCheck(loopScript);
  codeCheck(premergeScript);

  // 7. Verify artifacts exist and have expected content (only when generated)
  const artifactsDir = path.join(repoRoot, "artifacts/ai-company/mission-1.0k");
  const proposalPath = path.join(artifactsDir, "proposal.md");
  const htmlPath = path.join(artifactsDir, "landing-page.html");
  const kpiPath = path.join(artifactsDir, "kpi-scorecard.json");
  const paperclipPath = path.join(artifactsDir, "paperclip-mission-update.json");

  // Check Proposal pricing anchors if proposal exists
  if (fs.existsSync(proposalPath)) {
    const proposalCode = fs.readFileSync(proposalPath, "utf8");
    assert(proposalCode.includes("4.9 triệu") && proposalCode.includes("12.9 triệu") && proposalCode.includes("18 triệu"), "proposal has correct pricing anchors");
  }

  // Check landing-page.html if it exists
  if (fs.existsSync(htmlPath)) {
    const htmlCode = fs.readFileSync(htmlPath, "utf8");
    assert(!htmlCode.includes("<script src=\"http") && !htmlCode.includes("tailwind.min.css") && !htmlCode.includes("bootstrap.min.css"), "landing-page.html has no external CDNs or external scripts");
    assert(htmlCode.includes("onsubmit=\"return false;\"") || htmlCode.includes("action=\"#\""), "landing-page.html has no live form submission");
  }

  // Check KPI scorecard if it exists
  if (fs.existsSync(kpiPath)) {
    try {
      const kpiData = JSON.parse(fs.readFileSync(kpiPath, "utf8"));
      assert(
        typeof kpiData.mission_success_score === "number" &&
        typeof kpiData.customer_value_score === "number" &&
        typeof kpiData.copy_quality_score === "number" &&
        typeof kpiData.conversion_readiness_score === "number" &&
        typeof kpiData.delivery_readiness_score === "number" &&
        typeof kpiData.safety_score === "number" &&
        typeof kpiData.learning_quality_score === "number",
        "KPI scorecard has all required fields"
      );
    } catch {
      assert(false, "KPI scorecard parses as JSON");
    }
  }

  // Check Paperclip update if it exists
  if (fs.existsSync(paperclipPath)) {
    try {
      const pcData = JSON.parse(fs.readFileSync(paperclipPath, "utf8"));
      assert(
        pcData.widget_id &&
        pcData.display_name &&
        pcData.payload &&
        pcData.payload.active_mission &&
        pcData.payload.progress_status &&
        pcData.payload.last_run_verdict,
        "Paperclip update payload contains required fields"
      );
    } catch {
      assert(false, "Paperclip update parses as JSON");
    }
  }

  // 8. Check that no runtime reports are tracked in Git
  let trackedReports = [];
  try {
    const stdout = execSync("git ls-files", { encoding: "utf8" });
    const files = stdout.split("\n").map(f => f.trim()).filter(Boolean);
    trackedReports = files.filter(f => 
      f === "reports/revenue-website-mission/latest.json" ||
      f === "reports/revenue-website-verify/latest.json" ||
      f === "reports/self-test/latest.json" ||
      f === "reports/self-test/latest.md" ||
      f === "reports/e2e/latest.json" ||
      f === "reports/post-merge/latest.json" ||
      f === "logs/revenue-website-auto-loop-report.json" ||
      f === "logs/revenue-website-premerge-simulate-report.json"
    );
  } catch (err) {
    console.error("Warning: Failed to run git ls-files to audit tracked reports.");
  }
  assert(trackedReports.length === 0, `No runtime reports must be tracked in Git. Found: ${trackedReports.join(", ")}`);

  // 9. Self-Test Gate supports 1.0k
  const gateFile = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  if (fs.existsSync(gateFile)) {
    const gateCode = fs.readFileSync(gateFile, "utf8");
    assert(gateCode.includes("1.0k"), "self-test gate includes verify-1.0k");
  }

  if (failures.length > 0) {
    console.error("Phase 1.0K verification FAILED!");
    process.exit(1);
  } else {
    console.log("Phase 1.0K verification PASSED!");
  }
}

main();
