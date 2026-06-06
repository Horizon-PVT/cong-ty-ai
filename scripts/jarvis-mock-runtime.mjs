#!/usr/bin/env node

import { createHash } from 'node:crypto';

// 1. Helper functions
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[JARVIS Mock Runtime] Error: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url} with status ${res.status}`);
  }
  return res.json();
}

async function postJson(url, payload, extraHeaders = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST failed for ${url} with status ${res.status}: ${text}`);
  }
  return res.json();
}

function formatMaybe(value) {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }
  return value;
}

function findAgentByNameOrRole(agents, name, roleHint) {
  const foundByName = agents.find(a => a.name === name);
  if (foundByName) return foundByName;
  const foundByRole = agents.find(a => a.role === roleHint || (a.title && a.title.toLowerCase().includes(roleHint)));
  return foundByRole || null;
}

function buildAdvisorReport(issue, agents, codexAgent, claudeAgent, qaAgent) {
  const codexName = codexAgent ? `${codexAgent.name} (${codexAgent.title})` : "Not provided";
  const claudeName = claudeAgent ? `${claudeAgent.name} (${claudeAgent.title})` : "Not provided";
  const qaName = qaAgent ? `${qaAgent.name} (${qaAgent.title})` : "Not provided";

  return `### 🧠 JARVIS Strategy Advisor Analysis

#### Executive Summary
We have reviewed the request for the task: "${issue.title}". Based on the current company goal, project configuration, and available agent roles, we have generated a strategic alignment report and proposed specific agent subtasks under the JARVIS Executive Autonomy Policy.

#### Owner Goal Interpretation
- **Goal Statement**: The goal is to address: "${issue.title}".
- **Goal Context / Details**: ${formatMaybe(issue.description)}

#### Current Context
- **Task ID**: \`${issue.id}\`
- **Current Status**: \`${issue.status}\`
- **Priority Level**: \`${issue.priority}\`
- **Project ID**: \`${issue.projectId || "Not provided"}\`
- **Goal ID**: \`${issue.goalId || "Not provided"}\`

#### 🛡️ JARVIS Executive Autonomy Policy
- **JARVIS Authority Level**: Level 2 (Executive Autonomy / Internal Execution)
- **Internal Autonomy Allowed**: Planning, task decomposition, and local branch execution orchestration for Codex Developer, Claude Reviewer, and Antigravity QA.
- **What JARVIS May Decide Automatically**:
  - Directing, unpausing, and waking internal agents for local or branch work.
  - Creating temporary coding branches and running local verification scripts.
  - Generating issue thread comment summaries and posting report analyses.
- **What JARVIS Must Escalate to Owner (Critical Approval Gates)**:
  - Merging code changes to the master branch.
  - Deploying to production environments.
  - Destructive database schema changes or data deletion.
  - Adding/modifying environment secrets or API keys.
  - External messaging (emails/Slack/Discord comments) to customers or leads.
  - Financial spend or ads commitments exceeding configured budgets.
- **Budget / Spend Policy (Placeholder for future Phase, not an active billing/ads control system yet)**:
  - Daily limit: $50 (Placeholder)
  - Monthly limit: $1,000 (Placeholder)
  - Per-task limit: $10 (Placeholder)
  - Hard stop enforcement: Policy placeholder, enforcement not active yet.
- **Next Autonomous Action**: Resuming Codex Developer to begin local work on the child task.
- **Escalation Rules**: If any internal process fails three consecutive times or encounters budget exhaustion, JARVIS will immediately pause execution and alert the owner.

#### Recommended Plan
1. **Phase 1: Implementation**: Codex Developer performs the core coding changes and sets up the execution loop environment.
2. **Phase 2: Code Review**: Claude Reviewer conducts safety, dependency containment, and code quality validation.
3. **Phase 3: QA Verification**: Antigravity QA performs manual and automated interface/run-level checks on the UI.

#### Agent Task Breakdown
The strategic plan allocates directives across the following roles:
- **Codex Developer**: ${codexName}
- **Claude Reviewer**: ${claudeName}
- **Antigravity QA**: ${qaName}

#### Acceptance Criteria
- [ ] Codex Developer completes the implementation task.
- [ ] Claude Reviewer approves the code review.
- [ ] Antigravity QA verifies the final build and logs.

#### Risks / Blockers
- **Complexity Risk**: Tight coordination required between Codex and Claude tasks.
- **Verification Risk**: Local process execution requires correct environment variables (\`PAPERCLIP_TASK_ID\`, etc.) without keys.

#### Owner Approval Needed
- **Action**: Please review the pending task suggestions in the dashboard and approve them to create the child tasks.

#### Next Recommended Action
- Click **"Accept Tasks"** on the proposed interaction below to assign and queue tasks for Codex Developer, Claude Reviewer, and Antigravity QA.

---
*Report generated dynamically by JARVIS Strategy Advisor v0.3 (Autonomy Policy Enabled).*`;
}

function buildSuggestedTasks(issue, codexAgent, claudeAgent, qaAgent) {
  const clientKey = (prefix) => `${prefix}-${createHash('sha256').update(issue.id).digest('hex').slice(0, 8)}`;

  return {
    kind: "suggest_tasks",
    title: `Task Breakdown for: ${issue.title}`,
    summary: `Decompose strategic steps for the implementation, review, and verification of "${issue.title}".`,
    continuationPolicy: "wake_assignee",
    payload: {
      version: 1,
      defaultParentId: issue.id,
      tasks: [
        {
          clientKey: clientKey("codex-task"),
          title: `[Codex] Implement solution for: ${issue.title}`,
          description: `Develop and verify the code changes requested in "${issue.title}".\n\nAcceptance Criteria:\n- Code changes address the core requirements\n- No syntax or type errors in the worktree\n- Passes local unit tests\n\n---\n**Autonomous Execution Metadata:**\n- **Execution Mode**: JARVIS internal autonomy\n- **Autonomy Level**: Level 2 (Internal Execution Allowed)\n- **Status**: Pending human confirmation (downstream agents will not auto-run until accepted)\n- **Safety Boundary**: Merge, deploy, external comms, and spend-over-budget remain strictly blocked and require owner approval.`,
          priority: "medium",
          workMode: "standard",
          assigneeAgentId: codexAgent ? codexAgent.id : null,
          projectId: issue.projectId,
          goalId: issue.goalId
        },
        {
          clientKey: clientKey("claude-task"),
          title: `[Claude Review] Code audit and review for: ${issue.title}`,
          description: `Audit the code changes implemented for "${issue.title}".\n\nSafety/Code Quality Checklist:\n- No hardcoded secrets or sensitive credentials\n- Code cleanliness and correct package dependencies\n- Error handling is robust and standard patterns are followed\n\n---\n**Autonomous Execution Metadata:**\n- **Execution Mode**: JARVIS internal autonomy\n- **Autonomy Level**: Level 2 (Internal Execution Allowed)\n- **Status**: Pending human confirmation (downstream agents will not auto-run until accepted)\n- **Safety Boundary**: Merge, deploy, external comms, and spend-over-budget remain strictly blocked and require owner approval.`,
          priority: "medium",
          workMode: "standard",
          assigneeAgentId: claudeAgent ? claudeAgent.id : null,
          projectId: issue.projectId,
          goalId: issue.goalId
        },
        {
          clientKey: clientKey("qa-task"),
          title: `[QA] Integration and visual verification for: ${issue.title}`,
          description: `Verify functionality and interface rendering for "${issue.title}".\n\nVerification Checklist:\n- Verification check passes on local dev server\n- Interactive components work correctly in dashboard\n- Logs and run indicators update correctly without looping\n\n---\n**Autonomous Execution Metadata:**\n- **Execution Mode**: JARVIS internal autonomy\n- **Autonomy Level**: Level 2 (Internal Execution Allowed)\n- **Status**: Pending human confirmation (downstream agents will not auto-run until accepted)\n- **Safety Boundary**: Merge, deploy, external comms, and spend-over-budget remain strictly blocked and require owner approval.`,
          priority: "medium",
          workMode: "standard",
          assigneeAgentId: qaAgent ? qaAgent.id : null,
          projectId: issue.projectId,
          goalId: issue.goalId
        }
      ]
    }
  };
}

// 2. Main execution function
async function run() {
  console.log("[JARVIS Mock Runtime] Starting execution...");

  // Validate required env variables
  const apiUrl = requireEnv("PAPERCLIP_API_URL");
  const agentId = requireEnv("PAPERCLIP_AGENT_ID");
  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const taskId = requireEnv("PAPERCLIP_TASK_ID");
  const runId = process.env.PAPERCLIP_RUN_ID;

  console.log("[JARVIS Mock Runtime] Required environment variables validated.");

  try {
    // Fetch issue details
    console.log(`[JARVIS Mock Runtime] Fetching issue details for: ${taskId}`);
    const issue = await fetchJson(`${apiUrl}/api/issues/${taskId}`);
    console.log(`[JARVIS Mock Runtime] Fetched issue: "${issue.title}" (Status: ${issue.status})`);

    // Fetch company agents
    console.log(`[JARVIS Mock Runtime] Fetching company agents for company: ${companyId}`);
    const agents = await fetchJson(`${apiUrl}/api/companies/${companyId}/agents`);
    console.log(`[JARVIS Mock Runtime] Fetched ${agents.length} company agents.`);

    // Find specific agents
    const codexAgent = findAgentByNameOrRole(agents, "Codex Developer", "developer") || findAgentByNameOrRole(agents, "Codex Developer", "engineer");
    const claudeAgent = findAgentByNameOrRole(agents, "Claude Reviewer", "reviewer") || findAgentByNameOrRole(agents, "Claude Reviewer", "engineer");
    const qaAgent = findAgentByNameOrRole(agents, "Antigravity QA", "qa") || findAgentByNameOrRole(agents, "Antigravity QA", "engineer");

    console.log(`- Codex Agent: ${codexAgent ? codexAgent.name : "Not found"}`);
    console.log(`- Claude Agent: ${claudeAgent ? claudeAgent.name : "Not found"}`);
    console.log(`- QA Agent: ${qaAgent ? qaAgent.name : "Not found"}`);

    // Build report and post comment
    console.log("[JARVIS Mock Runtime] Posting strategic advisor report comment...");
    const reportBody = buildAdvisorReport(issue, agents, codexAgent, claudeAgent, qaAgent);
    const commentPayload = {
      body: reportBody,
      presentation: {
        kind: "message",
        tone: "neutral",
        title: "JARVIS Strategic Advice & Alignment Report",
        detailsDefaultOpen: true
      }
    };

    try {
      const comment = await postJson(
        `${apiUrl}/api/issues/${taskId}/comments`,
        commentPayload,
        runId ? { "X-Paperclip-Run-Id": runId } : {}
      );
      console.log(`[JARVIS Mock Runtime] Report comment posted successfully: ${comment.id}`);
    } catch (commentErr) {
      console.warn(`[JARVIS Mock Runtime] Warning: Failed to post comment. Error: ${commentErr.message}`);
    }

    // Build and post task suggestions interaction
    console.log("[JARVIS Mock Runtime] Proposing task suggestions interaction...");
    const tasksPayload = buildSuggestedTasks(issue, codexAgent, claudeAgent, qaAgent);

    try {
      const interaction = await postJson(
        `${apiUrl}/api/issues/${taskId}/interactions`,
        tasksPayload,
        runId ? { "X-Paperclip-Run-Id": runId } : {}
      );
      console.log(`[JARVIS Mock Runtime] Suggest_tasks interaction proposed successfully: ${interaction.id}`);
    } catch (interactionErr) {
      console.warn(`[JARVIS Mock Runtime] Warning: Failed to create suggest_tasks interaction. Error: ${interactionErr.message}`);
    }

    console.log("[JARVIS Mock Runtime] Runtime execution completed successfully.");
  } catch (error) {
    console.error("[JARVIS Mock Runtime] Error during execution:", error);
    process.exit(1);
  }
}

run();
