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

const agentId = getArg("--agent");
const missionType = getArg("--mission-type");
const mode = getArg("--mode") || "auto";
const simulateOutcome = getArg("--simulate-outcome");
const writeReport = hasFlag("--write-report");
const writeMemory = hasFlag("--write-memory");
const explain = hasFlag("--explain");

if (!agentId || !missionType) {
  console.error("Usage: --agent <id> --mission-type <TYPE> [--mode auto|primary|fallback|challenger|panel|cheap] [--simulate-outcome success|failure|low_confidence|high_cost|rate_limit] [--write-report] [--write-memory] [--explain]");
  process.exit(1);
}

// Load registries
const providers = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/provider-registry.json"), "utf8"));
const models = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/model-registry.json"), "utf8"));
const runtimes = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/runtime-registry.json"), "utf8"));
const pools = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/agent-provider-pools.json"), "utf8"));
const routingPolicy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/provider-routing-policy.json"), "utf8"));
const performanceMemory = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/provider-performance.json"), "utf8"));
const learningPolicy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/learning-policy.json"), "utf8"));

console.log("[Provider Router] Initializing multi-provider router...");
console.log(`[Provider Router] Agent: ${agentId}`);
console.log(`[Provider Router] Mission Type: ${missionType}`);
console.log(`[Provider Router] Mode: ${mode}`);

// Find agent pool
const pool = pools.pools.find(p => p.agent_or_worker_id === agentId);
if (!pool) {
  console.error(`[Provider Router] ERROR: No provider pool found for agent '${agentId}'`);
  process.exit(1);
}

// Deterministic run ID
function makeRunId(agent, mission, selMode) {
  const input = `${agent}_${mission}_${selMode}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `prun_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

// Determine effective mode
function determineMode() {
  if (mode !== "auto") return mode;
  // Check cheap triggers
  const cheapTriggers = routingPolicy.cheap_mode_triggers || [];
  const mLower = missionType.toLowerCase();
  if (cheapTriggers.some(t => mLower.includes(t.replace(/_/g, " ")) || mLower.includes(t))) return "cheap";
  // Check panel triggers
  const panelTriggers = routingPolicy.panel_mode_triggers || [];
  if (panelTriggers.some(t => mLower.includes(t.replace(/_/g, " ")) || mLower.includes(t)) && pool.panel_mode_allowed) return "panel";
  return "primary";
}

const effectiveMode = determineMode();
console.log(`[Provider Router] Effective mode: ${effectiveMode}`);

// Select provider based on mode
function selectProvider(selMode) {
  switch (selMode) {
    case "primary": return pool.primary_provider;
    case "fallback": return pool.fallback_providers[0] || pool.primary_provider;
    case "challenger": return pool.challenger_providers[0] || pool.primary_provider;
    case "panel": return pool.primary_provider; // panel lead
    case "cheap": return pool.cheap_provider;
    default: return pool.primary_provider;
  }
}

const selectedProviderId = selectProvider(effectiveMode);
const selectedProvider = providers.providers.find(p => p.provider_id === selectedProviderId);

// Select runtime
function selectRuntime(providerId) {
  if (effectiveMode === "primary" || effectiveMode === "panel") return pool.primary_runtime;
  const provider = providers.providers.find(p => p.provider_id === providerId);
  if (provider && provider.available_runtime_ids.length > 0) return provider.available_runtime_ids[0];
  return "local_runner";
}
const selectedRuntimeId = selectRuntime(selectedProviderId);
const selectedRuntime = runtimes.runtimes.find(r => r.runtime_id === selectedRuntimeId);

// Select model
function selectModel(providerId) {
  const providerModels = models.models.filter(m => m.provider_id === providerId);
  if (providerModels.length === 0) return null;
  // Score models for the role
  const role = pool.role;
  let best = providerModels[0];
  let bestScore = 0;
  for (const m of providerModels) {
    let score = 0;
    if (m.recommended_roles.includes(role)) score += 0.5;
    score += (m.reasoning_strength || 0) * 0.2;
    score += (m.coding_strength || 0) * 0.15;
    score += (m.review_strength || 0) * 0.15;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}
const selectedModel = selectModel(selectedProviderId);

// Score breakdown
const perfEntry = performanceMemory.providers.find(p => p.provider_id === selectedProviderId);
const weights = routingPolicy.scoring_weights;
const roleScore = (perfEntry && perfEntry.role_scores && perfEntry.role_scores[pool.role]) || 0.5;
const taskScore = (perfEntry && perfEntry.mission_type_scores && perfEntry.mission_type_scores[missionType]) || 0.5;
const qualityScore = perfEntry ? perfEntry.average_quality_score : 0.5;
const successRate = perfEntry && perfEntry.total_missions > 0 ? perfEntry.success_count / perfEntry.total_missions : 0.5;
const costScore = perfEntry ? perfEntry.average_cost_score : 0.5;
const latencyScore = perfEntry ? perfEntry.average_latency_score : 0.5;
const failurePenalty = perfEntry && perfEntry.total_missions > 0 ? (perfEntry.failure_count / perfEntry.total_missions) * 0.5 : 0;

const totalScore = (
  roleScore * weights.role_fit +
  taskScore * weights.task_fit +
  qualityScore * weights.historical_quality +
  successRate * weights.historical_success_rate +
  costScore * weights.cost_efficiency +
  latencyScore * weights.latency -
  failurePenalty * weights.recent_failure_penalty
);

console.log(`[Provider Router] Selected provider: ${selectedProviderId}`);
console.log(`[Provider Router] Selected model: ${selectedModel ? selectedModel.model_id : "none"}`);
console.log(`[Provider Router] Selected runtime: ${selectedRuntimeId}`);
console.log(`[Provider Router] Total score: ${totalScore.toFixed(4)}`);

// Fallback chain
const fallbackChain = pool.fallback_providers || [];
const challengerProviders = pool.challenger_providers || [];
const panelProviders = pool.panel_mode_allowed ? [pool.primary_provider, ...(pool.challenger_providers || []), ...(pool.fallback_providers || []).slice(0, 1)] : [];

// Simulate outcome if requested
let learningEvent = null;
let memoryUpdateApplied = false;
let staffingRecommendation = { needed: false };

if (simulateOutcome) {
  console.log(`[Provider Router] Simulating outcome: ${simulateOutcome}`);
  const isSuccess = simulateOutcome === "success";
  const simQuality = isSuccess ? 0.8 : (simulateOutcome === "low_confidence" ? 0.35 : 0.2);

  learningEvent = {
    lesson_id: makeRunId(agentId, missionType, effectiveMode) + "_lesson",
    run_id: makeRunId(agentId, missionType, effectiveMode),
    agent_or_worker_id: agentId,
    mission_type: missionType,
    provider_id: selectedProviderId,
    model_id: selectedModel ? selectedModel.model_id : null,
    runtime_id: selectedRuntimeId,
    outcome: simulateOutcome,
    quality_score: simQuality,
    lesson: isSuccess
      ? `Provider ${selectedProviderId} handled ${missionType} for ${agentId} successfully in ${effectiveMode} mode.`
      : `Provider ${selectedProviderId} produced ${simulateOutcome} result for ${missionType}. Consider ${simulateOutcome === "low_confidence" ? "challenger" : "fallback"} next time.`,
    is_sample: false
  };

  // Check staffing recommendation triggers
  if (!isSuccess) {
    staffingRecommendation = {
      needed: true,
      recommended_worker_type: `${missionType.toLowerCase()}_specialist`,
      factory_id: "ai_dev_factory",
      reason: `Repeated ${simulateOutcome} outcomes for ${missionType} suggest a specialist worker may improve results.`,
      evidence: [`${simulateOutcome} outcome for ${missionType} with provider ${selectedProviderId}`],
      suggested_provider_pool: {
        primary_provider: fallbackChain[0] || selectedProviderId,
        fallback_providers: fallbackChain.slice(1),
        cheap_provider: pool.cheap_provider
      },
      suggested_trial_kpi: ["quality_score > 0.7", "success_rate > 0.8"],
      recommended_staffing_level: "temporary_worker",
      next_action: "monitor"
    };
  }

  if (writeMemory && perfEntry) {
    perfEntry.total_missions += 1;
    if (isSuccess) perfEntry.success_count += 1;
    else perfEntry.failure_count += 1;
    perfEntry.average_quality_score = ((perfEntry.average_quality_score * (perfEntry.total_missions - 1)) + simQuality) / perfEntry.total_missions;
    perfEntry.last_updated_run_id = makeRunId(agentId, missionType, effectiveMode);
    if (!perfEntry.mission_type_scores[missionType]) perfEntry.mission_type_scores[missionType] = 0.5;
    perfEntry.mission_type_scores[missionType] = ((perfEntry.mission_type_scores[missionType] * (perfEntry.total_missions - 1)) + simQuality) / perfEntry.total_missions;

    fs.writeFileSync(path.join(repoRoot, "memory/ai-company/provider-performance.json"), JSON.stringify(performanceMemory, null, 2) + "\n");
    fs.appendFileSync(path.join(repoRoot, "memory/ai-company/mission-lessons.jsonl"), JSON.stringify(learningEvent) + "\n");
    memoryUpdateApplied = true;
    console.log("[Provider Router] Memory updated.");
  }
}

// Build report
const report = {
  provider_router_run_id: makeRunId(agentId, missionType, effectiveMode),
  agent_or_worker_id: agentId,
  mission_type: missionType,
  selected_mode: effectiveMode,
  selected_provider_id: selectedProviderId,
  selected_model_id: selectedModel ? selectedModel.model_id : null,
  selected_runtime_id: selectedRuntimeId,
  fallback_chain: fallbackChain,
  challenger_providers: challengerProviders,
  panel_providers: effectiveMode === "panel" ? panelProviders : [],
  cheap_provider: pool.cheap_provider,
  scoring_breakdown: {
    role_fit: roleScore,
    task_fit: taskScore,
    historical_quality: qualityScore,
    historical_success_rate: successRate,
    cost_efficiency: costScore,
    latency: latencyScore,
    recent_failure_penalty: failurePenalty,
    total_score: parseFloat(totalScore.toFixed(4))
  },
  memory_influence: perfEntry ? {
    total_missions: perfEntry.total_missions,
    success_count: perfEntry.success_count,
    failure_count: perfEntry.failure_count,
    average_quality: perfEntry.average_quality_score
  } : null,
  simulated_outcome: simulateOutcome || null,
  learning_event_created: learningEvent !== null,
  memory_update_applied: memoryUpdateApplied,
  staffing_recommendation: staffingRecommendation,
  next_provider_recommendation: simulateOutcome && simulateOutcome !== "success"
    ? `Consider using ${fallbackChain[0] || "challenger"} for next ${missionType} mission.`
    : `Continue with ${selectedProviderId} as primary for ${missionType}.`,
  explanation: explain ? [
    `Agent ${agentId} has role '${pool.role}'.`,
    `Mode '${mode}' resolved to '${effectiveMode}'.`,
    `Primary provider is ${pool.primary_provider} with runtime ${pool.primary_runtime}.`,
    `Selected provider ${selectedProviderId} scored ${totalScore.toFixed(4)} based on memory and policy weights.`,
    selectedModel ? `Model ${selectedModel.model_id} from family '${selectedModel.model_family}' selected for best role fit.` : "No model matched.",
    simulateOutcome ? `Simulated outcome: ${simulateOutcome}.` : "No outcome simulation requested."
  ] : []
};

if (explain) {
  console.log("\n[Provider Router] Explanation:");
  report.explanation.forEach(e => console.log(`  - ${e}`));
}

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/provider-router");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Provider Router] Report written to reports/provider-router/latest.json");
}

console.log("[Provider Router] Done.");
