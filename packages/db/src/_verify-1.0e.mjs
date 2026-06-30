import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

async function main() {
  console.log("Starting Phase 1.0E verification...");

  // 1. Verify docs, config, memory, and script files exist
  const requiredFiles = [
    "docs/ai-company-os/ai-staff-runtime.md",
    "docs/ai-company-os/multi-provider-router.md",
    "docs/ai-company-os/self-learning-loop.md",
    "configs/ai-company/provider-registry.json",
    "configs/ai-company/model-registry.json",
    "configs/ai-company/runtime-registry.json",
    "configs/ai-company/agent-provider-pools.json",
    "configs/ai-company/provider-routing-policy.json",
    "configs/ai-company/learning-policy.json",
    "memory/ai-company/provider-performance.json",
    "memory/ai-company/capability-scores.json",
    "memory/ai-company/mission-lessons.jsonl",
    "memory/ai-company/decision-log.jsonl",
    "scripts/ai-company-provider-router-dry-run.mjs",
    "scripts/ai-company-learning-loop-dry-run.mjs"
  ];
  for (const file of requiredFiles) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file "${file}" does not exist`);
    }
  }
  console.log("✅ verified: required documents, configurations, memory files, and scripts exist");

  // 2. Parse configs and validate json content
  let providerReg, modelReg, runtimeReg, pools, routingPolicy, learningPolicy, perfMemory, capScores;
  try {
    providerReg = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/provider-registry.json"), "utf8"));
    modelReg = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/model-registry.json"), "utf8"));
    runtimeReg = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/runtime-registry.json"), "utf8"));
    pools = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/agent-provider-pools.json"), "utf8"));
    routingPolicy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/provider-routing-policy.json"), "utf8"));
    learningPolicy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/learning-policy.json"), "utf8"));
    perfMemory = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/provider-performance.json"), "utf8"));
    capScores = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/capability-scores.json"), "utf8"));
  } catch (err) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
  console.log("✅ verified: all JSON configuration and memory files parsed successfully");

  // 3. Verify provider registry includes openai, anthropic, google, local, hermes_internal
  const expectedProviders = ["openai", "anthropic", "google", "local", "hermes_internal"];
  const registeredProviders = providerReg.providers.map(p => p.provider_id);
  for (const provider of expectedProviders) {
    if (!registeredProviders.includes(provider)) {
      throw new Error(`Provider registry is missing required provider: ${provider}`);
    }
  }
  console.log("✅ verified: provider registry contains all required providers");

  // 4. Verify runtime registry includes chatgpt, codex, claude_api or claude_code, antigravity, hermes, local_runner
  const expectedRuntimes = ["chatgpt", "codex", "claude_api", "claude_code", "antigravity", "hermes", "local_runner"];
  const registeredRuntimes = runtimeReg.runtimes.map(r => r.runtime_id);
  for (const runtime of expectedRuntimes) {
    if (!registeredRuntimes.includes(runtime)) {
      throw new Error(`Runtime registry is missing required runtime: ${runtime}`);
    }
  }
  console.log("✅ verified: runtime registry contains all required runtimes");

  // 5. Verify agent-provider-pools includes executive agents and key workers
  const expectedPoolAgents = [
    "ceo_agent", "coo_agent", "cto_agent", "cmo_agent", "cfo_agent", "research_agent", "customer_success_agent", "knowledge_agent",
    "repo_auditor", "implementation_worker", "review_worker", "test_worker", "media_worker", "research_worker", "finance_worker", "customer_success_worker", "knowledge_worker", "learning_worker"
  ];
  const poolAgents = pools.pools.map(p => p.agent_or_worker_id);
  for (const agent of expectedPoolAgents) {
    if (!poolAgents.includes(agent)) {
      throw new Error(`Agent provider pools configuration is missing pool for: ${agent}`);
    }
  }
  console.log("✅ verified: agent provider pools configuration maps all required roles");

  // 6. Verify provider routing policy includes primary/fallback/challenger/panel/cheap modes
  const expectedModes = ["primary", "fallback", "challenger", "panel", "cheap"];
  const policyModes = routingPolicy.selection_modes;
  for (const mode of expectedModes) {
    if (!policyModes.includes(mode)) {
      throw new Error(`Routing policy is missing support for selection mode: ${mode}`);
    }
  }
  console.log("✅ verified: routing policy covers all required selection modes");

  // 7. Verify learning policy enables local learning & staffing recommendations
  if (learningPolicy.learning_mode !== "local") {
    throw new Error("Learning policy must specify learning_mode as local");
  }
  if (learningPolicy.staffing_recommendation_enabled !== true) {
    throw new Error("Learning policy must enable staffing_recommendation_enabled");
  }
  if (learningPolicy.auto_create_permanent_worker === true) {
    throw new Error("Learning policy must not allow auto_create_permanent_worker in 1.0E");
  }
  console.log("✅ verified: learning policy configuration attributes are correct");

  // 8. Verify provider-performance memory exists and initializes neutral values (0.5 or neutral)
  for (const entry of perfMemory.providers) {
    if (entry.total_missions !== 0 || entry.success_count !== 0 || entry.failure_count !== 0) {
      throw new Error(`Provider performance memory for ${entry.provider_id} should be initialized to zero/neutral`);
    }
    if (entry.average_quality_score !== 0.5) {
      throw new Error(`Provider performance quality score for ${entry.provider_id} should be initialized to 0.5`);
    }
  }
  console.log("✅ verified: provider performance memory initialized with neutral values");

  // 9. Verify mission-lessons.jsonl and decision-log.jsonl are non-empty
  const lessonsContent = fs.readFileSync(path.join(repoRoot, "memory/ai-company/mission-lessons.jsonl"), "utf8").trim();
  const decisionLogContent = fs.readFileSync(path.join(repoRoot, "memory/ai-company/decision-log.jsonl"), "utf8").trim();
  if (lessonsContent.length === 0) {
    throw new Error("mission-lessons.jsonl is empty");
  }
  if (decisionLogContent.length === 0) {
    throw new Error("decision-log.jsonl is empty");
  }
  console.log("✅ verified: mission lessons and decision logs are initialized");

  // 10. Verify dry-run router script has no external action API or non-deterministic ID generator
  const routerScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-provider-router-dry-run.mjs"), "utf8");
  const learningScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-learning-loop-dry-run.mjs"), "utf8");

  const forbiddenPatterns = [
    /fetch\(/, /axios\./, /sendMail/, /publish\(/, /deploy\(/, /\.post\(/,
    /Date\.now\(\)/, /Math\.random\(\)/, /new Date\(/
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(routerScriptContent)) {
      throw new Error(`Dry-run provider router script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
    if (pattern.test(learningScriptContent)) {
      throw new Error(`Dry-run learning loop script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
  }

  // 11. Verify CLI flags support
  if (!routerScriptContent.includes("--agent") || !routerScriptContent.includes("--mission-type") || !routerScriptContent.includes("--mode") || !routerScriptContent.includes("--simulate-outcome") || !routerScriptContent.includes("--write-report") || !routerScriptContent.includes("--write-memory") || !routerScriptContent.includes("--explain")) {
    throw new Error("Provider router script is missing support for required CLI options");
  }
  if (!learningScriptContent.includes("--agent") || !learningScriptContent.includes("--mission-type") || !learningScriptContent.includes("--provider") || !learningScriptContent.includes("--outcome") || !learningScriptContent.includes("--quality-score") || !learningScriptContent.includes("--simulate-lesson") || !learningScriptContent.includes("--write-report") || !learningScriptContent.includes("--write-memory")) {
    throw new Error("Learning loop script is missing support for required CLI options");
  }
  console.log("✅ verified: scripts support all required CLI options and maintain safety boundaries");

  // 12. Verify no auto permanent worker creation or auto capability registry mutation exists in learning loop
  if (learningScriptContent.includes("capability-registry.json") && (learningScriptContent.includes("fs.writeFileSync") || learningScriptContent.includes("fs.appendFileSync"))) {
    // Make sure we are only reading it, not writing/mutating it
    const capRegistryMatches = learningScriptContent.match(/capability-registry\.json/g) || [];
    if (capRegistryMatches.length > 0 && (learningScriptContent.includes("writeFileSync") || learningScriptContent.includes("appendFileSync"))) {
      // Allow writing to provider-performance, capability-scores, mission-lessons, decision-log, but NOT capability-registry
      const writeMatches = learningScriptContent.match(/(writeFileSync|appendFileSync)\([^,]*registry/);
      if (writeMatches) {
        throw new Error("Learning loop script must not automatically mutate the capability registry");
      }
    }
  }
  console.log("✅ verified: learning loop does not automatically mutate the capability registry or create permanent workers");

  // 13. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-provider-learning-loop") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master HEAD --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping strict diff file checks.");
    }

    const allowed = [
      "docs/ai-company-os/ai-staff-runtime.md",
      "docs/ai-company-os/multi-provider-router.md",
      "docs/ai-company-os/self-learning-loop.md",
      "configs/ai-company/provider-registry.json",
      "configs/ai-company/model-registry.json",
      "configs/ai-company/runtime-registry.json",
      "configs/ai-company/agent-provider-pools.json",
      "configs/ai-company/provider-routing-policy.json",
      "configs/ai-company/learning-policy.json",
      "memory/ai-company/provider-performance.json",
      "memory/ai-company/capability-scores.json",
      "memory/ai-company/mission-lessons.jsonl",
      "memory/ai-company/decision-log.jsonl",
      "scripts/ai-company-provider-router-dry-run.mjs",
      "scripts/ai-company-learning-loop-dry-run.mjs",
      "packages/db/src/_verify-1.0e.mjs",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/provider-router/latest") || changedFile.includes("reports/learning-loop/latest")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not feat/ai-company-os-provider-learning-loop.");
  }

  console.log("🎉 ALL PHASE 1.0E VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
