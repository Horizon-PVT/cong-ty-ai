import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

async function main() {
  console.log("Starting Phase 1.0F verification...");

  // 1. Verify docs, config, memory, and script files exist
  const requiredFiles = [
    "docs/ai-company-os/dynamic-ai-staffing.md",
    "docs/ai-company-os/worker-trial-loop.md",
    "configs/ai-company/staffing-policy.json",
    "configs/ai-company/worker-archetypes.json",
    "configs/ai-company/staffing-gap-scenarios.1.0f.json",
    "memory/ai-company/staffing-gaps.jsonl",
    "memory/ai-company/worker-candidates.jsonl",
    "memory/ai-company/worker-trials.jsonl",
    "memory/ai-company/worker-scorecards.json",
    "scripts/ai-company-dynamic-staffing-dry-run.mjs",
    "scripts/ai-company-worker-trial-dry-run.mjs",
    "scripts/ai-company-staffing-recommendation-sweep.mjs"
  ];
  for (const file of requiredFiles) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file "${file}" does not exist`);
    }
  }
  console.log("✅ verified: required documents, configurations, memory files, and scripts exist");

  // 2. Parse configs and validate json content
  let policy, archetypes, scenarios, scorecards;
  try {
    policy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/staffing-policy.json"), "utf8"));
    archetypes = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/worker-archetypes.json"), "utf8"));
    scenarios = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/staffing-gap-scenarios.1.0f.json"), "utf8"));
    scorecards = JSON.parse(fs.readFileSync(path.join(repoRoot, "memory/ai-company/worker-scorecards.json"), "utf8"));
  } catch (err) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
  console.log("✅ verified: all JSON configuration and memory files parsed successfully");

  // 3. Verify policy attributes
  if (policy.dynamic_staffing_enabled !== true) {
    throw new Error("Staffing policy must define dynamic_staffing_enabled as true");
  }
  if (policy.temporary_worker_auto_create_allowed !== true) {
    throw new Error("Staffing policy must allow temporary worker auto creation");
  }
  if (policy.candidate_worker_auto_create_allowed !== true) {
    throw new Error("Staffing policy must allow candidate worker auto creation");
  }
  if (policy.permanent_worker_auto_create_allowed === true) {
    throw new Error("Staffing policy must forbid permanent worker auto creation in 1.0F");
  }
  if (policy.permanent_worker_requires_owner_review !== true) {
    throw new Error("Staffing policy must require owner review for permanent workers");
  }
  console.log("✅ verified: staffing policy attributes are correct");

  // 4. Verify worker archetypes include required factories
  const requiredArchetypes = [
    "repo_audit_specialist", "code_repair_worker", "playwright_e2e_worker", "pr_review_assistant",
    "tiktok_hook_worker", "facebook_post_worker", "short_video_script_worker", "brand_voice_reviewer",
    "lead_qualification_worker", "sales_objection_handler", "competitor_research_worker",
    "api_cost_optimizer", "onboarding_worker", "decision_log_worker"
  ];
  const registeredArchs = archetypes.archetypes.map(a => a.archetype_id);
  for (const id of requiredArchetypes) {
    if (!registeredArchs.includes(id)) {
      throw new Error(`Worker archetypes configuration is missing required archetype: ${id}`);
    }
  }
  console.log("✅ verified: worker archetypes cover all required specialist roles");

  // 5. Verify staffing scenarios include at least 5 scenarios
  if (!Array.isArray(scenarios.scenarios) || scenarios.scenarios.length < 5) {
    throw new Error("Staffing scenarios configuration must define at least 5 scenarios");
  }
  console.log("✅ verified: staffing gap scenarios cover at least 5 required patterns");

  // 6. Verify scorecards initialized with neutral values
  const coreWorkers = [
    "repo_auditor", "implementation_worker", "review_worker", "test_worker", "media_worker",
    "research_worker", "finance_worker", "customer_success_worker", "knowledge_worker", "learning_worker"
  ];
  for (const workerId of coreWorkers) {
    const card = scorecards.scorecards.find(s => s.worker_id === workerId);
    if (!card) {
      throw new Error(`Scorecards memory is missing scorecard for: ${workerId}`);
    }
    if (card.total_trials !== 0 || card.success_count !== 0 || card.failure_count !== 0) {
      throw new Error(`Scorecard for ${workerId} should be initialized to zero/neutral trials`);
    }
    if (card.average_quality_score !== 0.5 || card.average_cost_score !== 0.5 || card.average_latency_score !== 0.5) {
      throw new Error(`Scorecard for ${workerId} scores should be initialized to 0.5`);
    }
  }
  console.log("✅ verified: scorecards memory initialized correctly for all core workers");

  // 7. Verify non-empty memory streams
  const gapsContent = fs.readFileSync(path.join(repoRoot, "memory/ai-company/staffing-gaps.jsonl"), "utf8").trim();
  const candidatesContent = fs.readFileSync(path.join(repoRoot, "memory/ai-company/worker-candidates.jsonl"), "utf8").trim();
  const trialsContent = fs.readFileSync(path.join(repoRoot, "memory/ai-company/worker-trials.jsonl"), "utf8").trim();
  if (gapsContent.length === 0) throw new Error("staffing-gaps.jsonl is empty");
  if (candidatesContent.length === 0) throw new Error("worker-candidates.jsonl is empty");
  if (trialsContent.length === 0) throw new Error("worker-trials.jsonl is empty");
  console.log("✅ verified: staffing memory streams are non-empty");

  // 8. Verify scripts support required CLI options & maintain boundaries
  const staffingScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-dynamic-staffing-dry-run.mjs"), "utf8");
  const trialScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-worker-trial-dry-run.mjs"), "utf8");
  const sweepScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-staffing-recommendation-sweep.mjs"), "utf8");

  const forbiddenPatterns = [
    /fetch\(/, /axios\./, /sendMail/, /publish\(/, /deploy\(/, /\.post\(/,
    /Date\.now\(\)/, /Math\.random\(\)/, /new Date\(/
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(staffingScriptContent)) {
      throw new Error(`Dry-run staffing script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
    if (pattern.test(trialScriptContent)) {
      throw new Error(`Dry-run worker trial script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
    if (pattern.test(sweepScriptContent)) {
      throw new Error(`Staffing sweep script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
  }

  if (!staffingScriptContent.includes("--scenario") || !staffingScriptContent.includes("--mission-type") || !staffingScriptContent.includes("--factory") || !staffingScriptContent.includes("--severity") || !staffingScriptContent.includes("--create-temporary-worker") || !staffingScriptContent.includes("--create-candidate-worker") || !staffingScriptContent.includes("--write-report") || !staffingScriptContent.includes("--write-memory") || !staffingScriptContent.includes("--explain")) {
    throw new Error("Dynamic staffing script is missing support for required CLI options");
  }
  if (!trialScriptContent.includes("--candidate-worker") || !trialScriptContent.includes("--archetype") || !trialScriptContent.includes("--mission-type") || !trialScriptContent.includes("--factory") || !trialScriptContent.includes("--quality-score") || !trialScriptContent.includes("--cost-score") || !trialScriptContent.includes("--latency-score") || !trialScriptContent.includes("--outcome") || !trialScriptContent.includes("--write-report") || !trialScriptContent.includes("--write-memory") || !trialScriptContent.includes("--explain")) {
    throw new Error("Worker trial script is missing support for required CLI options");
  }
  if (!sweepScriptContent.includes("--write-report") || !sweepScriptContent.includes("--write-memory") || !sweepScriptContent.includes("--explain")) {
    throw new Error("Staffing sweep script is missing support for required CLI options");
  }

  // 9. Verify no capability-registry.json mutations
  if (staffingScriptContent.includes("capability-registry.json") && (staffingScriptContent.includes("fs.writeFileSync") || staffingScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Dynamic staffing script must not automatically mutate the capability registry");
  }
  if (trialScriptContent.includes("capability-registry.json") && (trialScriptContent.includes("fs.writeFileSync") || trialScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Worker trial script must not automatically mutate the capability registry");
  }
  if (sweepScriptContent.includes("capability-registry.json") && (sweepScriptContent.includes("fs.writeFileSync") || sweepScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Staffing sweep script must not automatically mutate the capability registry");
  }
  console.log("✅ verified: dry-run scripts support all required CLI options and maintain safety boundaries");

  // 10. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-dynamic-staffing") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master HEAD --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping strict diff file checks.");
    }

    const allowed = [
      "docs/ai-company-os/dynamic-ai-staffing.md",
      "docs/ai-company-os/worker-trial-loop.md",
      "configs/ai-company/staffing-policy.json",
      "configs/ai-company/worker-archetypes.json",
      "configs/ai-company/staffing-gap-scenarios.1.0f.json",
      "memory/ai-company/staffing-gaps.jsonl",
      "memory/ai-company/worker-candidates.jsonl",
      "memory/ai-company/worker-trials.jsonl",
      "memory/ai-company/worker-scorecards.json",
      "scripts/ai-company-dynamic-staffing-dry-run.mjs",
      "scripts/ai-company-worker-trial-dry-run.mjs",
      "scripts/ai-company-staffing-recommendation-sweep.mjs",
      "packages/db/src/_verify-1.0f.mjs",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/dynamic-staffing/") || changedFile.includes("reports/worker-trial/") || changedFile.includes("reports/staffing-sweep/")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not feat/ai-company-os-dynamic-staffing.");
  }

  console.log("🎉 ALL PHASE 1.0F VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
