#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PASSES = 4;
console.log(`[1.3E Auto-Loop] Running ${PASSES} passes...`);
for (let i = 1; i <= PASSES; i++) {
  console.log(`\n--- Pass ${i}/${PASSES} ---`);
  try {
    execSync("node scripts/ai-company-task-conflict-agent-perms.mjs --mode dry_run", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.3e.mjs", { cwd: ROOT, stdio: "inherit" });
    console.log(`✅ Pass ${i} OK`);
  } catch (e) { console.error(`❌ Pass ${i} FAILED`); process.exit(1); }
}
console.log(`\n[1.3E Auto-Loop] All ${PASSES} passes stable. ✅`);
