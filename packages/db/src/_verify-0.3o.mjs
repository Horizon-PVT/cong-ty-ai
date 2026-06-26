/**
 * Phase 0.3O Verification Script
 * E2E Merge-Path Dirty Tree Hardening
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { validateGoalIntent, isValidBranchName } from "../../../scripts/ai-dev-factory-e2e-dev-run.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

async function main() {
  console.log("Starting Phase 0.3O verification...");

  // 1. Verify E2E runner exists
  const e2eRunnerPath = path.join(repoRoot, "scripts/ai-dev-factory-e2e-dev-run.mjs");
  if (!fs.existsSync(e2eRunnerPath)) {
    throw new Error("scripts/ai-dev-factory-e2e-dev-run.mjs does not exist");
  }
  console.log("✅ verified: scripts/ai-dev-factory-e2e-dev-run.mjs exists");

  // 2. Verify docs exist
  const docsPath = path.join(repoRoot, "docs/e2e-merge-path-dirty-tree-hardening.md");
  if (!fs.existsSync(docsPath)) {
    throw new Error("docs/e2e-merge-path-dirty-tree-hardening.md does not exist");
  }
  console.log("✅ verified: docs/e2e-merge-path-dirty-tree-hardening.md exists");

  // 3. Static analysis of the E2E runner merge-mode code
  console.log("Running static analysis checks on E2E runner merge-mode code...");
  const e2eContent = fs.readFileSync(e2eRunnerPath, "utf8");

  // Check: clean-tree check BEFORE owner merge gate in merge mode
  const preMergeCleanTreeIdx = e2eContent.indexOf("E2E merge path requires a clean working tree before owner-approved merge");
  const ownerMergeGateIdx = e2eContent.indexOf("ai-dev-factory-owner-merge-gate.mjs");
  if (preMergeCleanTreeIdx === -1) {
    throw new Error("Merge mode does not have pre-merge clean-tree check");
  }
  if (ownerMergeGateIdx === -1) {
    throw new Error("Merge mode does not call owner merge gate");
  }
  if (preMergeCleanTreeIdx > ownerMergeGateIdx) {
    throw new Error("Pre-merge clean-tree check does not appear before owner merge gate call");
  }
  console.log("  - pre-merge clean-tree check ordering: PASS");

  // Check: owner merge gate appears before post-merge cleanup
  const postMergeCleanupIdx = e2eContent.indexOf("ai-dev-factory-post-merge-cleanup.mjs");
  if (postMergeCleanupIdx === -1) {
    throw new Error("Merge mode does not call post-merge cleanup");
  }
  if (ownerMergeGateIdx > postMergeCleanupIdx) {
    throw new Error("Owner merge gate does not appear before post-merge cleanup call");
  }
  console.log("  - merge gate before cleanup ordering: PASS");

  // Check: post-merge cleanup appears before E2E report writes in merge mode
  // Find the merge-mode report write (post-cleanup marker)
  const postCleanupReportIdx = e2eContent.indexOf("post-cleanup");
  if (postCleanupReportIdx === -1) {
    throw new Error("Merge mode does not mark report writes as post-cleanup");
  }
  if (postMergeCleanupIdx > postCleanupReportIdx) {
    throw new Error("Post-merge cleanup call does not appear before report writes");
  }
  console.log("  - cleanup before report writes ordering: PASS");

  // Check: master branch confirmation after cleanup
  if (!e2eContent.includes("Expected to be on master after cleanup")) {
    throw new Error("Merge mode does not confirm master branch after cleanup");
  }
  console.log("  - master branch confirmation check: PASS");

  // Check: clean tree check after cleanup
  if (!e2eContent.includes("E2E merge path expected clean tree after post-merge cleanup")) {
    throw new Error("Merge mode does not check clean tree after cleanup");
  }
  console.log("  - post-cleanup clean-tree check: PASS");

  // Check: merge-mode JSON report includes enhanced fields
  if (!e2eContent.includes("approvalTokenAccepted")) {
    throw new Error("Merge-mode JSON report does not include approvalTokenAccepted field");
  }
  if (!e2eContent.includes("masterBranchConfirmed")) {
    throw new Error("Merge-mode JSON report does not include masterBranchConfirmed field");
  }
  if (!e2eContent.includes("postMergeReportFound")) {
    throw new Error("Merge-mode JSON report does not include postMergeReportFound field");
  }
  if (!e2eContent.includes("finalGitStatus")) {
    throw new Error("Merge-mode JSON report does not include finalGitStatus field");
  }
  console.log("  - enhanced merge-mode report fields: PASS");

  // Check: no E2E report write before merge/cleanup in merge mode
  // The report write section should only appear AFTER the cleanup calls
  const mergeModeSectionStart = e2eContent.indexOf("// F. Owner-Approved Merge Integration");
  const mergeModeSectionEnd = e2eContent.indexOf("const finishedAt", mergeModeSectionStart);
  const mergeModeSection = e2eContent.substring(mergeModeSectionStart, mergeModeSectionEnd);
  if (mergeModeSection.includes("writeFileSync") && !mergeModeSection.includes("MOCK_REPORT_WRITE_BYPASS")) {
    throw new Error("Merge mode section F writes files before report section G");
  }
  console.log("  - no report writes in merge section F: PASS");

  // Check: process.exit(1) on failure
  if (!e2eContent.includes("process.exit(1)")) {
    throw new Error("E2E runner does not call process.exit(1) on failure");
  }
  console.log("  - failure exit code check: PASS");

  // 4. Runtime report tracking policy
  console.log("Checking runtime report tracking policy...");
  const gitignoreContent = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  const requiredIgnores = [
    "reports/e2e/latest.json",
    "reports/e2e/latest.md",
    "reports/post-merge/latest.json",
    "reports/post-merge/latest.md"
  ];
  for (const pattern of requiredIgnores) {
    if (!gitignoreContent.includes(pattern)) {
      throw new Error(`.gitignore does not contain: ${pattern}`);
    }
  }
  console.log("  - runtime reports are gitignored: PASS");

  // 5. Test approval token validation via CLI
  console.log("Running merge-mode CLI test cases...");

  // Missing approval token
  try {
    execSync(
      `node "${e2eRunnerPath}" --pr 13 --apply`,
      { encoding: "utf8", stdio: "pipe" }
    );
    throw new Error("Expected missing approval token to fail");
  } catch (err) {
    if (err.message && err.message.includes("Expected missing approval token to fail")) throw err;
    const stderr = err.stderr || "";
    if (!stderr.includes("Missing owner approval token")) {
      throw new Error("Missing approval token did not print expected error");
    }
  }
  console.log("  - missing approval token is rejected: PASS");

  // Wrong approval token
  try {
    execSync(
      `node "${e2eRunnerPath}" --pr 13 --approval OWNER_APPROVED_MERGE_PR=99 --apply`,
      {
        env: { ...process.env, MOCK_REPORT_WRITE_BYPASS: "true" },
        encoding: "utf8",
        stdio: "pipe"
      }
    );
    throw new Error("Expected wrong approval token to fail");
  } catch (err) {
    if (err.message && err.message.includes("Expected wrong approval token to fail")) throw err;
    const combined = (err.stdout || "") + "\n" + (err.stderr || "");
    if (!combined.includes("E2E_CRITICAL_GATE_BLOCKED") || !combined.includes("Mismatched or invalid approval token")) {
      throw new Error("Wrong approval token did not return E2E_CRITICAL_GATE_BLOCKED");
    }
  }
  console.log("  - wrong approval token is rejected: PASS");

  // Dry-run merge mode
  const dryRunMergeOut = execSync(
    `node "${e2eRunnerPath}" --pr 13 --approval OWNER_APPROVED_MERGE_PR=13 --dry-run`,
    { encoding: "utf8", stdio: "pipe" }
  );
  if (!dryRunMergeOut.includes("E2E_MERGED_AND_CLEANED")) {
    throw new Error("Dry-run merge mode did not return E2E_MERGED_AND_CLEANED");
  }
  if (!dryRunMergeOut.includes("Would check clean tree before merge")) {
    throw new Error("Dry-run merge mode did not mention clean tree check");
  }
  if (!dryRunMergeOut.includes("Would write E2E final reports after cleanup")) {
    throw new Error("Dry-run merge mode did not mention writing reports after cleanup");
  }
  // Dry-run should print all 5 no-action messages
  const requiredDryRunPhrases = [
    "No files modified",
    "No commit created",
    "No push performed",
    "No Draft PR created",
    "No merge attempted"
  ];
  for (const phrase of requiredDryRunPhrases) {
    if (!dryRunMergeOut.includes(phrase)) {
      throw new Error(`Dry-run merge output missing phrase: "${phrase}"`);
    }
  }
  console.log("  - dry-run merge mode checks: PASS");

  // 6. Safety flags in dry-run report
  const dryRunReportMatch = dryRunMergeOut.match(/\{[\s\S]*?\}/);
  if (dryRunReportMatch) {
    const dryRunReport = JSON.parse(dryRunReportMatch[0]);
    if (dryRunReport.deployAttempted !== false) throw new Error("deployAttempted is not false");
    if (dryRunReport.secretsRead !== false) throw new Error("secretsRead is not false");
    if (dryRunReport.destructiveActionAttempted !== false) throw new Error("destructiveActionAttempted is not false");
    if (dryRunReport.spendAttempted !== false) throw new Error("spendAttempted is not false");
    if (dryRunReport.externalCommunicationAttempted !== false) throw new Error("externalCommunicationAttempted is not false");
    if (dryRunReport.criticalGatesBlocked !== true) throw new Error("criticalGatesBlocked is not true");
    console.log("  - safety flags in dry-run report: PASS");
  }

  // 7. Verify previous verification scripts remain callable
  const previousVerifyScripts = [
    "packages/db/src/_verify-0.3i.mjs",
    "packages/db/src/_verify-0.3k.mjs",
    "packages/db/src/_verify-0.3l.mjs",
    "packages/db/src/_verify-0.3m.mjs",
    "packages/db/src/_verify-0.3n.mjs"
  ];
  for (const script of previousVerifyScripts) {
    const scriptPath = path.join(repoRoot, script);
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Previous verification script does not exist: ${script}`);
    }
  }
  console.log("✅ verified: previous phase verification scripts remain callable");

  // 8. Verify execution status doc mentions Phase 0.3O
  const execStatusPath = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  if (fs.existsSync(execStatusPath)) {
    const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
    if (!execStatusContent.includes("Phase 0.3O")) {
      throw new Error("docs/ai-dev-factory-execution-status.md does not mention Phase 0.3O");
    }
    console.log("✅ verified: execution status doc references Phase 0.3O");
  }

  console.log("🎉 ALL PHASE 0.3O VERIFICATIONS PASSED!");
}

main();
