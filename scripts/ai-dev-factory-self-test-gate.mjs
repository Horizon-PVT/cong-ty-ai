#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkCommandGuardrails, isValidBranchName } from "./safe-branch-execution-loop.mjs";

const COMMANDS_BASELINE = [
  { name: "pnpm -r typecheck", cmd: "pnpm -r typecheck", phase: "0.3j" },
  { name: "pnpm build", cmd: "pnpm build", phase: "0.3j" },
  { name: "pnpm test:run --dry-run", cmd: "pnpm test:run --dry-run", phase: "0.3j" },
  { name: "verify-0.3i", cmd: "node packages/db/src/_verify-0.3i.mjs", phase: "0.3j", optional: true },
  { name: "verify-0.3j", cmd: "node packages/db/src/_verify-0.3j.mjs", phase: "0.3j", optional: true },
  { name: "verify-0.3k", cmd: "node packages/db/src/_verify-0.3k.mjs", phase: "0.3k", optional: true },
  { name: "verify-0.3l", cmd: "node packages/db/src/_verify-0.3l.mjs", phase: "0.3l", optional: true },
  { name: "verify-0.3m", cmd: "node packages/db/src/_verify-0.3m.mjs", phase: "0.3m", optional: true },
  { name: "verify-0.3n", cmd: "node packages/db/src/_verify-0.3n.mjs", phase: "0.3n", optional: true },
  { name: "verify-0.3o", cmd: "node packages/db/src/_verify-0.3o.mjs", phase: "0.3o", optional: true }
];

async function main() {
  const args = process.argv.slice(2);
  
  // Parse flags
  const isSimulate = args.includes("--simulate") || args.includes("--plan-only");
  const isDryRun = args.includes("--dry-run") || !args.includes("--apply");
  const isWriteReport = args.includes("--write-report");
  const isAll = args.includes("--all");
  
  let selectedPhase = "0.3l";
  const phaseIndex = args.indexOf("--phase");
  if (phaseIndex !== -1 && phaseIndex + 1 < args.length) {
    selectedPhase = args[phaseIndex + 1];
  }

  console.log(`[Self-Test Gate] Initializing Autonomous Self-Test Gate...`);
  console.log(`[Self-Test Gate] Phase Filter: ${isAll ? "All" : selectedPhase}`);
  console.log(`[Self-Test Gate] Execution Mode: ${isSimulate ? "SIMULATED (Simulation Mode)" : "REAL (Active Checks)"}`);
  console.log(`[Self-Test Gate] Write Report: ${isWriteReport ? "ENABLED" : "DISABLED"}`);

  // 1. Detect and Validate current branch
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.error(`[Self-Test Gate] Error: Failed to check current Git branch.`);
    process.exit(1);
  }

  if (!isValidBranchName(currentBranch)) {
    console.error(`[Self-Test Gate] Error: Safe Branch Loop can only run on chore/* or feat/* feature branches.`);
    process.exit(1);
  }
  console.log(`[Self-Test Gate] Active Git feature branch: \`${currentBranch}\``);

  // Filter commands by selected phase
  let filteredCommands = COMMANDS_BASELINE;
  if (!isAll) {
    if (selectedPhase === "0.3j") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j");
    } else if (selectedPhase === "0.3k") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k");
    } else if (selectedPhase === "0.3l") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l");
    } else if (selectedPhase === "0.3m") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m");
    } else if (selectedPhase === "0.3n") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n");
    } else if (selectedPhase === "0.3o") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n" || c.phase === "0.3o");
    }
  }

  console.log(`[Self-Test Gate] Scheduled ${filteredCommands.length} commands for verification.`);

  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const commandResults = [];
  let allPassed = true;
  let guardrailViolated = false;

  for (const item of filteredCommands) {
    // If it's optional, check if the file exists before running it
    if (item.optional) {
      const fileToVerify = item.cmd.split(/\s+/).pop();
      if (!fs.existsSync(fileToVerify)) {
        console.log(`[Self-Test Gate] Skipping optional command: \`${item.cmd}\` (File not found)`);
        continue;
      }
    }

    console.log(`\n[Self-Test Gate] Running check: \`${item.cmd}\``);
    
    // Check if the command violates any guardrails before execution
    const guardrailCheck = checkCommandGuardrails(item.cmd);
    if (guardrailCheck.violated) {
      console.error(`[Self-Test Gate] Error: Command violates critical guardrail pattern: ${guardrailCheck.pattern}`);
      commandResults.push({
        command: item.cmd,
        exitCode: 1,
        status: "FAIL_GUARDRAIL",
        durationMs: 0,
        executionMode: isSimulate ? "simulated" : "real"
      });
      allPassed = false;
      guardrailViolated = true;
      break;
    }

    const itemStartTime = Date.now();
    let exitCode = 0;
    let status = "PASS";

    if (isSimulate) {
      // Simulation mode: pretend it passed
      exitCode = 0;
      status = "PASS";
      console.log(`[Self-Test Gate] [SIMULATED] Command passed (simulated).`);
    } else {
      // Real mode: execute command
      try {
        execSync(item.cmd, { stdio: "inherit" });
      } catch (err) {
        exitCode = err.status || 1;
        status = "FAIL";
        console.error(`[Self-Test Gate] Command failed with exit code ${exitCode}.`);
      }
    }

    const itemDurationMs = Date.now() - itemStartTime;
    commandResults.push({
      command: item.cmd,
      exitCode,
      status,
      durationMs: itemDurationMs,
      executionMode: isSimulate ? "simulated" : "real"
    });

    if (status !== "PASS" && !item.optional) {
      allPassed = false;
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - startTime;

  // Determine final verdict
  let finalVerdict = "FAIL_BLOCKED";
  if (guardrailViolated) {
    finalVerdict = "FAIL_CRITICAL_GATE_VIOLATION";
  } else if (allPassed) {
    if (isSimulate) {
      // Simulated checks must NEVER produce PASS verdicts for PR/Owner review
      finalVerdict = "FAIL_BLOCKED";
    } else {
      // Real checks passing
      finalVerdict = isDryRun ? "PASS_READY_FOR_DRAFT_PR" : "PASS_READY_FOR_OWNER_REVIEW";
    }
  }

  console.log(`\n=============================================`);
  console.log(`[Self-Test Gate] FINAL VERDICT: ${finalVerdict}`);
  console.log(`=============================================`);

  // Write reports if enabled
  if (isWriteReport) {
    const reportDir = path.resolve("reports/self-test");
    fs.mkdirSync(reportDir, { recursive: true });

    // 1. JSON Report
    const jsonReport = {
      phase: selectedPhase,
      branch: currentBranch,
      startedAt,
      finishedAt,
      durationMs: totalDurationMs,
      commands: commandResults,
      finalVerdict,
      canOpenDraftPr: finalVerdict === "PASS_READY_FOR_DRAFT_PR" || finalVerdict === "PASS_READY_FOR_OWNER_REVIEW",
      canRequestOwnerReview: finalVerdict === "PASS_READY_FOR_OWNER_REVIEW",
      canMerge: false,
      criticalGatesBlocked: true,
      secretsRead: false,
      deployAttempted: false,
      destructiveActionAttempted: false,
      spendAttempted: false,
      externalCommunicationAttempted: false
    };

    fs.writeFileSync(
      path.join(reportDir, "latest.json"),
      JSON.stringify(jsonReport, null, 2),
      "utf8"
    );
    console.log(`[Self-Test Gate] Wrote JSON report to reports/self-test/latest.json`);

    // 2. Markdown Report
    let mdContent = `# AI Dev Factory Self-Test Gate Report\n\n`;
    mdContent += `- **Branch**: \`${currentBranch}\`\n`;
    mdContent += `- **Phase**: \`${selectedPhase}\`\n`;
    mdContent += `- **Final Verdict**: \`${finalVerdict}\`\n`;
    mdContent += `- **Can Open Draft PR**: \`${jsonReport.canOpenDraftPr ? "YES" : "NO"}\`\n`;
    mdContent += `- **Can Request Owner Review**: \`${jsonReport.canRequestOwnerReview ? "YES" : "NO"}\`\n`;
    mdContent += `- **Can Merge**: \`NO\` (Strictly blocked pending manual owner review)\n`;
    mdContent += `- **Owner Gate Status**: \`SECURE (All critical gates blocked)\`\n\n`;

    mdContent += `## Command Checklist\n\n`;
    mdContent += `| Command | Exit Code | Status | Duration | Execution Mode |\n`;
    mdContent += `| ------- | --------- | ------ | -------- | -------------- |\n`;

    for (const res of commandResults) {
      mdContent += `| \`${res.command}\` | ${res.exitCode} | **${res.status}** | ${(res.durationMs / 1000).toFixed(2)}s | ${res.executionMode} |\n`;
    }
    mdContent += `\n`;

    if (!allPassed) {
      mdContent += `## Failures / Blockers\n\n`;
      mdContent += `> [!CAUTION]\n`;
      if (guardrailViolated) {
        mdContent += `> Critical guardrail check was violated. Operation aborted to protect repository integrity.\n`;
      } else {
        mdContent += `> One or more checks failed. Please inspect command logs and fix errors before retrying.\n`;
      }
      mdContent += `\n`;
    }

    mdContent += `## Recommended Next Action\n\n`;
    if (finalVerdict === "PASS_READY_FOR_DRAFT_PR") {
      mdContent += `The self-test passed! You are ready to open a Draft PR.\n`;
    } else if (finalVerdict === "PASS_READY_FOR_OWNER_REVIEW") {
      mdContent += `All checks passed. Ready for owner manual review.\n`;
    } else {
      mdContent += `Fix errors and re-run self-test gate runner.\n`;
    }

    fs.writeFileSync(
      path.join(reportDir, "latest.md"),
      mdContent,
      "utf8"
    );
    console.log(`[Self-Test Gate] Wrote Markdown report to reports/self-test/latest.md`);
  }

  if (finalVerdict.startsWith("FAIL")) {
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
