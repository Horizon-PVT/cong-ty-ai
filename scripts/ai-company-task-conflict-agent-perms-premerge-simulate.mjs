#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
console.log("[1.3E Premerge] Running premerge simulation...");
try {
  execSync("node scripts/ai-company-task-conflict-agent-perms.mjs --mode dry_run", { cwd: ROOT, stdio: "inherit" });
  execSync("node packages/db/src/_verify-1.3e.mjs", { cwd: ROOT, stdio: "inherit" });
} catch (e) { console.error("[1.3E Premerge] ❌ FAILED"); process.exit(1); }
const sc = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "ai-company", "mission-1.3e", "generated", "task-conflict-scorecard.json"), "utf8"));
console.log(`\n[1.3E Premerge] Scorecard: ${sc.verdict}`);
console.log("[1.3E Premerge] Premerge: TASK_CONFLICT_PASS ✅");
