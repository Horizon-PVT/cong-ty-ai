#!/usr/bin/env node

import { createHash } from 'node:crypto';

const {
  PAPERCLIP_API_URL,
  PAPERCLIP_AGENT_ID,
  PAPERCLIP_COMPANY_ID,
  PAPERCLIP_TASK_ID,
  PAPERCLIP_RUN_ID
} = process.env;

console.log("[JARVIS Mock Runtime] Starting execution...");
console.log(`- PAPERCLIP_API_URL: ${PAPERCLIP_API_URL}`);
console.log(`- PAPERCLIP_AGENT_ID: ${PAPERCLIP_AGENT_ID}`);
console.log(`- PAPERCLIP_COMPANY_ID: ${PAPERCLIP_COMPANY_ID}`);
console.log(`- PAPERCLIP_TASK_ID: ${PAPERCLIP_TASK_ID}`);
console.log(`- PAPERCLIP_RUN_ID: ${PAPERCLIP_RUN_ID}`);

if (!PAPERCLIP_API_URL || !PAPERCLIP_AGENT_ID || !PAPERCLIP_COMPANY_ID || !PAPERCLIP_TASK_ID) {
  console.error("[JARVIS Mock Runtime] Error: Missing required environment variables.");
  process.exit(1);
}

async function run() {
  try {
    // 1. Fetch the triggering issue/task context
    console.log(`[JARVIS Mock Runtime] Fetching issue details for: ${PAPERCLIP_TASK_ID}`);
    const issueResponse = await fetch(`${PAPERCLIP_API_URL}/api/issues/${PAPERCLIP_TASK_ID}`);
    if (!issueResponse.ok) {
      throw new Error(`Failed to fetch issue details. Status: ${issueResponse.status}`);
    }
    const issue = await issueResponse.json();
    console.log(`[JARVIS Mock Runtime] Fetched issue: "${issue.title}" (Status: ${issue.status})`);

    // 2. Fetch company agents
    console.log(`[JARVIS Mock Runtime] Fetching company agents for company: ${PAPERCLIP_COMPANY_ID}`);
    const agentsResponse = await fetch(`${PAPERCLIP_API_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/agents`);
    if (!agentsResponse.ok) {
      throw new Error(`Failed to fetch company agents. Status: ${agentsResponse.status}`);
    }
    const companyAgents = await agentsResponse.json();
    console.log(`[JARVIS Mock Runtime] Fetched ${companyAgents.length} agents.`);

    // 3. Find specific agents to assign tasks to
    const codexAgent = companyAgents.find(a => a.name === "Codex Developer") || companyAgents.find(a => a.role === "engineer" && a.title.toLowerCase().includes("developer"));
    const claudeAgent = companyAgents.find(a => a.name === "Claude Reviewer") || companyAgents.find(a => a.role === "engineer" && a.title.toLowerCase().includes("reviewer"));
    const qaAgent = companyAgents.find(a => a.name === "Antigravity QA") || companyAgents.find(a => a.role === "engineer" && a.title.toLowerCase().includes("qa"));

    console.log(`- Codex Agent: ${codexAgent ? codexAgent.name + " (" + codexAgent.id + ")" : "Not found"}`);
    console.log(`- Claude Agent: ${claudeAgent ? claudeAgent.name + " (" + claudeAgent.id + ")" : "Not found"}`);
    console.log(`- QA Agent: ${qaAgent ? qaAgent.name + " (" + qaAgent.id + ")" : "Not found"}`);

    // 4. Generate deterministic report/plan
    const reportTitle = "JARVIS Strategic Advice & Alignment Report";
    const reportBody = `### 🧠 JARVIS Strategy Advisor Analysis

**Goal Description**: ${issue.title}
**Parent Task ID**: \`${issue.id}\`
**Assigned Company**: \`AI Dev Factory\`

#### Executive Summary
The system has completed verification of the master branch post-merge. All package checks, TypeScript typechecking, Vitest dry-run, and migrations are passing. We are now preparing to run a mock execution cycle for the local runtime adapters.

#### Strategic Plan & Roadmap
1. **Milestone 1**: Verify local execution logs and child process spawns under Node.js runtime.
2. **Milestone 2**: Perform visual validations of the dashboard layout to ensure agent cards do not duplicate.
3. **Milestone 3**: Decompose subsequent verification steps into specific agent directives.

#### Target Directives & Checklists
- **Codex Developer (Engineer)**:
  - Verify that the process adapter logs console stdout and stderr correctly.
  - Assert that all environment variables are populated.
- **Claude Reviewer (Reviewer)**:
  - Audit script imports to ensure no third-party package dependencies are introduced.
  - Review that code changes adhere to the "no-code/no-secret" policy.
- **Antigravity QA (QA)**:
  - Perform validation of issue comment presentation types.
  - Verify that \`suggest_tasks\` interactions render correctly on the issue details page.

#### Acceptance Criteria
- [x] Process adapter execution finishes with exit code 0.
- [x] Advisor comment is created on parent task.
- [ ] Task decomposition list is accepted and child issues are created.

#### Known Risks & Mitigations
- **Risk**: Stale database records causing run event inconsistencies.
- **Mitigation**: Run \`seed-ai-factory\` to clean run records before starting a fresh run.

---
*Report generated deterministically by JARVIS Strategy Advisor v0.1 Mock Runtime.*`;

    // 5. Post comment back to the issue
    console.log(`[JARVIS Mock Runtime] Posting strategic report as a comment...`);
    const commentPayload = {
      body: reportBody,
      presentation: {
        kind: "message",
        tone: "neutral",
        title: reportTitle,
        detailsDefaultOpen: true
      }
    };

    const commentResponse = await fetch(`${PAPERCLIP_API_URL}/api/issues/${PAPERCLIP_TASK_ID}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PAPERCLIP_RUN_ID ? { "X-Paperclip-Run-Id": PAPERCLIP_RUN_ID } : {})
      },
      body: JSON.stringify(commentPayload)
    });

    if (!commentResponse.ok) {
      console.warn(`[JARVIS Mock Runtime] Warning: Failed to post comment. Status: ${commentResponse.status}`);
    } else {
      const comment = await commentResponse.json();
      console.log(`[JARVIS Mock Runtime] Comment posted successfully: ${comment.id}`);
    }

    // 6. Propose a suggest_tasks interaction
    console.log(`[JARVIS Mock Runtime] Proposing task suggestions...`);
    
    // Generate deterministic client keys based on task ID
    const clientKey = (prefix) => `${prefix}-${createHash('sha256').update(PAPERCLIP_TASK_ID).digest('hex').slice(0, 8)}`;

    const tasksPayload = {
      kind: "suggest_tasks",
      title: "Task Breakdown for AI Dev Factory Verification",
      summary: "Decompose verification steps for Codex, Claude, and QA agents.",
      continuationPolicy: "wake_assignee",
      payload: {
        version: 1,
        defaultParentId: PAPERCLIP_TASK_ID,
        tasks: [
          {
            clientKey: clientKey("codex-task"),
            title: "[Codex] Local adapter stdout and environment validation",
            description: "Verify that the process adapter logs child process outputs and environment variables accurately.",
            priority: "medium",
            workMode: "standard",
            assigneeAgentId: codexAgent ? codexAgent.id : null,
            projectId: issue.projectId,
            goalId: issue.goalId
          },
          {
            clientKey: clientKey("claude-task"),
            title: "[Claude] Code audit for dependency containment",
            description: "Review imports in local scripts to confirm they use only built-in Node.js modules without external dependencies.",
            priority: "medium",
            workMode: "standard",
            assigneeAgentId: claudeAgent ? claudeAgent.id : null,
            projectId: issue.projectId,
            goalId: issue.goalId
          },
          {
            clientKey: clientKey("qa-task"),
            title: "[QA] Interaction and layout verification",
            description: "Verify that interaction blocks render correctly in the dashboard UI and do not create duplicate card loops.",
            priority: "medium",
            workMode: "standard",
            assigneeAgentId: qaAgent ? qaAgent.id : null,
            projectId: issue.projectId,
            goalId: issue.goalId
          }
        ]
      }
    };

    const interactionResponse = await fetch(`${PAPERCLIP_API_URL}/api/issues/${PAPERCLIP_TASK_ID}/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PAPERCLIP_RUN_ID ? { "X-Paperclip-Run-Id": PAPERCLIP_RUN_ID } : {})
      },
      body: JSON.stringify(tasksPayload)
    });

    if (!interactionResponse.ok) {
      const errText = await interactionResponse.text();
      console.warn(`[JARVIS Mock Runtime] Warning: Failed to create suggest_tasks interaction. Status: ${interactionResponse.status}, Error: ${errText}`);
    } else {
      const interaction = await interactionResponse.json();
      console.log(`[JARVIS Mock Runtime] Suggest_tasks interaction proposed successfully: ${interaction.id}`);
    }

    console.log("[JARVIS Mock Runtime] Finished execution successfully.");
  } catch (error) {
    console.error("[JARVIS Mock Runtime] Error during execution:", error);
    process.exit(1);
  }
}

run();
