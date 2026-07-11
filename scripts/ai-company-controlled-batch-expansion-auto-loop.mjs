#!/usr/bin/env node
/**
 * Milestone 1.0Z: Controlled Batch Expansion Auto-Loop
 * Runs runner + verifier twice consecutively to confirm stability.
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REQUIRED_PASSES = 2;
let consecutivePasses = 0;

console.log("[1.0Z Auto-Loop] Starting controlled batch expansion auto-loop...");

for (let attempt = 1; attempt <= REQUIRED_PASSES + 1; attempt++) {
  console.log(`\n[Auto-Loop] Attempt ${attempt}...`);
  try {
    execSync(
      "node scripts/ai-company-run-controlled-batch-expansion-mission.mjs",
      { cwd: ROOT, stdio: "inherit" }
    );
    execSync(
      "node packages/db/src/_verify-1.0z.mjs",
      { cwd: ROOT, stdio: "inherit" }
    );
    consecutivePasses++;
    console.log(`[Auto-Loop] Attempt ${attempt} PASSED. Consecutive passes: ${consecutivePasses}/${REQUIRED_PASSES}`);
    if (consecutivePasses >= REQUIRED_PASSES) {
      console.log(`\n[Auto-Loop] Stable passes achieved: ${consecutivePasses}/${REQUIRED_PASSES}`);
      console.log("[Auto-Loop] Auto-loop completed successfully!");
      process.exit(0);
    }
  } catch (err) {
    console.error(`[Auto-Loop] Attempt ${attempt} FAILED: ${err.message}`);
    consecutivePasses = 0;
    process.exit(1);
  }
}
