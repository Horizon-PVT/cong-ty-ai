#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
console.log("[2.1B Premerge] Running premerge simulation...");
try {
  execSync("node scripts/ai-company-cli-run.mjs --mode dry_run", { cwd: ROOT, stdio: "inherit" });
  execSync("node packages/db/src/_verify-2.1b.mjs", { cwd: ROOT, stdio: "inherit" });
} catch (e) { console.error("[2.1B Premerge] ❌ FAILED"); process.exit(1); }
const sc = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "ai-company", "mission-2.1b", "generated", "cli-run-scorecard.json"), "utf8"));
console.log(`\n[2.1B Premerge] Scorecard: ${sc.verdict}`);
console.log("[2.1B Premerge] Premerge: CLI_RUN_PASS ✅");
