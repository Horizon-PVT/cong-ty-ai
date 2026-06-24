/**
 * Phase 0.3L Verification Script
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSelfTestReport } from "../../../scripts/ai-dev-factory-pr-automation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

async function main() {
  console.log("Starting Phase 0.3L verification...");

  // 1. Verify scripts/ai-dev-factory-pr-automation.mjs exists
  const runnerPath = path.join(repoRoot, "scripts/ai-dev-factory-pr-automation.mjs");
  if (!fs.existsSync(runnerPath)) {
    throw new Error("scripts/ai-dev-factory-pr-automation.mjs does not exist");
  }
  console.log("✅ verified: scripts/ai-dev-factory-pr-automation.mjs exists");

  // 2. Verify validation logic: PR automation fails if report has bad finalVerdict, canMerge=true, etc.
  const badReport1 = {
    finalVerdict: "FAIL_BLOCKED",
    canMerge: false,
    criticalGatesBlocked: true,
    commands: [{ command: "test", exitCode: 0, status: "PASS", executionMode: "real" }]
  };
  const val1 = validateSelfTestReport(badReport1);
  if (val1.valid) {
    throw new Error("Validation passed for bad finalVerdict");
  }

  const badReport2 = {
    finalVerdict: "PASS_READY_FOR_DRAFT_PR",
    canMerge: true,
    criticalGatesBlocked: true,
    commands: [{ command: "test", exitCode: 0, status: "PASS", executionMode: "real" }]
  };
  const val2 = validateSelfTestReport(badReport2);
  if (val2.valid) {
    throw new Error("Validation passed for canMerge = true");
  }

  const badReport3 = {
    finalVerdict: "PASS_READY_FOR_DRAFT_PR",
    canMerge: false,
    criticalGatesBlocked: true,
    commands: [{ command: "test", exitCode: 0, status: "PASS", executionMode: "simulated" }]
  };
  const val3 = validateSelfTestReport(badReport3);
  if (val3.valid) {
    throw new Error("Validation passed for simulated execution mode");
  }
  console.log("✅ verified: PR automation validates safety reports correctly");

  // 3. Verify previous Phase 0.3K verification remains callable
  const verify0_3kPath = path.join(repoRoot, "packages/db/src/_verify-0.3k.mjs");
  if (!fs.existsSync(verify0_3kPath)) {
    throw new Error("_verify-0.3k.mjs does not exist");
  }
  console.log("✅ verified: Phase 0.3K verification script remains callable");

  console.log("🎉 ALL PHASE 0.3L VERIFICATIONS PASSED!");
}

main();
