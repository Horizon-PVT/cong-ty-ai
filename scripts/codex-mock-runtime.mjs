#!/usr/bin/env node

import {
  requireEnv,
  fetchAssignedIssue,
  fetchParentIssue,
  postIssueComment,
  patchIssueStatus,
  buildSafetyFooter,
  formatMaybe
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

    const parentIssue = await fetchParentIssue(apiUrl, issue);
    if (parentIssue) {
      console.log(`[Codex Mock Runtime] Parent task fetched: "${parentIssue.title}"`);
    }

    const parentTitle = parentIssue ? parentIssue.title : "Not available";
    const parentDesc = parentIssue ? parentIssue.description : "Not available";

    const markdown = `### 💻 Codex Developer Implementation Report

#### 🎯 Interpreted Task Objective
- **Child Task**: "${issue.title}"
- **Objective**: Implement code adjustments to resolve child task under parent goal: "${parentTitle}".
- **Parent Details**: ${formatMaybe(parentDesc)}

#### 🛠️ Proposed Implementation Approach
- Research local file dependencies for feature implementation.
- Setup test branches / local workspace.
- Implement responsive layout changes using vanilla CSS/HTML.
- Verify compiling with \`pnpm build\` and local typechecks.

#### 📂 Files Likely to Inspect / Change
- \`src/components/...\`
- \`src/routes/...\`
- \`src/utils/...\`

#### 🌿 Branch & Worktree Safety Reminder
- **Local Branching**: Developers must always run edits on a temporary branch (e.g. \`chore/...\` or \`feat/...\`).
- **Safety Mode**: Mock runtime (No actual code changes or repository writes performed in this mock run).

#### 🔍 Acceptance Criteria
- [ ] Code builds cleanly with zero compile errors.
- [ ] Responsive design verified under mobile/desktop screen widths.
- [ ] Git working tree clean before review handoff.

${buildSafetyFooter()}`;

    await postIssueComment(apiUrl, taskId, runId, markdown, "Codex Developer Implementation Report");
    console.log("[Codex Mock Runtime] Report comment posted successfully.");
    await patchIssueStatus(apiUrl, taskId, "done");
    console.log("[Codex Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Codex Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
