#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Target report path: reports/mission-planner/latest.json

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
    goal: null,
    goalType: null,
    writeReport: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--goal" && i + 1 < args.length) {
      options.goal = args[i + 1];
      i++;
    } else if (args[i] === "--goal-type" && i + 1 < args.length) {
      options.goalType = args[i + 1];
      i++;
    } else if (args[i] === "--write-report") {
      options.writeReport = true;
    }
  }

  return options;
}

function main() {
  console.log("[Mission Planner] Initializing dry-run planner...");
  const options = parseArgs();

  // 1. Read configuration files
  const registryPath = path.join(repoRoot, "configs", "ai-company", "capability-registry.json");
  const typesPath = path.join(repoRoot, "configs", "ai-company", "mission-types.json");
  const samplePath = path.join(repoRoot, "configs", "ai-company", "sample-mission-plan.1.0c.json");

  if (!fs.existsSync(registryPath)) {
    console.error(`[Error] Capability registry not found at: ${registryPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(typesPath)) {
    console.error(`[Error] Mission types configuration not found at: ${typesPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(samplePath)) {
    console.error(`[Error] Sample mission plan not found at: ${samplePath}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const missionTypes = JSON.parse(fs.readFileSync(typesPath, "utf8"));
  const samplePlan = JSON.parse(fs.readFileSync(samplePath, "utf8"));

  // Check defaults if no goal text is provided
  const targetGoal = options.goal || samplePlan.source_goal;
  
  // Classify goal type
  let targetGoalType = options.goalType;
  if (!targetGoalType) {
    const lowerGoal = targetGoal.toLowerCase();
    if (lowerGoal.includes("grow") || lowerGoal.includes("multi-factory") || lowerGoal.includes("ops")) {
      targetGoalType = "company_ops";
    } else if (lowerGoal.includes("product") || lowerGoal.includes("delivery") || lowerGoal.includes("code")) {
      targetGoalType = "product_delivery";
    } else if (lowerGoal.includes("marketing") || lowerGoal.includes("media") || lowerGoal.includes("blog")) {
      targetGoalType = "media_growth";
    } else if (lowerGoal.includes("sales") || lowerGoal.includes("lead")) {
      targetGoalType = "sales_growth";
    } else if (lowerGoal.includes("research") || lowerGoal.includes("competitor")) {
      targetGoalType = "research_request";
    } else if (lowerGoal.includes("finance") || lowerGoal.includes("budget")) {
      targetGoalType = "finance_review";
    } else if (lowerGoal.includes("customer") || lowerGoal.includes("feedback")) {
      targetGoalType = "customer_success";
    } else if (lowerGoal.includes("knowledge") || lowerGoal.includes("docs")) {
      targetGoalType = "knowledge_update";
    } else {
      targetGoalType = "company_ops";
    }
  }

  console.log(`[Mission Planner] Goal text: "${targetGoal}"`);
  console.log(`[Mission Planner] Classified Goal Type: "${targetGoalType}"`);

  // Build capability map for quick validation
  const capMap = new Map();
  for (const cap of registry.capabilities) {
    capMap.set(cap.capability_id, cap);
  }

  // Build type map for capability resolution
  const typeMap = new Map();
  for (const type of missionTypes) {
    typeMap.set(type.mission_type, type);
  }

  // Decompose goal into missions
  let planMissions = [];

  if (targetGoal === samplePlan.source_goal) {
    // If it's the sample 1.0C growth goal, return the 8 required sample missions
    planMissions = samplePlan.missions.map(m => {
      // Validate that the capability exists in capability-registry
      if (!capMap.has(m.target_capability)) {
        throw new Error(`Capability "${m.target_capability}" mapped in mission "${m.mission_id}" does not exist in registry`);
      }
      return {
        ...m,
        dispatch_allowed: false,
        dispatch_blocked_reason: "Direct queue dispatch blocked. System is in planning-only mode."
      };
    });
  } else {
    // Dynamically plan based on the goal types
    const typesToPlan = [];
    if (targetGoalType === "product_delivery") {
      typesToPlan.push("REPO_AUDIT", "PRODUCT_RESEARCH", "CODE_MODIFICATION", "PR_REVIEW", "VERIFY_PHASE");
    } else if (targetGoalType === "media_growth") {
      typesToPlan.push("CONTENT_PLANNING", "BLOG_DRAFT", "MEDIA_AUDIT", "PUBLISH_DRY_RUN");
    } else {
      // Standard company ops fallback
      typesToPlan.push("REPO_AUDIT", "TECHNICAL_RESEARCH", "VERIFY_PHASE");
    }

    planMissions = typesToPlan.map((typeStr, idx) => {
      const typeDef = typeMap.get(typeStr);
      if (!typeDef) {
        throw new Error(`Unknown mission type: ${typeStr}`);
      }
      if (!capMap.has(typeDef.default_capability)) {
        throw new Error(`Capability "${typeDef.default_capability}" mapped for type "${typeStr}" does not exist in registry`);
      }

      const capDef = capMap.get(typeDef.default_capability);

      return {
        mission_id: `m0${idx + 1}_${typeStr.toLowerCase()}`,
        title: `Plan ${typeDef.default_capability.replace("_", " ")}`,
        mission_type: typeStr,
        target_factory: typeDef.default_factory,
        target_capability: typeDef.default_capability,
        owner_agent: typeDef.default_owner_agent,
        required_inputs: typeDef.default_required_inputs,
        expected_outputs: typeDef.default_expected_outputs,
        safety_class: typeDef.default_safety_class,
        blocked_actions: capDef.blocked_actions,
        approval_required_actions: capDef.approval_required_actions,
        depends_on: idx > 0 ? [`m0${idx}_${typesToPlan[idx - 1].toLowerCase()}`] : [],
        status: idx === 0 ? "ready_for_dry_run" : "planned",
        dispatch_allowed: false,
        dispatch_blocked_reason: "Direct queue dispatch blocked. System is in planning-only mode.",
        verifier_requirements: capDef.verifier_requirements || [],
        handoff_target: capDef.handoff_target
      };
    });
  }

  // Create deterministic plan_id
  let planId = "";
  if (targetGoal === samplePlan.source_goal) {
    planId = "plan_1.0c_company_ops_static_sample";
  } else {
    const hash = crypto.createHash("sha256").update(targetGoal + targetGoalType).digest("hex").slice(0, 12);
    planId = `plan_${targetGoalType}_${hash}_dry_run`;
  }

  // Create plan object
  const plan = {
    plan_id: planId,
    milestone: "1.0C",
    source_goal: targetGoal,
    goal_type: targetGoalType,
    planning_mode: "dry_run",
    created_by_agent: "ceo_agent",
    owner_approval_required: true,
    dispatch_allowed: false,
    dispatch_blocked_reason: "Router execution is blocked in planning-only phase 1.0C.",
    safety_summary: "Safe local execution of dry-run planning logic. Live queue operations blocked.",
    missions: planMissions
  };

  console.log(`[Mission Planner] Successfully planned ${plan.missions.length} missions.`);
  for (const m of plan.missions) {
    console.log(`  - Mission [${m.mission_id}]: ${m.title} -> ${m.target_factory} / ${m.target_capability} (depends_on: [${m.depends_on.join(", ")}])`);
  }

  // Write report if requested
  if (options.writeReport) {
    const reportDir = path.join(repoRoot, "reports", "mission-planner");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, "latest.json"),
      JSON.stringify(plan, null, 2),
      "utf8"
    );
    console.log(`[Mission Planner] Wrote plan report to: ${path.join(reportDir, "latest.json")}`);
  }

  console.log("[Mission Planner] Dry-run planning completed successfully.");
}

main();
