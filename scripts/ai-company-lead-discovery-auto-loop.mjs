#!/usr/bin/env node
// scripts/ai-company-lead-discovery-auto-loop.mjs
// Milestone 1.0N — Auto-Loop Verifier (stable convergence check)

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORKSPACE = process.cwd();
const MAX_ITERATIONS = 3;
const REQUIRED_STABLE_PASSES = 2;

console.log("[Auto-Loop] Initializing Lead Discovery Mission Auto-Loop...\n");

let stablePasses = 0;

for (let i = 1; i <= MAX_ITERATIONS; i++) {
  console.log(`[Auto-Loop] Iteration ${i}/${MAX_ITERATIONS}...`);
  try {
    execSync("node scripts/ai-company-run-lead-discovery-mission.mjs", {
      stdio: "inherit",
      cwd: WORKSPACE
    });
    execSync("node scripts/ai-company-lead-discovery-verify.mjs", {
      stdio: "inherit",
      cwd: WORKSPACE
    });
    stablePasses++;
    console.log(`[Auto-Loop] Iteration ${i} PASSED. Stable passes in a row: ${stablePasses}/${REQUIRED_STABLE_PASSES}\n`);
    if (stablePasses >= REQUIRED_STABLE_PASSES) {
      break;
    }
  } catch (err) {
    console.error(`[Auto-Loop] Iteration ${i} FAILED: ${err.message}`);
    stablePasses = 0;
  }
}

const logDir = path.join(WORKSPACE, "logs");
fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(
  path.join(logDir, "lead-discovery-auto-loop-report.json"),
  JSON.stringify({
    milestone: "1.0N",
    max_iterations: MAX_ITERATIONS,
    required_stable_passes: REQUIRED_STABLE_PASSES,
    stable_passes_achieved: stablePasses,
    verdict: stablePasses >= REQUIRED_STABLE_PASSES
      ? "LEAD_DISCOVERY_MISSION_STABLE_PASS"
      : "LEAD_DISCOVERY_MISSION_UNSTABLE_FAIL",
    timestamp: "2026-07-02"
  }, null, 2)
);
console.log("[Auto-Loop] Wrote logs/lead-discovery-auto-loop-report.json");

if (stablePasses >= REQUIRED_STABLE_PASSES) {
  console.log("[Auto-Loop] Final Verdict: LEAD_DISCOVERY_MISSION_STABLE_PASS\n");
} else {
  console.error("[Auto-Loop] Final Verdict: LEAD_DISCOVERY_MISSION_UNSTABLE_FAIL");
  process.exit(1);
}
