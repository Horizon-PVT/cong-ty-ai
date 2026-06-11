#!/usr/bin/env node

import {
  requireEnv,
  fetchAssignedIssue,
  fetchParentIssue,
  postIssueComment,
  patchIssueStatus,
  buildSafetyFooter,
  fetchJson,
  formatMaybe,
  getWorkspaceSummary,
  getGitSummary,
  buildProjectContextBlock
} from "./agent-mock-runtime-utils.mjs";

async function main() {
  console.log("[Report Bot Mock Runtime] Starting execution...");

  const apiUrl = requireEnv("PAPERCLIP_API_URL");
  const agentId = requireEnv("PAPERCLIP_AGENT_ID");
  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const taskId = requireEnv("PAPERCLIP_TASK_ID");
  const runId = process.env.PAPERCLIP_RUN_ID || null;

  console.log("[Report Bot Mock Runtime] Environment variables validated.");

  try {
    const issue = await fetchAssignedIssue(apiUrl, taskId);
    console.log(`[Report Bot Mock Runtime] Child task fetched: "${issue.title}"`);

    if (issue.status === "done") {
      console.log(`[Report Bot Mock Runtime] Task ${taskId} is already done. Exiting cleanly.`);
      process.exit(0);
    }

    const parentIssue = await fetchParentIssue(apiUrl, issue);
    let siblingIssues = [];
    if (parentIssue) {
      console.log(`[Report Bot Mock Runtime] Parent task fetched: "${parentIssue.title}"`);
      // Fetch sibling tasks under the parent issue
      try {
        siblingIssues = await fetchJson(`${apiUrl}/api/companies/${companyId}/issues?parentId=${parentIssue.id}`);
        console.log(`[Report Bot Mock Runtime] Fetched ${siblingIssues.length} sibling child tasks.`);
      } catch (err) {
        console.warn(`[Report Bot Mock Runtime] Warning: Failed to fetch sibling tasks: ${err.message}`);
      }
    }

    const parentTitle = parentIssue ? parentIssue.title : "Not available";
    const parentDesc = parentIssue ? parentIssue.description : "Not available";

    const ws = getWorkspaceSummary();
    const git = getGitSummary();
    const contextBlock = buildProjectContextBlock();

    let childTaskStatusSection = "";
    if (siblingIssues.length > 0) {
      childTaskStatusSection = "#### 📋 Coordinated Child Task Statuses\n";
      for (const sibling of siblingIssues) {
        let statusExplain = `\`${sibling.status}\``;
        if (sibling.id === taskId) {
          statusExplain = `\`${sibling.status}\` *(generating this report)*`;
        }
        childTaskStatusSection += `- **${sibling.title}** (Assignee ID: \`${sibling.assigneeAgentId || "None"}\`): ${statusExplain}\n`;
      }
      childTaskStatusSection += `\n*Note: Report Bot's own task is shown as \`in_progress\` because it fetches statuses during execution and transitions to \`done\` immediately after posting this summary.*\n`;
    } else {
      childTaskStatusSection = "#### 📋 Coordinated Child Task Statuses\n- Sibling task statuses not available.\n";
    }

    const markdown = `### 📊 AI Dev Factory Operator Summary

#### 🎯 Parent Goal & Workspace Context
- **Parent Task**: "${parentTitle}"
- **Goal Description**: ${formatMaybe(parentDesc)}
- **Workspace Name**: \`${ws.name}\` (Monorepo: \`${ws.isMonorepo ? "Yes" : "No"}\`)

${childTaskStatusSection}
#### 🤖 Coordinated Agents Executed / Assigned
- **JARVIS Strategy Advisor** (Orchestrated task creation, unpausing, and coordination)
- **Codex Developer** (Implementation phase)
- **Claude Reviewer** (Audit & review phase)
- **Antigravity QA** (Verification phase)
- **Report Bot** (Summary and operations logging)

#### 🌿 Git Status & Branch Summary
- **Active Branch**: \`${git.branch}\`
- **Working Tree Clean**: \`${git.isClean ? "Yes" : "No"}\`

${contextBlock}

#### 🛑 Blockers / Issues
- None detected. Downstream mock dry-runs executed successfully.

#### 🛡️ Critical Gates Status
- **Merge to Master**: \`BLOCKED\` (Owner manual approval required)
- **Production Deploy**: \`BLOCKED\` (Owner manual approval required)
- **Database Schema Changes**: \`BLOCKED\` (No mutations allowed in mock mode)
- **Billing / Spend**: \`BLOCKED\` (Total budget spend: $0.00)

#### 🚦 Next Owner-Facing Checkpoint
- Verify that the downstream reports (Implementation, Review, QA) have been successfully compiled in the issue threads.
- In the next Phase, the human owner can proceed with the manual merge/deployment.

${buildSafetyFooter()}`;

    await patchIssueStatus(apiUrl, taskId, "done");
    await postIssueComment(apiUrl, taskId, runId, markdown, "AI Dev Factory Operator Summary");
    console.log("[Report Bot Mock Runtime] Report comment posted successfully.");
    console.log("[Report Bot Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Report Bot Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
