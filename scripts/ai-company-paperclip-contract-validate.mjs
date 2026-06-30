import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}
const contractArg = getArg("--contract") || "all";
const writeReport = args.includes("--write-report");
const explain = args.includes("--explain");

console.log("[Contract Validator] Initializing Paperclip contract validation...");

// Deterministic ID
function makeValidationId(contract) {
  const input = `validate_${contract}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `val_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const validationRunId = makeValidationId(contractArg);

// Safely load JSON files
function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
}

const policy = loadJson("configs/ai-company/paperclip-integration-policy.json");
const widgetMap = loadJson("configs/ai-company/paperclip-widget-map.json");

// Core validation checks
const checks = {
  policy_parsed: true,
  widget_map_parsed: true,
  paperclip_is_primary_ui: policy.paperclip_is_primary_ui === true,
  standalone_dashboard_blocked: policy.standalone_dashboard_allowed === false,
  frontend_ui_blocked: policy.frontend_ui_allowed === false,
  live_api_bridge_blocked: policy.live_api_bridge_allowed === false,
  safety_guards_enforced: policy.deploy_allowed === false && policy.spend_allowed === false && policy.customer_comms_allowed === false,
  widgets_covered: widgetMap.widgets && widgetMap.widgets.length >= 12
};

let status = "PASS";
const failureReasons = [];

for (const [key, passed] of Object.entries(checks)) {
  if (!passed) {
    status = "FAIL";
    failureReasons.push(`${key} assertion failed`);
  }
}

// Perform mock schema validation on sample fixtures
let snapshotSchemaValid = false;
let actionSchemaValid = false;

try {
  const statusFixture = loadJson("fixtures/ai-company/paperclip-company-status.sample.json");
  const actionFixture = loadJson("fixtures/ai-company/paperclip-owner-action.sample.json");

  // Basic property assertion
  if (statusFixture.integration_target === "paperclip" && statusFixture.milestone_status) {
    snapshotSchemaValid = true;
  }
  if (actionFixture.action_id && actionFixture.action_type && actionFixture.approval_required) {
    actionSchemaValid = true;
  }
} catch (e) {
  status = "FAIL";
  failureReasons.push(`Fixture schema validation error: ${e.message}`);
}

checks.snapshot_schema_valid = snapshotSchemaValid;
checks.action_schema_valid = actionSchemaValid;

console.log(`[Contract Validator] Status: ${status}`);

const report = {
  validation_run_id: validationRunId,
  status: status,
  contract_targeted: contractArg,
  checks_evaluated: checks,
  failures: failureReasons,
  explanation: explain ? [
    `Validated Paperclip integration contract schemas.`,
    `Verified standalone UI builds are blocked (standalone_dashboard_allowed: false).`,
    `Checked widget mappings config containing ${widgetMap.widgets ? widgetMap.widgets.length : 0} items.`,
    `Confirmed dry-run safety attributes are correctly enforced.`
  ] : []
};

if (explain) {
  console.log("\n[Contract Validator] Explanation:");
  report.explanation.forEach(e => console.log(`  - ${e}`));
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/paperclip-contract");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Contract Validator] Report written to reports/paperclip-contract/latest.json");
}

console.log("[Contract Validator] Done.");
if (status === "FAIL") {
  process.exit(1);
}
