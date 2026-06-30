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

const fromReport = getArg("--from-report");
const simulateLesson = hasFlag("--simulate-lesson");
const writeMemory = hasFlag("--write-memory");
const writeReport = hasFlag("--write-report");
const agentId = getArg("--agent");
const missionType = getArg("--mission-type");
const providerId = getArg("--provider");
const outcome = getArg("--outcome");
const qualityScoreArg = getArg("--quality-score");

if (!agentId || !missionType || !providerId || !outcome) {
  console.error("Usage: --agent <id> --mission-type <TYPE> --provider <provider_id> --outcome <success|failure|low_confidence|high_cost|rate_limit> [--quality-score <0-1>] [--simulate-lesson] [--write-memory] [--write-report] [--from-report <path>]");
  process.exit(1);
}

const qualityScore = qualityScoreArg ? parseFloat(qualityScoreArg) : (outcome === "success" ? 0.75 : 0.3);

// Load configs and memory
const learningPolicy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/learning-policy.json"), "utf8"));
const performanceMemory = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/provider-performance.json"), "utf8"));
const capabilityScores = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/capability-scores.json"), "utf8"));
const pools = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/agent-provider-pools.json"), "utf8"));

console.log("[Learning Loop] Initializing self-learning loop...");
console.log(`[Learning Loop] Agent: ${agentId}`);
console.log(`[Learning Loop] Mission Type: ${missionType}`);
console.log(`[Learning Loop] Provider: ${providerId}`);
console.log(`[Learning Loop] Outcome: ${outcome}`);
console.log(`[Learning Loop] Quality Score: ${qualityScore}`);

// Deterministic IDs
function makeLessonId(agent, mission, provider) {
  const input = `lesson_${agent}_${mission}_${provider}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `lesson_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

function makeRunId(agent, mission, provider) {
  const input = `run_${agent}_${mission}_${provider}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `lrun_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

const lessonId = makeLessonId(agentId, missionType, providerId);
const runId = makeRunId(agentId, missionType, providerId);
const isSuccess = outcome === "success";

// Create lesson
const lesson = {
  lesson_id: lessonId,
  run_id: runId,
  agent_or_worker_id: agentId,
  mission_type: missionType,
  provider_id: providerId,
  outcome: outcome,
  quality_score: qualityScore,
  lesson: isSuccess
    ? `Provider ${providerId} delivered quality ${qualityScore.toFixed(2)} for ${missionType}. ${qualityScore >= 0.8 ? "Excellent performance, reinforce this provider preference." : "Acceptable performance."}`
    : `Provider ${providerId} produced ${outcome} for ${missionType} with quality ${qualityScore.toFixed(2)}. ${outcome === "low_confidence" ? "Consider challenger provider." : outcome === "high_cost" ? "Consider cheap mode for this task type." : "Consider fallback provider."}`,
  improvements: isSuccess ? [] : [
    outcome === "low_confidence" ? "Try challenger provider for comparison" : null,
    outcome === "high_cost" ? "Route similar tasks to cheap provider" : null,
    outcome === "failure" ? "Add fallback trigger for this mission type" : null,
    outcome === "rate_limit" ? "Implement rate limit backoff" : null
  ].filter(Boolean),
  is_sample: false
};

console.log(`[Learning Loop] Lesson created: ${lessonId}`);
console.log(`[Learning Loop] Lesson: ${lesson.lesson}`);

// Update provider performance
let providerPerformanceUpdated = false;
const perfEntry = performanceMemory.providers.find(p => p.provider_id === providerId);
if (perfEntry && learningPolicy.provider_performance_update_enabled) {
  perfEntry.total_missions += 1;
  if (isSuccess) perfEntry.success_count += 1;
  else perfEntry.failure_count += 1;
  perfEntry.average_quality_score = ((perfEntry.average_quality_score * (perfEntry.total_missions - 1)) + qualityScore) / perfEntry.total_missions;
  perfEntry.last_updated_run_id = runId;
  if (!perfEntry.mission_type_scores[missionType]) perfEntry.mission_type_scores[missionType] = 0.5;
  perfEntry.mission_type_scores[missionType] = ((perfEntry.mission_type_scores[missionType] * (perfEntry.total_missions - 1)) + qualityScore) / perfEntry.total_missions;
  providerPerformanceUpdated = true;
  console.log(`[Learning Loop] Provider performance updated for ${providerId}.`);
}

// Update capability score
let capabilityScoreUpdated = false;
// Find capability by looking for mission type mapping (simplified: use mission_type as proxy)
const capEntry = capabilityScores.capabilities.find(c => {
  // Map mission types to known capabilities
  const mapping = {
    "PRODUCT_RESEARCH": "product_research",
    "MARKET_RESEARCH": "market_research",
    "REPO_AUDIT": "dev_repo_audit",
    "CODE_MODIFICATION": "dev_task_implementation",
    "VERIFY_PHASE": "dev_self_test_verification",
    "CONTENT_PLANNING": "media_content_strategy",
    "LEAD_RESEARCH": "sales_lead_research",
    "PRICING_ANALYSIS": "pricing_analysis",
    "DOC_SUMMARY": "internal_docs_summary",
    "PR_REVIEW": "dev_task_implementation"
  };
  return c.capability_id === (mapping[missionType] || missionType.toLowerCase());
});
if (capEntry && learningPolicy.capability_score_update_enabled) {
  capEntry.total_runs += 1;
  capEntry.success_rate = ((capEntry.success_rate * (capEntry.total_runs - 1)) + (isSuccess ? 1 : 0)) / capEntry.total_runs;
  capEntry.average_quality_score = ((capEntry.average_quality_score * (capEntry.total_runs - 1)) + qualityScore) / capEntry.total_runs;
  if (!isSuccess && !capEntry.common_failure_reasons.includes(outcome)) {
    capEntry.common_failure_reasons.push(outcome);
  }
  if (!capEntry.last_lesson_ids.includes(lessonId)) {
    capEntry.last_lesson_ids.push(lessonId);
    if (capEntry.last_lesson_ids.length > 10) capEntry.last_lesson_ids.shift();
  }
  capabilityScoreUpdated = true;
  console.log(`[Learning Loop] Capability score updated for ${capEntry.capability_id}.`);
}

// Provider change recommendation
let providerChangeRecommendation = null;
if (perfEntry) {
  const currentQuality = perfEntry.average_quality_score;
  if (currentQuality < 0.4) {
    const pool_entry = pools.pools.find(p => p.agent_or_worker_id === agentId);
    const fallback = pool_entry ? pool_entry.fallback_providers[0] : null;
    providerChangeRecommendation = {
      action: "switch_primary",
      current_provider: providerId,
      recommended_provider: fallback || "anthropic",
      reason: `Average quality ${currentQuality.toFixed(2)} is below threshold 0.4`,
      escalate_to_owner: false
    };
  }
}

// Staffing recommendation
let staffingRecommendation = { needed: false };
if (learningPolicy.staffing_recommendation_enabled) {
  if (!isSuccess && perfEntry && perfEntry.failure_count >= 2) {
    const pool_entry = pools.pools.find(p => p.agent_or_worker_id === agentId);
    staffingRecommendation = {
      needed: true,
      recommended_worker_type: `${missionType.toLowerCase()}_specialist`,
      factory_id: "ai_dev_factory",
      reason: `${perfEntry.failure_count} failures recorded for provider ${providerId}. A specialist worker may improve outcomes for ${missionType}.`,
      evidence: [`${outcome} outcome`, `quality_score: ${qualityScore}`, `failure_count: ${perfEntry.failure_count}`],
      suggested_provider_pool: {
        primary_provider: pool_entry ? (pool_entry.fallback_providers[0] || providerId) : providerId,
        fallback_providers: pool_entry ? pool_entry.fallback_providers.slice(1) : [],
        cheap_provider: pool_entry ? pool_entry.cheap_provider : "local"
      },
      suggested_trial_kpi: ["quality_score > 0.7", "success_rate > 0.8"],
      recommended_staffing_level: "temporary_worker",
      next_action: "monitor"
    };
    console.log(`[Learning Loop] Staffing recommendation: ${staffingRecommendation.recommended_worker_type}`);
  }
}

// Write memory if allowed
if (writeMemory && learningPolicy.auto_memory_update_allowed) {
  fs.writeFileSync(path.join(repoRoot, "memory/ai-company/provider-performance.json"), JSON.stringify(performanceMemory, null, 2) + "\n");
  fs.writeFileSync(path.join(repoRoot, "memory/ai-company/capability-scores.json"), JSON.stringify(capabilityScores, null, 2) + "\n");
  fs.appendFileSync(path.join(repoRoot, "memory/ai-company/mission-lessons.jsonl"), JSON.stringify(lesson) + "\n");

  // Append decision log if provider change recommended
  if (providerChangeRecommendation) {
    const decision = {
      decision_id: `decision_${runId}`,
      decision: `Recommend switching primary provider for ${agentId} from ${providerId} to ${providerChangeRecommendation.recommended_provider} for ${missionType}.`,
      rationale: providerChangeRecommendation.reason,
      alternatives_considered: [providerId],
      evidence: [`average_quality: ${perfEntry.average_quality_score.toFixed(2)}`, `failures: ${perfEntry.failure_count}`],
      milestone: "1.0E"
    };
    fs.appendFileSync(path.join(repoRoot, "memory/ai-company/decision-log.jsonl"), JSON.stringify(decision) + "\n");
  }
  console.log("[Learning Loop] Memory files updated.");
} else if (writeMemory) {
  console.log("[Learning Loop] Memory update skipped (auto_memory_update_allowed is false).");
}

// Build report
const report = {
  learning_loop_run_id: runId,
  agent_or_worker_id: agentId,
  mission_type: missionType,
  provider_id: providerId,
  outcome: outcome,
  quality_score: qualityScore,
  lesson_created: lesson,
  provider_performance_updated: providerPerformanceUpdated,
  capability_score_updated: capabilityScoreUpdated,
  provider_change_recommendation: providerChangeRecommendation,
  staffing_recommendation: staffingRecommendation,
  memory_write_applied: writeMemory && learningPolicy.auto_memory_update_allowed,
  summary: lesson.lesson
};

if (writeReport) {
  const reportDir = path.join(repoRoot, "reports/learning-loop");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("[Learning Loop] Report written to reports/learning-loop/latest.json");
}

console.log("[Learning Loop] Done.");
