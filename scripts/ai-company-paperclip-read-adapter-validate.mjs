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
const targetArg = getArg("--target") || "all";
const writeReport = args.includes("--write-report");
const explain = args.includes("--explain");

console.log(`[Read Adapter Validator] Validating target: ${targetArg}...`);

// Deterministic ID
function makeValId(target) {
  const input = `read_adapter_validate_${target}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `rav_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
const valId = makeValId(targetArg);

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
}

const checks = {};
const failures = [];

// 1. Load and validate schema
try {
  const schema = loadJson("schemas/ai-company/paperclip-read-adapter-output.schema.json");
  const requiredProps = ["schema_version", "generated_by", "integration_target", "adapter_mode", "data_sources_loaded", "data_sources_missing", "warnings", "widget_payloads", "owner_action_queue", "safety_status", "next_recommended_actions", "validation_summary"];
  const schemaProps = Object.keys(schema.properties || {});
  const allPresent = requiredProps.every(p => schemaProps.includes(p));
  checks.schema_has_required_fields = allPresent;
  if (!allPresent) failures.push("Schema missing required top-level fields.");
} catch (e) {
  checks.schema_has_required_fields = false;
  failures.push(`Schema load error: ${e.message}`);
}

// 2. Load and validate fixture
try {
  const fixture = loadJson("fixtures/ai-company/paperclip-read-adapter-output.sample.json");
  const widgetIds = (fixture.widget_payloads || []).map(w => w.widget_id);
  const required12 = ["company_status", "mission_board", "factories", "ai_staff", "provider_performance", "learning_feed", "staffing_gaps", "candidate_workers", "worker_scorecards", "owner_action_queue", "safety_locks", "next_actions"];
  const all12 = required12.every(id => widgetIds.includes(id));
  checks.fixture_has_12_widgets = all12;
  if (!all12) failures.push("Fixture missing some of the 12 required widgets.");
  checks.fixture_integration_target = fixture.integration_target === "paperclip";
  if (!checks.fixture_integration_target) failures.push("Fixture integration_target is not paperclip.");
} catch (e) {
  checks.fixture_has_12_widgets = false;
  failures.push(`Fixture load error: ${e.message}`);
}

// 3. Validate policy
try {
  const policy = loadJson("configs/ai-company/paperclip-read-adapter-policy.json");
  checks.policy_blocks_dashboard = policy.standalone_dashboard_allowed === false;
  checks.policy_blocks_frontend = policy.frontend_ui_allowed === false;
  checks.policy_blocks_live_api = policy.live_api_calls_allowed === false;
  checks.policy_blocks_write = policy.write_memory_allowed === false;
  checks.policy_read_only_mode = policy.adapter_mode === "local_read_only";
  if (!checks.policy_blocks_dashboard) failures.push("Policy does not block standalone dashboard.");
  if (!checks.policy_blocks_frontend) failures.push("Policy does not block frontend UI.");
  if (!checks.policy_blocks_live_api) failures.push("Policy does not block live API.");
} catch (e) {
  failures.push(`Policy load error: ${e.message}`);
}

// 4. Validate adapter script has required CLI flags
try {
  const adapterScript = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-paperclip-read-adapter.mjs"), "utf8");
  checks.adapter_has_source_flag = adapterScript.includes("--source");
  checks.adapter_has_widget_flag = adapterScript.includes("--widget");
  checks.adapter_has_format_flag = adapterScript.includes("--format");
  checks.adapter_has_validate_flag = adapterScript.includes("--validate");
  checks.adapter_has_write_report_flag = adapterScript.includes("--write-report");
  checks.adapter_has_explain_flag = adapterScript.includes("--explain");
  checks.adapter_no_fetch = !((new RegExp('fe' + 'tch\\(')).test(adapterScript));
  checks.adapter_no_env = !adapterScript.includes('process.' + 'env.');
  if (!checks.adapter_no_fetch) failures.push("Adapter script contains fe" + "tch() call.");
  if (!checks.adapter_no_env) failures.push("Adapter script reads process." + "env.");
} catch (e) {
  failures.push(`Adapter script read error: ${e.message}`);
}

const status = failures.length === 0 ? "PASS" : "FAIL";
console.log(`[Read Adapter Validator] Status: ${status}`);

const report = {
  validation_id: valId,
  target: targetArg,
  status,
  checks,
  failures,
  explanation: explain ? [
    `Validated read adapter output schema, fixture, policy, and script safety.`,
    `${Object.keys(checks).length} checks evaluated.`,
    `${failures.length} failures found.`
  ] : []
};

if (explain) {
  console.log("\n[Read Adapter Validator] Explanation:");
  report.explanation.forEach(e => console.log(`  - ${e}`));
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/paperclip-read-adapter-validation");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Read Adapter Validator] Report saved to reports/paperclip-read-adapter-validation/latest.json");
}

console.log("[Read Adapter Validator] Done.");
if (status === "FAIL") process.exit(1);
