/**
 * LOCAL DEV BOOTSTRAP ONLY.
 * This script resets AI Dev Factory runtime history.
 * Do not run against production or a database with important data.
 */

import { eq, inArray } from "drizzle-orm";
import { createDb } from "./client.js";
import {
  companies,
  agents,
  goals,
  projects,
  issues,
  activityLog,
  heartbeatRuns,
  heartbeatRunEvents,
  agentWakeupRequests,
  agentTaskSessions,
  agentApiKeys,
  agentRuntimeState,
  issueComments,
  issueExecutionDecisions,
  issueThreadInteractions,
} from "./schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const db = createDb(url);

console.log("Checking and seeding AI Dev Factory...");

// 1. Idempotency: cleanup existing AI Dev Factory company and related data
const existingCompany = await db
  .select()
  .from(companies)
  .where(eq(companies.name, "AI Dev Factory"));

if (existingCompany.length > 0) {
  const companyId = existingCompany[0].id;
  console.log(`Cleaning up existing AI Dev Factory company with ID ${companyId}...`);

  // 1.1. Get agent IDs to clean up agent-related tables
  const companyAgents = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.companyId, companyId));
  const agentIds = companyAgents.map((a) => a.id);

  // 1.2. Delete activity logs and run events first (they are leaf nodes in constraints)
  await db.delete(activityLog).where(eq(activityLog.companyId, companyId));
  await db.delete(heartbeatRunEvents).where(eq(heartbeatRunEvents.companyId, companyId));

  // 1.3. Delete comments, decisions, interactions (which reference runs or issues)
  await db.delete(issueComments).where(eq(issueComments.companyId, companyId));
  await db.delete(issueExecutionDecisions).where(eq(issueExecutionDecisions.companyId, companyId));
  await db.delete(issueThreadInteractions).where(eq(issueThreadInteractions.companyId, companyId));

  // 1.4. Delete heartbeat runs (which reference wakeup requests)
  await db.delete(heartbeatRuns).where(eq(heartbeatRuns.companyId, companyId));

  // 1.5. Delete agent-specific sub-records (which reference agents)
  if (agentIds.length > 0) {
    await db.delete(agentApiKeys).where(inArray(agentApiKeys.agentId, agentIds));
    await db.delete(agentRuntimeState).where(inArray(agentRuntimeState.agentId, agentIds));
    await db.delete(agentTaskSessions).where(inArray(agentTaskSessions.agentId, agentIds));
    await db.delete(agentWakeupRequests).where(inArray(agentWakeupRequests.agentId, agentIds));
  }

  // 1.6. Delete issues, projects, goals
  await db.delete(issues).where(eq(issues.companyId, companyId));
  await db.delete(projects).where(eq(projects.companyId, companyId));
  await db.delete(goals).where(eq(goals.companyId, companyId));

  // 1.7. Delete agents
  await db.delete(agents).where(eq(agents.companyId, companyId));
}

// 2. Insert or update AI Dev Factory Company
let company;
if (existingCompany.length > 0) {
  const companyId = existingCompany[0].id;
  const [updatedCompany] = await db
    .update(companies)
    .set({
      description: "Xưởng phát triển AI OS nội bộ",
      status: "active",
      budgetMonthlyCents: 10000000,
    })
    .where(eq(companies.id, companyId))
    .returning();
  company = updatedCompany;
  console.log(`Updated existing company: ${company.name} with ID ${company.id}`);
} else {
  const [insertedCompany] = await db
    .insert(companies)
    .values({
      name: "AI Dev Factory",
      description: "Xưởng phát triển AI OS nội bộ",
      status: "active",
      budgetMonthlyCents: 10000000, // 100,000 USD / Month budget
    })
    .returning();
  company = insertedCompany;
  console.log(`Created company: ${company.name} with ID ${company.id}`);
}

// 3. Insert Agents
// 3.1. JARVIS Strategy Advisor (CEO role)
const [jarvis] = await db
  .insert(agents)
  .values({
    companyId: company.id,
    name: "JARVIS Strategy Advisor",
    role: "ceo",
    title: "Strategy Advisor",
    status: "paused",
    pauseReason: "manual",
    pausedAt: new Date(),
    adapterType: "process",
    adapterConfig: {
      command: "node",
      args: ["-e", "console.log('JARVIS Strategy Advisor is paused. Connect a real runtime adapter in agent settings.')"],
    },
    budgetMonthlyCents: 2000000,
  })
  .returning();

// 3.2. Codex Developer (Engineer role)
const [codex] = await db
  .insert(agents)
  .values({
    companyId: company.id,
    name: "Codex Developer",
    role: "engineer",
    title: "Lead Developer",
    status: "paused",
    pauseReason: "manual",
    pausedAt: new Date(),
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: {
      command: "node",
      args: ["-e", "console.log('Codex Developer is paused. Connect a real runtime adapter in agent settings.')"],
    },
    budgetMonthlyCents: 1500000,
  })
  .returning();

// 3.3. Claude Reviewer (Engineer role)
const [claude] = await db
  .insert(agents)
  .values({
    companyId: company.id,
    name: "Claude Reviewer",
    role: "engineer",
    title: "Code Reviewer",
    status: "paused",
    pauseReason: "manual",
    pausedAt: new Date(),
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: {
      command: "node",
      args: ["-e", "console.log('Claude Reviewer is paused. Connect a real runtime adapter in agent settings.')"],
    },
    budgetMonthlyCents: 1500000,
  })
  .returning();

// 3.4. Antigravity QA (Engineer role)
const [antigravity] = await db
  .insert(agents)
  .values({
    companyId: company.id,
    name: "Antigravity QA",
    role: "engineer",
    title: "QA Engineer",
    status: "paused",
    pauseReason: "manual",
    pausedAt: new Date(),
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: {
      command: "node",
      args: ["-e", "console.log('Antigravity QA is paused. Connect a real runtime adapter in agent settings.')"],
    },
    budgetMonthlyCents: 1000000,
  })
  .returning();

// 3.5. Report Bot (Engineer role)
const [reportBot] = await db
  .insert(agents)
  .values({
    companyId: company.id,
    name: "Report Bot",
    role: "engineer",
    title: "Reporter Bot",
    status: "paused",
    pauseReason: "manual",
    pausedAt: new Date(),
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: {
      command: "node",
      args: ["-e", "console.log('Report Bot is paused. Connect a real runtime adapter in agent settings.')"],
    },
    budgetMonthlyCents: 500000,
  })
  .returning();

console.log("Seeded 5 agents successfully.");

// 4. Insert Goal
const [goal] = await db
  .insert(goals)
  .values({
    companyId: company.id,
    title: "Build and operate Cong Ty AI OS safely",
    description: "Xây dựng và vận hành hệ điều hành Công Ty AI an toàn, tin cậy và hiệu quả.",
    level: "company",
    status: "active",
    ownerAgentId: jarvis.id,
  })
  .returning();

console.log(`Created Goal: ${goal.title}`);

// 5. Insert Project
const [project] = await db
  .insert(projects)
  .values({
    companyId: company.id,
    goalId: goal.id,
    name: "Cong Ty AI OS Core Setup",
    description: "Thiết lập cốt lõi cho hệ điều hành Công Ty AI.",
    status: "in_progress",
    leadAgentId: jarvis.id,
  })
  .returning();

console.log(`Created Project: ${project.name}`);

// 6. Insert Task (Issue)
const [task] = await db
  .insert(issues)
  .values({
    companyId: company.id,
    projectId: project.id,
    goalId: goal.id,
    title: "Verify latest Paperclip update and AI Dev Factory setup",
    description: "Kiểm tra bản cập nhật Paperclip mới nhất và xác minh thiết lập Xưởng AI Dev Factory hoạt động đúng.",
    status: "todo",
    priority: "high",
    assigneeAgentId: codex.id,
    createdByAgentId: jarvis.id,
  })
  .returning();

console.log(`Created Task: ${task.title}`);

console.log("Seeding AI Dev Factory complete!");
process.exit(0);
