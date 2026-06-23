/**
 * Phase 0.3H Post-Merge Verification Script
 */
import postgres from "postgres";

const API = "http://127.0.0.1:3100";
const DB_URL = "postgresql://paperclip@127.0.0.1:54329/paperclip";
const COMPANY_NAME = "AI Dev Factory";

async function main() {
  const sql = postgres(DB_URL);
  try {
    console.log("Starting Phase 0.3H verification...");

    // 1. Check health
    const hRes = await fetch(`${API}/api/health`);
    const h = await hRes.json();
    console.log(`Health check: status=${h.status}, version=${h.version}`);
    if (h.status !== "ok") throw new Error("Health status not ok");

    // 2. Find AI Dev Factory
    const cos = await sql`SELECT id FROM companies WHERE name = ${COMPANY_NAME}`;
    if (cos.length !== 1) throw new Error("AI Dev Factory not found in DB");
    const cid = cos[0].id;
    console.log(`AI Dev Factory ID: ${cid}`);

    // 3. Find agents
    const agents = await sql`SELECT id, name FROM agents WHERE company_id = ${cid}`;
    console.log(`Found ${agents.length} agents.`);
    if (agents.length !== 5) throw new Error(`Expected 5 agents, found ${agents.length}`);

    // 4. Force-pause all agents to clear slate
    for (const a of agents) {
      await fetch(`${API}/api/agents/${a.id}/pause`, { method: "POST" });
    }
    console.log("All agents paused.");

    // 5. Create fresh parent issue
    const projs = await sql`SELECT id FROM projects WHERE company_id = ${cid} LIMIT 1`;
    const goals = await sql`SELECT id FROM goals WHERE company_id = ${cid} LIMIT 1`;
    const jarvis = agents.find(a => a.name === "JARVIS Strategy Advisor");

    const ts = new Date().toISOString();
    const title = `[0.3H-Verify] Action-Aware Planning Packets Test — ${ts}`;
    const [ins] = await sql`
      INSERT INTO issues (id, company_id, project_id, goal_id, title, description, status, priority, created_by_agent_id)
      VALUES (gen_random_uuid(), ${cid}, ${projs[0]?.id||null}, ${goals[0]?.id||null},
        ${title}, 'Phase 0.3H automated verification.', 'todo', 'high', ${jarvis.id})
      RETURNING id
    `;
    const pid = ins.id;
    console.log(`Parent issue created: ${pid}`);

    // Assign to JARVIS
    await fetch(`${API}/api/issues/${pid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeAgentId: jarvis.id })
    });

    // Resume & wake JARVIS
    await fetch(`${API}/api/agents/${jarvis.id}/resume`, { method: "POST" });
    const wr = await fetch(`${API}/api/agents/${jarvis.id}/wakeup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: { issueId: pid } })
    });
    const run = await wr.json();
    console.log(`JARVIS woken. Run ID: ${run.id}`);

    // Poll JARVIS completion
    console.log("Polling JARVIS run completion...");
    let finished = false;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const pr = await fetch(`${API}/api/heartbeat-runs/${run.id}`);
      if (pr.ok) {
        const d = await pr.json();
        if (d.finishedAt || ["completed", "failed", "skipped", "cancelled", "succeeded"].includes(d.status)) {
          finished = true;
          console.log(`JARVIS finished with status: ${d.status}`);
          break;
        }
      }
    }
    if (!finished) throw new Error("JARVIS execution poll timed out");

    // Pause JARVIS back
    await fetch(`${API}/api/agents/${jarvis.id}/pause`, { method: "POST" });

    // Wait for downstream agents to finish
    console.log("Waiting 35s for downstream mock agents to finish...");
    await new Promise(r => setTimeout(r, 35000));

    // Check child tasks
    const children = await sql`
      SELECT id, title FROM issues 
      WHERE parent_id = ${pid} 
        AND (
          title LIKE '[Codex]%' 
          OR title LIKE '[Claude Review]%' 
          OR title LIKE '[QA]%' 
          OR title LIKE '[Report Bot]%'
        )
      ORDER BY created_at
    `;
    console.log(`Found ${children.length} coordinated child issues.`);
    if (children.length !== 4) throw new Error(`Expected 4 child tasks, found ${children.length}`);

    // Verify comments and packets
    const prefixes = ["[Codex]", "[Claude Review]", "[QA]", "[Report Bot]"];
    for (const child of children) {
      const pfx = prefixes.find(p => child.title.startsWith(p));
      const comments = await sql`SELECT body FROM issue_comments WHERE issue_id = ${child.id}`;
      console.log(`Verifying comments for child "${child.title}": found ${comments.length} comment(s).`);
      if (comments.length === 0) throw new Error(`No comments found for ${child.title}`);

      const body = comments.map(c => c.body || "").join("\n");
      
      // 1. Verify "Action-Aware Planning Packet" heading exists
      if (!body.includes("Action-Aware Planning Packet")) {
        throw new Error(`Missing "Action-Aware Planning Packet" heading in ${child.title}`);
      }

      // 2. Parse the JSON metadata block
      const jsonMatch = body.match(/```json\r?\n([\s\S]*?)\r?\n```/);
      if (!jsonMatch) {
        throw new Error(`Missing JSON metadata block in ${child.title}`);
      }

      const meta = JSON.parse(jsonMatch[1]);
      console.log(`Parsed metadata for ${pfx}:`, JSON.stringify(meta));

      // Validate standard autonomy metadata properties
      if (meta.mode !== "mock") throw new Error("mode mismatch");
      if (meta.packetGenerated !== true) throw new Error("packetGenerated mismatch");
      if (meta.internalExecutionMode !== "safe_branch") throw new Error("internalExecutionMode mismatch");
      if (meta.ownerApprovalRequiredForSafeBranchCodeChanges !== false) throw new Error("ownerApprovalRequiredForSafeBranchCodeChanges mismatch");
      if (meta.ownerApprovalRequiredForCriticalGates !== true) throw new Error("ownerApprovalRequiredForCriticalGates mismatch");
      if (meta.safeBranchCodeChangesAllowed !== true) throw new Error("safeBranchCodeChangesAllowed mismatch");
      if (meta.mergeToMasterAllowed !== false) throw new Error("mergeToMasterAllowed mismatch");
      if (meta.deployAllowed !== false) throw new Error("deployAllowed mismatch");

      // Validate packetType per agent
      const expectedTypeMap = {
        "[Codex]": "implementation_plan",
        "[Claude Review]": "review_plan",
        "[QA]": "qa_plan",
        "[Report Bot]": "operator_summary"
      };
      if (meta.packetType !== expectedTypeMap[pfx]) {
        throw new Error(`packetType mismatch for ${pfx}: expected ${expectedTypeMap[pfx]}, got ${meta.packetType}`);
      }
    }

    // Duplicate prevention test (Run 2)
    console.log("Running duplicate prevention test (JARVIS Run 2)...");
    await fetch(`${API}/api/agents/${jarvis.id}/resume`, { method: "POST" });
    const wr2 = await fetch(`${API}/api/agents/${jarvis.id}/wakeup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: { issueId: pid } })
    });
    const run2 = await wr2.json();
    
    // Poll JARVIS Run 2 completion
    let finished2 = false;
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const pr = await fetch(`${API}/api/heartbeat-runs/${run2.id}`);
      if (pr.ok) {
        const d = await pr.json();
        if (d.finishedAt || ["completed", "failed", "skipped", "cancelled", "succeeded"].includes(d.status)) {
          finished2 = true;
          console.log(`JARVIS Run 2 finished with status: ${d.status}`);
          break;
        }
      }
    }
    if (!finished2) throw new Error("JARVIS Run 2 poll timed out");
    await fetch(`${API}/api/agents/${jarvis.id}/pause`, { method: "POST" });

    const children2 = await sql`
      SELECT id, title FROM issues 
      WHERE parent_id = ${pid}
        AND (
          title LIKE '[Codex]%' 
          OR title LIKE '[Claude Review]%' 
          OR title LIKE '[QA]%' 
          OR title LIKE '[Report Bot]%'
        )
    `;
    console.log(`Coordinated child tasks count after Run 2: ${children2.length}`);
    if (children2.length !== 4) throw new Error(`Duplicate prevention failed! Expected 4, found ${children2.length}`);
    console.log("Duplicate prevention passed successfully!");

    console.log("🎉 ALL PHASE 0.3H VERIFICATIONS PASSED!");
  } catch (err) {
    console.error("❌ VERIFICATION FAILED:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
