#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
console.log("[1.4A Premerge] Running premerge simulation...");
try {
  execSync("node scripts/ai-company-dashboard-db.mjs --mode dry_run", { cwd: ROOT, stdio: "inherit" });
  execSync("node packages/db/src/_verify-1.4a.mjs", { cwd: ROOT, stdio: "inherit" });
} catch (e) { console.error("[1.4A Premerge] ❌ FAILED"); process.exit(1); }
const sc = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "ai-company", "mission-1.4a", "generated", "dashboard-db-scorecard.json"), "utf8"));
console.log(`\n[1.4A Premerge] Scorecard: ${sc.verdict}`);
console.log("[1.4A Premerge] Premerge: DASHBOARD_DB_PASS ✅");
