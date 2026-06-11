#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  requireEnv,
  fetchAssignedIssue,
  fetchParentIssue,
  postIssueComment,
  patchIssueStatus,
  buildSafetyFooter,
  formatMaybe,
  getWorkspaceSummary,
  getGitSummary,
  getLikelyRelevantFiles,
  buildProjectContextBlock,
  findRepoRoot
} from "./agent-mock-runtime-utils.mjs";

async function main() {
  console.log("[Codex Mock Runtime] Starting execution...");

  const apiUrl = requireEnv("PAPERCLIP_API_URL");
  const agentId = requireEnv("PAPERCLIP_AGENT_ID");
  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const taskId = requireEnv("PAPERCLIP_TASK_ID");
  const runId = process.env.PAPERCLIP_RUN_ID || null;

  console.log("[Codex Mock Runtime] Environment variables validated.");

  try {
    const issue = await fetchAssignedIssue(apiUrl, taskId);
    console.log(`[Codex Mock Runtime] Child task fetched: "${issue.title}"`);

    if (issue.status === "done") {
      console.log(`[Codex Mock Runtime] Task ${taskId} is already done. Exiting cleanly.`);
      process.exit(0);
    }

    const parentIssue = await fetchParentIssue(apiUrl, issue);
    if (parentIssue) {
      console.log(`[Codex Mock Runtime] Parent task fetched: "${parentIssue.title}"`);
    }

    const parentTitle = parentIssue ? parentIssue.title : "Not available";
    const parentDesc = parentIssue ? parentIssue.description : "Not available";

    const ws = getWorkspaceSummary();
    const git = getGitSummary();
    const relevantFiles = getLikelyRelevantFiles(issue.title, issue.description || "");
    const contextBlock = buildProjectContextBlock();

    // Read package scripts from package.json if available
    let scriptsSummary = "None detected";
    try {
      const root = findRepoRoot();
      const pkgRaw = fs.readFileSync(path.join(root, "package.json"), "utf8");
      const pkg = JSON.parse(pkgRaw);
      if (pkg.scripts) {
        scriptsSummary = Object.keys(pkg.scripts).map(s => `\`${s}\``).join(", ");
      }
    } catch {}

    const markdown = `### 💻 Codex Developer Implementation Report

#### 🎯 Task Objective (Project-Aware Interpretation)
- **Child Task**: "${issue.title}"
- **Objective**: Implement code adjustments to resolve child task under parent goal: "${parentTitle}".
- **Parent Details**: ${formatMaybe(parentDesc)}

#### 🛠️ Proposed Implementation Approach & Suggested Steps
- Inspect likely relevant files listed below to locate target components/routes.
- Initialize local branch edits matching task context if safety permits.
- Verify building with \`pnpm build\` and typechecks using script: \`pnpm -r typecheck\`.
- Available package scripts for build/run: ${scriptsSummary}.

#### 📂 Files Likely to Inspect / Change (Task-Aware Match)
${relevantFiles.length > 0 ? relevantFiles.map(f => `- \`${f}\``).join("\n") : "- None detected matching keywords."}

${contextBlock}

#### 🌿 Branch & Worktree Safety Reminder
- **Local Branching**: Current active git branch: \`${git.branch}\`. Developers must always run edits on a temporary branch.
- **Safety Mode**: Mock runtime (No actual code changes or repository writes performed in this mock run).

#### 🔍 Acceptance Criteria
- [ ] Code builds cleanly with zero compile errors.
- [ ] Target functionality verified on active route/pages.
- [ ] Git working tree remains clean and typechecks pass.

${buildSafetyFooter()}`;

    await patchIssueStatus(apiUrl, taskId, "done");
    await postIssueComment(apiUrl, taskId, runId, markdown, "Codex Developer Implementation Report");
    console.log("[Codex Mock Runtime] Report comment posted successfully.");
    console.log("[Codex Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Codex Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
