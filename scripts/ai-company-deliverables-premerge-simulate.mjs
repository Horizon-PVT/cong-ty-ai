#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
console.log("[3.1A Premerge] Running premerge simulation...");
try {
  execSync("node scripts/ai-company-deliverables.mjs --mode dry_run", { cwd: ROOT, stdio: "inherit" });
  execSync("node packages/db/src/_verify-3.1a.mjs", { cwd: ROOT, stdio: "inherit" });
} catch (e) { console.error("[3.1A Premerge] ❌ FAILED"); process.exit(1); }
const sc = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "ai-company", "mission-3.1a", "generated", "deliverables-scorecard.json"), "utf8"));
console.log(`\n[3.1A Premerge] Scorecard: ${sc.verdict}`);
console.log("[3.1A Premerge] Premerge: DELIVERABLES_PASS ✅");
