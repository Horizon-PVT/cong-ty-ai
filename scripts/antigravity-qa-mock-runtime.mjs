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
  console.log("[Antigravity QA Mock Runtime] Starting execution...");

  const apiUrl = requireEnv("PAPERCLIP_API_URL");
  const agentId = requireEnv("PAPERCLIP_AGENT_ID");
  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const taskId = requireEnv("PAPERCLIP_TASK_ID");
  const runId = process.env.PAPERCLIP_RUN_ID || null;

  console.log("[Antigravity QA Mock Runtime] Environment variables validated.");

  try {
    const issue = await fetchAssignedIssue(apiUrl, taskId);
    console.log(`[Antigravity QA Mock Runtime] Child task fetched: "${issue.title}"`);

    const parentIssue = await fetchParentIssue(apiUrl, issue);
    if (parentIssue) {
      console.log(`[Antigravity QA Mock Runtime] Parent task fetched: "${parentIssue.title}"`);
    }

    const parentTitle = parentIssue ? parentIssue.title : "Not available";

    const markdown = `### 🧪 Antigravity QA Verification Report

#### 🌐 Local UI Verification Checklist
- [ ] Components render without overlapping boundaries.
- [ ] Vibrant color combinations conform to HSL dark mode standard.
- [ ] Hover transitions and micro-animations execute in under 150ms.
- [ ] Form validations show informative error popups instead of defaulting.

#### 🚶 Browser Flow to Test
- Navigate to the page containing target changes.
- Click all buttons to confirm they bind to correct local actions.
- Perform focus navigation using keyboard (Tab indexing).

#### 📈 Expected Visible Behavior
- Seamless routing across navigation items.
- Smooth gradients and cohesive typography (Outfit/Inter).
- Fully responsive styling under multiple viewports (Mobile, Tablet, Desktop).

#### 🔍 Regression Checks
- Existing sidebar items, dashboards, and settings operate correctly.
- No hydration warning messages in browser dev console.

#### 📸 Screenshot / Recording Placeholder
- *[Mock Mode: Browser screenshot not captured]*

#### 📢 QA Verdict
- **Verdict**: \`PASSED (Mock mode verification only)\`

${buildSafetyFooter()}`;

    await postIssueComment(apiUrl, taskId, runId, markdown, "Antigravity QA Verification Report");
    console.log("[Antigravity QA Mock Runtime] Report comment posted successfully.");
    await patchIssueStatus(apiUrl, taskId, "done");
    console.log("[Antigravity QA Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Antigravity QA Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
