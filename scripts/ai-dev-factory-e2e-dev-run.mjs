#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../");

function getGhPath() {
  if (process.env.MOCK_GH_PATH_MISSING === "true") {
    return null;
  }
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

const BLOCKED_INTENTS = [
  { pattern: /deploy/i, name: "deployment" },
  { pattern: /secret|\.env|api_key|api-key|password/i, name: "secrets" },
  { pattern: /drop|truncate/i, name: "destructive database actions" },
  { pattern: /spend|campaign|billing/i, name: "spending" },
  { pattern: /communication|customer|client|email|mail|sms/i, name: "external communication" }
];

export function validateGoalIntent(goal) {
  if (!goal || goal.trim() === "") {
    return { valid: false, reason: "Goal is empty" };
  }
  for (const item of BLOCKED_INTENTS) {
    if (item.pattern.test(goal)) {
      return { valid: false, reason: `Blocked intent detected: ${item.name}` };
    }
  }
  return { valid: true };
}

export function isValidBranchName(branch) {
  if (branch === "master" || branch === "main") {
    return false;
  }
  return branch.startsWith("chore/") || branch.startsWith("feat/");
}

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = !isApply || args.includes("--dry-run");

  // Parse options
  let goal = "";
  const goalIndex = args.indexOf("--goal");
  if (goalIndex !== -1 && goalIndex + 1 < args.length) {
    goal = args[goalIndex + 1];
  }

  let taskId = "";
  const taskIndex = args.indexOf("--task-id");
  if (taskIndex !== -1 && taskIndex + 1 < args.length) {
    taskId = args[taskIndex + 1];
  }

  let phase = "0.3n";
  const phaseIndex = args.indexOf("--phase");
  if (phaseIndex !== -1 && phaseIndex + 1 < args.length) {
    phase = args[phaseIndex + 1];
  }

  const autoPr = args.includes("--auto-pr");

  let prOption = null;
  const prIndex = args.indexOf("--pr");
  if (prIndex !== -1 && prIndex + 1 < args.length) {
    prOption = args[prIndex + 1];
  }

  let approvalOption = null;
  const approvalIndex = args.indexOf("--approval");
  if (approvalIndex !== -1 && approvalIndex + 1 < args.length) {
    approvalOption = args[approvalIndex + 1];
  }

  const isMergeMode = !!prOption;

  console.log(`[E2E Runner] Initializing End-to-End Autonomous Dev Run...`);
  console.log(`[E2E Runner] Mode: ${isDryRun ? "DRY-RUN (Simulated)" : "APPLY (Execution)"}`);

  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  // A. Goal Intake Validation
  if (!isMergeMode) {
    const goalVal = validateGoalIntent(goal);
    if (!goalVal.valid) {
      console.error(`[E2E Runner] Error: ${goalVal.reason}.`);
      process.exit(1);
    }
    console.log(`[E2E Runner] Goal validated: "${goal}"`);
  }

  // B. Branch Validation
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.error(`[E2E Runner] Error: Failed to check current Git branch.`);
    process.exit(1);
  }

  if (prOption && !approvalOption) {
    console.error(`[E2E Runner] Error: Missing owner approval token. Merging requires --approval OWNER_APPROVED_MERGE_PR=<number>`);
    process.exit(1);
  }

  // If in execution mode, refuse master/main
  if (!isMergeMode && !isValidBranchName(currentBranch)) {
    console.error(`[E2E Runner] Error: E2E Runner cannot run execution on master/main. Require chore/* or feat/* branch.`);
    process.exit(1);
  }
  console.log(`[E2E Runner] Active branch: \`${currentBranch}\``);

  // C. Controlled Task Execution (Phase 0.3N Proof File)
  const proofPath = path.join(repoRoot, "docs/ai-dev-factory-e2e-proof.md");
  let selfTestVerdict = "UNKNOWN";
  let prNumber = prOption ? parseInt(prOption, 10) : null;
  let draftPrUrl = "";
  let mergeAttempted = false;
  let mergeApproved = false;
  let mergeResult = "SKIPPED";
  let postMergeCleanupResult = "SKIPPED";
  let finalVerdict = "E2E_WAITING_FOR_OWNER_APPROVAL";

  if (!isMergeMode) {
    if (isDryRun) {
      console.log(`[E2E Runner] [Dry-Run] Would write docs/ai-dev-factory-e2e-proof.md`);
      selfTestVerdict = "PASS_READY_FOR_DRAFT_PR";
      if (autoPr) {
        draftPrUrl = "https://github.com/Horizon-PVT/cong-ty-ai/pull/simulated-pr-13";
        prNumber = 13;
      }
      finalVerdict = "E2E_WAITING_FOR_OWNER_APPROVAL";
    } else {
      console.log(`[E2E Runner] Executing controlled task: writing docs/ai-dev-factory-e2e-proof.md...`);
      let proofContent = `# Phase 0.3N E2E Dev Run Proof\n\n`;
      proofContent += `- **Goal**: ${goal}\n`;
      proofContent += `- **Task ID**: ${taskId}\n`;
      proofContent += `- **Branch**: ${currentBranch}\n`;
      proofContent += `- **Phase**: ${phase}\n`;
      proofContent += `- **Safe Actions Performed**: Scoped proof documentation update and E2E self-testing\n`;
      proofContent += `- **Blocked Critical Gates**: Checked (Deploy, Secrets, Destructive DB, Spending, External Communications are blocked)\n`;
      proofContent += `- **Self-Test Status**: PENDING\n`;
      proofContent += `- **PR Status**: PENDING\n`;
      proofContent += `- **Merge Gate Status**: PENDING\n`;
      proofContent += `- **Final Verdict**: E2E_WAITING_FOR_OWNER_APPROVAL\n`;
      
      if (process.env.MOCK_REPORT_WRITE_BYPASS === "true") {
        console.log(`[E2E Runner] (Mocked Report Write) Bypassed writing docs/ai-dev-factory-e2e-proof.md`);
      } else {
        fs.writeFileSync(proofPath, proofContent, "utf8");
        console.log(`[E2E Runner] Wrote proof document.`);
      }

      // D. Self-Test Integration
      console.log(`[E2E Runner] Running self-test gate...`);
      try {
        if (process.env.MOCK_SELF_TEST_VERDICT) {
          selfTestVerdict = process.env.MOCK_SELF_TEST_VERDICT;
          console.log(`[E2E Runner] (Mocked Self-Test) Verdict: ${selfTestVerdict}`);
        } else {
          execSync(`node scripts/ai-dev-factory-self-test-gate.mjs --phase ${phase} --dry-run --write-report`, { stdio: "inherit" });
          const selfTestReportPath = path.join(repoRoot, "reports/self-test/latest.json");
          if (fs.existsSync(selfTestReportPath)) {
            const selfTestReport = JSON.parse(fs.readFileSync(selfTestReportPath, "utf8"));
            selfTestVerdict = selfTestReport.finalVerdict;
          }
        }
      } catch (err) {
        console.error(`[E2E Runner] Error: Self-test gate failed: ${err.message}`);
        process.exit(1);
      }

      if (selfTestVerdict !== "PASS_READY_FOR_DRAFT_PR") {
        console.error(`[E2E Runner] Error: Self-test gate did not return PASS_READY_FOR_DRAFT_PR (got: ${selfTestVerdict}).`);
        process.exit(1);
      }
      console.log(`[E2E Runner] Self-test passed: ${selfTestVerdict}`);

      // E. Auto PR Integration
      if (autoPr) {
        console.log(`[E2E Runner] Auto PR enabled. Running PR automation...`);
        try {
          if (process.env.MOCK_PR_CREATION_FAIL === "true") {
            throw new Error("Simulated PR creation failure");
          }
          if (process.env.MOCK_PR_AUTOMATION_BYPASS === "true") {
            console.log(`[E2E Runner] (Mocked PR Automation) Bypassed running pr-automation script.`);
          } else {
            execSync(`node scripts/ai-dev-factory-pr-automation.mjs --apply`, { stdio: "inherit" });
          }
          const ghPath = getGhPath();
          if (ghPath) {
            if (process.env.MOCK_GH_PR_VIEW_FAIL === "true") {
              throw new Error("Simulated gh pr view failure");
            }
            if (process.env.MOCK_REAL_PR_DETAILS) {
              const data = JSON.parse(process.env.MOCK_REAL_PR_DETAILS);
              prNumber = data.number;
              draftPrUrl = data.url;
            } else {
              const prViewCmd = `"${ghPath}" pr view --json number,url`;
              const prViewOut = execSync(prViewCmd, { encoding: "utf8" }).trim();
              const prViewData = JSON.parse(prViewOut);
              prNumber = prViewData.number;
              draftPrUrl = prViewData.url;
            }
            console.log(`[E2E Runner] PR #${prNumber} created successfully at: ${draftPrUrl}`);
          } else {
            console.error(`[E2E Runner] Error: gh CLI not found. Cannot retrieve real PR details in apply mode.`);
            finalVerdict = "E2E_FAILED";
            prNumber = null;
            draftPrUrl = "";
          }
        } catch (err) {
          console.error(`[E2E Runner] Error: PR automation or PR retrieval failed in apply mode: ${err.message}`);
          finalVerdict = "E2E_FAILED";
          prNumber = null;
          draftPrUrl = "";
        }
      }

      // Write final proof document
      if (finalVerdict !== "E2E_FAILED") {
        let proofContentUpdated = `# Phase 0.3N E2E Dev Run Proof\n\n`;
        proofContentUpdated += `- **Goal**: ${goal}\n`;
        proofContentUpdated += `- **Task ID**: ${taskId}\n`;
        proofContentUpdated += `- **Branch**: ${currentBranch}\n`;
        proofContentUpdated += `- **Phase**: ${phase}\n`;
        proofContentUpdated += `- **Safe Actions Performed**: Scoped proof documentation update and E2E self-testing\n`;
        proofContentUpdated += `- **Blocked Critical Gates**: Checked (Deploy, Secrets, Destructive DB, Spending, External Communications are blocked)\n`;
        proofContentUpdated += `- **Self-Test Status**: ${selfTestVerdict}\n`;
        proofContentUpdated += `- **PR Status**: ${autoPr ? "Draft PR Requested" : "Bypassed / Not Requested"}\n`;
        proofContentUpdated += `- **Merge Gate Status**: Waiting for Owner Approval\n`;
        proofContentUpdated += `- **Final Verdict**: ${finalVerdict}\n`;
        
        if (process.env.MOCK_REPORT_WRITE_BYPASS === "true") {
          console.log(`[E2E Runner] (Mocked Report Write) Bypassed updating docs/ai-dev-factory-e2e-proof.md`);
        } else {
          fs.writeFileSync(proofPath, proofContentUpdated, "utf8");
        }

        // Commit changes locally to ensure clean working tree before PR automation
        if (process.env.MOCK_GIT_OPERATIONS === "true") {
          console.log(`[E2E Runner] (Mocked Git operations) Staging and committing proof files bypassed.`);
        } else {
          console.log(`[E2E Runner] Committing changes before PR automation...`);
          try {
            execSync("git add docs/ai-dev-factory-e2e-proof.md docs/ai-dev-factory-execution-status.md reports/self-test/latest.json reports/self-test/latest.md", { stdio: "inherit" });
            execSync('git commit -m "chore: commit latest self-test gate reports and proof for 0.3n"', { stdio: "inherit" });
            console.log(`[E2E Runner] Committed successfully.`);
          } catch (err) {
            console.log(`[E2E Runner] Warning: Nothing to commit or git commit failed: ${err.message}`);
          }
        }
      } else {
        let proofContentFailed = `# Phase 0.3N E2E Dev Run Proof\n\n`;
        proofContentFailed += `- **Goal**: ${goal}\n`;
        proofContentFailed += `- **Task ID**: ${taskId}\n`;
        proofContentFailed += `- **Branch**: ${currentBranch}\n`;
        proofContentFailed += `- **Phase**: ${phase}\n`;
        proofContentFailed += `- **Safe Actions Performed**: Scoped proof documentation update and E2E self-testing\n`;
        proofContentFailed += `- **Blocked Critical Gates**: Checked (Deploy, Secrets, Destructive DB, Spending, External Communications are blocked)\n`;
        proofContentFailed += `- **Self-Test Status**: ${selfTestVerdict}\n`;
        proofContentFailed += `- **PR Status**: Failed to create real PR\n`;
        proofContentFailed += `- **Merge Gate Status**: Blocked\n`;
        proofContentFailed += `- **Final Verdict**: E2E_FAILED\n`;
        
        if (process.env.MOCK_REPORT_WRITE_BYPASS === "true") {
          console.log(`[E2E Runner] (Mocked Report Write) Bypassed writing docs/ai-dev-factory-e2e-proof.md on failure`);
        } else {
          fs.writeFileSync(proofPath, proofContentFailed, "utf8");
        }
      }
    }
  }

  // F. Owner-Approved Merge Integration
  if (isMergeMode) {
    console.log(`[E2E Runner] Merge mode activated for PR #${prOption}...`);
    mergeAttempted = true;

    // Check approval token format
    const match = approvalOption.match(/^OWNER_APPROVED_MERGE_PR=(\d+)$/);
    if (!match || match[1] !== prOption) {
      console.error(`[E2E Runner] Error: Mismatched or invalid approval token: "${approvalOption}"`);
      finalVerdict = "E2E_CRITICAL_GATE_BLOCKED";
      mergeApproved = false;
      mergeResult = "FAILED";
    } else {
      mergeApproved = true;
      if (isDryRun) {
        console.log(`[E2E Runner] [Dry-Run] Would run owner merge gate & post-merge cleanup for PR #${prOption}`);
        mergeResult = "SUCCESS";
        postMergeCleanupResult = "SUCCESS";
        finalVerdict = "E2E_MERGED_AND_CLEANED";
      } else {
        try {
          console.log(`[E2E Runner] Executing Owner-Approved Merge Gate...`);
          execSync(`node scripts/ai-dev-factory-owner-merge-gate.mjs --pr ${prOption} --approval ${approvalOption} --apply`, { stdio: "inherit" });
          mergeResult = "SUCCESS";

          console.log(`[E2E Runner] Executing Post-Merge Cleanup...`);
          execSync(`node scripts/ai-dev-factory-post-merge-cleanup.mjs --pr ${prOption} --apply`, { stdio: "inherit" });
          postMergeCleanupResult = "SUCCESS";

          finalVerdict = "E2E_MERGED_AND_CLEANED";
        } catch (err) {
          console.error(`[E2E Runner] Error during merge/cleanup: ${err.message}`);
          mergeResult = mergeResult === "SUCCESS" ? "SUCCESS" : "FAILED";
          postMergeCleanupResult = mergeResult === "SUCCESS" ? "FAILED" : "SKIPPED";
          finalVerdict = "E2E_FAILED";
        }
      }
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  // G. Reports
  const reportDir = path.join(repoRoot, "reports/e2e");
  if (!isDryRun) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const jsonReport = {
    phase,
    taskId,
    ownerGoal: goal,
    branch: currentBranch,
    startedAt,
    finishedAt,
    durationMs,
    controlledFilesChanged: ["docs/ai-dev-factory-e2e-proof.md"],
    selfTestVerdict,
    draftPrUrl: draftPrUrl || null,
    prNumber,
    mergeAttempted,
    mergeApproved,
    mergeResult,
    postMergeCleanupResult,
    criticalGatesBlocked: true,
    deployAttempted: false,
    secretsRead: false,
    destructiveActionAttempted: false,
    spendAttempted: false,
    externalCommunicationAttempted: false,
    finalVerdict
  };

  if (!isDryRun) {
    if (process.env.MOCK_REPORT_WRITE_BYPASS === "true") {
      console.log(`[E2E Runner] (Mocked Report Write) Bypassed writing report files.`);
    } else {
      fs.writeFileSync(
        path.join(reportDir, "latest.json"),
        JSON.stringify(jsonReport, null, 2),
        "utf8"
      );
      console.log(`[E2E Runner] Wrote reports/e2e/latest.json`);

      let mdContent = `# E2E Dev Run Report\n\n`;
      mdContent += `- **Phase**: \`${phase}\`\n`;
      mdContent += `- **Task ID**: \`${taskId}\`\n`;
      mdContent += `- **Owner Goal**: "${goal}"\n`;
      mdContent += `- **Branch**: \`${currentBranch}\`\n`;
      mdContent += `- **Started At**: \`${startedAt}\`\n`;
      mdContent += `- **Finished At**: \`${finishedAt}\`\n`;
      mdContent += `- **Duration**: \`${(durationMs / 1000).toFixed(2)}s\`\n`;
      mdContent += `- **Self-Test Verdict**: \`${selfTestVerdict}\`\n`;
      mdContent += `- **PR Number**: \`${prNumber || "N/A"}\`\n`;
      mdContent += `- **PR URL**: [${draftPrUrl || "N/A"}](${draftPrUrl || "#"})\n`;
      mdContent += `- **Merge Attempted**: \`${mergeAttempted}\`\n`;
      mdContent += `- **Merge Approved**: \`${mergeApproved}\`\n`;
      mdContent += `- **Merge Result**: \`${mergeResult}\`\n`;
      mdContent += `- **Cleanup Result**: \`${postMergeCleanupResult}\`\n`;
      mdContent += `- **Final Verdict**: \`${finalVerdict}\`\n\n`;
      mdContent += `### Safety Gate Rollup\n\n`;
      mdContent += `| Gate | Status | Blocked |\n`;
      mdContent += `| --- | --- | --- |\n`;
      mdContent += `| Deploy | **OK** | YES |\n`;
      mdContent += `| Secrets Read | **OK** | YES |\n`;
      mdContent += `| Destructive DB | **OK** | YES |\n`;
      mdContent += `| Spending | **OK** | YES |\n`;
      mdContent += `| External Comm | **OK** | YES |\n`;

      fs.writeFileSync(
        path.join(reportDir, "latest.md"),
        mdContent,
        "utf8"
      );
      console.log(`[E2E Runner] Wrote reports/e2e/latest.md`);
    }
  } else {
    console.log(`\n=== DRY-RUN E2E RUNNER SUMMARY ===`);
    console.log(JSON.stringify(jsonReport, null, 2));
    console.log(`==================================\n`);
    console.log(`No files modified`);
    console.log(`No push performed`);
    console.log(`No Draft PR created`);
    console.log(`No merge attempted`);
  }

  console.log(`[E2E Runner] Dev run complete. Final verdict: ${finalVerdict}`);

  if (finalVerdict === "E2E_FAILED" || finalVerdict === "E2E_CRITICAL_GATE_BLOCKED") {
    console.error(`[E2E Runner] Terminating with final verdict: ${finalVerdict}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
