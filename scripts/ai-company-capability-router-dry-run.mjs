#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Target report path: reports/capability-router/latest.json

// Find repository root
let repoRoot = "";
try {
  repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
} catch (err) {
  repoRoot = path.resolve(__dirname, "..");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    missionPlan: null,
    scenario: null,
    writeReport: false,
    simulateWorkers: false,
    maxRetries: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mission-plan") {
      options.missionPlan = args[i + 1] || null;
      i++;
    } else if (args[i] === "--scenario") {
      options.scenario = args[i + 1] || null;
      i++;
    } else if (args[i] === "--write-report") {
      options.writeReport = true;
    } else if (args[i] === "--simulate-workers") {
      options.simulateWorkers = true;
    } else if (args[i] === "--max-retries") {
      options.maxRetries = parseInt(args[i + 1], 10) || null;
      i++;
    }
  }
  return options;
}

function main() {
  const options = parseArgs();

  console.log("[Capability Router] Initializing local capability router...");

  // 1. Load Configurations
  const registryPath = path.join(repoRoot, "configs/ai-company/capability-registry.json");
  const missionTypesPath = path.join(repoRoot, "configs/ai-company/mission-types.json");
  const policyPath = path.join(repoRoot, "configs/ai-company/router-policy.json");
  const scenariosPath = path.join(repoRoot, "configs/ai-company/router-scenarios.1.0d.json");

  if (!fs.existsSync(registryPath) || !fs.existsSync(missionTypesPath) || !fs.existsSync(policyPath) || !fs.existsSync(scenariosPath)) {
    console.error("[Capability Router] Error: Missing required config files.");
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const missionTypes = JSON.parse(fs.readFileSync(missionTypesPath, "utf8"));
  const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
  const scenariosConfig = JSON.parse(fs.readFileSync(scenariosPath, "utf8"));

  const maxRetryAttempts = options.maxRetries !== null ? options.maxRetries : policy.max_retry_attempts;

  // 2. Load Target Plan or Scenario
  let planMissions = [];
  let sourcePlanId = "";
  let targetGoal = "";
  let goalType = "";
  let scenarioId = null;

  if (options.scenario) {
    scenarioId = options.scenario;
    const scenario = scenariosConfig.scenarios.find(s => s.scenario_id === scenarioId);
    if (!scenario) {
      console.error(`[Capability Router] Error: Scenario ${scenarioId} not found.`);
      process.exit(1);
    }
    console.log(`[Capability Router] Running Scenario: ${scenario.description}`);
    planMissions = scenario.missions;
    sourcePlanId = scenario.plan_id;
    targetGoal = scenario.source_goal;
    goalType = scenario.goal_type;
  } else {
    let planPath = path.join(repoRoot, "configs/ai-company/sample-mission-plan.1.0c.json");
    if (options.missionPlan) {
      planPath = path.resolve(options.missionPlan);
      console.log(`[Capability Router] Loading custom mission plan: ${planPath}`);
    } else {
      console.log("[Capability Router] Loading default sample plan (1.0C)...");
    }

    if (!fs.existsSync(planPath)) {
      console.error(`[Capability Router] Error: Mission plan file not found at ${planPath}`);
      process.exit(1);
    }

    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    planMissions = plan.missions || [];
    sourcePlanId = plan.plan_id;
    targetGoal = plan.source_goal;
    goalType = plan.goal_type;
  }

  // 3. Resolve capabilities and create route decisions
  const routeDecisions = [];
  const queueEntries = [];

  for (const mission of planMissions) {
    const typeDef = missionTypes.find(t => t.mission_type === mission.mission_type);
    if (!typeDef) {
      console.error(`[Capability Router] Error: Mission type ${mission.mission_type} not found in mission types catalog.`);
      process.exit(1);
    }

    const capId = mission.target_capability || typeDef.default_capability;
    const capDef = registry.capabilities.find(c => c.capability_id === capId);

    if (!capDef) {
      console.error(`[Capability Router] Error: Capability ${capId} not found in registry.`);
      process.exit(1);
    }

    const expectedFactory = capDef.factory_id;
    const expectedOwner = capDef.owner_agent;

    if (mission.target_factory && mission.target_factory !== expectedFactory) {
      console.error(`[Capability Router] Error: Mission factory mismatch. Expected: ${expectedFactory}, got: ${mission.target_factory}`);
      process.exit(1);
    }

    if (mission.owner_agent && mission.owner_agent !== expectedOwner) {
      console.error(`[Capability Router] Error: Mission owner mismatches registry. Expected: ${expectedOwner}, got: ${mission.owner_agent}`);
      process.exit(1);
    }

    // Determine safety & routing decisions
    const hasRealWorldActions = capDef.blocked_actions.some(a => policy.blocked_real_actions.includes(a)) ||
                                capDef.approval_required_actions.some(a => policy.owner_approval_required_for.includes(a));
    const isRealAction = mission.safety_class === "real_world_action" || hasRealWorldActions;

    const routeAllowed = !isRealAction;
    const routeDecision = {
      mission_id: mission.mission_id,
      mission_type: mission.mission_type,
      target_capability: capId,
      target_factory: expectedFactory,
      owner_agent: expectedOwner,
      safety_class: isRealAction ? "real_world_action" : "safe_local",
      route_allowed: routeAllowed,
      status: routeAllowed ? "ROUTED" : "BLOCKED_REAL_WORLD_SIDE_EFFECT",
      blocked_reason: routeAllowed ? null : "Missions implying real-world side effects are blocked in local dry-run mode."
    };

    routeDecisions.push(routeDecision);

    if (routeAllowed) {
      queueEntries.push({
        mission_id: mission.mission_id,
        status: "QUEUED",
        retry_count: 0,
        simulate_failure: mission.simulate_failure || mission.mission_id.includes("fail") || false
      });
    }
  }

  // 4. Simulate Workers
  const workerResults = [];
  if (options.simulateWorkers) {
    console.log(`[Capability Router] Simulating workers for ${queueEntries.length} queued missions...`);

    for (const queueItem of queueEntries) {
      const decision = routeDecisions.find(d => d.mission_id === queueItem.mission_id);
      console.log(`  - Worker claiming mission [${queueItem.mission_id}] (${decision.target_capability})...`);
      queueItem.status = "CLAIMED_LOCAL";
      queueItem.status = "RUNNING_LOCAL";

      let executionSuccess = true;
      let currentTry = 0;

      if (queueItem.simulate_failure) {
        // Emulate retries
        while (currentTry <= maxRetryAttempts) {
          currentTry++;
          queueItem.retry_count = currentTry;
          console.log(`    * [Try ${currentTry}] Emulating simulated execution failure...`);
          if (currentTry <= maxRetryAttempts) {
            queueItem.status = "FAILED_RETRYABLE";
          } else {
            queueItem.status = "FAILED_BLOCKED";
            executionSuccess = false;
          }
        }
      }

      if (executionSuccess) {
        queueItem.status = "COMPLETED_LOCAL_SIMULATION";
        console.log(`    * Simulated execution successful.`);
        // Write simulated artifact file
        const artifactContent = {
          mission_id: queueItem.mission_id,
          status: "success",
          output_file: `reports/capability-router/artifacts/${queueItem.mission_id}_artifact.json`,
          simulated_by_worker: "simulated_local_worker_01"
        };
        const artifactsDir = path.join(repoRoot, "reports", "capability-router", "artifacts");
        if (options.writeReport) {
          fs.mkdirSync(artifactsDir, { recursive: true });
          fs.writeFileSync(
            path.join(artifactsDir, `${queueItem.mission_id}_artifact.json`),
            JSON.stringify(artifactContent, null, 2),
            "utf8"
          );
        }
        workerResults.push({
          mission_id: queueItem.mission_id,
          status: "success",
          tries: currentTry || 1,
          artifact_path: `reports/capability-router/artifacts/${queueItem.mission_id}_artifact.json`
        });
      } else {
        console.log(`    * Simulated execution permanently blocked/failed.`);
        workerResults.push({
          mission_id: queueItem.mission_id,
          status: "failed_blocked",
          tries: currentTry,
          artifact_path: null
        });
      }
    }
  }

  // 5. Generate deterministic run_id
  const runInput = {
    sourcePlanId,
    scenarioId,
    targetGoal,
    goalType,
    simulateWorkers: options.simulateWorkers,
    maxRetryAttempts
  };
  const hash = crypto.createHash("sha256").update(JSON.stringify(runInput)).digest("hex").slice(0, 16);
  const routerRunId = `run_${hash}_local`;

  // 6. Summarize Next Actions
  const totalMissions = planMissions.length;
  const routedCount = routeDecisions.filter(d => d.route_allowed).length;
  const queuedCount = queueEntries.length;
  const simulatedCompletedCount = queueEntries.filter(q => q.status === "COMPLETED_LOCAL_SIMULATION").length;
  const blockedRealWorldCount = routeDecisions.filter(d => !d.route_allowed).length;
  const failedCount = queueEntries.filter(q => q.status === "FAILED_BLOCKED").length;

  console.log(`[Capability Router] Routing summary:`);
  console.log(`  - Total Planned: ${totalMissions}`);
  console.log(`  - Routed: ${routedCount}`);
  console.log(`  - Blocked (Real-World): ${blockedRealWorldCount}`);
  if (options.simulateWorkers) {
    console.log(`  - Simulated Completed: ${simulatedCompletedCount}`);
    console.log(`  - Simulated Failed: ${failedCount}`);
  }

  const nextRecommendedActions = [];
  if (blockedRealWorldCount > 0) {
    nextRecommendedActions.push("Submit blocked real-world actions for manual owner approval.");
  }
  if (failedCount > 0) {
    nextRecommendedActions.push("Inspect simulated worker logs to debug retry exhaustion failures.");
  }
  if (routedCount > 0 && !options.simulateWorkers) {
    nextRecommendedActions.push("Run router dry-run with --simulate-workers to test local execution path.");
  }
  if (nextRecommendedActions.length === 0) {
    nextRecommendedActions.push("Proceed to Milestone 1.0E production deployment planner.");
  }

  console.log("[Capability Router] Recommended next actions:");
  for (const act of nextRecommendedActions) {
    console.log(`  - ${act}`);
  }

  const report = {
    router_run_id: routerRunId,
    router_mode: "local_dry_run",
    source_plan_id: sourcePlanId,
    scenario_id: scenarioId,
    total_missions: totalMissions,
    routed_count: routedCount,
    queued_count: queuedCount,
    simulated_completed_count: simulatedCompletedCount,
    blocked_real_world_count: blockedRealWorldCount,
    failed_count: failedCount,
    route_decisions: routeDecisions,
    queue_entries: queueEntries,
    worker_results: workerResults,
    blocked_reasons: routeDecisions.filter(d => !d.route_allowed).map(d => ({
      mission_id: d.mission_id,
      reason: d.blocked_reason
    })),
    next_recommended_actions: nextRecommendedActions
  };

  // 7. Write report if requested
  if (options.writeReport) {
    const reportDir = path.join(repoRoot, "reports", "capability-router");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, "latest.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    console.log(`[Capability Router] Report successfully written to reports/capability-router/latest.json`);
  }
}

main();
