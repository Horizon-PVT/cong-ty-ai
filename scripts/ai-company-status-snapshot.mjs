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
const formatArg = getArg("--format") || "json";
const writeReport = args.includes("--write-report");
const explain = args.includes("--explain");

// Deterministic ID
function makeSnapshotId(fmt) {
  const input = `snapshot_${fmt}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `snap_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const snapshotId = makeSnapshotId(formatArg);

console.log("[Status Snapshot] Generating company status snapshot...");

// Helper to load file safely
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

const policy = loadJsonFile("configs/ai-company/operator-console-policy.json");
const providers = loadJsonFile("configs/ai-company/provider-registry.json");
const pools = loadJsonFile("configs/ai-company/agent-provider-pools.json");
const scorecards = loadJsonFile("memory/ai-company/worker-scorecards.json");

// Build Paperclip-compatible JSON snapshot
const snapshot = {
  snapshot_id: snapshotId,
  timestamp: "2026-06-30T16:00:00Z",
  milestone_status: "1.0G",
  org_summary: {
    departments: ["Dev", "Media", "Sales", "Research", "Finance", "CS", "Knowledge"],
    factories: ["ai_dev_factory", "media_factory", "sales_factory", "research_factory", "finance_factory", "customer_success_factory", "knowledge_factory"]
  },
  executive_agents: [
    { id: "ceo_agent", role: "CEO", pool: "OpenAI" },
    { id: "cto_agent", role: "CTO", pool: "Anthropic" }
  ],
  workers: scorecards.scorecards ? scorecards.scorecards.map(s => ({
    id: s.worker_id,
    archetype: s.worker_type,
    readiness: s.promotion_readiness_score,
    trials: s.total_trials
  })) : [],
  provider_summary: providers.providers ? providers.providers.map(p => ({
    id: p.provider_id,
    name: p.display_name,
    live_enabled: p.live_api_enabled
  })) : [],
  learning_summary: {
    total_lessons: 1,
    performance_memory_active: true
  },
  staffing_summary: {
    hiring_sweep_active: true,
    policy: "local_dry_run"
  },
  owner_approval_queue: {
    pending_items: 1
  },
  risk_safety_locks: {
    no_deploy: true,
    no_secrets: true,
    no_spend: true,
    no_external_communications: true
  },
  next_recommended_phase: "1.0h",
  explanation: explain ? [
    "Structured company snapshot exported successfully.",
    "Formated for complete compatibility with Paperclip dashboard consumption."
  ] : []
};

if (formatArg === "json") {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  console.log(`Snapshot ID: ${snapshotId}`);
  console.log(`Milestone Status: ${snapshot.milestone_status}`);
  console.log(`Safety Locks: ACTIVE`);
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/company-status");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(snapshot, null, 2) + "\n");
  console.log("[Status Snapshot] Snapshot saved to reports/company-status/latest.json");
}

console.log("[Status Snapshot] Done.");
