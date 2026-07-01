import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}
const widgetArg = getArg("--widget") || "company_status";
const formatArg = getArg("--format") || "json";
const writeReport = args.includes("--write-report");
const explain = args.includes("--explain");

console.log(`[Widget Payload] Building payload for widget: ${widgetArg}...`);

// Run the read adapter for a single widget and capture output
const adapterScript = path.join(repoRoot, "scripts/ai-company-paperclip-read-adapter.mjs");
const cmdArgs = [`--source`, `all`, `--widget`, widgetArg, `--format`, `json`];
if (explain) cmdArgs.push(`--explain`);

let adapterOutput;
try {
  const rawOutput = execSync(`node "${adapterScript}" ${cmdArgs.join(" ")}`, { encoding: "utf8", cwd: repoRoot });
  // Extract JSON from output (skip log lines) using brace counting
  const lines = rawOutput.split("\n");
  const jsonLines = [];
  let braceCount = 0;
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!started && trimmed.startsWith("{")) {
      started = true;
    }
    if (started) {
      jsonLines.push(line);
      for (const char of trimmed) {
        if (char === "{") braceCount++;
        if (char === "}") braceCount--;
      }
      if (braceCount === 0) {
        break;
      }
    }
  }
  adapterOutput = JSON.parse(jsonLines.join("\n"));
} catch (err) {
  console.error(`[Widget Payload] Error running adapter: ${err.message}`);
  process.exit(1);
}

const widgetPayload = adapterOutput.widget_payloads && adapterOutput.widget_payloads[0];

// Deterministic ID
function makePayloadId(wid) {
  const input = `widget_payload_${wid}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `wp_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}
const payloadId = makePayloadId(widgetArg);

const report = {
  payload_id: payloadId,
  widget_id: widgetArg,
  widget_payload: widgetPayload || {},
  adapter_run_id: adapterOutput.adapter_run_id,
  data_sources_loaded: adapterOutput.data_sources_loaded,
  data_sources_missing: adapterOutput.data_sources_missing,
  warnings: adapterOutput.warnings,
  explanation: explain ? [
    `Built single widget payload for: ${widgetArg}.`,
    `Payload ID: ${payloadId}.`,
    `Reused read adapter logic internally.`
  ] : []
};

if (formatArg === "json") {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Payload ID: ${payloadId}`);
  console.log(`Widget: ${widgetArg}`);
  console.log(`Status: ${widgetPayload ? widgetPayload.source_status : "unknown"}`);
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/paperclip-widget-payload");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Widget Payload] Report saved to reports/paperclip-widget-payload/latest.json");
}

console.log("[Widget Payload] Done.");
