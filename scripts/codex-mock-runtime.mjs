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

## Action-Aware Planning Packet

### 🎯 Task Objective
- **Child Task**: "${issue.title}"
- **Objective**: Implement code adjustments to resolve child task under parent goal: "${parentTitle}".
- **Parent Details**: ${formatMaybe(parentDesc)}

### 📂 Relevant Files
${relevantFiles.length > 0 ? relevantFiles.map(f => `- \`${f}\``).join("\n") : "- None detected matching keywords."}

### 📝 Proposed File-by-File Implementation Plan
- Inspect likely relevant files listed above to locate target components/routes.
- Initialize local branch edits matching task context if safety permits.

### 🌿 Safe Branch Execution Permission
- **Policy**: This mock runtime did not perform code changes. Safe branch code changes are allowed for the real Codex execution adapter under the internal execution policy.
- **Active Git Branch**: \`${git.branch}\`
- **Owner Approval**: Owner approval is NOT required for safe branch edits, commits, or draft PRs.

### 🛠️ Ordered Implementation Steps
1. Create a local temporary feature branch if not already on one.
2. Edit target files to address "${issue.title}".
3. Build the project using \`pnpm build\`.
4. Validate changes using \`pnpm -r typecheck\`.

### 💻 Local Run Commands
- Build workspace: \`pnpm build\`
- Typecheck: \`pnpm -r typecheck\`
- Run tests: \`pnpm test:run\`

### 📊 Expected Outputs
- Successful build and zero typecheck errors.
- Working tree contains only modified files matching the implementation scope.

### 🔄 Rollback Notes
- Rollback local changes: \`git restore .\`
- Switch back to master: \`git checkout master\`

### 🚧 Critical Gates Blocked
- Merging to master, production deployment, database schema modifications, paid budget spend, and external communications remain strictly blocked. Owner manual approval is required for these critical gates.

### 🔍 Acceptance Criteria
- [ ] Code builds cleanly with zero compile errors.
- [ ] Target functionality verified on active route/pages.
- [ ] Git working tree remains clean and typechecks pass.

${contextBlock}

\`\`\`json
{
  "mode": "mock",
  "packetType": "implementation_plan",
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
    await postIssueComment(apiUrl, taskId, runId, markdown, "Codex Developer Implementation Report");
    console.log("[Codex Mock Runtime] Report comment posted successfully.");
    console.log("[Codex Mock Runtime] Runtime execution completed successfully.");
  } catch (err) {
    console.error("[Codex Mock Runtime] Execution failed:", err.message);
    process.exit(1);
  }
}

main();
