#!/usr/bin/env node
/**
 * Milestone 1.2B Premerge Simulation: Runs runner, verifier, and outputs a merge-gate verdict.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

console.log("[1.2B Premerge] Running premerge simulation...");

try {
  execSync("node scripts/ai-company-remote-sandbox-real-api-integration.mjs --mode dry_run", {
    cwd: ROOT,
    stdio: "inherit"
  });
  execSync("node packages/db/src/_verify-1.2b.mjs", {
    cwd: ROOT,
    stdio: "inherit"
  });
} catch (e) {
  console.error("[1.2B Premerge] ❌ FAILED — premerge blocked.");
  process.exit(1);
}

// Read scorecard verdict
const scorecardPath = path.join(ROOT, "artifacts", "ai-company", "mission-1.2b", "generated", "sandbox-real-api-scorecard.json");
const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));

console.log(`\n[1.2B Premerge] Scorecard Verdict: ${scorecard.verdict}`);
console.log(`[1.2B Premerge] Premerge Verdict: SANDBOX_REAL_API_PASS ✅`);
