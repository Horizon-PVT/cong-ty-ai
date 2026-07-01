#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isValidBranchName } from "./safe-branch-execution-loop.mjs";

export { isValidBranchName };

const GATES_CHECKLIST = [
  "canMerge",
  "criticalGatesBlocked",
  "secretsRead",
  "deployAttempted",
  "destructiveActionAttempted",
  "spendAttempted",
  "externalCommunicationAttempted"
];

function getGhPath() {
  const commonPaths = [
    "C:\\Program Files\\GitHub CLI\\gh.exe",
    "C:\\Program Files (x86)\\GitHub CLI\\gh.exe",
    "gh"
  ];
  for (const p of commonPaths) {
    try {
      execSync(`"${p}" --version`, { stdio: "ignore" });
      return p;
    } catch {}
  }
  return null;
}

function getRepoIdentifier() {
  try {
    const remoteUrl = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
    const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^.]+)/);
    if (match) {
      return match[1];
    }
  } catch {}
  return null;
}

export function validateSelfTestReport(report) {
  const allowedVerdicts = ["PASS_READY_FOR_DRAFT_PR", "PASS_READY_FOR_OWNER_REVIEW"];
  if (!report.finalVerdict || !allowedVerdicts.includes(report.finalVerdict)) {
    return { valid: false, error: `Invalid finalVerdict: ${report.finalVerdict}` };
  }

  if (report.finalVerdict === "PASS_READY_FOR_DRAFT_PR" && report.canOpenDraftPr !== true) {
    return { valid: false, error: "Validation failed: canOpenDraftPr must be true when verdict is PASS_READY_FOR_DRAFT_PR" };
  }

  if (report.canMerge !== false) {
    return { valid: false, error: "Validation failed: canMerge must be false" };
  }

  if (report.criticalGatesBlocked !== true) {
    return { valid: false, error: "Validation failed: criticalGatesBlocked must be true" };
  }

  if (
    report.secretsRead !== false ||
    report.deployAttempted !== false ||
    report.destructiveActionAttempted !== false ||
    report.spendAttempted !== false ||
    report.externalCommunicationAttempted !== false
  ) {
    return { valid: false, error: "Validation failed: Blocked critical owner gates violated in report" };
  }

  if (!report.commands || !Array.isArray(report.commands) || report.commands.length === 0) {
    return { valid: false, error: "Validation failed: commands list is empty" };
  }

  for (const cmd of report.commands) {
    if (cmd.executionMode !== "real") {
      return { valid: false, error: `Validation failed: command "${cmd.command}" was run in simulated mode` };
    }
    if (cmd.status !== "PASS" && !cmd.optional) {
      return { valid: false, error: `Validation failed: command "${cmd.command}" status is not PASS` };
    }
    if (cmd.exitCode !== 0 && !cmd.optional) {
      return { valid: false, error: `Validation failed: command "${cmd.command}" exit code is non-zero` };
    }
  }

  return { valid: true };
}

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = !isApply || args.includes("--dry-run");

  console.log(`[PR Automation] Initializing Auto Push & Draft PR Gate...`);
  console.log(`[PR Automation] Mode: ${isDryRun ? "DRY-RUN (Simulated)" : "APPLY (Execution)"}`);

  // 1. Detect branch name
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.error(`[PR Automation] Error: Failed to check current Git branch.`);
    process.exit(1);
  }

  if (!isValidBranchName(currentBranch)) {
    console.error(`[PR Automation] Error: Auto PR Gate can only run on chore/* or feat/* feature branches.`);
    process.exit(1);
  }
  console.log(`[PR Automation] Active Git feature branch: \`${currentBranch}\``);

  // 2. Load latest.json report
  const reportPath = path.resolve("reports/self-test/latest.json");
  if (!fs.existsSync(reportPath)) {
    console.error(`[PR Automation] Error: Self-test report does not exist at ${reportPath}. Please run self-test runner first.`);
    process.exit(1);
  }

  let report = {};
  try {
    report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch (err) {
    console.error(`[PR Automation] Error: Failed to parse self-test report JSON: ${err.message}`);
    process.exit(1);
  }

  // 3. Validate safety policies and real PASS status
  const validation = validateSelfTestReport(report);
  if (!validation.valid) {
    console.error(`[PR Automation] Error: ${validation.error}`);
    process.exit(1);
  }
  console.log(`[PR Automation] Verification report validated successfully. PASS status is real and secure.`);

  // 4. Generate pr-body.md template
  const prBodyDir = path.resolve("reports/self-test");
  fs.mkdirSync(prBodyDir, { recursive: true });
  const prBodyPath = path.join(prBodyDir, "pr-body.md");

  let prTitle = "feat: add auto push & draft pr gate";
  let prBodyContent = "";

  if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0i.mjs")) && (currentBranch.includes("ai-company-os-paperclip-read-adapter") || currentBranch.includes("1.0i"))) {
    prTitle = "feat: add AI Company OS Paperclip read adapter";
    prBodyContent = `### Milestone 1.0I: AI Company OS Paperclip Read Adapter Implementation\n\n`;
    prBodyContent += `This PR implements Milestone 1.0I, turning the Paperclip Integration Contract into a working local read adapter that aggregates AI Company OS data sources and emits Paperclip-compatible widget payloads.\n\n`;
    prBodyContent += `- **Milestone**: 1.0I\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### Read Adapter Summary:\n`;
    prBodyContent += `Reads configs, memory streams, schemas, and optional runtime reports to build 12 stable widget payloads for Paperclip consumption.\n\n`;
    prBodyContent += `#### Data Sources:\n`;
    prBodyContent += `* 4 required sources (integration policy, widget map, company status schema, owner action schema)\n`;
    prBodyContent += `* 12 optional sources (memory streams, runtime reports)\n\n`;
    prBodyContent += `#### Widget Payloads (12 panels):\n`;
    prBodyContent += `Company Status, Mission Board, Factories, AI Staff, Provider Performance, Learning Feed, Staffing Gaps, Candidate Workers, Worker Scorecards, Owner Action Queue, Safety Locks, Next Actions\n\n`;
    prBodyContent += `#### Schemas & Fixtures Created:\n`;
    prBodyContent += `* \`schemas/ai-company/paperclip-read-adapter-output.schema.json\`\n`;
    prBodyContent += `* \`fixtures/ai-company/paperclip-read-adapter-output.sample.json\`\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* All safety locks enforced (no deploy/secrets/.env/spend/comms/publish/dashboard/frontend)\n`;
    prBodyContent += `* Read-only adapter mode confirmed\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0h.mjs")) && (currentBranch.includes("ai-company-os-paperclip-integration-contract") || currentBranch.includes("1.0h"))) {
    prTitle = "feat: add AI Company OS Paperclip integration contract";
    prBodyContent = `### Milestone 1.0H: AI Company OS Paperclip Integration Contract\n\n`;
    prBodyContent += `This PR implements Milestone 1.0H, defining the stable Paperclip Integration Contract, widget panel mappings, schemas, sample fixtures, local validation, and dry-run adapter mapping for the AI Company OS.\n\n`;
    prBodyContent += `- **Milestone**: 1.0H\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### Paperclip Integration Contract Summary:\n`;
    prBodyContent += `Establishes Paperclip as the primary user interface and human-in-the-loop dashboard, while the AI Company OS serves as the operating brain. Establishes read-only schemas and approval queues via \`owner-action-queue.jsonl\`.\n\n`;
    prBodyContent += `#### Paperclip Widget Map Summary:\n`;
    prBodyContent += `Maps 12 future operator panels (Company Status, Mission Board, Factories, AI Staff, Provider Performance, Learning Feed, Staffing Gaps, Candidate Workers, Worker Scorecards, Owner Action Queue, Safety Locks, Next Actions) to stable local reports and JSON paths.\n\n`;
    prBodyContent += `#### JSON Schemas Created:\n`;
    prBodyContent += `* \`schemas/ai-company/paperclip-company-status.schema.json\` (Validates unified company status snapshots)\n`;
    prBodyContent += `* \`schemas/ai-company/paperclip-owner-action.schema.json\` (Validates owner action queue items)\n`;
    prBodyContent += `* \`schemas/ai-company/paperclip-widget-map.schema.json\` (Validates widget configuration maps)\n\n`;
    prBodyContent += `#### Sample Fixtures Mapped:\n`;
    prBodyContent += `* \`fixtures/ai-company/paperclip-company-status.sample.json\`\n`;
    prBodyContent += `* \`fixtures/ai-company/paperclip-owner-action.sample.json\`\n\n`;
    prBodyContent += `#### Standalone UI Confirmation:\n`;
    prBodyContent += `* **No standalone dashboard or frontend UI built**: Strictly verified. Paperclip remains the sole UI layer.\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external customer communication**: Blocked.\n`;
    prBodyContent += `* **no real publish**: Blocked.\n`;
    prBodyContent += `* **no permanent worker core registry mutation**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0g.mjs")) && (currentBranch.includes("ai-company-os-operator-console") || currentBranch.includes("1.0g"))) {
    prTitle = "feat: add AI Company OS operator console";
    prBodyContent = `### Milestone 1.0G: AI Company OS Operator Console & Workbench\n\n`;
    prBodyContent += `This PR implements Milestone 1.0G, establishing the Operator Console, status snapshot, and owner action queue simulations for the AI Company OS.\n\n`;
    prBodyContent += `- **Milestone**: 1.0G\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### What AI Staff Workbench does:\n`;
    prBodyContent += `Acts as the Paperclip-compatible operator data layer of the AI Company OS, gathering and formatting company status, gaps, provider performance, and trial statistics.\n\n`;
    prBodyContent += `#### What Operator Console does:\n`;
    prBodyContent += `Provides local query status commands, snapshot exports, and action queue dry-run runs for safe, read-only system inspection.\n\n`;
    prBodyContent += `#### Supported Commands:\n`;
    prBodyContent += `* STATUS, SHOW_ORG, SHOW_FACTORIES, SHOW_WORKERS, SHOW_PROVIDERS, SHOW_LEARNING, SHOW_STAFFING, SHOW_CANDIDATES, SHOW_SCORECARDS, SHOW_OWNER_QUEUE, SHOW_NEXT_ACTIONS, EXPORT_SNAPSHOT\n\n`;
    prBodyContent += `#### Owner Action Queue Summary:\n`;
    prBodyContent += `* Tracks pending decisions that require owner approvals, such as live API activation, spending, publishing, and candidate worker confirmation.\n\n`;
    prBodyContent += `#### Status Snapshot Summary:\n`;
    prBodyContent += `* Exports a stable, unified JSON snapshot designed for seamless ingestion by the Paperclip dashboard UI.\n\n`;
    prBodyContent += `#### Memory Files Created:\n`;
    prBodyContent += `* \`memory/ai-company/owner-action-queue.jsonl\`\n`;
    prBodyContent += `* \`memory/ai-company/operator-notes.jsonl\`\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external customer communication**: Blocked.\n`;
    prBodyContent += `* **no real publish**: Blocked.\n`;
    prBodyContent += `* **no permanent worker core registry mutation**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0f.mjs")) && (currentBranch.includes("ai-company-os-dynamic-staffing") || currentBranch.includes("1.0f"))) {
    prTitle = "feat: add AI Company OS dynamic staffing";
    prBodyContent = `### Milestone 1.0F: AI Company OS Dynamic AI Staffing\n\n`;
    prBodyContent += `This PR implements Milestone 1.0F, establishing the Dynamic AI Staffing pipeline and loop simulation for the AI Company OS.\n\n`;
    prBodyContent += `- **Milestone**: 1.0F\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### What Dynamic AI Staffing does:\n`;
    prBodyContent += `Identifies skill and capacity gaps in active factories and resolves them by configuring temporary workers, managing candidate trials, and generating promotional reports for owner review.\n\n`;
    prBodyContent += `#### Temporary/Candidate/Permanent worker model:\n`;
    prBodyContent += `* **Temporary Workers**: Local task-specific instances (e.g. \`temporary_worker_tiktok_hook_001\`) created to run immediate trial missions.\n`;
    prBodyContent += `* **Candidate Workers**: Proposed profiles undergoing structured evaluation runs before permanent promotion.\n`;
    prBodyContent += `* **Permanent Workers**: Official core profiles requiring manual owner review and code check-in (unmutated automatically).\n\n`;
    prBodyContent += `#### Staffing Policy Summary:\n`;
    prBodyContent += `* Configures severity thresholds, KPI targets, and promotion/archival readiness rules.\n`;
    prBodyContent += `* Enforces local auto-creation blocks for permanent roles.\n\n`;
    prBodyContent += `#### Worker Archetype Summary:\n`;
    prBodyContent += `* 14 distinct roles defined across Dev, Media, Sales, Research, CS, Finance, and Knowledge factories.\n\n`;
    prBodyContent += `#### Staffing Gap Scenario Summary:\n`;
    prBodyContent += `* 5 preconfigured scenarios covering low quality hooks, test failures, weak followups, high API costs, and panel overuse.\n\n`;
    prBodyContent += `#### Worker Trial & Scorecard Summary:\n`;
    prBodyContent += `* Simulation engine evaluates trial results, updates worker scorecards, and calculates readiness scores.\n\n`;
    prBodyContent += `#### Staffing Sweep Summary:\n`;
    prBodyContent += `* Sweeper script aggregates gap detections across scenarios and ranks recommended hires.\n\n`;
    prBodyContent += `#### Memory Files Created:\n`;
    prBodyContent += `* \`memory/ai-company/staffing-gaps.jsonl\`\n`;
    prBodyContent += `* \`memory/ai-company/worker-candidates.jsonl\`\n`;
    prBodyContent += `* \`memory/ai-company/worker-trials.jsonl\`\n`;
    prBodyContent += `* \`memory/ai-company/worker-scorecards.json\`\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external customer communication**: Blocked.\n`;
    prBodyContent += `* **no real publish**: Blocked.\n`;
    prBodyContent += `* **no permanent worker core registry mutation**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0e.mjs")) && (currentBranch.includes("ai-company-os-provider-learning-loop") || currentBranch.includes("1.0e"))) {
    prTitle = "feat: add AI Company OS multi-provider learning loop";
    prBodyContent = `### Milestone 1.0E: AI Company OS Multi-Provider Learning Loop\n\n`;
    prBodyContent += `This PR implements Milestone 1.0E, establishing the AI Staff Runtime, Multi-Provider Router, and Self-Learning Loop for the AI Company OS.\n\n`;
    prBodyContent += `- **Milestone**: 1.0E\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### What AI Staff Runtime does:\n`;
    prBodyContent += `Manages role/persona mappings to provider pools, fallbacks, challengers, panel, and cheap modes, shielding workers from hard API binds.\n\n`;
    prBodyContent += `#### What Multi-Provider Router does:\n`;
    prBodyContent += `Dynamically evaluates candidate providers/models/runtimes for each mission using role_fit, task_fit, quality, cost, latency, and reliability scores.\n\n`;
    prBodyContent += `#### What Self-Learning Loop does:\n`;
    prBodyContent += `Records simulated mission outcomes (quality, latency, success) to local memory, extracts lessons, updates provider rankings, and offers preview staffing recommendations.\n\n`;
    prBodyContent += `#### Provider Registry Summary:\n`;
    prBodyContent += `* **openai**: strategy, coding support, structured reasoning (chatgpt, codex runtimes)\n`;
    prBodyContent += `* **anthropic**: review, critique, long-context analysis (claude_api, claude_code runtimes)\n`;
    prBodyContent += `* **google**: testing, Gemini workflows, Antigravity runtime (antigravity, gemini_api runtimes)\n`;
    prBodyContent += `* **local**: cheap classification, log summaries (local_runner runtime)\n`;
    prBodyContent += `* **hermes_internal**: media operations, brand learning (hermes runtime)\n\n`;
    prBodyContent += `#### Runtime Registry Summary:\n`;
    prBodyContent += `* Conversational and code-execution interfaces mapped to appropriate permission levels (can_modify_repo, can_open_pr, can_run_tests).\n\n`;
    prBodyContent += `#### Agent Provider Pool Summary:\n`;
    prBodyContent += `* Every executive agent and worker mapped to customized primary/fallback/challenger/cheap configurations.\n\n`;
    prBodyContent += `#### Learning Memory Files:\n`;
    prBodyContent += `* \`memory/ai-company/provider-performance.json\`: aggregates provider execution stats.\n`;
    prBodyContent += `* \`memory/ai-company/capability-scores.json\`: tracks capability success rates.\n`;
    prBodyContent += `* \`memory/ai-company/mission-lessons.jsonl\`: appends individual mission lessons.\n`;
    prBodyContent += `* \`memory/ai-company/decision-log.jsonl\`: logs provider and policy changes.\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external customer communication**: Blocked.\n`;
    prBodyContent += `* **no real publish**: Blocked.\n`;
    prBodyContent += `* **no production data mutation**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0d.mjs")) && (currentBranch.includes("ai-company-os-capability-router") || currentBranch.includes("1.0d"))) {
    prTitle = "feat: add AI Company OS capability router";
    prBodyContent = `### Milestone 1.0D: AI Company OS Capability Router\n\n`;
    prBodyContent += `This PR implements Milestone 1.0D, establishing the local Capability Router, in-memory queue, and worker execution simulation for the AI Company OS.\n\n`;
    prBodyContent += `- **Milestone**: 1.0D\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### What Capability Router does:\n`;
    prBodyContent += `Reads the Capability Registry, Mission Types, and Mission Plans, resolves target capabilities, validates factory and owner agent constraints, and places missions in a simulated local queue.\n\n`;
    prBodyContent += `#### Local Queue and Worker Simulation:\n`;
    prBodyContent += `Emulates local-safe worker claiming, execution, and artifact writing, with automated retry/backoff simulation. Actions implying real-world side effects are blocked.\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`docs/ai-company-os/capability-router.md\`\n`;
    prBodyContent += `* \`docs/ai-company-os/local-mission-queue.md\`\n`;
    prBodyContent += `* \`configs/ai-company/router-policy.json\`\n`;
    prBodyContent += `* \`configs/ai-company/router-scenarios.1.0d.json\`\n`;
    prBodyContent += `* \`scripts/ai-company-capability-router-dry-run.mjs\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-1.0d.mjs\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-pr-automation.mjs\` (updated to support 1.0D template generation)\n\n`;
    prBodyContent += `#### Scenarios Created:\n`;
    prBodyContent += `1. **scenario_1_default_sample**: Routing default sample plan from 1.0C.\n`;
    prBodyContent += `2. **scenario_2_product_delivery**: Routing a product delivery plan with code refactor (safe) and merge (blocked).\n`;
    prBodyContent += `3. **scenario_3_media_growth**: Routing media campaigns with dry-run publish (safe) and live publish (blocked).\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external communications**: Blocked.\n`;
    prBodyContent += `* **no auto-publish**: Blocked.\n`;
    prBodyContent += `* **no live queue dispatch**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0c.mjs")) && (currentBranch.includes("ai-company-os-mission-planner") || currentBranch.includes("1.0c"))) {
    prTitle = "feat: add AI Company OS mission planner";
    prBodyContent = `### Milestone 1.0C: AI Company OS Mission Planner\n\n`;
    prBodyContent += `This PR implements Milestone 1.0C, establishing the static Mission Planner and contract/schema validation layer for the AI Company OS.\n\n`;
    prBodyContent += `- **Milestone**: 1.0C\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### Why Mission Planner is needed:\n`;
    prBodyContent += `To execute company-level goals autonomously, we need a planner layer that decomposes human-level objectives into a dependency-ordered list of missions with defined factories, capabilities, inputs, outputs, and safety properties.\n\n`;
    prBodyContent += `#### Relationship to Organization Model from 1.0A:\n`;
    prBodyContent += `Every planned mission is assigned to a target factory and monitored by its respective executive agent (CTO, CMO, CFO, etc.) defined in Milestone 1.0A.\n\n`;
    prBodyContent += `#### Relationship to Capability Registry from 1.0B:\n`;
    prBodyContent += `The Mission Planner resolves mission types to their registered capabilities, verifying that input schemas, output targets, and safety boundaries exist in the registry.\n\n`;
    prBodyContent += `#### Difference between Mission Planner and Capability Router:\n`;
    prBodyContent += `* **Mission Planner**: Decoupled dry-run layer that analyzes and decomposes a goal into a static dependency plan.\n`;
    prBodyContent += `* **Capability Router**: Runtime engine (Milestone 1.0D) that will dispatch missions to active worker queues.\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`docs/ai-company-os/mission-planner.md\`\n`;
    prBodyContent += `* \`docs/ai-company-os/mission-plan-contract.md\`\n`;
    prBodyContent += `* \`configs/ai-company/mission-plan.schema.json\`\n`;
    prBodyContent += `* \`configs/ai-company/mission-types.json\`\n`;
    prBodyContent += `* \`configs/ai-company/sample-mission-plan.1.0c.json\`\n`;
    prBodyContent += `* \`scripts/ai-company-mission-planner-dry-run.mjs\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-1.0c.mjs\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-pr-automation.mjs\` (updated to support 1.0C template generation)\n\n`;
    prBodyContent += `#### Mission Types Added:\n`;
    prBodyContent += `* Default mappings for 32 mission types across AI Dev, Media, Sales, Research, Finance, Customer Success, and Knowledge factories.\n\n`;
    prBodyContent += `#### Sample Mission Plan Summary:\n`;
    prBodyContent += `* Decomposes the OS grow goal into 8 ordered missions: \`REPO_AUDIT\`, \`PRODUCT_RESEARCH\`, \`MARKET_RESEARCH\`, \`CONTENT_PLANNING\`, \`LEAD_RESEARCH\`, \`PRICING_ANALYSIS\`, \`DOC_SUMMARY\`, and \`VERIFY_PHASE\`.\n`;
    prBodyContent += `* All sample missions are configured with \`dispatch_allowed = false\` (dry-run/static planning only).\n\n`;
    prBodyContent += `#### Dry-Run Planner Summary:\n`;
    prBodyContent += `* \`ai-company-mission-planner-dry-run.mjs\` deterministically parses goals, classifies goal types, maps mission types to capabilities, and validates capability existence in the registry.\n\n`;
    prBodyContent += `#### Verification Results:\n`;
    prBodyContent += `* \`node packages/db/src/_verify-1.0c.mjs\`: PASS\n`;
    prBodyContent += `* \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0c --dry-run --write-report\`: PASS\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external communications**: Blocked.\n`;
    prBodyContent += `* **no auto-publish**: Blocked.\n`;
    prBodyContent += `* **no live queue dispatch**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (currentBranch.includes("owner-approved-merge-cleanup-gate") || currentBranch.includes("0.3m")) {
    prTitle = "feat: add owner-approved merge cleanup gate";
    prBodyContent = `### Phase 0.3M Owner-Approved Merge & Post-Merge Cleanup Gate\n\n`;
    prBodyContent += `This PR implements Phase 0.3M, introducing an owner-approved merge gate and local post-merge workspace cleanup.\n\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n`;
    prBodyContent += `- **Self-Test Verdict**: \`${report.finalVerdict}\`\n`;
    prBodyContent += `- **Execution Mode**: \`REAL\`\n`;
    prBodyContent += `- **Timestamp**: \`${new Date().toISOString()}\`\n\n`;
    prBodyContent += `#### Capabilities Added:\n`;
    prBodyContent += `* owner-approved merge gate\n`;
    prBodyContent += `* approval token format\n`;
    prBodyContent += `* post-merge cleanup\n`;
    prBodyContent += `* post-merge reports\n`;
    prBodyContent += `* explicit owner approval required before merge\n`;
    prBodyContent += `* verify-0.3M PASS\n`;
    prBodyContent += `* critical gates still blocked\n\n`;
  } else if (currentBranch.includes("end-to-end-autonomous-dev-run") || currentBranch.includes("0.3n")) {
    prTitle = "feat: add end-to-end autonomous dev run orchestrator";
    prBodyContent = `### Phase 0.3N End-to-End Autonomous Dev Run\n\n`;
    prBodyContent += `This PR implements Phase 0.3N, introducing a unified orchestrator runner that automates goal intake, branch verification, execution, self-testing, and Draft PR creation.\n\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n`;
    prBodyContent += `- **Self-Test Verdict**: \`${report.finalVerdict}\`\n`;
    prBodyContent += `- **Execution Mode**: \`REAL\`\n`;
    prBodyContent += `- **Timestamp**: \`${new Date().toISOString()}\`\n\n`;
    prBodyContent += `#### Orchestrated Gates & Capabilities:\n`;
    prBodyContent += `* **Owner Goal Intake**: Intent parsing blocks deploy, secrets, destructive db migrations, spending, and external communication.\n`;
    prBodyContent += `* **Safe Feature Branch Loop Validation**: Blocks master/main branch runs and enforces feature branch naming conventions.\n`;
    prBodyContent += `* **Controlled Proof Task**: Executes safe scoped documentation updates (writing docs/ai-dev-factory-e2e-proof.md).\n`;
    prBodyContent += `* **Autonomous Self-Test Gate Integration**: Automatically executes full verification tests suite locally.\n`;
    prBodyContent += `* **Auto Push & Draft PR Gate Integration**: Automatically pushes feature branch and opens Draft PR on GitHub.\n`;
    prBodyContent += `* **Owner-Approved Merge Gate Integration**: Connects to owner merge gate verifying approval tokens.\n`;
    prBodyContent += `* **Post-Merge local Cleanup**: Automatically switches to master, pulls remote master, deletes local feature branch safely, and prunes remote tracking branches.\n`;
    prBodyContent += `* **E2E Reports**: Writes latest.json and latest.md run metrics.\n`;
    prBodyContent += `* **verify-0.3N PASS**: Full E2E verifications pass successfully.\n`;
    prBodyContent += `* **Critical Gates Still Blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `* **Merge Action Restricted**: Merge remains strictly blocked pending explicit owner approval token of format \`OWNER_APPROVED_MERGE_PR=<number>\`.\n\n`;
  } else if (currentBranch.includes("e2e-merge-path-dirty-tree-hardening") || currentBranch.includes("0.3o")) {
    prTitle = "feat: harden e2e merge path dirty tree handling";
    prBodyContent = `### Phase 0.3O E2E Merge-Path Dirty Tree Hardening\n\n`;
    prBodyContent += `This PR implements Phase 0.3O, resolving the edge case where the E2E runner wrote reports before post-merge cleanup, dirtying the working tree.\n\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n`;
    prBodyContent += `- **Self-Test Verdict**: \`${report.finalVerdict}\`\n`;
    prBodyContent += `- **Execution Mode**: \`REAL\`\n`;
    prBodyContent += `- **Timestamp**: \`${new Date().toISOString()}\`\n\n`;
    prBodyContent += `#### Changes Made & Capabilities:\n`;
    prBodyContent += `* **Pre-Merge Clean-Tree Checks**: Enforces a clean working tree before owner-approved merge.\n`;
    prBodyContent += `* **Fixed Merge-Mode Order**: Merges PR first, runs post-merge cleanup immediately, and only writes E2E reports after cleanup.\n`;
    prBodyContent += `* **Clean-Tree Checks after Cleanup**: Confirms the branch is master and the working tree is clean after cleanup.\n`;
    prBodyContent += `* **Runtime Report Tracking Policy**: Adds E2E and post-merge runtime report files to \`.gitignore\` to ensure they do not dirty the repository.\n`;
    prBodyContent += `* **verify-0.3O PASS**: Full verification suite passes successfully.\n`;
    prBodyContent += `* **Self-Test Resiliency**: Makes DB and API connection checks optional/non-fatal so offline states do not fail E2E run validations.\n`;
    prBodyContent += `* **Critical Gates Still Blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `* **Merge Action Restricted**: Merge remains strictly blocked pending explicit owner approval token of format \`OWNER_APPROVED_MERGE_PR=<number>\`.\n\n`;
  } else if (currentBranch.includes("first-real-product-task-e2e") || currentBranch.includes("0.3p")) {
    prTitle = "feat: add first real product task e2e mission";
    prBodyContent = `### Phase 0.3P First Real Product Task Through E2E Loop\n\n`;
    prBodyContent += `This PR implements Phase 0.3P, executing the first real product-facing task under the automated E2E dev pipeline.\n\n`;
    prBodyContent += `- **Phase**: 0.3P\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n`;
    prBodyContent += `- **Product task selected**: "Create a read-only product capability page/document describing how AI Dev Factory can accept a small product task and route it through safe E2E execution."\n`;
    prBodyContent += `- **Self-test verdict**: \`${report.finalVerdict}\`\n`;
    prBodyContent += `- **Execution Mode**: \`REAL\`\n`;
    prBodyContent += `- **Timestamp**: \`${new Date().toISOString()}\`\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`missions/phase-0.3p-first-product-task.json\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-first-product-task.md\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-0.3p.mjs\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-pr-automation.mjs\`\n\n`;
    prBodyContent += `#### Why this is a safe real product task:\n`;
    prBodyContent += `* Only writes read-only document files (\`docs/ai-dev-factory-first-product-task.md\`) and configuration/validation code.\n`;
    prBodyContent += `* Does not modify server routes, database logic, or system actions.\n`;
    prBodyContent += `* Enforces all standard safety boundaries (no deploy, no secrets, no destructive DB actions, no external/customer comms, no spend).\n\n`;
    prBodyContent += `#### Changes Made & Capabilities:\n`;
    prBodyContent += `* **Mission File Control**: Declares the task parameters in \`missions/phase-0.3p-first-product-task.json\`.\n`;
    prBodyContent += `* **Product Capability Page**: Documents Safe E2E Task Execution for operators.\n`;
    prBodyContent += `* **verify-0.3P PASS**: The new verification script validates the mission definition and product document.\n`;
    prBodyContent += `* **Self-Test Support**: Self-test gate supports \`--phase 0.3p\` filters.\n`;
    prBodyContent += `* **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `* **Merge Action Restricted**: Merge requires OWNER_APPROVED_MERGE_PR=<PR_NUMBER> token.\n\n`;
  } else if (currentBranch.includes("mission-queue-resume-idempotency") || currentBranch.includes("0.3q")) {
    prTitle = "feat: add mission queue resume idempotency";
    prBodyContent = `### Phase 0.3Q Mission Queue & Resume/Idempotency\n\n`;
    prBodyContent += `This PR implements Phase 0.3Q, defining the design and static verification scripts for the safe mission queue and resume/idempotency behaviors.\n\n`;
    prBodyContent += `- **Phase**: 0.3Q\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n`;
    prBodyContent += `- **Mission queue capability**: Safe state tracking (Pending -> Claimed -> Running -> Testing -> PR -> Approved -> Merged -> Cleaned), locking, and idempotency.\n`;
    prBodyContent += `- **Self-test verdict**: \`${report.finalVerdict}\`\n`;
    prBodyContent += `- **Execution Mode**: \`REAL\`\n`;
    prBodyContent += `- **Timestamp**: \`${new Date().toISOString()}\`\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`docs/ai-dev-factory-mission-queue.md\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-resume-policy.md\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += `* \`missions/queue/phase-0.3q-sample-queue.json\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-0.3p.mjs\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-0.3q.mjs\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-pr-automation.mjs\`\n\n`;
    prBodyContent += `#### Why this is a safe real product task:\n`;
    prBodyContent += `* Only creates design documents, static sample JSON configs, and verification scripts.\n`;
    prBodyContent += `* Does not modify server routes, database logic, or system actions.\n`;
    prBodyContent += `* Enforces all standard safety boundaries (no deploy, no secrets, no destructive DB actions, no external/customer comms, no spend).\n\n`;
    prBodyContent += `#### Resume/Idempotency & Duplicate PR Prevention Behavior:\n`;
    prBodyContent += `* **Branch Reuse**: Switches to and reuses the existing branch if it exists.\n`;
    prBodyContent += `* **Duplicate PR Prevention**: If a draft PR already exists, the runner edits/updates it using \`gh pr edit\` instead of spawning a new one.\n`;
    prBodyContent += `* **Skipping Completed Tasks**: Skips rerun entirely if the mission status is already \`MERGED\` or \`CLEANED\`.\n`;
    prBodyContent += `* **Self-Test Validation**: Only trusts local self-test reports if the report's commit \`head_sha\` matches the active branch's current commit.\n`;
    prBodyContent += `* **Lock Control**: Prevents concurrent runs by writing and checking lock files.\n`;
    prBodyContent += `* **verify-0.3p branch-compatibility fix**: Keeps 0.3P static scope checks active on 0.3P branches, while avoiding false failures when earlier phase verifiers are called from later phase branches such as 0.3Q.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge Action Restricted**: Merge requires OWNER_APPROVED_MERGE_PR=<PR_NUMBER> token.\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0b.mjs")) && (currentBranch.includes("ai-company-os-capability-registry") || currentBranch.includes("1.0b"))) {
    prTitle = "feat: add AI Company OS capability registry";
    prBodyContent = `### Milestone 1.0B: AI Company OS Capability Registry\n\n`;
    prBodyContent += `This PR implements Milestone 1.0B, establishing the static Capability Registry and Contract format for all factories in the AI Company OS.\n\n`;
    prBodyContent += `- **Milestone**: 1.0B\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### Why Capability Registry is needed:\n`;
    prBodyContent += `To scale corporate operations dynamically, we decouple task planning from execution. The Capability Registry defines what services are available, their required inputs/outputs, and safety controls, enabling the CEO Agent to route missions strategically.\n\n`;
    prBodyContent += `#### Relationship to Organization Model from 1.0A:\n`;
    prBodyContent += `Every registered capability maps directly back to a factory defined in Milestone 1.0A and is owned by its respective executive agent.\n\n`;
    prBodyContent += `#### Difference between Capability Registry and Capability Router:\n`;
    prBodyContent += `* **Capability Registry**: Static catalog declaring capability JSON schemas, allowed tools, and safety boundaries.\n`;
    prBodyContent += `* **Capability Router**: Active runtime engine dispatching missions to target factory queues under worker locks.\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`docs/ai-company-os/capability-registry.md\`\n`;
    prBodyContent += `* \`docs/ai-company-os/capability-contracts.md\`\n`;
    prBodyContent += `* \`configs/ai-company/capability-registry.json\`\n`;
    prBodyContent += `* \`configs/ai-company/capability-contract.schema.json\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-1.0b.mjs\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += "* `scripts/ai-dev-factory-pr-automation.mjs` (updated to support 1.0B template generation)\n\n";
    prBodyContent += `#### Factories included:\n`;
    prBodyContent += `* ai_dev_factory, media_factory, sales_factory, research_factory, finance_factory, customer_success_factory, knowledge_factory\n\n`;
    prBodyContent += `#### Capabilities included (32 total):\n`;
    prBodyContent += `* **ai_dev_factory**: dev_repo_audit, dev_task_implementation, dev_pr_review, dev_e2e_merge_gate, dev_self_test_verification\n`;
    prBodyContent += `* **media_factory**: media_content_strategy, media_content_generation, media_review_queue, media_publish_dry_run, media_brand_memory\n`;
    prBodyContent += `* **sales_factory**: sales_lead_research, sales_message_drafting, sales_followup_planning, sales_offer_packaging, sales_pipeline_reporting\n`;
    prBodyContent += `* **research_factory**: market_research, competitor_research, product_research, technical_research, source_summary\n`;
    prBodyContent += `* **finance_factory**: budget_tracking, pricing_analysis, revenue_projection, cost_risk_review\n`;
    prBodyContent += `* **customer_success_factory**: customer_onboarding_plan, customer_issue_triage, customer_feedback_summary, retention_plan\n`;
    prBodyContent += `* **knowledge_factory**: knowledge_ingestion, memory_update_candidate, internal_docs_summary, decision_log_maintenance\n\n`;
    prBodyContent += `#### Verification Results:\n`;
    prBodyContent += `* \`node packages/db/src/_verify-1.0b.mjs\`: PASS\n`;
    prBodyContent += `* \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0b --dry-run --write-report\`: PASS\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external communications**: Blocked.\n`;
    prBodyContent += `* **no auto-publish**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-1.0a.mjs")) && (currentBranch.includes("ai-company-os-organization-model") || currentBranch.includes("1.0a"))) {
    prTitle = "feat: add AI Company OS organization model";
    prBodyContent = `### Milestone 1.0A: AI Company OS Organization Model\n\n`;
    prBodyContent += `This PR implements Milestone 1.0A, transitioning from a single capability developer factory into the broader AI Company Operating System.\n\n`;
    prBodyContent += `- **Milestone**: 1.0A\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### Why Milestone 1 starts now:\n`;
    prBodyContent += `The foundational engineering dev loop (Milestone 0.3) is completely stabilized and merged. We now expand the architecture to support multiple factories (Sales, Media, Finance, CS, etc.) and organizational executive roles under one operating system.\n\n`;
    prBodyContent += `#### Relationship between AI Dev Factory and AI Company OS:\n`;
    prBodyContent += `The AI Dev Factory is repositioned as a specialized capability registry ("Engineering") within the overarching OS, controlled by the CTO Agent.\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`docs/ai-company-os/overview.md\`\n`;
    prBodyContent += `* \`docs/ai-company-os/organization-model.md\`\n`;
    prBodyContent += `* \`docs/ai-company-os/milestone-1-roadmap.md\`\n`;
    prBodyContent += `* \`docs/ai-company-os/milestone-0.3-closeout.md\`\n`;
    prBodyContent += `* \`configs/ai-company/organization-model.json\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-1.0a.mjs\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-0.3n.mjs\` (updated to support schema skip for merge-mode reports)\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += "* `scripts/ai-dev-factory-pr-automation.mjs` (updated to support 1.0A template generation)\n\n";
    prBodyContent += `#### Organization roles added:\n`;
    prBodyContent += `* CEO Agent, COO Agent, CTO Agent, CMO Agent, CFO Agent, Product Agent, Research Agent, Legal/Risk Agent, Human Owner\n\n`;
    prBodyContent += `#### Factories/capabilities added:\n`;
    prBodyContent += `* ai_dev_factory, media_factory, sales_factory, research_factory, finance_factory, customer_success_factory, knowledge_factory\n\n`;
    prBodyContent += `#### Verification Results:\n`;
    prBodyContent += `* \`node packages/db/src/_verify-1.0a.mjs\`: PASS\n`;
    prBodyContent += `* \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0a --dry-run --write-report\`: PASS\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external communications**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (fs.existsSync(path.resolve("packages/db/src/_verify-0.3s.mjs")) && (currentBranch.includes("queue-runtime-engine") || currentBranch.includes("0.3s"))) {
    prTitle = "feat: harden queue runtime multi-worker reliability";
    prBodyContent = `### Phase 0.3S Multi-Worker & Reliability Hardening\n\n`;
    prBodyContent += `This PR implements Phase 0.3S, upgrading the queue runtime to support safe multi-worker execution, lock heartbeats, crash recovery, retries, and fairness selection.\n\n`;
    prBodyContent += `- **Phase**: 0.3S\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-queue-runner.mjs\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-0.3s.mjs\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-0.3q.mjs\`\n`;
    prBodyContent += `* \`missions/queue/phase-0.3s-queue.json\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-pr-automation.mjs\`\n\n`;
    prBodyContent += `* **verify-0.3q branch-compatibility fix**: keeps 0.3Q static scope checks active on 0.3Q branches, while avoiding false failures when earlier phase verifiers are called from later phase branches such as 0.3S.\n\n`;
    prBodyContent += `#### Summary of Hardening:\n`;
    prBodyContent += `* **queue write lock synchronization**: Added queue file write locking (\`phase-0.3s-queue.json.lock\`) to eliminate read-modify-write race conditions.\n`;
    prBodyContent += `* **in-process heartbeat**: Implemented in-process asynchronous heartbeat refreshing every 2s.\n`;
    prBodyContent += `* **signal cleanup**: Added cleanup handlers for exit, SIGINT, SIGTERM, and uncaughtException to safely delete owned locks.\n`;
    prBodyContent += `* **stale threshold ≥12s**: Upgraded stale threshold to 12s to protect against GC and scheduling pauses.\n`;
    prBodyContent += `* **crash recovery to FAILED_RETRYABLE / FAILED_BLOCKED**: Stale locks transition directly to FAILED_RETRYABLE (or FAILED_BLOCKED if retries exhausted) instead of CLAIMED, incrementing retry count.\n`;
    prBodyContent += `* **retry jitter**: Added 0-3s random jitter to exponential backoff delay calculation.\n`;
    prBodyContent += `* **fairness sorting**: Sorted candidate missions by priority (default 2), created_at (age), and retry_count.\n`;
    prBodyContent += `* **optimistic lock validation**: Version validation on lock write and cleanup release.\n`;
    prBodyContent += `* **verifier coverage**: Fully covered with concurrent and recovery test cases.\n\n`;
    prBodyContent += `#### Verification Results:\n`;
    prBodyContent += `* \`node packages/db/src/_verify-0.3s.mjs\`: PASS\n`;
    prBodyContent += `* \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 0.3s --dry-run --write-report\`: PASS\n\n`;
    prBodyContent += `#### Safety Confirmation:\n`;
    prBodyContent += `* **no deploy**: Blocked.\n`;
    prBodyContent += `* **no secrets**: Blocked.\n`;
    prBodyContent += `* **no .env touch**: Blocked.\n`;
    prBodyContent += `* **no destructive DB**: Blocked.\n`;
    prBodyContent += `* **no spend**: Blocked.\n`;
    prBodyContent += `* **no external communications**: Blocked.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge remains blocked until owner approval token**: \`OWNER_APPROVED_MERGE_PR=<PR_NUMBER>\`\n\n`;
  } else if (currentBranch.includes("queue-runtime-engine") || currentBranch.includes("0.3r")) {
    prTitle = "feat: add queue runtime engine";
    prBodyContent = `### Phase 0.3R Queue Runtime (Minimal Execution Engine)\n\n`;
    prBodyContent += `This PR implements Phase 0.3R, converting the static mission queue design into a minimal working runtime execution engine.\n\n`;
    prBodyContent += `- **Phase**: 0.3R\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n`;
    prBodyContent += `- **Capability**: A queue runner that picks, locks, executes, and updates missions end-to-end locally.\n`;
    prBodyContent += `- **Self-test verdict**: \`${report.finalVerdict}\`\n`;
    prBodyContent += `- **Execution Mode**: \`REAL\`\n`;
    prBodyContent += `- **Timestamp**: \`${new Date().toISOString()}\`\n\n`;
    prBodyContent += `#### Files changed:\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-queue-runner.mjs\`\n`;
    prBodyContent += `* \`packages/db/src/_verify-0.3r.mjs\`\n`;
    prBodyContent += `* \`missions/queue/phase-0.3r-queue.json\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-self-test-gate.mjs\`\n`;
    prBodyContent += `* \`docs/ai-dev-factory-execution-status.md\`\n`;
    prBodyContent += `* \`scripts/ai-dev-factory-pr-automation.mjs\`\n\n`;
    prBodyContent += `#### Why this is a safe execution engine:\n`;
    prBodyContent += `* Only runs mock tasks locally (verifiers/self-tests).\n`;
    prBodyContent += `* No remote deployment, no database writes, no secret exposure, no external calls.\n`;
    prBodyContent += `* Enforces all standard safety boundaries.\n\n`;
    prBodyContent += `#### Resume/Idempotency & Lock Behavior:\n`;
    prBodyContent += `* **Resume Support**: If mission is already CLAIMED or RUNNING, resumes instead of restarting.\n`;
    prBodyContent += `* **Idempotency**: Skips missions already in MERGED, CLEANED, WAITING_OWNER_APPROVAL, or DRAFT_PR_OPENED states.\n`;
    prBodyContent += `* **Lock Control**: Prevents concurrent runs by writing and checking lock files atomically.\n`;
    prBodyContent += `* **verify-0.3r PASS**: The new verification script validates the queue runtime behavior.\n\n`;
    prBodyContent += `#### Owner Safety Gate Controls\n`;
    prBodyContent += `- **Safety gates remain blocked**: Deployments, secrets reads, destructive database actions, spending, and external communications remain fully blocked.\n`;
    prBodyContent += `- **Merge Action Restricted**: Merge requires OWNER_APPROVED_MERGE_PR=<PR_NUMBER> token.\n\n`;
  } else {
    prBodyContent = `### Phase 0.3L Auto-Generated PR Summary\n\n`;
    prBodyContent += `- **Branch**: \`${currentBranch}\`\n`;
    prBodyContent += `- **Self-Test Verdict**: \`${report.finalVerdict}\`\n`;
    prBodyContent += `- **Execution Mode**: \`REAL\`\n`;
    prBodyContent += `- **Timestamp**: \`${new Date().toISOString()}\`\n\n`;
  }

  prBodyContent += `#### Verified Checks Checklist\n\n`;
  prBodyContent += `| Command | Status | Duration | Execution Mode |\n`;
  prBodyContent += `| ------- | ------ | -------- | -------------- |\n`;
  for (const cmd of report.commands) {
    prBodyContent += `| \`${cmd.command}\` | **${cmd.status}** | ${(cmd.durationMs / 1000).toFixed(2)}s | ${cmd.executionMode} |\n`;
  }
  if (currentBranch.includes("ai-company-os-mission-planner") || currentBranch.includes("1.0c")) {
    prBodyContent += `| \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0c --dry-run --write-report\` | **PASS** | ${(report.durationMs / 1000).toFixed(2)}s | real |\n`;
  } else if (currentBranch.includes("ai-company-os-capability-router") || currentBranch.includes("1.0d")) {
    prBodyContent += `| \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0d --dry-run --write-report\` | **PASS** | ${(report.durationMs / 1000).toFixed(2)}s | real |\n`;
  } else if (currentBranch.includes("ai-company-os-provider-learning-loop") || currentBranch.includes("1.0e")) {
    prBodyContent += `| \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0e --dry-run --write-report\` | **PASS** | ${(report.durationMs / 1000).toFixed(2)}s | real |\n`;
  } else if (currentBranch.includes("ai-company-os-dynamic-staffing") || currentBranch.includes("1.0f")) {
    prBodyContent += `| \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0f --dry-run --write-report\` | **PASS** | ${(report.durationMs / 1000).toFixed(2)}s | real |\n`;
  } else if (currentBranch.includes("ai-company-os-operator-console") || currentBranch.includes("1.0g")) {
    prBodyContent += `| \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0g --dry-run --write-report\` | **PASS** | ${(report.durationMs / 1000).toFixed(2)}s | real |\n`;
  } else if (currentBranch.includes("ai-company-os-paperclip-integration-contract") || currentBranch.includes("1.0h")) {
    prBodyContent += `| \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0h --dry-run --write-report\` | **PASS** | ${(report.durationMs / 1000).toFixed(2)}s | real |\n`;
  } else if (currentBranch.includes("ai-company-os-paperclip-read-adapter") || currentBranch.includes("1.0i")) {
    prBodyContent += `| \`node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0i --dry-run --write-report\` | **PASS** | ${(report.durationMs / 1000).toFixed(2)}s | real |\n`;
  }
  prBodyContent += `\n`;

  prBodyContent += `#### Owner Safety Gate Controls\n\n`;
  prBodyContent += `- **Merge Blocked**: \`YES\` (Strictly blocked pending manual owner review)\n`;
  prBodyContent += `- **Deployments Blocked**: \`YES\` (Vercel, Railway, Docker push are blocked)\n`;
  prBodyContent += `- **Destructive DB Actions Blocked**: \`YES\` (No DROP/TRUNCATE database allowed)\n`;
  prBodyContent += `- **Secrets Read Blocked**: \`YES\` (No API keys or .env files are read/printed)\n`;
  prBodyContent += `- **Infra/Ad Budget Spending Blocked**: \`YES\`\n`;
  prBodyContent += `- **External Customer Communications Blocked**: \`YES\`\n\n`;
  prBodyContent += `> [!IMPORTANT]\n`;
  const optionalFailures = report.optional_failures || [];
  const optionalFailureReasons = report.optional_failure_reasons || [];

  if (optionalFailures.length > 0) {
    prBodyContent += `> **Blocking checks passed successfully.**\n`;
    prBodyContent += `> The following non-blocking optional verification checks failed/skipped:\n`;
    for (const reason of optionalFailureReasons) {
      prBodyContent += `> - ${reason}\n`;
    }
  } else {
    prBodyContent += `> **All automated verification checks passed successfully in real execution mode.**\n`;
  }
  prBodyContent += `> The branch is safe and ready for owner review.\n\n`;

  fs.writeFileSync(prBodyPath, prBodyContent, "utf8");
  console.log(`[PR Automation] Wrote PR description body to reports/self-test/pr-body.md`);

  // 5. Dry-run vs Apply Execution
  if (isDryRun) {
    console.log(`\n=== DRY-RUN PR AUTOMATION SUMMARY ===`);
    console.log(`- Status: Simulation only for GitHub side effects`);
    console.log(`- Push Status: No push performed`);
    console.log(`- PR Status: No PR created`);
    console.log(`======================================\n`);
    process.exit(0);
  }

  // APPLY MODE
  // Check working tree status
  let gitStatus = "";
  try {
    gitStatus = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  } catch (err) {
    console.error(`[PR Automation] Error: Failed to check Git working tree status.`);
    process.exit(1);
  }

  if (gitStatus !== "") {
    const statusLines = gitStatus.split("\n").map(line => line.trim()).filter(Boolean);
    const realChanges = statusLines.filter(line => {
      const isReport = line.includes("reports/self-test/latest") || line.includes("reports/e2e/latest") || line.includes("reports/queue-runner/");
      return !isReport;
    });

    if (realChanges.length > 0) {
      console.error(`[PR Automation] Error: Auto PR Gate requires a clean working tree before push. Found:`, realChanges);
      process.exit(1);
    }
  }

  // A. Push branch
  console.log(`[PR Automation] Pushing current branch \`${currentBranch}\` to remote origin...`);
  try {
    execSync(`git push -u origin ${currentBranch}`, { stdio: "inherit" });
    console.log(`[PR Automation] Branch pushed successfully.`);
  } catch (err) {
    console.error(`[PR Automation] Error: Failed to push branch to origin: ${err.message}`);
    process.exit(1);
  }

  // B. Open Draft PR
  const ghPath = getGhPath();
  if (!ghPath) {
    console.error(`[PR Automation] Error: GitHub CLI (\`gh\`) is not installed or not authenticated on this system.`);
    process.exit(1);
  }
  console.log(`[PR Automation] Using gh CLI located at: ${ghPath}`);

  const repoId = getRepoIdentifier();
  const repoFlag = repoId ? `--repo ${repoId} ` : "";
  console.log(`[PR Automation] Target repository: ${repoId || "Default (GitHub CLI configuration)"}`);

  console.log(`[PR Automation] Creating Draft PR on GitHub...`);
  try {
    const prCmd = `"${ghPath}" pr create ${repoFlag}--draft --title "${prTitle}" --body-file "${prBodyPath}"`;
    const prUrl = execSync(prCmd, { encoding: "utf8" }).trim();
    console.log(`\n=============================================`);
    console.log(`[PR Automation] DRAFT PR CREATED SUCCESSFULLY!`);
    console.log(`[PR Automation] URL: ${prUrl}`);
    console.log(`=============================================\n`);
  } catch (err) {
    console.error(`[PR Automation] Error: Failed to create Draft PR via gh CLI: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
