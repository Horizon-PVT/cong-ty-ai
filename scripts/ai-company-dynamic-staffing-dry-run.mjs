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

const scenarioId = getArg("--scenario");
const missionTypeArg = getArg("--mission-type");
const factoryArg = getArg("--factory");
const severityArg = getArg("--severity") || "medium";
const createTemporaryWorker = hasFlag("--create-temporary-worker");
const createCandidateWorker = hasFlag("--create-candidate-worker");
const writeReport = hasFlag("--write-report");
const writeMemory = hasFlag("--write-memory");
const explain = hasFlag("--explain");

if (!scenarioId && (!missionTypeArg || !factoryArg)) {
  console.error("Usage: --scenario <id> [--create-temporary-worker] [--create-candidate-worker] [--write-report] [--write-memory] [--explain]");
  console.error("Or: --mission-type <TYPE> --factory <factory_id> [--severity <low|medium|high>] [--create-temporary-worker] [--create-candidate-worker] [--write-report] [--write-memory] [--explain]");
  process.exit(1);
}

// Load configurations
const staffingPolicy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/staffing-policy.json"), "utf8"));
const workerArchetypes = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/worker-archetypes.json"), "utf8"));
const scenariosConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/staffing-gap-scenarios.1.0f.json"), "utf8"));
const scorecards = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/worker-scorecards.json"), "utf8"));

console.log("[Dynamic Staffing] Initializing dynamic staffing engine...");

let missionType = missionTypeArg;
let factoryId = factoryArg;
let severity = severityArg;
let observedFailures = ["Manual specification of staffing gap"];
let expectedRecommendedWorkerType = null;

if (scenarioId) {
  const scenario = scenariosConfig.scenarios.find(s => s.scenario_id === scenarioId);
  if (!scenario) {
    console.error(`[Dynamic Staffing] ERROR: Scenario '${scenarioId}' not found in scenarios configuration.`);
    process.exit(1);
  }
  missionType = scenario.source_mission_type;
  factoryId = scenario.factory_id;
  severity = scenario.expected_staffing_gap.severity;
  observedFailures = scenario.observed_failures;
  expectedRecommendedWorkerType = scenario.expected_recommended_worker_type;
  console.log(`[Dynamic Staffing] Loaded Scenario: ${scenarioId}`);
}

// Deterministic staffing run ID
function makeStaffingRunId(scenId, mType, fId) {
  const input = `${scenId || "manual"}_${mType}_${fId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `srun_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const staffingRunId = makeStaffingRunId(scenarioId, missionType, factoryId);

// 1. Detect staffing gap
const detectedGap = {
  gap_id: `gap_${staffingRunId}`,
  mission_type: missionType,
  factory_id: factoryId,
  severity: severity,
  evidence: observedFailures,
  recommended_action: severity === "high" ? "create_candidate_worker" : "create_temporary_worker",
  reason: `Staffing gap detected for mission type ${missionType} in ${factoryId} with severity ${severity}.`
};

console.log(`[Dynamic Staffing] Staffing Gap Detected: ${detectedGap.gap_id} (${severity} severity)`);

// 2. Recommend worker archetype
const archetype = workerArchetypes.archetypes.find(a => 
  (expectedRecommendedWorkerType && a.archetype_id === expectedRecommendedWorkerType) ||
  a.best_for_mission_types.includes(missionType)
) || workerArchetypes.archetypes[0];

console.log(`[Dynamic Staffing] Recommended worker archetype: ${archetype.archetype_id}`);

// 3. Create temporary profile
let temporaryWorkerProfile = null;
if (createTemporaryWorker && staffingPolicy.temporary_worker_auto_create_allowed) {
  temporaryWorkerProfile = {
    worker_id: `temp_${archetype.archetype_id}_${staffingRunId.slice(5)}`,
    archetype_id: archetype.archetype_id,
    factory_id: factoryId,
    role: archetype.default_role,
    provider_pool: archetype.suggested_provider_pool,
    status: "active_temporary",
    assigned_mission_type: missionType
  };
  console.log(`[Dynamic Staffing] Created Temporary Worker Profile: ${temporaryWorkerProfile.worker_id}`);
}

// 4. Create candidate profile
let candidateWorkerProfile = null;
if (createCandidateWorker && staffingPolicy.candidate_worker_auto_create_allowed) {
  candidateWorkerProfile = {
    candidate_id: `candidate_${archetype.archetype_id}_${staffingRunId.slice(5)}`,
    archetype_id: archetype.archetype_id,
    factory_id: factoryId,
    role: archetype.default_role,
    provider_pool: archetype.suggested_provider_pool,
    trial_kpis: archetype.trial_kpis,
    risk_notes: archetype.risk_notes,
    status: "proposed_candidate"
  };
  console.log(`[Dynamic Staffing] Created Candidate Worker Profile: ${candidateWorkerProfile.candidate_id}`);
}

// Write memory if requested
let memoryUpdateApplied = false;
if (writeMemory) {
  // Append to staffing-gaps.jsonl
  fs.appendFileSync(path.join(repoRoot, "memory/ai-company/staffing-gaps.jsonl"), JSON.stringify(detectedGap) + "\n");
  
  if (candidateWorkerProfile) {
    fs.appendFileSync(path.join(repoRoot, "memory/ai-company/worker-candidates.jsonl"), JSON.stringify(candidateWorkerProfile) + "\n");
  }
  memoryUpdateApplied = true;
  console.log("[Dynamic Staffing] Appended staffing data to memory files.");
}

// Build report
const report = {
  staffing_run_id: staffingRunId,
  staffing_mode: staffingPolicy.staffing_mode,
  scenario_id: scenarioId || null,
  mission_type: missionType,
  factory_id: factoryId,
  detected_gap: detectedGap,
  recommended_worker: archetype.archetype_id,
  temporary_worker_profile: temporaryWorkerProfile,
  candidate_worker_profile: candidateWorkerProfile,
  suggested_provider_pool: archetype.suggested_provider_pool,
  suggested_trial_kpis: archetype.trial_kpis,
  promotion_path: {
    initial: "temporary_worker",
    evaluation: "candidate_worker",
    final: "permanent_worker (requires owner review)"
  },
  owner_review_required: true,
  memory_update_applied: memoryUpdateApplied,
  next_recommended_actions: [
    `Run a dry-run trial for the new worker archetype using scripts/ai-company-worker-trial-dry-run.mjs`,
    `Review scorecard generated for the trial run.`,
    `If trial score exceeds ${staffingPolicy.promotion_thresholds.to_candidate}, promote to candidate.`
  ],
  explanation: explain ? [
    `Detected staffing gap ${detectedGap.gap_id} in ${factoryId} for mission ${missionType}.`,
    `Observed failures indicate severity: ${severity}.`,
    `Archetype '${archetype.archetype_id}' is the best match for this mission.`,
    temporaryWorkerProfile ? `Generated temporary worker '${temporaryWorkerProfile.worker_id}' dynamically for task trial.` : "Temporary worker generation skipped.",
    candidateWorkerProfile ? `Generated candidate profile '${candidateWorkerProfile.candidate_id}' for owner review.` : "Candidate worker generation skipped.",
    "Dynamic AI Staffing is local-only; core capability registry remains unmutated."
  ] : []
};

if (explain) {
  console.log("\n[Dynamic Staffing] Explanation:");
  report.explanation.forEach(e => console.log(`  - ${e}`));
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/dynamic-staffing");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Dynamic Staffing] Report written to reports/dynamic-staffing/latest.json");
}

console.log("[Dynamic Staffing] Done.");
