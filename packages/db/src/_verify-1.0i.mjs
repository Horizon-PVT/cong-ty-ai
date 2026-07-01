// _verify-1.0i.mjs — Milestone 1.0I Verifier: Paperclip Read Adapter Implementation
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");

let pass = 0;
let fail = 0;
const failures = [];

function check(label, condition) {
  if (condition) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; failures.push(label); console.log(`  ❌ ${label}`); }
}
function loadJson(relPath) {
  const full = path.join(repoRoot, relPath);
  if (!fs.existsSync(full)) return null;
  try { return JSON.parse(fs.readFileSync(full, "utf8")); } catch { return null; }
}
function fileExists(relPath) { return fs.existsSync(path.join(repoRoot, relPath)); }
function readFile(relPath) {
  const full = path.join(repoRoot, relPath);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8");
}

console.log("\n🔍 Milestone 1.0I Verification: Paperclip Read Adapter Implementation\n");

// === Docs ===
console.log("📄 Documentation:");
check("docs/ai-company-os/paperclip-read-adapter.md exists", fileExists("docs/ai-company-os/paperclip-read-adapter.md"));

// === Configs ===
console.log("\n⚙️ Configs:");
const policy = loadJson("configs/ai-company/paperclip-read-adapter-policy.json");
check("paperclip-read-adapter-policy.json exists and parses", policy !== null);
check("policy.adapter_mode is local_read_only", policy?.adapter_mode === "local_read_only");
check("policy.paperclip_is_primary_ui is true", policy?.paperclip_is_primary_ui === true);
check("policy.standalone_dashboard_allowed is false", policy?.standalone_dashboard_allowed === false);
check("policy.frontend_ui_allowed is false", policy?.frontend_ui_allowed === false);
check("policy.live_api_calls_allowed is false", policy?.live_api_calls_allowed === false);
check("policy.write_memory_allowed is false", policy?.write_memory_allowed === false);
check("policy.mutate_registry_allowed is false", policy?.mutate_registry_allowed === false);
check("policy.deploy_allowed is false", policy?.deploy_allowed === false);
check("policy.publish_allowed is false", policy?.publish_allowed === false);
check("policy.spend_allowed is false", policy?.spend_allowed === false);
check("policy.customer_comms_allowed is false", policy?.customer_comms_allowed === false);
check("policy.secret_read_allowed is false", policy?.secret_read_allowed === false);
check("policy.production_data_mutation_allowed is false", policy?.production_data_mutation_allowed === false);

const sources = loadJson("configs/ai-company/paperclip-read-sources.json");
check("paperclip-read-sources.json exists and parses", sources !== null);
if (sources?.sources) {
  const srcIds = sources.sources.map(s => s.source_id);
  check("sources includes paperclip_integration_policy (required)", srcIds.includes("paperclip_integration_policy"));
  check("sources includes paperclip_widget_map (required)", srcIds.includes("paperclip_widget_map"));
  check("sources includes paperclip_company_status_schema (required)", srcIds.includes("paperclip_company_status_schema"));
  check("sources includes paperclip_owner_action_schema (required)", srcIds.includes("paperclip_owner_action_schema"));
  check("sources includes company_status_report (optional)", srcIds.includes("company_status_report"));
  check("sources includes provider_performance (optional)", srcIds.includes("provider_performance"));
  check("sources includes mission_lessons (optional)", srcIds.includes("mission_lessons"));
  check("sources includes staffing_gaps (optional)", srcIds.includes("staffing_gaps"));
  check("sources includes owner_action_queue (optional)", srcIds.includes("owner_action_queue"));
}

// === Schemas ===
console.log("\n📐 Schemas:");
const outputSchema = loadJson("schemas/ai-company/paperclip-read-adapter-output.schema.json");
check("paperclip-read-adapter-output.schema.json exists and parses", outputSchema !== null);
if (outputSchema?.properties) {
  const props = Object.keys(outputSchema.properties);
  const requiredFields = ["schema_version", "generated_by", "integration_target", "adapter_mode", "data_sources_loaded", "data_sources_missing", "warnings", "widget_payloads", "owner_action_queue", "safety_status", "next_recommended_actions", "validation_summary"];
  for (const f of requiredFields) {
    check(`schema has field: ${f}`, props.includes(f));
  }
}

// === Fixtures ===
console.log("\n📦 Fixtures:");
const fixture = loadJson("fixtures/ai-company/paperclip-read-adapter-output.sample.json");
check("paperclip-read-adapter-output.sample.json exists and parses", fixture !== null);
if (fixture?.widget_payloads) {
  const widgetIds = fixture.widget_payloads.map(w => w.widget_id);
  const required12 = ["company_status", "mission_board", "factories", "ai_staff", "provider_performance", "learning_feed", "staffing_gaps", "candidate_workers", "worker_scorecards", "owner_action_queue", "safety_locks", "next_actions"];
  check("fixture has 12 widget payloads", widgetIds.length >= 12);
  for (const wid of required12) {
    check(`fixture includes widget: ${wid}`, widgetIds.includes(wid));
  }
}

// === Scripts ===
console.log("\n🔧 Scripts:");
check("ai-company-paperclip-read-adapter.mjs exists", fileExists("scripts/ai-company-paperclip-read-adapter.mjs"));
check("ai-company-paperclip-widget-payload-dry-run.mjs exists", fileExists("scripts/ai-company-paperclip-widget-payload-dry-run.mjs"));
check("ai-company-paperclip-read-adapter-validate.mjs exists", fileExists("scripts/ai-company-paperclip-read-adapter-validate.mjs"));

// Check CLI flags in adapter script
const adapterScript = readFile("scripts/ai-company-paperclip-read-adapter.mjs");
check("adapter script has --source flag", adapterScript.includes("--source"));
check("adapter script has --widget flag", adapterScript.includes("--widget"));
check("adapter script has --format flag", adapterScript.includes("--format"));
check("adapter script has --validate flag", adapterScript.includes("--validate"));
check("adapter script has --write-report flag", adapterScript.includes("--write-report"));
check("adapter script has --explain flag", adapterScript.includes("--explain"));

// Check CLI flags in widget payload script
const widgetScript = readFile("scripts/ai-company-paperclip-widget-payload-dry-run.mjs");
check("widget payload script has --widget flag", widgetScript.includes("--widget"));
check("widget payload script has --format flag", widgetScript.includes("--format"));
check("widget payload script has --write-report flag", widgetScript.includes("--write-report"));
check("widget payload script has --explain flag", widgetScript.includes("--explain"));

// Check CLI flags in validate script
const validateScript = readFile("scripts/ai-company-paperclip-read-adapter-validate.mjs");
check("validate script has --target flag", validateScript.includes("--target"));
check("validate script has --write-report flag", validateScript.includes("--write-report"));
check("validate script has --explain flag", validateScript.includes("--explain"));

// === Safety checks across all scripts ===
console.log("\n🔒 Safety:");
const allScripts = [adapterScript, widgetScript, validateScript];
const scriptNames = ["read-adapter", "widget-payload", "validate"];
for (let i = 0; i < allScripts.length; i++) {
  const s = allScripts[i];
  const name = scriptNames[i];
  check(`${name}: no fetch() calls`, !(/fetch\(/.test(s)));
  check(`${name}: no axios`, !s.includes("axios"));
  check(`${name}: no sendMail`, !s.includes("sendMail"));
  check(`${name}: no .post(`, !s.includes(".post("));
  check(`${name}: no Date.now()`, !s.includes("Date.now()"));
  check(`${name}: no Math.random()`, !s.includes("Math.random()"));
  check(`${name}: no new Date()`, !s.includes("new Date()"));
  check(`${name}: no crypto.randomUUID`, !s.includes("crypto.randomUUID"));
  check(`${name}: no process.env.`, !s.includes("process.env."));
}

// === Integration checks ===
console.log("\n🔗 Integration:");
const selfTestGate = readFile("scripts/ai-dev-factory-self-test-gate.mjs");
check("self-test gate includes verify-1.0i", selfTestGate.includes("verify-1.0i"));

const execStatus = readFile("docs/ai-dev-factory-execution-status.md");
check("execution status mentions Milestone 1.0I", execStatus.includes("1.0I"));

// === No frontend/dashboard ===
console.log("\n🚫 No frontend/dashboard:");
check("no app/ directory in scope", !fileExists("app/ai-company-dashboard"));
check("no pages/ directory in scope", !fileExists("pages/ai-company-dashboard"));
check("no components/ directory in scope", !fileExists("components/ai-company-dashboard"));

// === Run live checks ===
console.log("\n🏃 Live script runs:");

try {
  execSync("node scripts/ai-company-paperclip-read-adapter.mjs --source all --widget all --format json --validate --write-report --explain", { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
  check("read adapter dry-run passes", true);
} catch (e) {
  check("read adapter dry-run passes", false);
}

try {
  execSync("node scripts/ai-company-paperclip-widget-payload-dry-run.mjs --widget company_status --format json --write-report --explain", { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
  check("widget payload dry-run (company_status) passes", true);
} catch (e) {
  check("widget payload dry-run (company_status) passes", false);
}

try {
  execSync("node scripts/ai-company-paperclip-widget-payload-dry-run.mjs --widget owner_action_queue --format json --write-report --explain", { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
  check("widget payload dry-run (owner_action_queue) passes", true);
} catch (e) {
  check("widget payload dry-run (owner_action_queue) passes", false);
}

try {
  execSync("node scripts/ai-company-paperclip-read-adapter-validate.mjs --target all --write-report --explain", { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
  check("read adapter validation passes", true);
} catch (e) {
  check("read adapter validation passes", false);
}

// === Summary ===
console.log(`\n${"═".repeat(50)}`);
console.log(`✅ Passed: ${pass}`);
console.log(`❌ Failed: ${fail}`);
if (failures.length > 0) {
  console.log(`\nFailures:`);
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(`${"═".repeat(50)}`);
if (fail > 0) { console.log("\n❌ Milestone 1.0I verification FAILED."); process.exit(1); }
else { console.log("\n✅ Milestone 1.0I verification PASSED."); }
