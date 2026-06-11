#!/usr/bin/env node

import {
  requireEnv,
  fetchAssignedIssue,
  fetchParentIssue,
  postIssueComment,
  patchIssueStatus,
  buildSafetyFooter,
  formatMaybe,
  detectRoutesAndPages,
  detectTestFiles,
  buildProjectContextBlock
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

    if (issue.status === "done") {
      console.log(`[Antigravity QA Mock Runtime] Task ${taskId} is already done. Exiting cleanly.`);
      process.exit(0);
    }

    const parentIssue = await fetchParentIssue(apiUrl, issue);
    if (parentIssue) {
      console.log(`[Antigravity QA Mock Runtime] Parent task fetched: "${parentIssue.title}"`);
    }

    const parentTitle = parentIssue ? parentIssue.title : "Not available";

    const routes = detectRoutesAndPages();
    const testFiles = detectTestFiles();
    const contextBlock = buildProjectContextBlock();

    // Map routes to suggested browser flows dynamically
    let suggestedFlows = "";
    if (routes.length > 0) {
      suggestedFlows = routes.slice(0, 3).map(r => `- Navigate to **${r}** page and verify UI responsiveness.\n- Click primary actions on **${r}** dashboard.`).join("\n");
    } else {
      suggestedFlows = "- Navigate to the page containing target changes.\n- Click all buttons to confirm they bind to correct local actions.\n- Perform focus navigation using keyboard (Tab indexing).";
    }

    const markdown = `### 🧪 Antigravity QA Verification Report

#### 🌐 Local UI Verification Checklist
- [ ] Components render without overlapping boundaries in frontend folders.
- [ ] Vibrant color combinations conform to HSL dark mode standard.
- [ ] Hover transitions and micro-animations execute in under 150ms.
- [ ] Form validations show informative error popups instead of defaulting.

#### 🚶 Browser Flow to Test (Route-Aware)
${suggestedFlows}

#### 📈 Expected Visible Behavior
- ${routes.length > 0 ? `Seamless routing across navigation items: ${routes.map(r => `\`${r}\``).join(", ")}.` : "No frontend route files detected from safe scan."}
- Smooth gradients and cohesive typography (Outfit/Inter).
- Fully responsive styling under multiple viewports (Mobile, Tablet, Desktop).

#### 🔍 Regression Checks (Test-Suite Aware)
- Existing sidebar items, dashboards, and settings operate correctly.
- No hydration warning messages in browser dev console.
- ${testFiles.length > 0 ? `Run local test coverage suites:\n${testFiles.map(tf => `  - \`pnpm test ${tf}\``).join("\n")}` : "No local test coverage suites detected from safe scan."}

${contextBlock}

#### 📸 Screenshot / Recording Placeholder
- *[Mock Mode: Browser screenshot not captured]*

#### 📢 QA Verdict
- **Verdict**: \`PASSED (Mock mode verification only)\`

${buildSafetyFooter()}`;

    await patchIssueStatus(apiUrl, taskId, "done");
    await postIssueComment(apiUrl, taskId, runId, markdown, "Antigravity QA Verification Report");
    console.log("[Antigravity QA Mock Runtime] Report comment posted successfully.");
    console.log("[Antigravity QA Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Antigravity QA Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
