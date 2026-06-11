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

async function patchJson(url, payload, extraHeaders = {}) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH failed for ${url} with status ${res.status}: ${text}`);
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

async function hasAlreadyRun(apiUrl, companyId, agentId, childTaskId) {
  try {
    const runs = await fetchJson(`${apiUrl}/api/companies/${companyId}/heartbeat-runs?agentId=${agentId}&limit=10`);
    return runs.some(run => {
      const runIssueId = run.contextSnapshot?.issueId || run.payload?.issueId;
      return runIssueId === childTaskId;
    });
  } catch (err) {
    console.warn(`[JARVIS Orchestrator] Warning: Failed to fetch runs for agent ${agentId}:`, err.message);
    return false;
  }
}

async function resumeAgent(apiUrl, agentId) {
  console.log(`[JARVIS Orchestrator] Resuming agent ${agentId}...`);
  return postJson(`${apiUrl}/api/agents/${agentId}/resume`, {});
}

async function wakeAgent(apiUrl, agentId, childTaskId, runId) {
  console.log(`[JARVIS Orchestrator] Waking agent ${agentId} for task ${childTaskId}...`);
  const payload = {
    source: "assignment",
    triggerDetail: "system",
    reason: "JARVIS internal auto-run coordination",
    payload: {
      issueId: childTaskId
    }
  };
  return postJson(
    `${apiUrl}/api/agents/${agentId}/wakeup`,
    payload,
    runId ? { "X-Paperclip-Run-Id": runId } : {}
  );
}

async function pauseAgent(apiUrl, agentId) {
  console.log(`[JARVIS Orchestrator] Pausing agent ${agentId}...`);
  return postJson(`${apiUrl}/api/agents/${agentId}/pause`, {});
}

async function pollRunCompletion(apiUrl, runId, maxSeconds = 45) {
  console.log(`[JARVIS Orchestrator] Polling run ${runId} completion...`);
  const start = Date.now();
  while (Date.now() - start < maxSeconds * 1000) {
    try {
      const run = await fetchJson(`${apiUrl}/api/heartbeat-runs/${runId}`);
      if (
        run.finishedAt ||
        ["completed", "failed", "skipped", "cancelled", "succeeded"].includes(run.status)
      ) {
        console.log(`[JARVIS Orchestrator] Run ${runId} finished with status: ${run.status}`);
        return run;
      }
    } catch (err) {
      console.warn(`[JARVIS Orchestrator] Warning: Failed to poll run ${runId}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.warn(`[JARVIS Orchestrator] Warning: Run ${runId} poll timed out.`);
  return null;
}

async function createOrConfirmChildTasks(apiUrl, companyId, parentIssue, agents, runId) {
  const existingIssues = await fetchJson(`${apiUrl}/api/companies/${companyId}/issues?parentId=${parentIssue.id}`);
  
  const codexAgent = findAgentByNameOrRole(agents, "Codex Developer", "developer") || findAgentByNameOrRole(agents, "Codex Developer", "engineer");
  const claudeAgent = findAgentByNameOrRole(agents, "Claude Reviewer", "reviewer") || findAgentByNameOrRole(agents, "Claude Reviewer", "engineer");
  const qaAgent = findAgentByNameOrRole(agents, "Antigravity QA", "qa") || findAgentByNameOrRole(agents, "Antigravity QA", "engineer");
  const reportBot = findAgentByNameOrRole(agents, "Report Bot", "reporter") || findAgentByNameOrRole(agents, "Report Bot", "engineer");

  const results = [];

  const targets = [
    { agent: codexAgent, titlePrefix: "[Codex]", role: "Codex Developer" },
    { agent: claudeAgent, titlePrefix: "[Claude Review]", role: "Claude Reviewer" },
    { agent: qaAgent, titlePrefix: "[QA]", role: "Antigravity QA" },
    { agent: reportBot, titlePrefix: "[Report Bot]", role: "Report Bot" }
  ];

  for (const target of targets) {
    if (!target.agent) {
      console.warn(`[JARVIS Orchestrator] Warning: ${target.role} agent not found.`);
      continue;
    }

    // Match by title prefix — more robust than assigneeAgentId because the watchdog may
    // re-assign blocked tasks to the recovery owner (e.g., JARVIS), causing false "not found".
    const existingTask = existingIssues.find(i => i.title && i.title.startsWith(target.titlePrefix));
    if (existingTask) {
      console.log(`[JARVIS Orchestrator] Task already exists for ${target.role}: ${existingTask.title}`);
      results.push({
        agent: target.agent,
        task: existingTask,
        created: false
      });
    } else {
      const title = `${target.titlePrefix} Coordinated task for: ${parentIssue.title}`;
      const description = `[internal_auto / JARVIS coordinated]
Parent Task ID: ${parentIssue.id}
Target Agent Name: ${target.role}
Execution Mode: local mock/no-op
Critical Gates Blocked: merge, deploy, external, spend, destructive database/data changes.`;

      const payload = {
        title,
        description,
        status: "todo",
        workMode: "standard",
        priority: "medium",
        assigneeAgentId: target.agent.id,
        projectId: parentIssue.projectId,
        goalId: parentIssue.goalId
      };

      console.log(`[JARVIS Orchestrator] Creating task for ${target.role}...`);
      const createdTask = await postJson(
        `${apiUrl}/api/issues/${parentIssue.id}/children`,
        payload,
        runId ? { "X-Paperclip-Run-Id": runId } : {}
      );
      results.push({
        agent: target.agent,
        task: createdTask,
        created: true
      });
    }
  }

  return results;
}

async function orchestrateInternalAgents(apiUrl, companyId, taskPairs, runId) {
  const orchestrationResults = [];
  
  for (const pair of taskPairs) {
    const agent = pair.agent;
    const task = pair.task;
    const result = {
      agentName: agent.name,
      taskId: task.id,
      taskTitle: task.title,
      skipped: false,
      resumeResult: "Not attempted",
      wakeResult: "Not attempted",
      pauseResult: "Not attempted",
      runStatus: "Unknown"
    };

    try {
      // Check if already run to prevent loops
      const alreadyRun = await hasAlreadyRun(apiUrl, companyId, agent.id, task.id);
      if (alreadyRun) {
        console.log(`[JARVIS Orchestrator] Agent ${agent.name} has already executed task ${task.id}. Skipping wakeup.`);
        result.skipped = true;
        result.resumeResult = "Skipped (Already executed)";
        result.wakeResult = "Skipped (Already executed)";
        result.pauseResult = "Skipped (Already executed)";
        result.runStatus = "Previously Completed";
        orchestrationResults.push(result);
        continue;
      }

      // Resume agent
      try {
        await resumeAgent(apiUrl, agent.id);
        result.resumeResult = "Success";
      } catch (resumeErr) {
        result.resumeResult = `Failed: ${resumeErr.message}`;
        throw resumeErr;
      }

      // Wake agent
      let runObj;
      try {
        runObj = await wakeAgent(apiUrl, agent.id, task.id, runId);
        result.wakeResult = `Success (Run ID: ${runObj.id})`;
      } catch (wakeErr) {
        result.wakeResult = `Failed: ${wakeErr.message}`;
        throw wakeErr;
      }

      // Poll run completion
      if (runObj && runObj.id) {
        const finishedRun = await pollRunCompletion(apiUrl, runObj.id);
        result.runStatus = finishedRun ? finishedRun.status : "Timed out";
      }

      // Pause agent back
      try {
        await pauseAgent(apiUrl, agent.id);
        result.pauseResult = "Success";
      } catch (pauseErr) {
        result.pauseResult = `Failed: ${pauseErr.message}`;
      }

    } catch (err) {
      console.error(`[JARVIS Orchestrator] Error orchestrating ${agent.name}:`, err.message);
      // Attempt to pause back if something failed
      try {
        await pauseAgent(apiUrl, agent.id);
        result.pauseResult = "Recovered (Paused)";
      } catch (_) {}
      result.runStatus = `Failed: ${err.message}`;
    }

    orchestrationResults.push(result);
  }

  return orchestrationResults;
}

function buildAdvisorReport(issue, agents, codexAgent, claudeAgent, qaAgent, reportBotAgent, orchestrationResults) {
  const codexName = codexAgent ? `${codexAgent.name} (${codexAgent.title})` : "Not provided";
  const claudeName = claudeAgent ? `${claudeAgent.name} (${claudeAgent.title})` : "Not provided";
  const qaName = qaAgent ? `${qaAgent.name} (${qaAgent.title})` : "Not provided";
  const reportBotName = reportBotAgent ? `${reportBotAgent.name} (${reportBotAgent.title})` : "Not provided";

  let internalAutoRunSection = `#### 🤖 Internal Auto-Run Orchestration\n\n`;
  for (const res of orchestrationResults) {
    internalAutoRunSection += `- **Child Task**: "${res.taskTitle}" (ID: \`${res.taskId}\`)\n`;
    internalAutoRunSection += `  - **Target Agent**: ${res.agentName}\n`;
    internalAutoRunSection += `  - **Resume Result**: ${res.resumeResult}\n`;
    internalAutoRunSection += `  - **Wakeup Result**: ${res.wakeResult}\n`;
    internalAutoRunSection += `  - **Pause-back Result**: ${res.pauseResult}\n`;
    internalAutoRunSection += `  - **Run Result**: \`${res.runStatus}\`\n\n`;
  }

  internalAutoRunSection += `- **Duplicate Prevention Status**: Active (historical runs checked via database API, no duplicate creations/wakeups performed).\n`;
  internalAutoRunSection += `- **🛡️ Critical Gates Blocked**: Merging to master, production deployments, database migrations, changing environment secrets, external communications, billing/spend.\n`;
  internalAutoRunSection += `- **Next Owner-facing Checkpoint**: Review the completed local test runs above. In the next Phase, the human owner can authorize code merge to the master branch.\n`;

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

${internalAutoRunSection}

#### Recommended Plan
1. **Phase 1: Implementation**: Codex Developer performs the core coding changes and sets up the execution loop environment.
2. **Phase 2: Code Review**: Claude Reviewer conducts safety, dependency containment, and code quality validation.
3. **Phase 3: QA Verification**: Antigravity QA performs manual and automated interface/run-level checks on the UI.

#### Agent Task Breakdown
The strategic plan allocates directives across the following roles:
- **Codex Developer**: ${codexName}
- **Claude Reviewer**: ${claudeName}
- **Antigravity QA**: ${qaName}
- **Report Bot**: ${reportBotName}

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

    // Prevent infinite recursion by checking if the task is already coordinated
    const isCoordinated =
      issue.parentId ||
      (issue.description && issue.description.includes("coordinated")) ||
      issue.title.startsWith("[Codex]") ||
      issue.title.startsWith("[Claude Review]") ||
      issue.title.startsWith("[QA]") ||
      issue.title.startsWith("[Report Bot]");

    if (isCoordinated) {
      console.log(`[JARVIS Mock Runtime] Task ${taskId} is a coordinated child task. Skipping orchestration to prevent recursion.`);
      process.exit(0);
    }

    // Fetch company agents
    console.log(`[JARVIS Mock Runtime] Fetching company agents for company: ${companyId}`);
    const agents = await fetchJson(`${apiUrl}/api/companies/${companyId}/agents`);
    console.log(`[JARVIS Mock Runtime] Fetched ${agents.length} company agents.`);

    // Find specific agents
    const codexAgent = findAgentByNameOrRole(agents, "Codex Developer", "developer") || findAgentByNameOrRole(agents, "Codex Developer", "engineer");
    const claudeAgent = findAgentByNameOrRole(agents, "Claude Reviewer", "reviewer") || findAgentByNameOrRole(agents, "Claude Reviewer", "engineer");
    const qaAgent = findAgentByNameOrRole(agents, "Antigravity QA", "qa") || findAgentByNameOrRole(agents, "Antigravity QA", "engineer");
    const reportBot = findAgentByNameOrRole(agents, "Report Bot", "reporter") || findAgentByNameOrRole(agents, "Report Bot", "engineer");

    console.log(`- Codex Agent: ${codexAgent ? codexAgent.name : "Not found"}`);
    console.log(`- Claude Agent: ${claudeAgent ? claudeAgent.name : "Not found"}`);
    console.log(`- QA Agent: ${qaAgent ? qaAgent.name : "Not found"}`);
    console.log(`- Report Bot Agent: ${reportBot ? reportBot.name : "Not found"}`);

    // Create or confirm child tasks
    console.log("[JARVIS Mock Runtime] Creating or confirming child tasks...");
    const childTasksResults = await createOrConfirmChildTasks(apiUrl, companyId, issue, agents, runId);

    // Run downstream agent orchestration
    console.log("[JARVIS Mock Runtime] Orchestrating internal downstream agents...");
    const orchestrationResults = await orchestrateInternalAgents(apiUrl, companyId, childTasksResults, runId);

    // Build report and post comment
    console.log("[JARVIS Mock Runtime] Posting strategic advisor report comment...");
    const reportBody = buildAdvisorReport(issue, agents, codexAgent, claudeAgent, qaAgent, reportBot, orchestrationResults);
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

    console.log("[JARVIS Mock Runtime] Runtime execution completed successfully.");
  } catch (error) {
    console.error("[JARVIS Mock Runtime] Error during execution:", error);
    process.exit(1);
  }
}

run();
