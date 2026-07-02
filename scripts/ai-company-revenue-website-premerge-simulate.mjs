#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../");

function getArgs() {
  const args = process.argv.slice(2);
  return {
    mission: null,
    writeReport: args.includes("--write-report"),
    explain: args.includes("--explain"),
    mission: args.indexOf("--mission") !== -1 ? args[args.indexOf("--mission") + 1] : null
  };
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
    console.log("[Premerge Simulate] Running Revenue Website Mission Premerge Simulation...");
  }

  const verifiers = ["1.0a", "1.0b", "1.0c", "1.0d", "1.0e", "1.0f", "1.0g", "1.0h", "1.0i", "1.0j", "1.0k"];
  const verifierChecks = {};

  verifiers.forEach(v => {
    const vPath = path.join(repoRoot, `packages/db/src/_verify-${v}.mjs`);
    if (fs.existsSync(vPath)) {
      const verdict = runStep(`node packages/db/src/_verify-${v}.mjs`);
      verifierChecks[`verify_${v.replace(".", "_")}`] = verdict;
    } else {
      verifierChecks[`verify_${v.replace(".", "_")}`] = "SKIPPED";
    }
  });

  // Verify the vertical mission artifacts directly
  let verifyVerdict = "FAIL";
  if (flags.mission) {
    verifyVerdict = runStep(`node scripts/ai-company-revenue-website-verify.mjs --mission ${flags.mission} --strict`);
  } else {
    verifyVerdict = "SKIPPED";
  }

  // Paperclip read adapter validation
  const adapterVerdict = runStep(`node scripts/ai-company-paperclip-read-adapter-validate.mjs --target all`);

  // Git status check for uncommitted/untracked runtime reports
  let gitCheck = "PASS";
  try {
    const gitStatus = execSync("git status --porcelain", { encoding: "utf8" }).trim();
    if (gitStatus !== "") {
      const lines = gitStatus.split("\n").map(l => l.trim()).filter(Boolean);
      // Make sure none of the untracked changes include runtime reports or logs
      const runtimeReports = lines.filter(l => 
        l.startsWith("?? ") && (
          l.includes("reports/revenue-website-mission/latest.json") ||
          l.includes("reports/revenue-website-verify/latest.json") ||
          l.includes("reports/self-test/latest") ||
          l.includes("reports/e2e/latest") ||
          l.includes("reports/post-merge/latest") ||
          l.includes("logs/")
        )
      );
      if (runtimeReports.length > 0) {
        gitCheck = "FAIL";
      }
    }
  } catch (err) {
    gitCheck = "FAIL";
  }

  const allPassed = Object.values(verifierChecks).every(v => v === "PASS" || v === "SKIPPED") &&
                    (verifyVerdict === "PASS" || verifyVerdict === "SKIPPED") &&
                    adapterVerdict === "PASS" &&
                    gitCheck === "PASS";

  const premergeReport = {
    premerge_status: allPassed ? "PASS" : "FAIL",
    checks: {
      ...verifierChecks,
      vertical_mission_verify: verifyVerdict,
      paperclip_adapter_validate: adapterVerdict,
      git_status_safety_check: gitCheck
    },
    final_verdict: allPassed ? "REVENUE_WEBSITE_PREMERGE_PASS" : "REVENUE_WEBSITE_PREMERGE_FAIL"
  };

  if (flags.writeReport) {
    const logDir = path.join(repoRoot, "logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(
      path.join(logDir, "revenue-website-premerge-simulate-report.json"),
      JSON.stringify(premergeReport, null, 2),
      "utf8"
    );
    console.log("[Premerge Simulate] Wrote logs/revenue-website-premerge-simulate-report.json");
  }

  if (flags.explain) {
    console.log(`[Premerge Simulate] Final Verdict: ${premergeReport.final_verdict}`);
  }

  if (!allPassed) {
    process.exit(1);
  }
}

main();
