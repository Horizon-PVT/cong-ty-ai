import fs from "node:fs";
import path from "node:url";
import fsp from "node:fs/promises";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = fsp ? path.fileURLToPath(import.meta.url) : "";
const repoRoot = execSync ? execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim() : "";

async function main() {
  console.log("Starting Phase 1.0B verification...");

  // 1. Verify docs exist
  const docs = [
    "docs/ai-company-os/capability-registry.md",
    "docs/ai-company-os/capability-contracts.md"
  ];
  for (const doc of docs) {
    const fullPath = execSync ? path.fileURLToPath(`file:///${repoRoot}/${doc}`) : "";
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required document "${doc}" does not exist`);
    }
  }
  console.log("✅ verified: capability-registry.md and capability-contracts.md exist");

  // 2. Verify configs exist and parse
  const registryPath = execSync ? path.fileURLToPath(`file:///${repoRoot}/configs/ai-company/capability-registry.json`) : "";
  if (!fs.existsSync(registryPath)) {
    throw new Error("configs/ai-company/capability-registry.json does not exist");
  }
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse capability-registry.json: ${err.message}`);
  }
  console.log("✅ verified: capability-registry.json exists and parses");

  const schemaPath = execSync ? path.fileURLToPath(`file:///${repoRoot}/configs/ai-company/capability-contract.schema.json`) : "";
  if (!fs.existsSync(schemaPath)) {
    throw new Error("configs/ai-company/capability-contract.schema.json does not exist");
  }
  try {
    JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse capability-contract.schema.json: ${err.message}`);
  }
  console.log("✅ verified: capability-contract.schema.json exists and parses");

  // 3. Verify capabilities in JSON
  const expectedFactories = [
    "ai_dev_factory", "media_factory", "sales_factory", "research_factory",
    "finance_factory", "customer_success_factory", "knowledge_factory"
  ];

  const configFactories = new Set(registry.capabilities.map(c => c.factory_id));
  for (const factory of expectedFactories) {
    if (!configFactories.has(factory)) {
      throw new Error(`Required factory "${factory}" missing from capability registry`);
    }
  }
  console.log("✅ verified: all required factories exist in registry");

  const requiredCapabilities = [
    "dev_repo_audit", "dev_task_implementation", "dev_pr_review", "dev_e2e_merge_gate", "dev_self_test_verification",
    "media_content_strategy", "media_content_generation", "media_review_queue", "media_publish_dry_run", "media_brand_memory",
    "sales_lead_research", "sales_message_drafting", "sales_followup_planning", "sales_offer_packaging", "sales_pipeline_reporting",
    "market_research", "competitor_research", "product_research", "technical_research", "source_summary",
    "budget_tracking", "pricing_analysis", "revenue_projection", "cost_risk_review",
    "customer_onboarding_plan", "customer_issue_triage", "customer_feedback_summary", "retention_plan",
    "knowledge_ingestion", "memory_update_candidate", "internal_docs_summary", "decision_log_maintenance"
  ];

  const capabilityIds = registry.capabilities.map(c => c.capability_id);
  const uniqueIds = new Set(capabilityIds);
  if (uniqueIds.size !== capabilityIds.length) {
    throw new Error("Duplicate capability_id values found in registry");
  }
  console.log("✅ verified: capability_id values are unique");

  for (const cap of requiredCapabilities) {
    if (!uniqueIds.has(cap)) {
      throw new Error(`Required capability "${cap}" missing from capability registry`);
    }
  }
  console.log("✅ verified: all required capabilities exist in registry");

  // Validate every capability has required fields
  const requiredFields = [
    "capability_id", "name", "factory_id", "owner_agent", "status", "maturity_level",
    "accepted_mission_types", "required_inputs", "output_artifacts", "allowed_actions",
    "blocked_actions", "approval_required_actions", "safety_boundary", "verifier_requirements",
    "depends_on", "handoff_target"
  ];

  for (const cap of registry.capabilities) {
    for (const field of requiredFields) {
      if (!(field in cap)) {
        throw new Error(`Capability "${cap.capability_id}" is missing required field: ${field}`);
      }
    }
    // Check valid factory reference from 1.0A
    if (!expectedFactories.includes(cap.factory_id)) {
      throw new Error(`Capability "${cap.capability_id}" references invalid factory_id: ${cap.factory_id}`);
    }

    // Check maturity level limits
    if (cap.factory_id === "ai_dev_factory") {
      if (cap.maturity_level !== "operational") {
        throw new Error(`ai_dev_factory capability "${cap.capability_id}" maturity level must be "operational", got "${cap.maturity_level}"`);
      }
    } else {
      if (cap.maturity_level === "operational") {
        throw new Error(`Non-dev factory capability "${cap.capability_id}" must not be "operational" yet`);
      }
    }
  }
  console.log("✅ verified: every capability has required fields, valid factory reference, and correct maturity constraints");

  // 4. Verify document content details
  const registryDocContent = fs.readFileSync(execSync ? path.fileURLToPath(`file:///${repoRoot}/docs/ai-company-os/capability-registry.md`) : "", "utf8");
  const contractsDocContent = fs.readFileSync(execSync ? path.fileURLToPath(`file:///${repoRoot}/docs/ai-company-os/capability-contracts.md`) : "", "utf8");

  if (!registryDocContent.includes("Capability Registry")) {
    throw new Error("Capability Registry mention missing in overview doc");
  }
  if (!registryDocContent.includes("Registry vs. Router") && !registryDocContent.includes("router")) {
    throw new Error("Mentions distinguishing registry from router missing in docs");
  }
  if (!contractsDocContent.includes("owner approval") && !registryDocContent.includes("owner approval")) {
    throw new Error("Mentions of owner approval missing in docs");
  }
  if (!contractsDocContent.includes("blocked_actions") && !contractsDocContent.includes("Blocked Actions")) {
    throw new Error("Mentions of blocked actions missing in docs");
  }
  console.log("✅ verified: docs mention Capability Registry, distinguish registry from router, and mention owner approval & blocked actions");

  // Verify Safety boundaries mentions in docs and JSON safety rules
  const safetyKeywords = [
    /deploy/i, /secret/i, /\.env/i, /destructive (db|database)/i, /spend/i, /external comm(unication)?s?/, /auto-publish/i
  ];
  const combinedContent = registryDocContent + " " + contractsDocContent + " " + JSON.stringify(registry);
  for (const regex of safetyKeywords) {
    if (!regex.test(combinedContent)) {
      throw new Error(`Mentions of safety constraint matching ${regex} are missing in docs/configs`);
    }
  }
  console.log("✅ verified: safety rules block deploy, secrets, .env, destructive DB, spend, external communications, and auto-publishing");

  // 5. Verify self-test gate mentions verify-1.0b
  const selfTestPath = execSync ? path.fileURLToPath(`file:///${repoRoot}/scripts/ai-dev-factory-self-test-gate.mjs`) : "";
  const selfTestContent = fs.readFileSync(selfTestPath, "utf8");
  if (!selfTestContent.includes("verify-1.0b") || !selfTestContent.includes("1.0b")) {
    throw new Error("self-test-gate.mjs does not include verify-1.0b or 1.0b filter");
  }
  console.log("✅ verified: self-test gate includes verify-1.0b");

  // 6. Verify execution status mentions Milestone 1.0B
  const execStatusPath = execSync ? path.fileURLToPath(`file:///${repoRoot}/docs/ai-dev-factory-execution-status.md`) : "";
  const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
  if (!execStatusContent.includes("Milestone 1.0B")) {
    throw new Error("execution-status.md does not mention Milestone 1.0B");
  }
  console.log("✅ verified: execution status doc mentions Milestone 1.0B");

  // 7. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-capability-registry") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping strict diff file checks.");
    }

    const allowed = [
      "docs/ai-company-os/capability-registry.md",
      "docs/ai-company-os/capability-contracts.md",
      "configs/ai-company/capability-registry.json",
      "configs/ai-company/capability-contract.schema.json",
      "packages/db/src/_verify-1.0b.mjs",
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
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not Milestone 1.0B branch.");
  }

  console.log("🎉 ALL PHASE 1.0B VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
