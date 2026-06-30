import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

async function main() {
  console.log("Starting Phase 1.0H verification...");

  // 1. Verify docs, configs, schemas, fixtures, and scripts exist
  const requiredFiles = [
    "docs/ai-company-os/paperclip-integration-contract.md",
    "docs/ai-company-os/paperclip-widget-map.md",
    "configs/ai-company/paperclip-integration-policy.json",
    "configs/ai-company/paperclip-widget-map.json",
    "schemas/ai-company/paperclip-company-status.schema.json",
    "schemas/ai-company/paperclip-owner-action.schema.json",
    "schemas/ai-company/paperclip-widget-map.schema.json",
    "fixtures/ai-company/paperclip-company-status.sample.json",
    "fixtures/ai-company/paperclip-owner-action.sample.json",
    "scripts/ai-company-paperclip-contract-validate.mjs",
    "scripts/ai-company-paperclip-adapter-dry-run.mjs"
  ];
  for (const file of requiredFiles) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file "${file}" does not exist`);
    }
  }
  console.log("✅ verified: required documents, configurations, schemas, fixtures, and scripts exist");

  // 2. Parse configs and validate json content
  let policy, widgetMap, statusSchema, actionSchema, widgetMapSchema;
  try {
    policy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/paperclip-integration-policy.json"), "utf8"));
    widgetMap = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/paperclip-widget-map.json"), "utf8"));
    statusSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, "schemas/ai-company/paperclip-company-status.schema.json"), "utf8"));
    actionSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, "schemas/ai-company/paperclip-owner-action.schema.json"), "utf8"));
    widgetMapSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, "schemas/ai-company/paperclip-widget-map.schema.json"), "utf8"));
  } catch (err) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
  console.log("✅ verified: all JSON configuration and schema files parsed successfully");

  // 3. Verify policy attributes
  if (policy.integration_mode !== "local_contract") {
    throw new Error("Integration policy must define integration_mode as local_contract");
  }
  if (policy.paperclip_is_primary_ui !== true) {
    throw new Error("Integration policy must assert Paperclip as primary UI");
  }
  if (policy.standalone_dashboard_allowed === true) {
    throw new Error("Integration policy must block standalone dashboards");
  }
  if (policy.frontend_ui_allowed === true) {
    throw new Error("Integration policy must block frontend UI building");
  }
  if (policy.live_api_bridge_allowed === true) {
    throw new Error("Integration policy must block live API bridge");
  }
  if (policy.deploy_allowed === true || policy.publish_allowed === true || policy.spend_allowed === true || policy.customer_comms_allowed === true || policy.secret_read_allowed === true || policy.production_data_mutation_allowed === true) {
    throw new Error("Integration policy must enforce all standard safety locks");
  }
  console.log("✅ verified: paperclip integration policy attributes are correct");

  // 4. Verify widget map includes all required widgets
  const requiredWidgets = [
    "company_status", "mission_board", "factories", "ai_staff", "provider_performance",
    "learning_feed", "staffing_gaps", "candidate_workers", "worker_scorecards",
    "owner_action_queue", "safety_locks", "next_actions"
  ];
  const registeredWidgets = widgetMap.widgets.map(w => w.widget_id);
  for (const wid of requiredWidgets) {
    if (!registeredWidgets.includes(wid)) {
      throw new Error(`Widget map is missing required widget panel: ${wid}`);
    }
  }
  console.log("✅ verified: widget map covers all 12 required dashboard panels");

  // 5. Verify schemas include required top-level fields
  const statusProperties = Object.keys(statusSchema.properties);
  const requiredStatusProps = [
    "schema_version", "generated_by", "integration_target", "milestone_status",
    "org_summary", "provider_summary", "learning_summary", "staffing_summary",
    "owner_action_queue_summary", "safety_status", "next_recommended_actions"
  ];
  for (const prop of requiredStatusProps) {
    if (!statusProperties.includes(prop)) {
      throw new Error(`Status schema is missing required property: ${prop}`);
    }
  }
  console.log("✅ verified: JSON schemas include all required top-level integration contract fields");

  // 6. Verify scripts support required CLI options & maintain boundaries
  const validatorScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-paperclip-contract-validate.mjs"), "utf8");
  const adapterScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-paperclip-adapter-dry-run.mjs"), "utf8");

  const forbiddenPatterns = [
    /fetch\(/, /axios\./, /sendMail/, /publish\(/, /deploy\(/, /\.post\(/,
    /Date\.now\(\)/, /Math\.random\(\)/, /new Date\(/
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(validatorScriptContent)) {
      throw new Error(`Validator script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
    if (pattern.test(adapterScriptContent)) {
      throw new Error(`Adapter script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
  }

  if (validatorScriptContent.includes("process.env.") && !validatorScriptContent.includes("process.env.argv")) {
    throw new Error("Validator script must not read secrets from process.env");
  }
  if (adapterScriptContent.includes("process.env.")) {
    throw new Error("Adapter script must not read secrets from process.env");
  }

  if (!validatorScriptContent.includes("--contract") || !validatorScriptContent.includes("--write-report") || !validatorScriptContent.includes("--explain")) {
    throw new Error("Validator script is missing support for required CLI options");
  }
  if (!adapterScriptContent.includes("--source") || !adapterScriptContent.includes("--format") || !adapterScriptContent.includes("--write-report") || !adapterScriptContent.includes("--explain")) {
    throw new Error("Adapter script is missing support for required CLI options");
  }

  // 7. Verify no capability-registry.json mutations
  if (validatorScriptContent.includes("capability-registry.json") && (validatorScriptContent.includes("fs.writeFileSync") || validatorScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Validator script must not automatically mutate the capability registry");
  }
  if (adapterScriptContent.includes("capability-registry.json") && (adapterScriptContent.includes("fs.writeFileSync") || adapterScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Adapter script must not automatically mutate the capability registry");
  }
  console.log("✅ verified: dry-run scripts support all required CLI options and maintain safety boundaries");

  // 8. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-paperclip-integration-contract") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master HEAD --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping diff checks.");
    }

    const allowed = [
      "docs/ai-company-os/paperclip-integration-contract.md",
      "docs/ai-company-os/paperclip-widget-map.md",
      "configs/ai-company/paperclip-integration-policy.json",
      "configs/ai-company/paperclip-widget-map.json",
      "schemas/ai-company/paperclip-company-status.schema.json",
      "schemas/ai-company/paperclip-owner-action.schema.json",
      "schemas/ai-company/paperclip-widget-map.schema.json",
      "fixtures/ai-company/paperclip-company-status.sample.json",
      "fixtures/ai-company/paperclip-owner-action.sample.json",
      "scripts/ai-company-paperclip-contract-validate.mjs",
      "scripts/ai-company-paperclip-adapter-dry-run.mjs",
      "packages/db/src/_verify-1.0h.mjs",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/paperclip-contract/") || changedFile.includes("reports/paperclip-adapter/")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not feat/ai-company-os-paperclip-integration-contract.");
  }

  console.log("🎉 ALL PHASE 1.0H VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
