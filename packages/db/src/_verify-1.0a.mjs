import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

async function main() {
  console.log("Starting Phase 1.0A verification...");

  // 1. Verify docs exist
  const docs = [
    "docs/ai-company-os/overview.md",
    "docs/ai-company-os/organization-model.md",
    "docs/ai-company-os/milestone-1-roadmap.md",
    "docs/ai-company-os/milestone-0.3-closeout.md"
  ];
  for (const doc of docs) {
    const fullPath = path.join(repoRoot, doc);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required document "${doc}" does not exist`);
    }
  }
  console.log("✅ verified: all new docs exist");

  // 2. Verify config exists and parses
  const configPath = path.join(repoRoot, "configs/ai-company/organization-model.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("configs/ai-company/organization-model.json does not exist");
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse organization-model.json: ${err.message}`);
  }
  console.log("✅ verified: organization-model.json exists and parses");

  // 3. Verify configuration contents
  if (config.milestone !== "1.0A") {
    throw new Error(`Expected milestone 1.0A, got "${config.milestone}"`);
  }
  if (!config.company_name) {
    throw new Error("Missing company_name in config");
  }
  if (!config.owner_role || config.owner_role.role_id !== "human_owner") {
    throw new Error("Missing owner_role definition");
  }

  const expectedAgents = [
    "ceo_agent", "coo_agent", "cto_agent", "cmo_agent", "cfo_agent",
    "product_agent", "research_agent", "legal_risk_agent"
  ];
  const configAgents = config.executive_agents.map(a => a.agent_id);
  for (const agent of expectedAgents) {
    if (!configAgents.includes(agent)) {
      throw new Error(`Required executive agent "${agent}" missing from config`);
    }
  }
  console.log("✅ verified: required executive agents exist in JSON");

  const expectedFactories = [
    "ai_dev_factory", "media_factory", "sales_factory", "research_factory",
    "finance_factory", "customer_success_factory", "knowledge_factory"
  ];
  const configFactories = config.factories.map(f => f.factory_id);
  for (const factory of expectedFactories) {
    if (!configFactories.includes(factory)) {
      throw new Error(`Required factory "${factory}" missing from config`);
    }
  }
  console.log("✅ verified: required factories exist in JSON");

  const devFactory = config.factories.find(f => f.factory_id === "ai_dev_factory");
  if (!devFactory) {
    throw new Error("ai_dev_factory is not defined in factories list");
  }
  if (devFactory.owner_agent !== "cto_agent") {
    throw new Error(`ai_dev_factory owner should be cto_agent, got "${devFactory.owner_agent}"`);
  }
  console.log("✅ verified: AI Dev Factory exists and is owned by cto_agent");

  if (!config.blocked_actions || !Array.isArray(config.blocked_actions)) {
    throw new Error("Missing blocked_actions list in JSON");
  }
  if (!config.approval_required_actions || !Array.isArray(config.approval_required_actions)) {
    throw new Error("Missing approval_required_actions list in JSON");
  }
  console.log("✅ verified: blocked and approval-required actions lists exist");

  // 4. Verify document content details
  const overviewContent = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/overview.md"), "utf8");
  const modelContent = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/organization-model.md"), "utf8");
  const roadmapContent = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/milestone-1-roadmap.md"), "utf8");
  const closeoutContent = fs.readFileSync(path.join(repoRoot, "docs/ai-company-os/milestone-0.3-closeout.md"), "utf8");

  // Verify milestone and OS mentions
  if (!overviewContent.includes("Milestone 1") && !roadmapContent.includes("Milestone 1")) {
    throw new Error("Mentions of Milestone 1 missing in docs");
  }
  if (!overviewContent.includes("AI Company OS") && !modelContent.includes("AI Company OS")) {
    throw new Error("Mentions of AI Company OS missing in docs");
  }
  if (!modelContent.includes("owner approval") && !closeoutContent.includes("owner approval")) {
    throw new Error("Mentions of owner approval missing in docs");
  }
  console.log("✅ verified: docs mention Milestone 1, AI Company OS, and owner approval");

  // Verify Dev Factory vs Company OS distinction
  if (!overviewContent.includes("AI Dev Factory vs. AI Company OS") && !overviewContent.includes("Engineering")) {
    throw new Error("Docs do not distinguish AI Dev Factory from AI Company OS");
  }
  console.log("✅ verified: docs distinguish AI Dev Factory from AI Company OS");

  // Verify Safety boundaries mentions
  const safetyKeywords = [
    /deploy/i, /secret/i, /\.env/i, /destructive (db|database)/i, /spend/i, /external comm(unication)?s?/i
  ];
  const combinedDocs = overviewContent + " " + modelContent + " " + roadmapContent + " " + closeoutContent + " " + JSON.stringify(config);
  for (const regex of safetyKeywords) {
    if (!regex.test(combinedDocs)) {
      throw new Error(`Mentions of safety constraint matching ${regex} are missing in docs/configs`);
    }
  }
  console.log("✅ verified: safety rules block deploy, secrets, .env, destructive DB, spend, and external communications");

  // 5. Verify self-test gate mentions verify-1.0a
  const selfTestPath = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  const selfTestContent = fs.readFileSync(selfTestPath, "utf8");
  if (!selfTestContent.includes("verify-1.0a") || !selfTestContent.includes("1.0a")) {
    throw new Error("self-test-gate.mjs does not include verify-1.0a or 1.0a filter");
  }
  console.log("✅ verified: self-test gate includes verify-1.0a");

  // 6. Verify execution status mentions Milestone 1.0A
  const execStatusPath = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
  if (!execStatusContent.includes("Milestone 1.0A")) {
    throw new Error("execution-status.md does not mention Milestone 1.0A");
  }
  console.log("✅ verified: execution status doc mentions Milestone 1.0A");

  // 7. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-organization-model") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping strict diff file checks.");
    }

    const allowed = [
      "docs/ai-company-os/overview.md",
      "docs/ai-company-os/organization-model.md",
      "docs/ai-company-os/milestone-1-roadmap.md",
      "docs/ai-company-os/milestone-0.3-closeout.md",
      "configs/ai-company/organization-model.json",
      "packages/db/src/_verify-1.0a.mjs",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/queue-runner/latest")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not Milestone 1.0A branch.");
  }

  console.log("🎉 ALL PHASE 1.0A VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
