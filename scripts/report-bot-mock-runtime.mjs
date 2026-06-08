#!/usr/bin/env node

import {
  requireEnv,
  fetchAssignedIssue,
  fetchParentIssue,
  postIssueComment,
  patchIssueStatus,
  buildSafetyFooter,
  fetchJson,
  formatMaybe
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

    let childTaskStatusSection = "";
    if (siblingIssues.length > 0) {
      childTaskStatusSection = "#### 📋 Coordinated Child Task Statuses\n";
      for (const sibling of siblingIssues) {
        childTaskStatusSection += `- **${sibling.title}** (Assignee ID: \`${sibling.assigneeAgentId || "None"}\`): \`${sibling.status}\`\n`;
      }
    } else {
      childTaskStatusSection = "#### 📋 Coordinated Child Task Statuses\n- Sibling task statuses not available.\n";
    }

    const markdown = `### 📊 AI Dev Factory Operator Summary

#### 🎯 Parent Goal
- **Parent Task**: "${parentTitle}"
- **Goal Description**: ${formatMaybe(parentDesc)}

${childTaskStatusSection}
#### 🤖 Coordinated Agents Executed / Assigned
- **JARVIS Strategy Advisor** (Orchestrated task creation, unpausing, and coordination)
- **Codex Developer** (Implementation phase)
- **Claude Reviewer** (Audit & review phase)
- **Antigravity QA** (Verification phase)
- **Report Bot** (Summary and operations logging)

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

    await postIssueComment(apiUrl, taskId, runId, markdown, "AI Dev Factory Operator Summary");
    console.log("[Report Bot Mock Runtime] Report comment posted successfully.");
    await patchIssueStatus(apiUrl, taskId, "done");
    console.log("[Report Bot Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Report Bot Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
