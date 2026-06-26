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

  if (currentBranch.includes("owner-approved-merge-cleanup-gate") || currentBranch.includes("0.3m")) {
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
  prBodyContent += `\n`;

  prBodyContent += `#### Owner Safety Gate Controls\n\n`;
  prBodyContent += `- **Merge Blocked**: \`YES\` (Strictly blocked pending manual owner review)\n`;
  prBodyContent += `- **Deployments Blocked**: \`YES\` (Vercel, Railway, Docker push are blocked)\n`;
  prBodyContent += `- **Destructive DB Actions Blocked**: \`YES\` (No DROP/TRUNCATE database allowed)\n`;
  prBodyContent += `- **Secrets Read Blocked**: \`YES\` (No API keys or .env files are read/printed)\n`;
  prBodyContent += `- **Infra/Ad Budget Spending Blocked**: \`YES\`\n`;
  prBodyContent += `- **External Customer Communications Blocked**: \`YES\`\n\n`;
  prBodyContent += `> [!IMPORTANT]\n`;
  if (currentBranch.includes("owner-approved-merge-cleanup-gate") || currentBranch.includes("0.3m")) {
    prBodyContent += `> All automated verification checks passed successfully in real execution mode (verify-0.3M PASS). The branch is safe and ready for owner review.\n`;
  } else if (currentBranch.includes("end-to-end-autonomous-dev-run") || currentBranch.includes("0.3n")) {
    prBodyContent += `> All automated verification checks passed successfully in real execution mode (verify-0.3N PASS). The branch is safe and ready for owner review.\n`;
  } else {
    prBodyContent += `> All automated verification checks passed successfully in real execution mode. The branch is safe and ready for manual review.\n`;
  }

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
    console.error(`[PR Automation] Error: Auto PR Gate requires a clean working tree before push.`);
    process.exit(1);
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
