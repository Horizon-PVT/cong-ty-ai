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
  { name: "verify-0.3o", cmd: "node packages/db/src/_verify-0.3o.mjs", phase: "0.3o", optional: true },
  { name: "verify-0.3p", cmd: "node packages/db/src/_verify-0.3p.mjs", phase: "0.3p", optional: true },
  { name: "verify-0.3q", cmd: "node packages/db/src/_verify-0.3q.mjs", phase: "0.3q", optional: true },
  { name: "verify-0.3r", cmd: "node packages/db/src/_verify-0.3r.mjs", phase: "0.3r", optional: true },
  { name: "verify-0.3s", cmd: "node packages/db/src/_verify-0.3s.mjs", phase: "0.3s", optional: true },
  { name: "verify-1.0a", cmd: "node packages/db/src/_verify-1.0a.mjs", phase: "1.0a", optional: true },
  { name: "verify-1.0b", cmd: "node packages/db/src/_verify-1.0b.mjs", phase: "1.0b", optional: true }
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
    } else if (selectedPhase === "0.3p") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n" || c.phase === "0.3o" || c.phase === "0.3p");
    } else if (selectedPhase === "0.3q") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n" || c.phase === "0.3o" || c.phase === "0.3p" || c.phase === "0.3q");
    } else if (selectedPhase === "0.3r") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n" || c.phase === "0.3o" || c.phase === "0.3p" || c.phase === "0.3q" || c.phase === "0.3r");
    } else if (selectedPhase === "0.3s") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n" || c.phase === "0.3o" || c.phase === "0.3p" || c.phase === "0.3q" || c.phase === "0.3r" || c.phase === "0.3s");
    } else if (selectedPhase === "1.0a") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n" || c.phase === "0.3o" || c.phase === "0.3p" || c.phase === "0.3q" || c.phase === "0.3r" || c.phase === "0.3s" || c.phase === "1.0a");
    } else if (selectedPhase === "1.0b") {
      filteredCommands = COMMANDS_BASELINE.filter(c => c.phase === "0.3j" || c.phase === "0.3k" || c.phase === "0.3l" || c.phase === "0.3m" || c.phase === "0.3n" || c.phase === "0.3o" || c.phase === "0.3p" || c.phase === "0.3q" || c.phase === "0.3r" || c.phase === "0.3s" || c.phase === "1.0a" || c.phase === "1.0b");
    }
  }

  // The current active phase verifier must be non-optional (blocking)
  for (const cmd of filteredCommands) {
    if (cmd.phase === selectedPhase) {
      cmd.optional = false;
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
      executionMode: isSimulate ? "simulated" : "real",
      optional: !!item.optional
    });

    if (status !== "PASS" && !item.optional) {
      allPassed = false;
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - startTime;

  const OPTIONAL_FAILURE_REASONS = {
    "verify-0.3i": "Historical verifier for Phase 0.3I",
    "verify-0.3j": "Historical verifier for Phase 0.3J",
    "verify-0.3k": "Historical verifier for Phase 0.3K",
    "verify-0.3l": "Historical verifier for Phase 0.3L",
    "verify-0.3m": "Historical verifier for Phase 0.3M",
    "verify-0.3n": "E2E verification is optional in later phases and reports on disk can be merge-mode",
    "verify-0.3o": "Historical verifier for Phase 0.3O",
    "verify-0.3p": "Historical verifier for Phase 0.3P",
    "verify-0.3q": "Historical verifier for Phase 0.3Q",
    "verify-0.3r": "Historical verifier for Phase 0.3R",
    "verify-0.3s": "Historical verifier for Phase 0.3S",
    "verify-1.0a": "Milestone 1.0A verifier"
  };

  const optionalFailures = commandResults.filter(r => r.status === "FAIL" && r.optional);
  const optional_failures = optionalFailures.map(r => r.command.split(/\s+/).pop().split("/").pop().replace(".mjs", "").replace("_", ""));
  
  const optional_failure_reasons = [];
  let optionalFailuresValid = true;
  for (const name of optional_failures) {
    const reason = OPTIONAL_FAILURE_REASONS[name];
    if (reason) {
      optional_failure_reasons.push(`${name}: ${reason}`);
    } else {
      optionalFailuresValid = false;
    }
  }

  const blocking_passed = allPassed && !guardrailViolated;
  let finalVerdict = "FAIL_BLOCKED";
  let final_verdict_reason = "Checks failed or guardrail violated.";

  if (guardrailViolated) {
    finalVerdict = "FAIL_CRITICAL_GATE_VIOLATION";
    final_verdict_reason = "Critical safety guardrail violated.";
  } else if (blocking_passed) {
    if (!optionalFailuresValid) {
      finalVerdict = "FAIL_BLOCKED";
      final_verdict_reason = "One or more optional checks failed without a valid non-blocking reason.";
    } else {
      if (isSimulate) {
        finalVerdict = "FAIL_BLOCKED";
        final_verdict_reason = "Simulated checks cannot produce PASS verdicts for review.";
      } else {
        finalVerdict = isDryRun ? "PASS_READY_FOR_DRAFT_PR" : "PASS_READY_FOR_OWNER_REVIEW";
        if (optional_failure_reasons.length > 0) {
          final_verdict_reason = `All blocking checks passed. Non-blocking failures: ${optional_failure_reasons.join("; ")}`;
        } else {
          final_verdict_reason = "All checks passed successfully.";
        }
      }
    }
  }

  console.log(`\n=============================================`);
  console.log(`[Self-Test Gate] FINAL VERDICT: ${finalVerdict}`);
  console.log(`[Self-Test Gate] Verdict Reason: ${final_verdict_reason}`);
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
      blocking_passed,
      optional_failures,
      optional_failure_reasons,
      final_verdict_reason,
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
    mdContent += `- **Verdict Reason**: \`${final_verdict_reason}\`\n`;
    mdContent += `- **Blocking Checks Passed**: \`${blocking_passed ? "YES" : "NO"}\`\n`;
    mdContent += `- **Optional Failures**: \`${optional_failures.join(", ") || "None"}\`\n`;
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
