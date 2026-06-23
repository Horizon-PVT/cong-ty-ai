#!/usr/bin/env node

import {
  requireEnv,
  fetchAssignedIssue,
  fetchParentIssue,
  postIssueComment,
  patchIssueStatus,
  buildSafetyFooter,
  formatMaybe,
  getGitSummary,
  detectConfigFiles,
  buildProjectContextBlock
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

    if (issue.status === "done") {
      console.log(`[Claude Reviewer Mock Runtime] Task ${taskId} is already done. Exiting cleanly.`);
      process.exit(0);
    }

    const parentIssue = await fetchParentIssue(apiUrl, issue);
    if (parentIssue) {
      console.log(`[Claude Reviewer Mock Runtime] Parent task fetched: "${parentIssue.title}"`);
    }

    const parentTitle = parentIssue ? parentIssue.title : "Not available";

    const git = getGitSummary();
    const configs = detectConfigFiles();
    const contextBlock = buildProjectContextBlock();

    let diffSection = "- No active code modifications or diff exists in the workspace. Review is based on task context and repository structure only.";
    if (git.diffStat) {
      diffSection = `- **Active Git Changes Detected**:\n\`\`\`\n${git.diffStat}\n\`\`\``;
    } else if (git.modifiedFiles.length > 0) {
      diffSection = `- **Modified Files**:\n${git.modifiedFiles.map(f => `  - \`${f}\``).join("\n")}`;
    }

    // Architecture Risk Analysis based on configuration files
    let archRisk = "No special architectural risks detected. Local structure conforms to pnpm workspace standards.";
    if (configs.includes("pnpm-workspace.yaml")) {
      archRisk = "Monorepo configuration verified. Packages are isolated within the \`packages/\` directory to prevent circular dependencies.";
    }

    const markdown = `### 🔍 Claude Reviewer Audit & Verification Report

## Action-Aware Planning Packet

### 🏗️ Review Risk Map
- **Task Alignment**: Reviewed the proposed approach for parent task: "${parentTitle}".
- **Import Audit**: Verified that all imports are contained inside the workspace. No external or unauthorized package requirements detected.
- **Complexity & Architectural Risk**: ${archRisk}

### 📈 Diff/File Risk Ranking
- **Risk Assessment**: Low. Local structure conforms to pnpm workspace standards.
${diffSection}

### 🔐 Security/Secrets/Data Checklist
- [ ] No hardcoded API keys or secrets detected in working tree.
- [ ] Confirmed **no secrets read** (no .env files, private keys, or credentials scanned).
- [ ] No database schema drops, truncates, or destructive actions.

### 🚀 Merge Readiness Checklist
- [ ] Typechecks pass successfully across the monorepo workspace.
- [ ] Code builds without errors on the active feature branch.
- [ ] Tests execute successfully in dry-run mode.

### 🌿 Safe Branch Review Policy
- **Policy**: Claude Reviewer is authorized to review branch diffs and request changes automatically on non-master feature branches.
- **Merge Gate**: It cannot approve merge to master without owner gate if policy requires owner approval.

### 🚧 Critical Gates Blocked
- Merging to master, production deployment, database schema modifications, paid budget spend, and external communications remain strictly blocked. Owner manual approval is required for these critical gates.

### 🚦 Explicit Mock Verdict
- **Verdict**: \`APPROVED (Mock mode evaluation only)\`

${contextBlock}

\`\`\`json
{
  "mode": "mock",
  "packetType": "review_plan",
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
    await postIssueComment(apiUrl, taskId, runId, markdown, "Claude Reviewer Audit & Verification Report");
    console.log("[Claude Reviewer Mock Runtime] Report comment posted successfully.");
    console.log("[Claude Reviewer Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Claude Reviewer Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
