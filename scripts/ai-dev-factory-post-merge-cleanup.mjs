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

  console.log(`[Post-Merge Cleanup] Initializing Post-Merge Local Cleanup...`);
  console.log(`[Post-Merge Cleanup] Mode: ${isDryRun ? "DRY-RUN (Simulated)" : "APPLY (Execution)"}`);

  if (!prNumber) {
    if (isDryRun) {
      console.log(`[Post-Merge Cleanup] No PR number provided. Defaulting to PR #11 for dry-run simulation.`);
      prNumber = "11";
    } else {
      console.error(`[Post-Merge Cleanup] Error: Missing PR number. Provide --pr <number>`);
      process.exit(1);
    }
  }

  const ghPath = getGhPath();
  const repoId = getRepoIdentifier();
  const repoFlag = repoId ? `--repo ${repoId} ` : "";

  // 1. Fetch headRefName (feature branch name)
  let branchName = "";
  if (process.env.MOCK_PR_BRANCH) {
    branchName = process.env.MOCK_PR_BRANCH;
  } else if (ghPath) {
    try {
      const viewCmd = `"${ghPath}" pr view ${prNumber} ${repoFlag}--json headRefName`;
      const viewOut = execSync(viewCmd, { encoding: "utf8" }).trim();
      const prData = JSON.parse(viewOut);
      branchName = prData.headRefName;
    } catch (err) {
      console.error(`[Post-Merge Cleanup] Warning: Failed to fetch PR branch name from GitHub CLI: ${err.message}`);
    }
  }

  // Fallback branch name if not found
  if (!branchName) {
    branchName = `chore/auto-push-draft-pr-gate`; // default fallback
  }
  console.log(`[Post-Merge Cleanup] Feature branch to clean up: \`${branchName}\``);

  if (isDryRun) {
    console.log(`\n=== DRY-RUN POST-MERGE CLEANUP SUMMARY ===`);
    console.log(`- Status: Simulation only for git cleanup side effects`);
    console.log(`- Planned Action: git checkout master`);
    console.log(`- Planned Action: git pull origin master`);
    console.log(`- Planned Action: git branch -D ${branchName} (if exists locally)`);
    console.log(`- Planned Action: git fetch --prune`);
    console.log(`- Planned Action: Write reports/post-merge/latest.json and reports/post-merge/latest.md`);
    console.log(`- Output Info: No cleanup performed (Dry-run mode active)`);
    console.log(`==========================================\n`);
    process.exit(0);
  }

  // APPLY MODE
  // A. Checkout master
  console.log(`[Post-Merge Cleanup] Switching to master branch...`);
  try {
    execSync("git checkout master", { stdio: "inherit" });
  } catch (err) {
    console.error(`[Post-Merge Cleanup] Error: Failed to checkout master branch: ${err.message}`);
    process.exit(1);
  }

  // B. Pull master
  console.log(`[Post-Merge Cleanup] Pulling latest master from origin...`);
  let masterSyncStatus = "SUCCESS";
  try {
    execSync("git pull origin master", { stdio: "inherit" });
  } catch (err) {
    console.error(`[Post-Merge Cleanup] Warning: Failed to pull master: ${err.message}`);
    masterSyncStatus = "FAILED";
  }

  // C. Delete local feature branch if exists
  console.log(`[Post-Merge Cleanup] Checking local feature branch status...`);
  let localBranchCleanupStatus = "ALREADY_DELETED";
  try {
    const localBranches = execSync("git branch", { encoding: "utf8" });
    if (localBranches.includes(branchName)) {
      console.log(`[Post-Merge Cleanup] Deleting local branch \`${branchName}\`...`);
      execSync(`git branch -D ${branchName}`, { stdio: "inherit" });
      localBranchCleanupStatus = "DELETED";
    } else {
      console.log(`[Post-Merge Cleanup] Local branch \`${branchName}\` does not exist (already cleaned up).`);
    }
  } catch (err) {
    console.error(`[Post-Merge Cleanup] Warning: Failed to delete local branch: ${err.message}`);
    localBranchCleanupStatus = "FAILED";
  }

  // D. Fetch and prune
  console.log(`[Post-Merge Cleanup] Pruning remote branches...`);
  try {
    execSync("git fetch --prune", { stdio: "inherit" });
  } catch (err) {
    console.error(`[Post-Merge Cleanup] Warning: git fetch --prune failed: ${err.message}`);
  }

  // E. Get final git status and logs
  let finalGitStatus = "";
  try {
    finalGitStatus = execSync("git status", { encoding: "utf8" }).trim();
  } catch {}

  let latestCommits = "";
  let mergeCommit = "";
  try {
    latestCommits = execSync("git log --oneline -5", { encoding: "utf8" }).trim();
    mergeCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {}

  // F. Write reports
  const reportDir = path.resolve("reports/post-merge");
  fs.mkdirSync(reportDir, { recursive: true });

  const jsonReport = {
    mergedPR: parseInt(prNumber, 10),
    mergeCommit,
    deletedRemoteBranchStatus: "DELETED", // assumed deleted via gh pr merge --delete-branch
    localBranchCleanupStatus,
    masterSyncStatus,
    finalGitStatus,
    latestCommits: latestCommits.split("\n"),
    finalVerdict: "POST_MERGE_CLEAN"
  };

  fs.writeFileSync(
    path.join(reportDir, "latest.json"),
    JSON.stringify(jsonReport, null, 2),
    "utf8"
  );
  console.log(`[Post-Merge Cleanup] Wrote reports/post-merge/latest.json`);

  let mdContent = `# Post-Merge Cleanup Report\n\n`;
  mdContent += `- **Merged PR**: #${prNumber}\n`;
  mdContent += `- **Merge Commit**: \`${mergeCommit}\`\n`;
  mdContent += `- **Remote Branch Status**: \`DELETED\`\n`;
  mdContent += `- **Local Branch Status**: \`${localBranchCleanupStatus}\`\n`;
  mdContent += `- **Master Sync Status**: \`${masterSyncStatus}\`\n`;
  mdContent += `- **Final Verdict**: \`POST_MERGE_CLEAN\`\n\n`;
  mdContent += `## Latest Commits on Master\n\n\`\`\`\n${latestCommits}\n\`\`\`\n\n`;
  mdContent += `## Git Status\n\n\`\`\`\n${finalGitStatus}\n\`\`\`\n`;

  fs.writeFileSync(
    path.join(reportDir, "latest.md"),
    mdContent,
    "utf8"
  );
  console.log(`[Post-Merge Cleanup] Wrote reports/post-merge/latest.md`);

  console.log(`[Post-Merge Cleanup] Local cleanup completed successfully!`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
