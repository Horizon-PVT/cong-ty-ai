#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

function main() {
  console.log("Starting Phase 1.0J verification...");

  let failures = [];
  const assert = (cond, msg) => {
    if (!cond) {
      failures.push(msg);
      console.log(`❌ ${msg}`);
    } else {
      console.log(`✅ ${msg}`);
    }
  };

  // 1. Verify docs exist
  assert(fs.existsSync(path.join(repoRoot, "docs/ai-company-os/ai-company-charter.md")), "ai-company-charter.md exists");
  assert(fs.existsSync(path.join(repoRoot, "docs/ai-company-os/capability-first-operating-model.md")), "capability-first-operating-model.md exists");
  assert(fs.existsSync(path.join(repoRoot, "docs/ai-company-os/vertical-mission-execution.md")), "vertical-mission-execution.md exists");
  assert(fs.existsSync(path.join(repoRoot, "docs/ai-company-os/hermes-chief-learning-officer.md")), "hermes-chief-learning-officer.md exists");

  // 2. Verify configs exist and parse
  const policyPath = path.join(repoRoot, "configs/ai-company/vertical-mission-policy.json");
  const kpiPath = path.join(repoRoot, "configs/ai-company/mission-kpi-policy.json");
  const mapPath = path.join(repoRoot, "configs/ai-company/vertical-mission-capability-map.json");
  const missionPath = path.join(repoRoot, "missions/ai-company/mission-1.0j-repo-audit.json");

  assert(fs.existsSync(policyPath), "vertical-mission-policy.json exists");
  assert(fs.existsSync(kpiPath), "mission-kpi-policy.json exists");
  assert(fs.existsSync(mapPath), "vertical-mission-capability-map.json exists");
  assert(fs.existsSync(missionPath), "mission-1.0j-repo-audit.json exists");

  let policy = {};
  let kpi = {};
  let map = {};
  let mission = {};

  try {
    policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
    assert(true, "vertical-mission-policy.json parses as JSON");
  } catch (err) { assert(false, "vertical-mission-policy.json parses as JSON"); }

  try {
    kpi = JSON.parse(fs.readFileSync(kpiPath, "utf8"));
    assert(true, "mission-kpi-policy.json parses as JSON");
  } catch (err) { assert(false, "mission-kpi-policy.json parses as JSON"); }

  try {
    map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    assert(true, "vertical-mission-capability-map.json parses as JSON");
  } catch (err) { assert(false, "vertical-mission-capability-map.json parses as JSON"); }

  try {
    mission = JSON.parse(fs.readFileSync(missionPath, "utf8"));
    assert(true, "mission-1.0j-repo-audit.json parses as JSON");
  } catch (err) { assert(false, "mission-1.0j-repo-audit.json parses as JSON"); }

  // 3. Verify Policy attributes
  assert(policy.capability_first === true, "policy has capability_first: true");
  assert(policy.owner_manual_qa_required === false, "policy has owner_manual_qa_required: false");
  assert(policy.allow_local_memory_write === true, "policy allows memory write");
  assert(policy.allow_local_artifact_write === true, "policy allows artifact write");
  assert(policy.allow_local_report_write === true, "policy allows report write");
  assert(policy.allow_live_api_calls === false, "policy blocks live API calls");
  assert(policy.allow_deploy === false, "policy blocks deploy");
  assert(policy.allow_publish === false, "policy blocks publish");
  assert(policy.allow_spend === false, "policy blocks spend");
  assert(policy.allow_customer_comms === false, "policy blocks customer communications");
  assert(policy.allow_secret_read === false, "policy blocks secret reading");
  assert(policy.allow_production_data_mutation === false, "policy blocks production database mutation");

  // 4. Verify KPI policy attributes
  if (kpi.kpi_groups) {
    assert(Array.isArray(kpi.kpi_groups.ceo_agent), "KPI ceo_agent metrics exist");
    assert(Array.isArray(kpi.kpi_groups.coo_agent), "KPI coo_agent metrics exist");
    assert(Array.isArray(kpi.kpi_groups.cto_agent), "KPI cto_agent metrics exist");
    assert(Array.isArray(kpi.kpi_groups.research_capability), "KPI research capability metrics exist");
    assert(Array.isArray(kpi.kpi_groups.dev_capability), "KPI dev capability metrics exist");
    assert(Array.isArray(kpi.kpi_groups.review_capability), "KPI review capability metrics exist");
    assert(Array.isArray(kpi.kpi_groups.learning_clo), "KPI learning CLO metrics exist");
  } else {
    assert(false, "KPI groups defined");
  }

  // 5. Verify Capability map contains required steps
  if (map.mission_steps) {
    const stepNames = map.mission_steps.map(s => s.step_name);
    const required = [
      "mission_intake", "ceo_briefing", "capability_decomposition", "capability_routing",
      "provider_selection", "repo_audit", "improvement_backlog_generation", "artifact_generation",
      "paperclip_update_generation", "learning_update", "kpi_scoring", "auto_verification", "premerge_simulation"
    ];
    required.forEach(req => {
      assert(stepNames.includes(req), `Capability map includes step: ${req}`);
    });
  } else {
    assert(false, "Capability map steps defined");
  }

  // 6. Verify Scripts exist
  const runScript = path.join(repoRoot, "scripts/ai-company-run-vertical-mission.mjs");
  const verifyScript = path.join(repoRoot, "scripts/ai-company-vertical-mission-verify.mjs");
  const loopScript = path.join(repoRoot, "scripts/ai-company-vertical-mission-auto-loop.mjs");
  const premergeScript = path.join(repoRoot, "scripts/ai-company-vertical-mission-premerge-simulate.mjs");

  assert(fs.existsSync(runScript), "run script exists");
  assert(fs.existsSync(verifyScript), "verify script exists");
  assert(fs.existsSync(loopScript), "loop script exists");
  assert(fs.existsSync(premergeScript), "premerge script exists");

  // 7. Code Audit on scripts (fetch, env, Date.now, Math.random)
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

  // 7b. Check that no runtime reports are tracked in Git
  let trackedReports = [];
  try {
    const stdout = execSync("git ls-files", { encoding: "utf8" });
    const files = stdout.split("\n").map(f => f.trim()).filter(Boolean);
    trackedReports = files.filter(f => 
      f === "reports/self-test/latest.json" ||
      f === "reports/self-test/latest.md" ||
      f === "reports/vertical-mission/latest.json" ||
      f === "reports/vertical-mission-verify/latest.json" ||
      f === "reports/e2e/latest.json" ||
      f === "reports/post-merge/latest.json" ||
      (f.startsWith("logs/") && f.endsWith(".json"))
    );
  } catch (err) {
    console.error("Warning: Failed to run git ls-files to audit tracked reports.");
  }
  assert(trackedReports.length === 0, `No runtime reports must be tracked in Git. Found: ${trackedReports.join(", ")}`);


  // 8. Self-Test Gate supports 1.0j
  const gateFile = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  if (fs.existsSync(gateFile)) {
    const gateCode = fs.readFileSync(gateFile, "utf8");
    assert(gateCode.includes("1.0j"), "self-test gate includes verify-1.0j");
  }

  // 9. Status file mention
  const statusFile = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  if (fs.existsSync(statusFile)) {
    const statusCode = fs.readFileSync(statusFile, "utf8");
    assert(statusCode.includes("Milestone 1.0J"), "execution status doc mentions Milestone 1.0J");
  }

  if (failures.length > 0) {
    console.error("Phase 1.0J verification FAILED!");
    process.exit(1);
  } else {
    console.log("Phase 1.0J verification PASSED!");
  }
}

main();
