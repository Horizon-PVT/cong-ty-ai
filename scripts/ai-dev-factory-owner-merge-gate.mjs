#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = !isApply || args.includes("--dry-run");

  // Parse --pr
  let prNumber = null;
  const prIndex = args.indexOf("--pr");
  if (prIndex !== -1 && prIndex + 1 < args.length) {
    prNumber = args[prIndex + 1];
  }

  // Parse --approval
  let approvalToken = null;
  const approvalIndex = args.indexOf("--approval");
  if (approvalIndex !== -1 && approvalIndex + 1 < args.length) {
    approvalToken = args[approvalIndex + 1];
  }

  console.log(`[Merge Gate] Initializing Owner-Approved Merge Gate...`);
  console.log(`[Merge Gate] Mode: ${isDryRun ? "DRY-RUN (Simulated)" : "APPLY (Execution)"}`);

  // 1. Check if PR number is missing
  if (!prNumber) {
    console.error(`[Merge Gate] Error: Missing PR number. Provide --pr <number>`);
    process.exit(1);
  }

  // 2. Check if approval token is missing
  if (!approvalToken) {
    console.error(`[Merge Gate] Error: Missing approval token. Provide --approval OWNER_APPROVED_MERGE_PR=<number>`);
    process.exit(1);
  }

  // 3. Enforce approval token format: OWNER_APPROVED_MERGE_PR=<number>
  const tokenMatch = approvalToken.match(/^OWNER_APPROVED_MERGE_PR=(\d+)$/);
  if (!tokenMatch) {
    console.error(`[Merge Gate] Error: Invalid approval token format. Must be OWNER_APPROVED_MERGE_PR=<number>`);
    process.exit(1);
  }

  // 4. Refuse if approval token PR number does not match --pr number
  const approvedPrNumber = tokenMatch[1];
  if (approvedPrNumber !== prNumber) {
    console.error(`[Merge Gate] Error: Approval token PR number (${approvedPrNumber}) does not match --pr number (${prNumber}).`);
    process.exit(1);
  }

  const ghPath = getGhPath();
  if (!ghPath) {
    console.error(`[Merge Gate] Error: GitHub CLI (\`gh\`) is not installed or authenticated.`);
    process.exit(1);
  }

  const repoId = getRepoIdentifier();
  const repoFlag = repoId ? `--repo ${repoId} ` : "";
  console.log(`[Merge Gate] Target repository: ${repoId || "Default"}`);

  // 5. Fetch PR status using gh CLI (or mock data if environment variable is set)
  let prData = null;
  if (process.env.MOCK_PR_DATA) {
    console.log(`[Merge Gate] Using mock PR data from environment...`);
    try {
      prData = JSON.parse(process.env.MOCK_PR_DATA);
    } catch (err) {
      console.error(`[Merge Gate] Error: Failed to parse MOCK_PR_DATA env var: ${err.message}`);
      process.exit(1);
    }
  } else {
    try {
      const viewCmd = `"${ghPath}" pr view ${prNumber} ${repoFlag}--json state,mergeable,statusCheckRollup,isDraft`;
      const viewOut = execSync(viewCmd, { encoding: "utf8" }).trim();
      prData = JSON.parse(viewOut);
    } catch (err) {
      console.error(`[Merge Gate] Error: Failed to fetch PR data via gh CLI: ${err.message}`);
      process.exit(1);
    }
  }

  // 6. Refuse if PR is not open
  if (prData.state !== "OPEN") {
    console.error(`[Merge Gate] Error: PR is not open (state: ${prData.state}).`);
    process.exit(1);
  }

  // 7. Refuse if PR has merge conflicts
  if (prData.mergeable === "CONFLICTING") {
    console.error(`[Merge Gate] Error: PR has merge conflicts.`);
    process.exit(1);
  }
  if (prData.mergeable !== "MERGEABLE" && prData.mergeable !== "UNKNOWN") {
    console.error(`[Merge Gate] Error: PR is not mergeable (mergeable: ${prData.mergeable}).`);
    process.exit(1);
  }

  // 8. Refuse if PR checks are not passing
  const statusCheckRollup = prData.statusCheckRollup || [];
  for (const check of statusCheckRollup) {
    if (check.status !== "COMPLETED") {
      console.error(`[Merge Gate] Error: Check "${check.name}" is not completed (status: ${check.status}).`);
      process.exit(1);
    }
    if (check.conclusion !== "SUCCESS" && check.conclusion !== "NEUTRAL") {
      console.error(`[Merge Gate] Error: Check "${check.name}" is not passing (conclusion: ${check.conclusion}).`);
      process.exit(1);
    }
  }

  console.log(`[Merge Gate] All safety and approval checks passed for PR #${prNumber}.`);

  if (isDryRun) {
    console.log(`\n=== DRY-RUN MERGE GATE SUMMARY ===`);
    console.log(`- Status: Simulation only for merge side effects`);
    console.log(`- Planned Action: Convert PR to Ready for review (if Draft)`);
    console.log(`- Planned Action: Merge PR #${prNumber} to master`);
    console.log(`- Planned Action: Delete remote branch`);
    console.log(`- Output Info: No merge performed (Dry-run mode active)`);
    console.log(`===================================\n`);
    process.exit(0);
  }

  // APPLY MODE
  // A. Mark Draft PR as Ready for review if needed
  if (prData.isDraft) {
    console.log(`[Merge Gate] PR is currently a draft. Converting to Ready for review...`);
    try {
      execSync(`"${ghPath}" pr ready ${prNumber} ${repoFlag}`, { stdio: "inherit" });
      console.log(`[Merge Gate] PR successfully marked ready for review.`);
    } catch (err) {
      console.error(`[Merge Gate] Error: Failed to mark PR ready for review: ${err.message}`);
      process.exit(1);
    }
  }

  // B. Merge PR
  console.log(`[Merge Gate] Merging PR #${prNumber} to master...`);
  try {
    const mergeCmd = `"${ghPath}" pr merge ${prNumber} --merge --delete-branch ${repoFlag}`;
    execSync(mergeCmd, { stdio: "inherit" });
    console.log(`[Merge Gate] PR #${prNumber} merged and remote branch deleted successfully.`);
  } catch (err) {
    console.error(`[Merge Gate] Error: Failed to merge PR: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
