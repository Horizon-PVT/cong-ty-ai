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
  console.log("[Claude Reviewer Mock Runtime] Starting execution...");

  const apiUrl = requireEnv("PAPERCLIP_API_URL");
  const agentId = requireEnv("PAPERCLIP_AGENT_ID");
  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const taskId = requireEnv("PAPERCLIP_TASK_ID");
  const runId = process.env.PAPERCLIP_RUN_ID || null;

  console.log("[Claude Reviewer Mock Runtime] Environment variables validated.");

  try {
    const issue = await fetchAssignedIssue(apiUrl, taskId);
    console.log(`[Claude Reviewer Mock Runtime] Child task fetched: "${issue.title}"`);

    const parentIssue = await fetchParentIssue(apiUrl, issue);
    if (parentIssue) {
      console.log(`[Claude Reviewer Mock Runtime] Parent task fetched: "${parentIssue.title}"`);
    }

    const parentTitle = parentIssue ? parentIssue.title : "Not available";

    const markdown = `### 🔍 Claude Reviewer Audit & Verification Report

#### 🏗️ Architecture & Code Quality Audit
- **Task Alignment**: Reviewed the proposed approach for parent task: "${parentTitle}".
- **Import Audit**: Verified that all imports are contained inside the workspace. No external or unauthorized package requirements detected.
- **Complexity Risk**: Minimal. Changes are localized to styling and markup.

#### 🛡️ Safety & Security Analysis
- **API Keys & Secrets**: Verified no hardcoded API keys, passwords, or tokens exist in the suggested code modifications.
- **Outbound Connections**: No external API endpoints or fetch calls allowed without explicit sandbox overrides.
- **Data Mutation**: Checked that database modifications are handled securely using seeded schemas, with no data deletion or schema drop commands.

#### 📊 Code Quality Checklist
- [ ] Schema extensions and type definitions are properly exported.
- [ ] Error boundaries are implemented to handle downstream layout failures gracefully.
- [ ] No debug statements or console log leakage of sensitive data.

#### 🚦 Merge & Deploy Gate Status
- **Merge Status**: Mock validation passed. Merge to master remains BLOCKED pending human owner approval.
- **Deploy Status**: Mock validation passed. Deployment to production remains BLOCKED pending human owner approval.

#### 📢 Review Verdict
- **Verdict**: \`APPROVED (Mock mode evaluation only)\`

${buildSafetyFooter()}`;

    await postIssueComment(apiUrl, taskId, runId, markdown, "Claude Reviewer Audit & Verification Report");
    console.log("[Claude Reviewer Mock Runtime] Report comment posted successfully.");
    await patchIssueStatus(apiUrl, taskId, "done");
    console.log("[Claude Reviewer Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Claude Reviewer Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
