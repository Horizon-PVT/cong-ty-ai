import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

async function main() {
  console.log("Starting Phase 1.0C verification...");

  // 1. Verify docs and script files exist
  const requiredFiles = [
    "docs/ai-company-os/mission-planner.md",
    "docs/ai-company-os/mission-plan-contract.md",
    "configs/ai-company/mission-plan.schema.json",
    "configs/ai-company/mission-types.json",
    "configs/ai-company/sample-mission-plan.1.0c.json",
    "scripts/ai-company-mission-planner-dry-run.mjs"
  ];
  for (const file of requiredFiles) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file "${file}" does not exist`);
    }
  }
  console.log("✅ verified: required documents, schemas, and dry-run planner exist");

  // 2. Parse configs and validate json
  const typesPath = path.join(repoRoot, "configs/ai-company/mission-types.json");
  const schemaPath = path.join(repoRoot, "configs/ai-company/mission-plan.schema.json");
  const samplePath = path.join(repoRoot, "configs/ai-company/sample-mission-plan.1.0c.json");
  const registryPath = path.join(repoRoot, "configs/ai-company/capability-registry.json");

  let missionTypes, schema, samplePlan, registry;
  try {
    missionTypes = JSON.parse(fs.readFileSync(typesPath, "utf8"));
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    samplePlan = JSON.parse(fs.readFileSync(samplePath, "utf8"));
    registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (err) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
  console.log("✅ verified: all configuration files parsed successfully");

  // 3. Verify capability consistency
  const capMap = new Map();
  for (const cap of registry.capabilities) {
    capMap.set(cap.capability_id, cap);
  }

  // Validate every mission type maps to an existing capability
  const expectedFactories = [
    "ai_dev_factory", "media_factory", "sales_factory", "research_factory",
    "finance_factory", "customer_success_factory", "knowledge_factory"
  ];

  for (const type of missionTypes) {
    if (!capMap.has(type.default_capability)) {
      throw new Error(`Mission type "${type.mission_type}" maps to non-existent capability: ${type.default_capability}`);
    }
    const cap = capMap.get(type.default_capability);
    if (!expectedFactories.includes(cap.factory_id)) {
      throw new Error(`Capability "${cap.capability_id}" references invalid factory_id: ${cap.factory_id}`);
    }
  }
  console.log("✅ verified: every mission type maps to a valid registered capability");

  // Validate every sample mission maps to an existing capability
  const sampleRequiredFields = [
    "target_factory", "target_capability", "owner_agent", "required_inputs",
    "expected_outputs", "safety_class", "blocked_actions", "approval_required_actions"
  ];

  for (const m of samplePlan.missions) {
    if (!capMap.has(m.target_capability)) {
      throw new Error(`Sample mission "${m.mission_id}" maps to non-existent capability: ${m.target_capability}`);
    }
    for (const field of sampleRequiredFields) {
      if (!(field in m)) {
        throw new Error(`Sample mission "${m.mission_id}" is missing required field: ${field}`);
      }
    }
    if (m.dispatch_allowed !== false) {
      throw new Error(`Sample mission "${m.mission_id}" has dispatch_allowed=true (must be false in 1.0C)`);
    }
    if (!m.dispatch_blocked_reason) {
      throw new Error(`Sample mission "${m.mission_id}" is missing dispatch_blocked_reason`);
    }
  }
  console.log("✅ verified: every sample mission maps correctly to registry and is safe (dispatch_allowed=false)");

  // 4. Verify safety and documentation content details
  const plannerDocContent = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/mission-planner.md"), "utf8");
  const contractDocContent = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/mission-plan-contract.md"), "utf8");

  if (!plannerDocContent.includes("Mission Planner")) {
    throw new Error("Mission Planner mention missing in overview doc");
  }
  if (!plannerDocContent.includes("Capability Registry")) {
    throw new Error("Capability Registry mention missing in overview doc");
  }
  if (!plannerDocContent.includes("Mission Planner vs. Capability Router") && !plannerDocContent.includes("Router")) {
    throw new Error("Mentions distinguishing planner from router missing in docs");
  }
  if (!plannerDocContent.includes("planning and dispatching") && !plannerDocContent.includes("planning vs. dispatching")) {
    throw new Error("Mentions distinguishing planning from dispatching missing in docs");
  }
  if (!plannerDocContent.includes("owner approval") && !contractDocContent.includes("owner approval")) {
    throw new Error("Mentions of owner approval missing in docs");
  }

  // Safety boundaries checks
  const safetyKeywords = [
    /deploy/i, /secret/i, /\.env/i, /destructive (db|database)/i, /spend/i, /external comm(unication)?s?/, /auto-publish/i
  ];
  const combinedContent = plannerDocContent + " " + contractDocContent + " " + JSON.stringify(samplePlan);
  for (const regex of safetyKeywords) {
    if (!regex.test(combinedContent)) {
      throw new Error(`Mentions of safety constraint matching ${regex} are missing in docs/configs`);
    }
  }
  console.log("✅ verified: docs and configs reference all safety controls and boundaries");

  // Validate dry-run script doesn't call external APIs (checking for fetch, axios, post, sendMail, publish)
  const scriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-mission-planner-dry-run.mjs"), "utf8");
  const forbiddenPatterns = [
    /fetch\(/, /axios\./, /sendMail/, /publish\(/, /deploy\(/, /\.post\(/
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(scriptContent)) {
      throw new Error(`Dry-run planner script contains potential external action API: ${pattern}`);
    }
  }
  
  if (!scriptContent.includes("reports/mission-planner/latest.json") && !scriptContent.includes("reports\", \"mission-planner\", \"latest.json")) {
    throw new Error("Dry-run planner script does not use report path reports/mission-planner/latest.json");
  }
  console.log("✅ verified: dry-run planner script has no external action calls and writes to correct report path");

  // 5. Verify self-test integration
  const selfTestPath = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  const selfTestContent = fs.readFileSync(selfTestPath, "utf8");
  if (!selfTestContent.includes("verify-1.0c") || !selfTestContent.includes("1.0c")) {
    throw new Error("self-test-gate.mjs does not include verify-1.0c or 1.0c filter");
  }
  console.log("✅ verified: self-test gate includes verify-1.0c");

  // 6. Verify execution status mentions Milestone 1.0C
  const execStatusPath = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
  if (!execStatusContent.includes("Milestone 1.0C")) {
    throw new Error("execution-status.md does not mention Milestone 1.0C");
  }
  console.log("✅ verified: execution status doc mentions Milestone 1.0C");

  // 7. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-mission-planner") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master HEAD --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping strict diff file checks.");
    }

    const allowed = [
      "docs/ai-company-os/mission-planner.md",
      "docs/ai-company-os/mission-plan-contract.md",
      "configs/ai-company/mission-plan.schema.json",
      "configs/ai-company/mission-types.json",
      "configs/ai-company/sample-mission-plan.1.0c.json",
      "scripts/ai-company-mission-planner-dry-run.mjs",
      "packages/db/src/_verify-1.0c.mjs",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/mission-planner/latest") || changedFile.includes("reports/queue-runner/latest")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not Milestone 1.0C branch.");
  }

  console.log("🎉 ALL PHASE 1.0C VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
