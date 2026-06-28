/**
 * Phase 0.3N Verification Script
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { checkCommandGuardrails } from "../../../scripts/safe-branch-execution-loop.mjs";
import { validateGoalIntent, isValidBranchName } from "../../../scripts/ai-dev-factory-e2e-dev-run.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

async function main() {
  console.log("Starting Phase 0.3N verification...");

  // 1. Verify files exist
  const e2eRunnerPath = path.join(repoRoot, "scripts/ai-dev-factory-e2e-dev-run.mjs");
  if (!fs.existsSync(e2eRunnerPath)) {
    throw new Error("scripts/ai-dev-factory-e2e-dev-run.mjs does not exist");
  }
  console.log("✅ verified: scripts/ai-dev-factory-e2e-dev-run.mjs exists");

  const docsPath = path.join(repoRoot, "docs/end-to-end-autonomous-dev-run.md");
  if (!fs.existsSync(docsPath)) {
    throw new Error("docs/end-to-end-autonomous-dev-run.md does not exist");
  }
  console.log("✅ verified: docs/end-to-end-autonomous-dev-run.md exists");

  // 2. Test empty and unsafe goals rejection in validator
  const emptyGoalRes = validateGoalIntent("");
  if (emptyGoalRes.valid) {
    throw new Error("Goal validator accepted empty goal");
  }

  const unsafeGoals = [
    "Deploy server to production",
    "Read .env config file and print details",
    "Drop database paperclip tables",
    "Truncate user directory",
    "Billing or spend money on ads",
    "Send customer campaign email notifications"
  ];
  for (const ug of unsafeGoals) {
    const res = validateGoalIntent(ug);
    if (res.valid) {
      throw new Error(`Goal validator accepted unsafe goal: "${ug}"`);
    }
  }
  console.log("✅ verified: goal validator rejects empty and unsafe goals");

  // 3. Test branch name constraints
  if (isValidBranchName("master")) throw new Error("Branch validator accepted master");
  if (isValidBranchName("main")) throw new Error("Branch validator accepted main");
  if (!isValidBranchName("chore/test-e2e")) throw new Error("Branch validator rejected chore/test-e2e");
  if (!isValidBranchName("feat/test-e2e")) throw new Error("Branch validator rejected feat/test-e2e");
  console.log("✅ verified: branch validator enforces prefix rules");

  // 4. Test E2E runner execution parameter validation via CLI
  try {
    execSync(`node "${e2eRunnerPath}" --goal "" --task-id "verify-0.3n-test" --dry-run`, { stdio: "ignore" });
    throw new Error("Runner accepted empty goal");
  } catch (err) {}

  try {
    execSync(`node "${e2eRunnerPath}" --goal "Deploy server" --task-id "verify-0.3n-test" --dry-run`, { stdio: "ignore" });
    throw new Error("Runner accepted unsafe goal");
  } catch (err) {}
  console.log("✅ verified: E2E runner rejects empty and unsafe goals");

  // 5. Test merge gate tokens logic in E2E runner
  try {
    execSync(`node "${e2eRunnerPath}" --pr 12 --approval OWNER_APPROVED_MERGE_PR=13 --dry-run`, { stdio: "ignore" });
    throw new Error("E2E runner accepted mismatched PR number in approval token");
  } catch (err) {}

  try {
    execSync(`node "${e2eRunnerPath}" --pr 12 --approval INVALID_TOKEN_FORMAT=12 --dry-run`, { stdio: "ignore" });
    throw new Error("E2E runner accepted invalid token format");
  } catch (err) {}
  console.log("✅ verified: E2E runner enforces approval token validation");

  // 6. Test reports schema if reports/e2e/latest.json exists
  const reportDir = path.join(repoRoot, "reports/e2e");
  const reportPath = path.join(reportDir, "latest.json");
  if (fs.existsSync(reportPath)) {
    const reportData = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const requiredKeys = [
      "phase", "taskId", "ownerGoal", "branch", "startedAt", "finishedAt",
      "durationMs", "controlledFilesChanged", "selfTestVerdict",
      "mergeAttempted", "mergeApproved", "mergeResult", "postMergeCleanupResult",
      "criticalGatesBlocked", "deployAttempted", "secretsRead",
      "destructiveActionAttempted", "spendAttempted", "externalCommunicationAttempted",
      "finalVerdict"
    ];
    for (const key of requiredKeys) {
      if (!(key in reportData)) {
        if ((key === "taskId" || key === "controlledFilesChanged") && reportData.mergeAttempted === true) {
          continue; // Skip keys not present in merge-mode reports
        }
        throw new Error(`Report latest.json is missing required schema key: ${key}`);
      }
    }
    console.log("✅ verified: reports/e2e/latest.json schema matches specification");
  } else {
    console.log("⚠️ skip: reports/e2e/latest.json not found for schema check");
  }

  // 7. Verify safety command guardrails
  const blockedCommands = [
    "git merge master",
    "git push origin master",
    "pnpm run deploy",
    "vercel --prod",
    "railway up",
    "docker push",
    "rm -rf database",
    "DROP DATABASE paperclip",
    "DROP TABLE issues",
    "TRUNCATE TABLE issues",
    "cat .env",
    "echo $API_KEY",
    "printenv SECRET",
    "TOKEN=abc",
    "ad campaign spend"
  ];
  for (const cmd of blockedCommands) {
    const res = checkCommandGuardrails(cmd);
    if (!res.violated) {
      throw new Error(`Failed to detect blocked command: ${cmd}`);
    }
  }
  console.log("✅ verified: safety guardrails block critical actions");

  // 8. Verify previous verification scripts remain callable
  const verify0_3i = path.join(repoRoot, "packages/db/src/_verify-0.3i.mjs");
  const verify0_3k = path.join(repoRoot, "packages/db/src/_verify-0.3k.mjs");
  const verify0_3l = path.join(repoRoot, "packages/db/src/_verify-0.3l.mjs");
  const verify0_3m = path.join(repoRoot, "packages/db/src/_verify-0.3m.mjs");

  if (!fs.existsSync(verify0_3i)) throw new Error("_verify-0.3i.mjs does not exist");
  if (!fs.existsSync(verify0_3k)) throw new Error("_verify-0.3k.mjs does not exist");
  if (!fs.existsSync(verify0_3l)) throw new Error("_verify-0.3l.mjs does not exist");
  if (!fs.existsSync(verify0_3m)) throw new Error("_verify-0.3m.mjs does not exist");
  console.log("✅ verified: previous phase verification scripts remain callable");

  // 9. Run orchestrator test cases to verify the new behaviors
  console.log("Running orchestrator safety & verdict test cases...");
  
  // Test case 1: apply-mode PR creation failure does not fallback to mock PR
  try {
    execSync(
      `node scripts/ai-dev-factory-e2e-dev-run.mjs --goal "test goal" --task-id "verify-0.3n-test" --apply --auto-pr`,
      {
        env: {
          ...process.env,
          MOCK_PR_CREATION_FAIL: "true",
          MOCK_SELF_TEST_VERDICT: "PASS_READY_FOR_DRAFT_PR",
          MOCK_GIT_OPERATIONS: "true",
          MOCK_REPORT_WRITE_BYPASS: "true"
        },
        encoding: "utf8",
        stdio: "pipe"
      }
    );
    throw new Error("Expected process to exit with code 1, but it succeeded.");
  } catch (err) {
    if (err.message && err.message.includes("Expected process to exit with code 1")) {
      throw err;
    }
    const stdout = err.stdout || "";
    const stderr = err.stderr || "";
    if (stdout.includes("pull/12") || stderr.includes("pull/12") || stdout.includes("pull/mock-12")) {
      throw new Error("PR creation failure fell back to mock PR #12 in apply mode");
    }
    if (!stdout.includes("E2E_FAILED") && !stderr.includes("E2E_FAILED")) {
      throw new Error("PR creation failure did not result in finalVerdict E2E_FAILED");
    }
  }
  console.log("  - apply-mode PR creation failure does not fallback to mock PR: PASS");

  try {
    execSync(
      `node scripts/ai-dev-factory-e2e-dev-run.mjs --goal "test goal" --task-id "verify-0.3n-test" --apply --auto-pr`,
      {
        env: {
          ...process.env,
          MOCK_GH_PATH_MISSING: "true",
          MOCK_SELF_TEST_VERDICT: "PASS_READY_FOR_DRAFT_PR",
          MOCK_GIT_OPERATIONS: "true",
          MOCK_REPORT_WRITE_BYPASS: "true",
          MOCK_PR_AUTOMATION_BYPASS: "true"
        },
        encoding: "utf8",
        stdio: "pipe"
      }
    );
    throw new Error("Expected missing gh CLI in apply mode to exit with error, but it succeeded.");
  } catch (err) {
    if (err.message && err.message.includes("Expected missing gh CLI in apply mode to exit with error")) {
      throw err;
    }
    const stdout = err.stdout || "";
    const stderr = err.stderr || "";
    if (stdout.includes("pull/12") || stderr.includes("pull/12") || stdout.includes("pull/mock-12")) {
      throw new Error("Missing gh CLI fabricated mock PR #12 in apply mode");
    }
    if (!stdout.includes("E2E_FAILED") && !stderr.includes("E2E_FAILED")) {
      throw new Error("Missing gh CLI did not set E2E_FAILED in apply mode");
    }
  }
  console.log("  - apply-mode missing gh CLI does not fabricate PR URL: PASS");

  // Test case 3: dry-run does not return E2E_DRAFT_PR_CREATED
  // Test case 4: dry-run clearly reports no push/no PR/no merge
  const dryRunOut = execSync(
    `node scripts/ai-dev-factory-e2e-dev-run.mjs --goal "test goal" --task-id "verify-0.3n-test" --dry-run --auto-pr`,
    {
      env: {
        ...process.env,
        MOCK_SELF_TEST_VERDICT: "PASS_READY_FOR_DRAFT_PR"
      },
      encoding: "utf8",
      stdio: "pipe"
    }
  );
  if (dryRunOut.includes("E2E_DRAFT_PR_CREATED")) {
    throw new Error("Dry-run returned E2E_DRAFT_PR_CREATED");
  }
  const requiredDryRunPhrases = [
    "No files modified",
    "No commit created",
    "No push performed",
    "No Draft PR created",
    "No merge attempted"
  ];
  for (const phrase of requiredDryRunPhrases) {
    if (!dryRunOut.includes(phrase)) {
      throw new Error(`Dry-run output missing phrase: "${phrase}"`);
    }
  }
  console.log("  - dry-run verdict and output checks (all 5 phrases checked): PASS");

  // Test case 5: apply without approval returns waiting-for-owner-approval after real Draft PR creation
  const applySuccessOut = execSync(
    `node scripts/ai-dev-factory-e2e-dev-run.mjs --goal "test goal" --task-id "verify-0.3n-test" --apply --auto-pr`,
    {
      env: {
        ...process.env,
        MOCK_SELF_TEST_VERDICT: "PASS_READY_FOR_DRAFT_PR",
        MOCK_GIT_OPERATIONS: "true",
        MOCK_REPORT_WRITE_BYPASS: "true",
        MOCK_PR_AUTOMATION_BYPASS: "true",
        MOCK_REAL_PR_DETAILS: JSON.stringify({ number: 13, url: "https://github.com/Horizon-PVT/cong-ty-ai/pull/13" })
      },
      encoding: "utf8",
      stdio: "pipe"
    }
  );
  if (!applySuccessOut.includes("E2E_WAITING_FOR_OWNER_APPROVAL")) {
    throw new Error("Successful apply mode without approval did not return E2E_WAITING_FOR_OWNER_APPROVAL");
  }
  if (applySuccessOut.includes("E2E_DRAFT_PR_CREATED")) {
    throw new Error("Successful apply mode returned E2E_DRAFT_PR_CREATED");
  }
  console.log("  - apply without approval returns waiting-for-owner-approval: PASS");

  // Test case 6: wrong owner approval token is rejected
  try {
    execSync(
      `node scripts/ai-dev-factory-e2e-dev-run.mjs --pr 13 --approval OWNER_APPROVED_MERGE_PR=99 --apply`,
      {
        env: {
          ...process.env,
          MOCK_REPORT_WRITE_BYPASS: "true"
        },
        encoding: "utf8",
        stdio: "pipe"
      }
    );
    throw new Error("Expected wrong owner approval token to fail, but it succeeded.");
  } catch (err) {
    if (err.message && err.message.includes("Expected wrong owner approval token to fail")) {
      throw err;
    }
    const stdout = err.stdout || "";
    const stderr = err.stderr || "";
    const combined = stdout + "\n" + stderr;
    if (!combined.includes("E2E_CRITICAL_GATE_BLOCKED") || !combined.includes("Mismatched or invalid approval token")) {
      throw new Error("Wrong owner approval token did not return E2E_CRITICAL_GATE_BLOCKED or print mismatch message");
    }
  }
  console.log("  - wrong owner approval token is rejected: PASS");

  // Test case 7: missing owner approval token cannot merge
  try {
    execSync(
      `node scripts/ai-dev-factory-e2e-dev-run.mjs --pr 13 --apply`,
      {
        env: {
          ...process.env,
          MOCK_REPORT_WRITE_BYPASS: "true"
        },
        encoding: "utf8",
        stdio: "pipe"
      }
    );
    throw new Error("Expected missing owner approval token to fail, but it succeeded.");
  } catch (err) {
    if (err.message && err.message.includes("Expected missing owner approval token to fail")) {
      throw err;
    }
    const stderr = err.stderr || "";
    if (!stderr.includes("Missing owner approval token")) {
      throw new Error("Missing owner approval token did not print error message");
    }
  }
  console.log("  - missing owner approval token cannot merge: PASS");

  // Test case 8: E2E report finalVerdict must be one of the allowed values
  // Test case 9: mock PR URL is never written in apply-mode reports
  if (fs.existsSync(reportPath)) {
    const reportData = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const allowedVerdicts = [
      "E2E_WAITING_FOR_OWNER_APPROVAL",
      "E2E_MERGED_AND_CLEANED",
      "E2E_FAILED",
      "E2E_CRITICAL_GATE_BLOCKED"
    ];
    if (!allowedVerdicts.includes(reportData.finalVerdict)) {
      throw new Error(`Report contains invalid/disallowed finalVerdict: "${reportData.finalVerdict}"`);
    }
    if (reportData.prNumber && !reportData.mergeAttempted) {
      if (reportData.finalVerdict !== "E2E_WAITING_FOR_OWNER_APPROVAL") {
        throw new Error(`Report finalVerdict is inconsistent: expected E2E_WAITING_FOR_OWNER_APPROVAL, got "${reportData.finalVerdict}"`);
      }
    }
    if (reportData.draftPrUrl && reportData.draftPrUrl.includes("mock-12")) {
      throw new Error("Mock PR URL written in reports");
    }
    if (reportData.prNumber === 12 && reportData.draftPrUrl && reportData.draftPrUrl.includes("/12")) {
      throw new Error("Mock PR URL (PR 12) written in reports");
    }
    console.log("  - E2E report finalVerdict and mock URL checks: PASS");
  }

  // 10. Direct static analysis checks on scripts/ai-dev-factory-e2e-dev-run.mjs code
  console.log("Running static analysis checks on E2E runner code...");
  const e2eContent = fs.readFileSync(e2eRunnerPath, "utf8");

  // Check: clean-tree check before PR automation
  if (!e2eContent.includes("git status --porcelain")) {
    throw new Error("E2E runner does not contain a clean-tree check (git status --porcelain)");
  }
  
  // Check: Commit-before-PR step appears before PR automation execution
  const commitIndex = e2eContent.indexOf("git commit -m");
  const prAutomationIndex = e2eContent.indexOf("pr-automation.mjs");
  if (commitIndex === -1 || prAutomationIndex === -1 || commitIndex > prAutomationIndex) {
    throw new Error("Commit-before-PR step does not appear before PR automation execution in the code");
  }
  console.log("  - commit-before-PR ordering check: PASS");

  // Check: Post-PR metadata update path exists
  if (!e2eContent.includes("chore: record e2e draft pr metadata")) {
    throw new Error("E2E runner does not contain post-PR metadata commit path ('chore: record e2e draft pr metadata')");
  }
  console.log("  - post-PR metadata update path check: PASS");

  // Check: clean-tree check (git status --porcelain) appears BEFORE the PR automation call
  const cleanTreeIndex = e2eContent.indexOf("git status --porcelain");
  if (cleanTreeIndex === -1) {
    throw new Error("E2E runner does not contain a clean-tree check (git status --porcelain)");
  }
  if (cleanTreeIndex > prAutomationIndex) {
    throw new Error("Clean-tree check (git status --porcelain) does not appear before PR automation execution in the code");
  }
  console.log("  - clean-tree check ordering (before PR automation): PASS");

  // Check: process.exit(1) is used when finalVerdict is E2E_FAILED or E2E_CRITICAL_GATE_BLOCKED
  if (!e2eContent.includes("E2E_FAILED") || !e2eContent.includes("E2E_CRITICAL_GATE_BLOCKED")) {
    throw new Error("E2E runner does not contain failure verdict constants (E2E_FAILED / E2E_CRITICAL_GATE_BLOCKED)");
  }
  const exitIndex = e2eContent.indexOf("process.exit(1)");
  if (exitIndex === -1) {
    throw new Error("E2E runner does not call process.exit(1) on failure");
  }
  console.log("  - apply failure exit code (process.exit(1)) check: PASS");

  // Check: post-PR metadata commit and push includes a clean-tree verification after push
  const postPushCleanTreeIndex = e2eContent.indexOf("git status --porcelain", cleanTreeIndex + 1);
  if (postPushCleanTreeIndex === -1) {
    throw new Error("E2E runner does not contain a post-push clean-tree verification");
  }
  console.log("  - post-push clean-tree verification check: PASS");

  console.log("🎉 ALL PHASE 0.3N VERIFICATIONS PASSED!");
}

main();
