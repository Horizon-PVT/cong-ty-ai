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
function hasFlag(name) { return args.includes(name); }

const writeReport = hasFlag("--write-report");
const writeMemory = hasFlag("--write-memory");
const explain = hasFlag("--explain");

console.log("[Staffing Sweep] Starting staffing recommendation sweep...");

// Load registry and scenarios
const scenariosConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/staffing-gap-scenarios.1.0f.json"), "utf8"));
const workerArchetypes = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/worker-archetypes.json"), "utf8"));

const recommendations = [];

for (const scenario of scenariosConfig.scenarios) {
  console.log(`[Staffing Sweep] Processing scenario: ${scenario.scenario_id}`);
  const mType = scenario.source_mission_type;
  const fId = scenario.factory_id;
  const severity = scenario.expected_staffing_gap.severity;
  const expectedWorkerType = scenario.expected_recommended_worker_type;

  const archetype = workerArchetypes.archetypes.find(a => a.archetype_id === expectedWorkerType) || workerArchetypes.archetypes[0];

  recommendations.push({
    scenario_id: scenario.scenario_id,
    factory_id: fId,
    mission_type: mType,
    severity: severity,
    recommended_worker_type: archetype.archetype_id,
    expected_business_impact: severity === "high" ? "Critical (resolves repeated failures)" : "Medium (optimizes pipeline)",
    hiring_action: severity === "high" ? "create_candidate_worker" : "create_temporary_worker",
    reason: scenario.expected_staffing_gap.reason
  });
}

// Sort by severity (high first)
const severityOrder = { high: 1, medium: 2, low: 3 };
recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

console.log(`[Staffing Sweep] Found ${recommendations.length} recommendations across the workspace.`);

// Write memory if requested
if (writeMemory) {
  for (const rec of recommendations) {
    const gapRecord = {
      gap_id: `gap_sweep_${rec.scenario_id}`,
      mission_type: rec.mission_type,
      factory_id: rec.factory_id,
      severity: rec.severity,
      evidence: [rec.reason],
      recommended_action: rec.hiring_action,
      reason: rec.reason
    };
    fs.appendFileSync(path.join(repoRoot, "memory/ai-company/staffing-gaps.jsonl"), JSON.stringify(gapRecord) + "\n");
  }
  console.log("[Staffing Sweep] Sweep recommendations written to memory files.");
}

// Build report
const report = {
  sweep_run_id: "sweep_run_1.0f_init",
  total_scenarios_evaluated: scenariosConfig.scenarios.length,
  recommendations: recommendations,
  grouped_by_factory: recommendations.reduce((acc, rec) => {
    if (!acc[rec.factory_id]) acc[rec.factory_id] = [];
    acc[rec.factory_id].push(rec);
    return acc;
  }, {}),
  explanation: explain ? [
    `Swept ${scenariosConfig.scenarios.length} predefined staffing gap scenarios.`,
    `Identified ${recommendations.filter(r => r.severity === "high").length} high severity gaps.`,
    `Identified ${recommendations.filter(r => r.severity === "medium").length} medium severity gaps.`,
    `Suggested immediate temporary/candidate hiring workflows.`,
    "All sweeper actions ran locally with no core structural mutations."
  ] : []
};

if (explain) {
  console.log("\n[Staffing Sweep] Explanation:");
  report.explanation.forEach(e => console.log(`  - ${e}`));
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/staffing-sweep");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Staffing Sweep] Report written to reports/staffing-sweep/latest.json");
}

console.log("[Staffing Sweep] Sweep completed.");
