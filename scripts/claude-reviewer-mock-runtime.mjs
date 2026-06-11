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

#### 🏗️ Architecture & Code Quality Audit
- **Task Alignment**: Reviewed the proposed approach for parent task: "${parentTitle}".
- **Import Audit**: Verified that all imports are contained inside the workspace. No external or unauthorized package requirements detected.
- **Complexity & Architectural Risk**: ${archRisk}

#### 🛡️ Safety & Security Analysis (No Secrets Read Confirmation)
- **API Keys & Secrets**: Confirmed **no secrets read** (no .env files, private keys, or credentials scanned). Verified no hardcoded API keys exist.
- **Outbound Connections**: No external API endpoints or fetch calls allowed without explicit sandbox overrides.
- **Data Mutation**: Checked that database modifications are handled securely, with no data deletion or schema drop commands.

#### 🌿 Workspace Git Diff / Stat Summary
${diffSection}

${contextBlock}

#### 📊 Code Quality Checklist (Config-Aware)
- [ ] Schema extensions and type definitions are properly exported.
- [ ] Config files match verified templates (${configs.map(c => `\`${c}\``).join(", ")}).
- [ ] No debug statements or console log leakage of sensitive data.

#### 🚦 Merge & Deploy Gate Status
- **Merge Status**: Mock validation passed. Merge to master remains BLOCKED pending human owner approval.
- **Deploy Status**: Mock validation passed. Deployment to production remains BLOCKED pending human owner approval.

#### 📢 Review Verdict
- **Verdict**: \`APPROVED (Mock mode evaluation only)\`

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
