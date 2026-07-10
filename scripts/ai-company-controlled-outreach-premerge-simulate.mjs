#!/usr/bin/env node
/**
 * Milestone 1.0X: Controlled Consented Outreach Pilot Pre-Merge Simulation
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(ROOT, "logs");

function ensureDirs() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function main() {
  ensureDirs();
  console.log("[Premerge Simulate] Starting 1.0X pre-merge simulation...");

  // 1. Run verifier
  console.log("[Premerge Simulate] Running 1.0X verifier...");
  try {
    execSync("node packages/db/src/_verify-1.0x.mjs", {
      cwd: ROOT,
      stdio: "inherit",
      encoding: "utf8",
    });
  } catch {
    console.error("[Premerge Simulate] ❌ Verifier failed. Pre-merge blocked.");
    process.exit(1);
  }

  // 2. Confirm no runtime reports are tracked in git
  console.log("[Premerge Simulate] Checking Git tracking status of runtime reports...");
  let hasTrackedReports = false;
  try {
    const tracked = execSync("git ls-files logs/ reports/e2e/ reports/post-merge/", {
      cwd: ROOT, encoding: "utf8"
    }).trim();
    if (tracked.length === 0) {
      console.log("[Premerge Simulate] ✅ No runtime reports are tracked in Git");
    } else {
      console.error("[Premerge Simulate] ❌ Some runtime logs tracked:", tracked);
      hasTrackedReports = true;
    }
  } catch { /* ok */ }

  // 3. Check runner script does not import forbidden modules
  console.log("[Premerge Simulate] Checking verifier meta-safety rules...");
  const runnerPath = path.join(ROOT, "scripts", "ai-company-run-controlled-outreach-pilot-mission.mjs");
  const runnerSrc = fs.readFileSync(runnerPath, "utf8");
  const forbiddenArtifactNames = ["daily-email-sandbox-payload", "daily-live-action-gateway", "daily-email-live-readiness-payload", "daily-email-live-pilot-payload", "daily-email-boss-live-test-payload"];
  let metaSafe = true;
  for (const name of forbiddenArtifactNames) {
    if (runnerSrc.includes(name)) {
      console.error(`[Premerge Simulate] ❌ Runner hardcodes forbidden artifact: ${name}`);
      metaSafe = false;
    }
  }
  if (metaSafe) console.log("[Premerge Simulate] ✅ Runner does not hardcode forbidden artifact names");

  if (hasTrackedReports || !metaSafe) {
    console.error("[Premerge Simulate] ❌ Pre-merge simulation failed due to safety violations.");
    process.exit(1);
  }

  const report = {
    milestone: "1.0X",
    verifier: "PASS",
    git_runtime_reports_untracked: !hasTrackedReports,
    runner_meta_safe: metaSafe,
    verdict: "CONTROLLED_OUTREACH_PREMERGE_PASS",
  };
  const reportPath = path.join(LOG_DIR, "controlled-outreach-premerge-simulate-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log("[Premerge Simulate] Final Verdict: CONTROLLED_OUTREACH_PREMERGE_PASS");
}

main().catch(e => { console.error(e); process.exit(1); });
