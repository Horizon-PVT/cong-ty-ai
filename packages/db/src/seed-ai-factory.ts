/**
 * WARNING: LOCAL/DEVELOPMENT BOOTSTRAP ONLY.
 *
 * - DO NOT RUN IN PRODUCTION.
 * - Rerunning this script will delete and recreate the "AI Dev Factory" company and all its related goals, projects, agents, and tasks.
 * - Do not run if the local database already contains important custom data you wish to preserve.
 */

import { eq } from "drizzle-orm";
import { createDb } from "./client.js";
import { companies, agents, goals, projects, issues } from "./schema/index.js";

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

  await db.delete(issues).where(eq(issues.companyId, companyId));
  await db.delete(projects).where(eq(projects.companyId, companyId));
  await db.delete(goals).where(eq(goals.companyId, companyId));
  await db.delete(agents).where(eq(agents.companyId, companyId));
  await db.delete(companies).where(eq(companies.id, companyId));
}

// 2. Insert AI Dev Factory Company
const [company] = await db
  .insert(companies)
  .values({
    name: "AI Dev Factory",
    description: "Xưởng phát triển AI OS nội bộ",
    status: "active",
    budgetMonthlyCents: 10000000, // 100,000 USD / Month budget
  })
  .returning();

console.log(`Created company: ${company.name} with ID ${company.id}`);

// 3. Insert Agents
// 3.1. JARVIS Strategy Advisor (CEO role)
const [jarvis] = await db
  .insert(agents)
  .values({
    companyId: company.id,
    name: "JARVIS Strategy Advisor",
    role: "ceo",
    title: "Strategy Advisor",
    status: "idle",
    adapterType: "process",
    adapterConfig: { command: "echo", args: ["JARVIS online"] },
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
    status: "idle",
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: { command: "echo", args: ["Codex online"] },
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
    status: "idle",
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: { command: "echo", args: ["Claude online"] },
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
    status: "idle",
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: { command: "echo", args: ["Antigravity QA online"] },
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
    status: "idle",
    reportsTo: jarvis.id,
    adapterType: "process",
    adapterConfig: { command: "echo", args: ["Report Bot online"] },
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
