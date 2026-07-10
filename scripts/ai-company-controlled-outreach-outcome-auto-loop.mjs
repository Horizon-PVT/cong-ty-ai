#!/usr/bin/env node
/**
 * Milestone 1.0Y: Controlled Outreach Outcome Auto-Loop
 * Runs the verifier repeatedly until 2 consecutive passes.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(ROOT, "logs");

const MAX_ITERATIONS = 5;
const REQUIRED_STABLE_PASSES = 2;

function ensureDirs() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function runVerifier() {
  try {
    execSync("node packages/db/src/_verify-1.0y.mjs", {
      cwd: ROOT,
      stdio: "inherit",
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

async function runMission() {
  try {
    execSync("node scripts/ai-company-run-controlled-outreach-outcome-mission.mjs", {
      cwd: ROOT,
      stdio: "inherit",
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  ensureDirs();
  console.log("[1.0Y Auto-Loop] Starting outreach outcome auto-loop...");

  let consecutivePasses = 0;
  let attempt = 0;

  while (attempt < MAX_ITERATIONS) {
    attempt++;
    console.log(`\n[Auto-Loop] Attempt ${attempt}...`);

    const missionOk = await runMission();
    if (!missionOk) {
      console.log(`[Auto-Loop] Mission runner failed. Resetting consecutive passes.`);
      consecutivePasses = 0;
      continue;
    }

    const verifyOk = await runVerifier();
    if (verifyOk) {
      consecutivePasses++;
      console.log(`[Auto-Loop] Attempt ${attempt} PASSED. Consecutive passes: ${consecutivePasses}/${REQUIRED_STABLE_PASSES}`);
    } else {
      console.log(`[Auto-Loop] Attempt ${attempt} FAILED. Resetting consecutive passes.`);
      consecutivePasses = 0;
    }

    if (consecutivePasses >= REQUIRED_STABLE_PASSES) {
      console.log(`\n[Auto-Loop] Stable passes achieved: ${consecutivePasses}/${REQUIRED_STABLE_PASSES}`);
      break;
    }
  }

  const report = {
    milestone: "1.0Y",
    total_attempts: attempt,
    consecutive_passes: consecutivePasses,
    stable: consecutivePasses >= REQUIRED_STABLE_PASSES,
    verdict: consecutivePasses >= REQUIRED_STABLE_PASSES
      ? "CONTROLLED_OUTREACH_OUTCOME_AUTO_LOOP_STABLE"
      : "CONTROLLED_OUTREACH_OUTCOME_AUTO_LOOP_UNSTABLE",
  };
  const reportPath = path.join(LOG_DIR, "controlled-outreach-outcome-auto-loop-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  if (!report.stable) {
    console.error("[Auto-Loop] Auto-loop did not achieve stable passes.");
    process.exit(1);
  }
  console.log("[Auto-Loop] Auto-loop completed successfully!");
}

main().catch(e => { console.error(e); process.exit(1); });
