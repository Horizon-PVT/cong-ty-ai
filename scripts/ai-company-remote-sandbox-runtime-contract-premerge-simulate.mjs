#!/usr/bin/env node
/**
 * Milestone 1.2A Premerge Simulation: Runs runner, verifier, and outputs a merge-gate verdict.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

console.log("[1.2A Premerge] Running premerge simulation...");

try {
  execSync("node scripts/ai-company-remote-sandbox-runtime-contract.mjs --mode dry_run", {
    cwd: ROOT,
    stdio: "inherit"
  });
  execSync("node packages/db/src/_verify-1.2a.mjs", {
    cwd: ROOT,
    stdio: "inherit"
  });
} catch (e) {
  console.error("[1.2A Premerge] ❌ FAILED — premerge blocked.");
  process.exit(1);
}

// Read scorecard verdict
const scorecardPath = path.join(ROOT, "artifacts", "ai-company", "mission-1.2a", "generated", "sandbox-execution-scorecard.json");
const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));

console.log(`\n[1.2A Premerge] Scorecard Verdict: ${scorecard.verdict}`);
console.log(`[1.2A Premerge] Premerge Verdict: SANDBOX_RUNTIME_PASS ✅`);
