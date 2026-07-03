#!/usr/bin/env node
// scripts/ai-company-owner-approval-workbench-premerge-simulate.mjs
// Milestone 1.0Q — Premerge Simulation

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORKSPACE = process.cwd();
const LOGS_DIR = path.join(WORKSPACE, "logs");
const PREMERGE_REPORT = path.join(LOGS_DIR, "owner-approval-workbench-premerge-simulate-report.json");

console.log("[Premerge Simulate] Initializing 1.0Q Owner Approval Workbench Premerge Simulation...");

fs.mkdirSync(LOGS_DIR, { recursive: true });

try {
  // 1. Run historical verifiers
  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0m.mjs...");
  execSync("node packages/db/src/_verify-1.0m.mjs", { stdio: "inherit" });

  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0n.mjs...");
  execSync("node packages/db/src/_verify-1.0n.mjs", { stdio: "inherit" });

  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0o.mjs...");
  execSync("node packages/db/src/_verify-1.0o.mjs", { stdio: "inherit" });

  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0p.mjs...");
  execSync("node packages/db/src/_verify-1.0p.mjs", { stdio: "inherit" });

  // 2. Run current verifier
  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0q.mjs...");
  execSync("node packages/db/src/_verify-1.0q.mjs", { stdio: "inherit" });

  // 3. Confirm runtime reports not tracked in Git
  console.log("[Premerge Simulate] Checking Git tracking status of runtime reports...");
  const tracked = execSync(
    "git ls-files reports/owner-approval-workbench/ reports/revenue-command-center/ reports/self-test/latest.json reports/self-test/latest.md",
    { encoding: "utf8" }
  ).trim();
  if (tracked !== "") {
    throw new Error(`Runtime reports must not be tracked in Git. Found: ${tracked}`);
  }
  console.log("[Premerge Simulate] ✅ No runtime reports are tracked in Git");

  // 4. Check that runner does not hardcode forbidden artifact names
  console.log("[Premerge Simulate] Checking verifier meta-safety rules...");
  const runnerSrc = fs.readFileSync("scripts/ai-company-run-owner-approval-workbench-mission.mjs", "utf8");
  const forbidden = ["client-proposal.md", "objection-handling.md", "follow-up-plan.md", "package-comparison.md"];
  for (const f of forbidden) {
    if (runnerSrc.includes(f)) {
      throw new Error(`Runner script must not hardcode legacy filename: ${f}`);
    }
  }
  console.log("[Premerge Simulate] ✅ Runner does not hardcode forbidden artifact names");

  fs.writeFileSync(
    PREMERGE_REPORT,
    JSON.stringify({ verdict: "OWNER_APPROVAL_WORKBENCH_PREMERGE_PASS", timestamp: "2026-07-03" }, null, 2)
  );
  console.log("[Premerge Simulate] Wrote logs/owner-approval-workbench-premerge-simulate-report.json");
  console.log("[Premerge Simulate] Final Verdict: OWNER_APPROVAL_WORKBENCH_PREMERGE_PASS");

} catch (err) {
  console.error(`[Premerge Simulate] Premerge simulation failed: ${err.message}`);
  fs.writeFileSync(
    PREMERGE_REPORT,
    JSON.stringify({ verdict: "OWNER_APPROVAL_WORKBENCH_PREMERGE_FAIL", error: err.message, timestamp: "2026-07-03" }, null, 2)
  );
  process.exit(1);
}
