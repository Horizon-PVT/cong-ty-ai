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

const candidateWorker = getArg("--candidate-worker") || "temp_worker_001";
const archetypeId = getArg("--archetype");
const missionType = getArg("--mission-type");
const factoryId = getArg("--factory");
const qualityScoreArg = getArg("--quality-score") || "0.8";
const costScoreArg = getArg("--cost-score") || "0.8";
const latencyScoreArg = getArg("--latency-score") || "0.8";
const outcome = getArg("--outcome") || "success";
const writeReport = hasFlag("--write-report");
const writeMemory = hasFlag("--write-memory");
const explain = hasFlag("--explain");

if (!archetypeId || !missionType || !factoryId) {
  console.error("Usage: --archetype <id> --mission-type <TYPE> --factory <factory_id> [--candidate-worker <id>] [--quality-score <0-1>] [--cost-score <0-1>] [--latency-score <0-1>] [--outcome success|failure|partial] [--write-report] [--write-memory] [--explain]");
  process.exit(1);
}

const qualityScore = parseFloat(qualityScoreArg);
const costScore = parseFloat(costScoreArg);
const latencyScore = parseFloat(latencyScoreArg);

// Load configs
const staffingPolicy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/staffing-policy.json"), "utf8"));
const workerArchetypes = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/worker-archetypes.json"), "utf8"));
const scorecardsMemory = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/worker-scorecards.json"), "utf8"));

console.log("[Worker Trial] Initializing worker trial loop...");

const archetype = workerArchetypes.archetypes.find(a => a.archetype_id === archetypeId);
if (!archetype) {
  console.error(`[Worker Trial] ERROR: Archetype '${archetypeId}' not found.`);
  process.exit(1);
}

// Deterministic trial ID
function makeTrialId(worker, arch, mType) {
  const input = `trial_${worker}_${arch}_${mType}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `trial_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const trialId = makeTrialId(candidateWorker, archetypeId, missionType);
const isSuccess = outcome === "success";
const successRate = isSuccess ? 1.0 : 0.0;

// Calculate Promotion Readiness Score
// Readiness = (Avg Quality * 0.4) + (Success Rate * 0.4) + (Cost Score * 0.1) + (Latency Score * 0.1)
const readinessScore = (qualityScore * 0.4) + (successRate * 0.4) + (costScore * 0.1) + (latencyScore * 0.1);

// Decide recommendation status
let recommendation = "keep_temporary";
if (readinessScore >= staffingPolicy.promotion_thresholds.to_permanent) {
  recommendation = "propose_permanent_worker";
} else if (readinessScore >= staffingPolicy.promotion_thresholds.to_candidate) {
  recommendation = "promote_to_candidate";
} else if (readinessScore < staffingPolicy.archive_thresholds.readiness_below) {
  recommendation = "archive_candidate";
}

console.log(`[Worker Trial] Trial ID: ${trialId}`);
console.log(`[Worker Trial] Promotion Readiness Score: ${readinessScore.toFixed(4)}`);
console.log(`[Worker Trial] Recommendation: ${recommendation}`);

// Create trial record
const trialRecord = {
  trial_id: trialId,
  worker_id: candidateWorker,
  archetype_id: archetypeId,
  mission_type: missionType,
  quality_score: qualityScore,
  cost_score: costScore,
  latency_score: latencyScore,
  readiness_score: readinessScore,
  outcome: outcome,
  recommendation: recommendation,
  is_sample: false
};

// Update scorecard memory if requested
let scorecardUpdated = false;
if (writeMemory) {
  let card = scorecardsMemory.scorecards.find(s => s.worker_id === candidateWorker);
  if (!card) {
    card = {
      worker_id: candidateWorker,
      worker_type: archetypeId,
      factory_id: factoryId,
      total_trials: 0,
      success_count: 0,
      failure_count: 0,
      average_quality_score: 0.5,
      average_cost_score: 0.5,
      average_latency_score: 0.5,
      promotion_readiness_score: 0.5,
      last_trial_id: null,
      common_failure_reasons: [],
      recommended_status: "temporary_worker"
    };
    scorecardsMemory.scorecards.push(card);
  }

  card.total_trials += 1;
  if (isSuccess) card.success_count += 1;
  else card.failure_count += 1;

  const N = card.total_trials;
  card.average_quality_score = ((card.average_quality_score * (N - 1)) + qualityScore) / N;
  card.average_cost_score = ((card.average_cost_score * (N - 1)) + costScore) / N;
  card.average_latency_score = ((card.average_latency_score * (N - 1)) + latencyScore) / N;
  card.promotion_readiness_score = ((card.promotion_readiness_score * (N - 1)) + readinessScore) / N;
  card.last_trial_id = trialId;
  card.recommended_status = recommendation === "propose_permanent_worker" ? "permanent_worker" : (recommendation === "promote_to_candidate" ? "candidate_worker" : "temporary_worker");

  if (!isSuccess && !card.common_failure_reasons.includes(outcome)) {
    card.common_failure_reasons.push(outcome);
  }

  fs.writeFileSync(path.join(repoRoot, "memory/ai-company/worker-scorecards.json"), JSON.stringify(scorecardsMemory, null, 2) + "\n");
  fs.appendFileSync(path.join(repoRoot, "memory/ai-company/worker-trials.jsonl"), JSON.stringify(trialRecord) + "\n");
  scorecardUpdated = true;
  console.log("[Worker Trial] Scorecard memory updated.");
}

// Build report
const report = {
  trial_id: trialId,
  worker_id: candidateWorker,
  archetype_id: archetypeId,
  mission_type: missionType,
  scores: {
    quality: qualityScore,
    cost: costScore,
    latency: latencyScore,
    readiness: parseFloat(readinessScore.toFixed(4))
  },
  outcome: outcome,
  recommendation: recommendation,
  scorecard_updated: scorecardUpdated,
  explanation: explain ? [
    `Worker '${candidateWorker}' evaluated as archetype '${archetypeId}'.`,
    `Outcome: ${outcome} (success rate: ${successRate}).`,
    `Calculated promotion readiness score: ${readinessScore.toFixed(4)}.`,
    `Result is recommended for: ${recommendation}.`,
    "Dynamic staffing trial runs locally and preserves all registry safety blocks."
  ] : []
};

if (explain) {
  console.log("\n[Worker Trial] Explanation:");
  report.explanation.forEach(e => console.log(`  - ${e}`));
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/worker-trial");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Worker Trial] Report written to reports/worker-trial/latest.json");
}

console.log("[Worker Trial] Done.");
