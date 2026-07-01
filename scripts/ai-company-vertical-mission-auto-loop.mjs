#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../");

function getArgs() {
  const args = process.argv.slice(2);
  const flags = {
    mission: null,
    maxIterations: 5,
    stablePasses: 2,
    writeReport: args.includes("--write-report"),
    explain: args.includes("--explain")
  };
  const mIndex = args.indexOf("--mission");
  if (mIndex !== -1 && mIndex + 1 < args.length) {
    flags.mission = args[mIndex + 1];
  }
  const maxIndex = args.indexOf("--max-iterations");
  if (maxIndex !== -1 && maxIndex + 1 < args.length) {
    flags.maxIterations = parseInt(args[maxIndex + 1], 10);
  }
  const sIndex = args.indexOf("--stable-passes");
  if (sIndex !== -1 && sIndex + 1 < args.length) {
    flags.stablePasses = parseInt(args[sIndex + 1], 10);
  }
  return flags;
}

function runStep(cmd) {
  try {
    execSync(cmd, { stdio: "pipe" });
    return "PASS";
  } catch (err) {
    return "FAIL";
  }
}

function main() {
  const flags = getArgs();

  if (flags.explain) {
    console.log("[Auto-Loop] Initializing Vertical Mission Auto-Loop...");
  }

  if (!flags.mission) {
    console.error("[Auto-Loop] Error: Missing --mission flag.");
    process.exit(1);
  }

  const iterationResults = [];
  let stableCount = 0;
  let converged = false;

  for (let i = 1; i <= flags.maxIterations; i++) {
    if (flags.explain) {
      console.log(`[Auto-Loop] Iteration ${i}/${flags.maxIterations}...`);
    }

    // Step 1: Run Vertical Mission
    const runVerdict = runStep(`node scripts/ai-company-run-vertical-mission.mjs --mission ${flags.mission} --write-artifacts --write-memory --write-report`);
    
    // Step 2: Run Vertical Mission Verify
    const verifyVerdict = runStep(`node scripts/ai-company-vertical-mission-verify.mjs --mission ${flags.mission} --strict --write-report`);
    
    // Step 3: Run Paperclip Read Adapter
    const adapterVerdict = runStep(`node scripts/ai-company-paperclip-read-adapter.mjs --source all --widget all --format json --validate --write-report`);

    // Step 4: Run KPI Validation (verify kpi scorecard exists and is parseable)
    const scorecardFile = path.join(repoRoot, "artifacts/ai-company/mission-1.0j/kpi-scorecard.json");
    let kpiVerdict = "FAIL";
    if (fs.existsSync(scorecardFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(scorecardFile, "utf8"));
        if (data.ceo_agent && data.coo_agent && data.cto_agent) {
          kpiVerdict = "PASS";
        }
      } catch {}
    }

    const iterResult = {
      iteration: i,
      steps: [
        { name: "run_mission", status: runVerdict },
        { name: "verify_mission", status: verifyVerdict },
        { name: "paperclip_read_adapter", status: adapterVerdict },
        { name: "kpi_validation", status: kpiVerdict }
      ],
      status: (runVerdict === "PASS" && verifyVerdict === "PASS" && adapterVerdict === "PASS" && kpiVerdict === "PASS") ? "PASS" : "FAIL"
    };

    iterationResults.push(iterResult);

    if (iterResult.status === "PASS") {
      stableCount++;
    } else {
      stableCount = 0; // Reset if any fail
    }

    if (stableCount >= flags.stablePasses) {
      converged = true;
      if (flags.explain) {
        console.log(`[Auto-Loop] Stable convergence reached on iteration ${i} (${flags.stablePasses} consecutive passes).`);
      }
      break;
    }
  }

  const loopReport = {
    iteration_results: iterationResults,
    convergence_status: converged ? "converged" : "failed",
    stable_passes: stableCount,
    final_verdict: converged ? "VERTICAL_MISSION_STABLE_PASS" : "VERTICAL_MISSION_STABLE_FAIL"
  };

  if (flags.writeReport) {
    const logDir = path.join(repoRoot, "logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(
      path.join(logDir, "vertical-mission-auto-loop-report.json"),
      JSON.stringify(loopReport, null, 2),
      "utf8"
    );
    console.log("[Auto-Loop] Wrote logs/vertical-mission-auto-loop-report.json");
  }

  if (loopReport.final_verdict !== "VERTICAL_MISSION_STABLE_PASS") {
    console.error("[Auto-Loop] Error: Failed to reach stable convergence.");
    process.exit(1);
  }
}

main();
