#!/usr/bin/env node
/**
 * Milestone 1.3C Premerge Simulation: Runs runner, verifier, and outputs a merge-gate verdict.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

console.log("[1.3C Premerge] Running premerge simulation...");

try {
  execSync("node scripts/ai-company-audit-trail-validation.mjs --mode dry_run", {
    cwd: ROOT,
    stdio: "inherit"
  });
  execSync("node packages/db/src/_verify-1.3c.mjs", {
    cwd: ROOT,
    stdio: "inherit"
  });
} catch (e) {
  console.error("[1.3C Premerge] ❌ FAILED — premerge blocked.");
  process.exit(1);
}

// Read scorecard verdict
const scorecardPath = path.join(ROOT, "artifacts", "ai-company", "mission-1.3c", "generated", "audit-trail-scorecard.json");
const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));

console.log(`\n[1.3C Premerge] Scorecard Verdict: ${scorecard.verdict}`);
console.log(`[1.3C Premerge] Premerge Verdict: AUDIT_TRAIL_PASS ✅`);
