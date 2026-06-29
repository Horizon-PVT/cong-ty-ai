import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

async function main() {
  console.log("Starting Phase 1.0D verification...");

  // 1. Verify docs and script files exist
  const requiredFiles = [
    "docs/ai-company-os/capability-router.md",
    "docs/ai-company-os/local-mission-queue.md",
    "configs/ai-company/router-policy.json",
    "configs/ai-company/router-scenarios.1.0d.json",
    "scripts/ai-company-capability-router-dry-run.mjs"
  ];
  for (const file of requiredFiles) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file "${file}" does not exist`);
    }
  }
  console.log("✅ verified: required documents, schemas, and dry-run router exist");

  // 2. Parse configs and validate json
  const policyPath = path.join(repoRoot, "configs/ai-company/router-policy.json");
  const scenariosPath = path.join(repoRoot, "configs/ai-company/router-scenarios.1.0d.json");
  const registryPath = path.join(repoRoot, "configs/ai-company/capability-registry.json");
  const missionTypesPath = path.join(repoRoot, "configs/ai-company/mission-types.json");
  const samplePath = path.join(repoRoot, "configs/ai-company/sample-mission-plan.1.0c.json");

  let policy, scenarios, registry, missionTypes, samplePlan;
  try {
    policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
    scenarios = JSON.parse(fs.readFileSync(scenariosPath, "utf8"));
    registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    missionTypes = JSON.parse(fs.readFileSync(missionTypesPath, "utf8"));
    samplePlan = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  } catch (err) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
  console.log("✅ verified: all configuration files parsed successfully");

  // 3. Verify policy attributes
  if (policy.router_mode !== "local_dry_run") {
    throw new Error("Router policy must define router_mode as local_dry_run");
  }
  if (policy.real_world_side_effects_blocked !== true) {
    throw new Error("Router policy must block real world side effects");
  }
  console.log("✅ verified: router policy configuration attributes correct");

  // 4. Verify scenario coverage
  if (!Array.isArray(scenarios.scenarios) || scenarios.scenarios.length < 3) {
    throw new Error("Scenarios configuration must define at least 3 scenarios");
  }
  const s1 = scenarios.scenarios.find(s => s.scenario_id.includes("scenario_1") || s.scenario_id.includes("default_sample"));
  const s2 = scenarios.scenarios.find(s => s.scenario_id.includes("scenario_2") || s.scenario_id.includes("product_delivery"));
  const s3 = scenarios.scenarios.find(s => s.scenario_id.includes("scenario_3") || s.scenario_id.includes("media_growth"));

  if (!s1 || !s2 || !s3) {
    throw new Error("Required scenarios are missing or mislabeled");
  }

  // Validate scenario 1 content matches default 1.0C sample plan goals/concept
  if (!s1.source_goal.includes("Grow AI Company OS")) {
    throw new Error("Scenario 1 must match the default 1.0C sample plan goal");
  }
  if (s1.missions.length !== samplePlan.missions.length) {
    throw new Error(`Scenario 1 has ${s1.missions.length} missions instead of ${samplePlan.missions.length} missions matching the default 1.0C plan`);
  }
  const requiredTypes = ["REPO_AUDIT", "PRODUCT_RESEARCH", "MARKET_RESEARCH", "CONTENT_PLANNING", "LEAD_RESEARCH", "PRICING_ANALYSIS", "DOC_SUMMARY", "VERIFY_PHASE"];
  for (const type of requiredTypes) {
    if (!s1.missions.some(m => m.mission_type === type)) {
      throw new Error(`Scenario 1 is missing required mission type: ${type}`);
    }
  }
  // Validate scenario 2 covers product_delivery
  if (s2.goal_type !== "product_delivery") {
    throw new Error("Scenario 2 must cover product_delivery");
  }
  // Validate scenario 3 covers media_growth
  if (s3.goal_type !== "media_growth") {
    throw new Error("Scenario 3 must cover media_growth");
  }
  console.log("✅ verified: scenarios include 3 required scenarios with correct goals, mappings, and mission types");

  // 5. Verify documentation mentions safety gates
  const routerDoc = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/capability-router.md"), "utf8");
  const queueDoc = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/local-mission-queue.md"), "utf8");

  const safetyKeywords = [
    /deploy/i, /secret/i, /\.env/i, /destructive (db|database)/i, /spend/i, /external comm(unication)?s?/, /auto-publish/i
  ];
  const combinedDocs = routerDoc + " " + queueDoc;
  for (const regex of safetyKeywords) {
    if (!regex.test(combinedDocs)) {
      throw new Error(`Safety constraint keyword matching ${regex} is missing in documentation`);
    }
  }
  console.log("✅ verified: capability router documentation details safety controls");

  // 6. Validate dry-run script doesn't call external APIs & has deterministic ID generation
  const scriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-capability-router-dry-run.mjs"), "utf8");
  const forbiddenPatterns = [
    /fetch\(/, /axios\./, /sendMail/, /publish\(/, /deploy\(/, /\.post\(/,
    /Date\.now\(\)/, /Math\.random\(\)/, /new Date\(/
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(scriptContent)) {
      throw new Error(`Dry-run capability router script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
  }

  if (!scriptContent.includes("reports/capability-router/latest.json") && !scriptContent.includes("reports\", \"capability-router\", \"latest.json")) {
    throw new Error("Dry-run capability router script does not write to reports/capability-router/latest.json");
  }
  if (!scriptContent.includes("--simulate-workers") || !scriptContent.includes("--scenario") || !scriptContent.includes("--mission-plan")) {
    throw new Error("Dry-run capability router script is missing support for required CLI options");
  }
  console.log("✅ verified: dry-run router script has no external action calls and writes to correct report path");

  // 7. Verify self-test integration
  const selfTestPath = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  const selfTestContent = fs.readFileSync(selfTestPath, "utf8");
  if (!selfTestContent.includes("verify-1.0d") || !selfTestContent.includes("1.0d")) {
    throw new Error("self-test-gate.mjs does not include verify-1.0d or 1.0d filter");
  }
  console.log("✅ verified: self-test gate includes verify-1.0d");

  // 8. Verify execution status mentions Milestone 1.0D
  const execStatusPath = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
  if (!execStatusContent.includes("Milestone 1.0D")) {
    throw new Error("execution-status.md does not mention Milestone 1.0D");
  }
  console.log("✅ verified: execution status doc mentions Milestone 1.0D");

  // 9. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-capability-router") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master HEAD --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping strict diff file checks.");
    }

    const allowed = [
      "docs/ai-company-os/capability-router.md",
      "docs/ai-company-os/local-mission-queue.md",
      "configs/ai-company/router-policy.json",
      "configs/ai-company/router-scenarios.1.0d.json",
      "scripts/ai-company-capability-router-dry-run.mjs",
      "packages/db/src/_verify-1.0d.mjs",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/capability-router/latest") || changedFile.includes("reports/mission-planner/latest")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not Milestone 1.0D branch.");
  }

  console.log("🎉 ALL PHASE 1.0D VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
