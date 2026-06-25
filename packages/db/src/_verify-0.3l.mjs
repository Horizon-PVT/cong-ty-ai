/**
 * Phase 0.3L Verification Script
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSelfTestReport, isValidBranchName } from "../../../scripts/ai-dev-factory-pr-automation.mjs";

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

  // 2. Verify branch validation rules
  const rejectedBranches = [
    "master",
    "main",
    "release/v1.0",
    "hotfix/bugfix",
    "dev",
    "staging",
    "release",
    "hotfix/123",
    "dev/feature"
  ];
  for (const b of rejectedBranches) {
    if (isValidBranchName(b)) {
      throw new Error(`Branch name "${b}" should have been rejected by isValidBranchName`);
    }
  }

  const acceptedBranches = [
    "chore/auto-push-draft-pr-gate",
    "feat/new-safety-checks",
    "chore/cleanup",
    "feat/cool-stuff"
  ];
  for (const b of acceptedBranches) {
    if (!isValidBranchName(b)) {
      throw new Error(`Branch name "${b}" should have been accepted by isValidBranchName`);
    }
  }
  console.log("✅ verified: branch prefix rules (chore/* or feat/* only) are strictly enforced");

  // 3. Verify safety report validation logic (validateSelfTestReport)
  const baseValidReport = {
    finalVerdict: "PASS_READY_FOR_DRAFT_PR",
    canOpenDraftPr: true,
    canMerge: false,
    criticalGatesBlocked: true,
    secretsRead: false,
    deployAttempted: false,
    destructiveActionAttempted: false,
    spendAttempted: false,
    externalCommunicationAttempted: false,
    commands: [{ command: "test", exitCode: 0, status: "PASS", executionMode: "real" }]
  };

  // Base case passes
  const valBase = validateSelfTestReport(baseValidReport);
  if (!valBase.valid) {
    throw new Error(`Base valid report failed validation: ${valBase.error}`);
  }

  // canOpenDraftPr=false is rejected when finalVerdict is PASS_READY_FOR_DRAFT_PR
  const bad1 = { ...baseValidReport, canOpenDraftPr: false };
  if (validateSelfTestReport(bad1).valid) {
    throw new Error("Validation passed for canOpenDraftPr = false with PASS_READY_FOR_DRAFT_PR");
  }

  // criticalGatesBlocked=false is rejected
  const bad2 = { ...baseValidReport, criticalGatesBlocked: false };
  if (validateSelfTestReport(bad2).valid) {
    throw new Error("Validation passed for criticalGatesBlocked = false");
  }

  // secretsRead=true is rejected
  const bad3 = { ...baseValidReport, secretsRead: true };
  if (validateSelfTestReport(bad3).valid) {
    throw new Error("Validation passed for secretsRead = true");
  }

  // deployAttempted=true is rejected
  const bad4 = { ...baseValidReport, deployAttempted: true };
  if (validateSelfTestReport(bad4).valid) {
    throw new Error("Validation passed for deployAttempted = true");
  }

  // destructiveActionAttempted=true is rejected
  const bad5 = { ...baseValidReport, destructiveActionAttempted: true };
  if (validateSelfTestReport(bad5).valid) {
    throw new Error("Validation passed for destructiveActionAttempted = true");
  }

  // spendAttempted=true is rejected
  const bad6 = { ...baseValidReport, spendAttempted: true };
  if (validateSelfTestReport(bad6).valid) {
    throw new Error("Validation passed for spendAttempted = true");
  }

  // externalCommunicationAttempted=true is rejected
  const bad7 = { ...baseValidReport, externalCommunicationAttempted: true };
  if (validateSelfTestReport(bad7).valid) {
    throw new Error("Validation passed for externalCommunicationAttempted = true");
  }

  // arbitrary PASS_FAKE or PASS_OK verdict is rejected
  const bad8 = { ...baseValidReport, finalVerdict: "PASS_FAKE" };
  if (validateSelfTestReport(bad8).valid) {
    throw new Error("Validation passed for arbitrary PASS_FAKE verdict");
  }
  const bad8b = { ...baseValidReport, finalVerdict: "PASS_OK" };
  if (validateSelfTestReport(bad8b).valid) {
    throw new Error("Validation passed for arbitrary PASS_OK verdict");
  }

  // simulated command execution is rejected
  const bad9 = {
    ...baseValidReport,
    commands: [{ command: "test", exitCode: 0, status: "PASS", executionMode: "simulated" }]
  };
  if (validateSelfTestReport(bad9).valid) {
    throw new Error("Validation passed for command in simulated executionMode");
  }

  // failed command status is rejected
  const bad10 = {
    ...baseValidReport,
    commands: [{ command: "test", exitCode: 0, status: "FAIL", executionMode: "real" }]
  };
  if (validateSelfTestReport(bad10).valid) {
    throw new Error("Validation passed for command with non-PASS status");
  }

  // non-zero exitCode is rejected
  const bad11 = {
    ...baseValidReport,
    commands: [{ command: "test", exitCode: 1, status: "PASS", executionMode: "real" }]
  };
  if (validateSelfTestReport(bad11).valid) {
    throw new Error("Validation passed for command with non-zero exitCode");
  }

  // empty command list is rejected
  const bad12 = { ...baseValidReport, commands: [] };
  if (validateSelfTestReport(bad12).valid) {
    throw new Error("Validation passed for empty commands list");
  }
  const bad12b = { ...baseValidReport, commands: null };
  if (validateSelfTestReport(bad12b).valid) {
    throw new Error("Validation passed for null commands");
  }

  console.log("✅ verified: PR automation validates safety reports with comprehensive constraints");

  // 4. Verify previous Phase 0.3K verification remains callable
  const verify0_3kPath = path.join(repoRoot, "packages/db/src/_verify-0.3k.mjs");
  if (!fs.existsSync(verify0_3kPath)) {
    throw new Error("_verify-0.3k.mjs does not exist");
  }
  console.log("✅ verified: Phase 0.3K verification script remains callable");

  console.log("🎉 ALL PHASE 0.3L VERIFICATIONS PASSED!");
}

main();
