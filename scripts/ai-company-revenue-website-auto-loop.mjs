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
    console.log("[Auto-Loop] Initializing Revenue Website Mission Auto-Loop...");
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

    // Step 1: Run Revenue Website Mission
    const runVerdict = runStep(`node scripts/ai-company-run-revenue-website-mission.mjs --mission ${flags.mission} --write-artifacts --write-memory --write-report`);
    
    // Step 2: Run Revenue Website Verify
    const verifyVerdict = runStep(`node scripts/ai-company-revenue-website-verify.mjs --mission ${flags.mission} --strict --write-report`);
    
    // Step 3: Run Paperclip Read Adapter (dry run adapter to verify compatibility)
    const adapterVerdict = runStep(`node scripts/ai-company-paperclip-read-adapter.mjs --source all --widget all --format json --validate --write-report`);

    // Step 4: Run KPI Validation (verify kpi scorecard exists and has all required scores)
    const scorecardFile = path.join(repoRoot, "artifacts/ai-company/mission-1.0k/kpi-scorecard.json");
    let kpiVerdict = "FAIL";
    if (fs.existsSync(scorecardFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(scorecardFile, "utf8"));
        if (
          typeof data.mission_success_score === "number" &&
          typeof data.customer_value_score === "number" &&
          typeof data.copy_quality_score === "number" &&
          typeof data.conversion_readiness_score === "number" &&
          typeof data.delivery_readiness_score === "number" &&
          typeof data.safety_score === "number" &&
          typeof data.learning_quality_score === "number"
        ) {
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
      if (stableCount >= flags.stablePasses) {
        converged = true;
        break;
      }
    } else {
      stableCount = 0; // reset stable pass count if any step failed
    }
  }

  const autoLoopReport = {
    converged,
    total_iterations: iterationResults.length,
    iterations: iterationResults,
    final_verdict: converged ? "REVENUE_WEBSITE_MISSION_STABLE_PASS" : "REVENUE_WEBSITE_MISSION_STABLE_FAIL"
  };

  if (flags.writeReport) {
    const logDir = path.join(repoRoot, "logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(
      path.join(logDir, "revenue-website-auto-loop-report.json"),
      JSON.stringify(autoLoopReport, null, 2),
      "utf8"
    );
    console.log("[Auto-Loop] Wrote logs/revenue-website-auto-loop-report.json");
  }

  if (flags.explain) {
    console.log(`[Auto-Loop] Final Verdict: ${autoLoopReport.final_verdict}`);
  }

  if (!converged) {
    process.exit(1);
  }
}

main();
