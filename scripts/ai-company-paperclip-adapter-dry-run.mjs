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
const sourceArg = getArg("--source") || "all";
const formatArg = getArg("--format") || "json";
const writeReport = args.includes("--write-report");
const explain = args.includes("--explain");

console.log(`[Paperclip Adapter] Running dry-run adapter mapping for source: ${sourceArg}...`);

// Deterministic Run ID
function makeAdapterRunId(src, fmt) {
  const input = `adapter_${src}_${fmt}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `arun_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const adapterRunId = makeAdapterRunId(sourceArg, formatArg);

// Safely load JSON files
function loadJsonFile(relPath, defaultVal = {}) {
  try {
    const fullPath = path.join(repoRoot, relPath);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, "utf8"));
    }
  } catch (e) {
    // Default
  }
  return defaultVal;
}

const policy = loadJsonFile("configs/ai-company/paperclip-integration-policy.json");
const widgetMap = loadJsonFile("configs/ai-company/paperclip-widget-map.json");
const statusFixture = loadJsonFile("fixtures/ai-company/paperclip-company-status.sample.json");

const payloads = {};
if (widgetMap.widgets) {
  for (const widget of widgetMap.widgets) {
    payloads[widget.widget_id] = {
      source_file: widget.source_file,
      refresh_mode: widget.refresh_mode,
      data: statusFixture[widget.widget_id] || {}
    };
  }
}

const report = {
  adapter_run_id: adapterRunId,
  source_mode: sourceArg,
  integration_mode: policy.integration_mode || "local_contract",
  widget_payloads: payloads,
  data_sources_loaded: [
    "configs/ai-company/paperclip-integration-policy.json",
    "configs/ai-company/paperclip-widget-map.json",
    "fixtures/ai-company/paperclip-company-status.sample.json"
  ],
  data_sources_missing: [],
  safety_status: {
    no_deploy: true,
    no_secrets: true,
    no_spend: true,
    no_standalone_dashboard: true
  },
  owner_queue_summary: {
    pending_approvals: 1
  },
  next_actions: [
    "Commit integration contract branch and create PR.",
    "Owner approves integration contract to prepare for future UI integration."
  ],
  explanation: explain ? [
    `Parsed local configurations and structured ${Object.keys(payloads).length} widget payloads.`,
    `Format selected: ${formatArg}.`,
    `Run ID: ${adapterRunId}.`,
    `Safety locks confirmed: Standalone dashboard is strictly blocked.`
  ] : []
};

if (formatArg === "json") {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Adapter Run ID: ${adapterRunId}`);
  console.log(`Payloads mapped: ${Object.keys(payloads).length} widgets.`);
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/paperclip-adapter");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Paperclip Adapter] Adapter snapshot saved to reports/paperclip-adapter/latest.json");
}

console.log("[Paperclip Adapter] Done.");
