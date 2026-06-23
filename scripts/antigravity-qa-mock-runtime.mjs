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

## Action-Aware Planning Packet

### 🧪 Route/Page/Component-Aware Test Plan
- **Scope**: Validate UI/UX stability and execution correctness for parent issue: "${parentTitle}".
- **Target Pages/Components**: ${routes.length > 0 ? routes.map(r => `\`${r}\``).join(", ") : "No specific route files mapped."}

### 🚶 Browser Flows to Verify
${suggestedFlows}

### 🔄 Regression Checklist
- [ ] Vibrant color combinations conform to dark mode standard.
- [ ] Hover transitions and micro-animations execute smoothly.
- [ ] Forms validate without hydration warnings.

### 💻 Local Verification Commands
- Run test suites:
${testFiles.length > 0 ? testFiles.map(tf => `  - \`pnpm test ${tf}\``).join("\n") : "  - No local test coverage suites detected."}

### 📈 Expected Pass/Fail Signals
- **Pass**: Zero failed assertions, compilation success.
- **Fail**: Active exceptions, broken layout, compile errors.

### 📸 Screenshot/Manual QA Placeholder
- *[Mock Mode: Browser screenshot not captured automatically]*

### 🌿 Safe Branch QA Policy
- **Policy**: Antigravity QA is authorized to run local QA and test suite verification automatically on non-master feature branches.
- **Deploy Gate**: It cannot deploy to production or stage without owner approval.

### 🚧 Critical Gates Blocked
- Merging to master, production deployment, database schema modifications, paid budget spend, and external communications remain strictly blocked. Owner manual approval is required for these critical gates.

### 🚦 Dry-Run QA Verdict
- **Verdict**: \`PASSED (Mock mode verification only)\`

${contextBlock}

\`\`\`json
{
  "mode": "mock",
  "packetType": "qa_plan",
  "packetGenerated": true,
  "internalExecutionMode": "safe_branch",
  "ownerApprovalRequiredForPacketGeneration": false,
  "ownerApprovalRequiredForInternalTaskDecomposition": false,
  "ownerApprovalRequiredForSafeBranchCodeChanges": false,
  "ownerApprovalRequiredForLocalCommit": false,
  "ownerApprovalRequiredForDraftPr": false,
  "ownerApprovalRequiredForCriticalGates": true,
  "safeBranchCodeChangesAllowed": true,
  "localVerificationAllowed": true,
  "draftPrAllowed": true,
  "mergeToMasterAllowed": false,
  "deployAllowed": false,
  "externalApiCalls": false,
  "localPaperclipApiCallsOnly": true,
  "apiKeysUsed": false,
  "secretsRead": false,
  "spendPerformed": false,
  "destructiveChangesPerformed": false
}
\`\`\`

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
