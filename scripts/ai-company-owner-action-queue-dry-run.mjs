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
const actionTypeArg = getArg("--action-type");
const titleArg = getArg("--title") || "Action Item";
const priorityArg = getArg("--priority") || "medium";
const writeReport = args.includes("--write-report");
const writeMemory = args.includes("--write-memory");
const explain = args.includes("--explain");

if (!actionTypeArg) {
  console.error("Usage: --action-type <merge|deploy|publish|spend|customer_comms|permanent_worker|provider_live_api> [--title <text>] [--priority low|medium|high] [--write-report] [--write-memory] [--explain]");
  process.exit(1);
}

// Deterministic ID
function makeActionId(type, prio) {
  const input = `action_${type}_${prio}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `act_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const actionId = makeActionId(actionTypeArg, priorityArg);

console.log("[Owner Action Queue] Initializing action item creation...");

// Classify risk level
let riskLevel = "low";
if (["deploy", "spend", "provider_live_api"].includes(actionTypeArg)) {
  riskLevel = "high";
} else if (["publish", "permanent_worker"].includes(actionTypeArg)) {
  riskLevel = "medium";
}

const actionItem = {
  item_id: actionId,
  action_type: actionTypeArg,
  title: titleArg,
  priority: priorityArg,
  risk_level: riskLevel,
  approval_required: true,
  suggested_action: `Inspect configurations and verifications before approving '${actionTypeArg}'.`,
  is_sample: false
};

console.log(`[Owner Action Queue] Created action item: ${actionId} (${priorityArg} priority, risk: ${riskLevel})`);

if (writeMemory) {
  const memoryPath = path.join(repoRoot, "memory/ai-company/owner-action-queue.jsonl");
  fs.appendFileSync(memoryPath, JSON.stringify(actionItem) + "\n");
  console.log("[Owner Action Queue] Action item appended to owner-action-queue.jsonl");
}

const report = {
  action_run_id: `run_${actionId}`,
  created_item: actionItem,
  safety_guards: {
    action_execution_blocked: true,
    local_simulation_only: true
  },
  explanation: explain ? [
    `Created local approval item '${actionId}'.`,
    `Risk classified as '${riskLevel}'.`,
    "All action execution is dry-run only; no external changes applied."
  ] : []
};

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/owner-action");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Owner Action Queue] Report written to reports/owner-action/latest.json");
}

console.log("[Owner Action Queue] Done.");
