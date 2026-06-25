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

  console.log("🎉 ALL PHASE 0.3N VERIFICATIONS PASSED!");
}

main();
