import postgres from "postgres";

async function main() {
  const sql = postgres("postgresql://paperclip@localhost:54329/paperclip");
  try {
    const agents = await sql`SELECT id, name, company_id FROM agents`;
    console.log("AGENTS:");
    console.log(JSON.stringify(agents, null, 2));

    const issues = await sql`SELECT id, title, assignee_agent_id, status FROM issues ORDER BY created_at DESC LIMIT 5`;
    console.log("\nRECENT ISSUES:");
    console.log(JSON.stringify(issues, null, 2));
  } catch (err) {
    console.error("DB connection error:", err.message);
  } finally {
    await sql.end();
  }
}

main();
