import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

async function main() {
  console.log("Starting Phase 0.3P verification...");

  // 1. Verify missions file exists and is valid JSON
  const missionPath = path.join(repoRoot, "missions/phase-0.3p-first-product-task.json");
  if (!fs.existsSync(missionPath)) {
    throw new Error("missions/phase-0.3p-first-product-task.json does not exist");
  }
  console.log("✅ verified: missions/phase-0.3p-first-product-task.json exists");

  let mission = {};
  try {
    mission = JSON.parse(fs.readFileSync(missionPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse mission JSON: ${err.message}`);
  }
  console.log("✅ verified: mission JSON parses successfully");

  // 1.5. Static Scope Integrity Checks
  const allowed = mission.allowed_files || [];
  
  // Verify every expected changed file for this phase is listed in mission.allowed_files
  const expectedChanged = [
    "missions/phase-0.3p-first-product-task.json",
    "docs/ai-dev-factory-first-product-task.md",
    "docs/ai-dev-factory-execution-status.md",
    "packages/db/src/_verify-0.3p.mjs",
    "scripts/ai-dev-factory-self-test-gate.mjs"
  ];
  for (const file of expectedChanged) {
    if (!allowed.includes(file)) {
      throw new Error(`Expected changed file "${file}" is not listed in mission.allowed_files`);
    }
  }

  // Verify known forbidden runtime report files are not part of the allowed files
  const forbiddenSubstrings = [
    "reports/self-test/latest.json",
    "reports/self-test/latest.md",
    "reports/e2e",
    "reports/post-merge"
  ];
  for (const forbidden of forbiddenSubstrings) {
    for (const allowedFile of allowed) {
      if (allowedFile.includes(forbidden)) {
        throw new Error(`Forbidden runtime report file/pattern "${allowedFile}" is listed in allowed_files`);
      }
    }
  }

  // Dynamically check git diff against master using execSync
  let changedFiles = [];
  try {
    const diffOut = execSync("git diff master --name-only", { encoding: "utf8" });
    changedFiles = diffOut.split("\n").map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.warn("⚠️ Warning: Failed to run git diff (expected in environment without git). Checking presence only.");
  }

  if (changedFiles.length > 0) {
    // If pr-automation.mjs is changed, it must be listed
    const isPrAutomationChanged = changedFiles.some(f => f.includes("ai-dev-factory-pr-automation.mjs"));
    if (isPrAutomationChanged) {
      if (!allowed.includes("scripts/ai-dev-factory-pr-automation.mjs")) {
        throw new Error("scripts/ai-dev-factory-pr-automation.mjs is modified but not listed in allowed_files");
      }
    }

    // Verify _verify-0.3n.mjs is listed ONLY if it remains changed and has compatibility_notes
    const isVerify03nChanged = changedFiles.some(f => f.includes("_verify-0.3n.mjs"));
    if (isVerify03nChanged) {
      if (!allowed.includes("packages/db/src/_verify-0.3n.mjs")) {
        throw new Error("packages/db/src/_verify-0.3n.mjs is modified but not listed in allowed_files");
      }
      if (!mission.compatibility_notes) {
        throw new Error("packages/db/src/_verify-0.3n.mjs is modified but compatibility_notes are missing in mission JSON");
      }
    } else {
      if (allowed.includes("packages/db/src/_verify-0.3n.mjs")) {
        throw new Error("packages/db/src/_verify-0.3n.mjs is NOT modified but is listed in allowed_files");
      }
    }

    // Double check that no files are modified other than allowed files, and no forbidden reports are modified
    for (const changedFile of changedFiles) {
      if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest")) {
        throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
      }
      if (!allowed.includes(changedFile)) {
        throw new Error(`Out of scope file modification detected: "${changedFile}". Not in mission.allowed_files`);
      }
    }
  }
  console.log("✅ verified: static scope integrity checks passed successfully");

  // 2. Check mission content
  if (mission.phase !== "0.3P") {
    throw new Error(`Expected phase to be "0.3P", got "${mission.phase}"`);
  }
  if (mission.branch !== "chore/first-real-product-task-e2e") {
    throw new Error(`Expected branch to be "chore/first-real-product-task-e2e", got "${mission.branch}"`);
  }
  console.log("✅ verified: mission phase and branch are correct");

  // Check safety rules block critical actions
  const rulesText = JSON.stringify(mission.safety_rules || []);
  const blockedKeywords = ["deploy", "secret", "database", "spend", "communication"];
  for (const kw of blockedKeywords) {
    if (!rulesText.toLowerCase().includes(kw)) {
      throw new Error(`safety_rules does not appear to block keyword: "${kw}"`);
    }
  }
  console.log("✅ verified: mission contains safety rules blocking deploy/secrets/DB/spend/comms");

  // Check required verification commands
  if (!mission.verification_commands || mission.verification_commands.length === 0) {
    throw new Error("verification_commands is missing or empty");
  }
  console.log("✅ verified: mission contains required verification commands");

  // 3. Verify product doc exists and contains required wording
  const productDocPath = path.join(repoRoot, "docs/ai-dev-factory-first-product-task.md");
  if (!fs.existsSync(productDocPath)) {
    throw new Error("docs/ai-dev-factory-first-product-task.md does not exist");
  }
  console.log("✅ verified: docs/ai-dev-factory-first-product-task.md exists");

  const productDocContent = fs.readFileSync(productDocPath, "utf8");
  if (!productDocContent.includes("Phase 0.3P")) {
    throw new Error("Product capability doc does not mention Phase 0.3P");
  }
  if (!productDocContent.includes("Draft PR")) {
    throw new Error("Product capability doc does not mention Draft PR");
  }
  if (!productDocContent.includes("owner approval token")) {
    throw new Error("Product capability doc does not mention owner approval token");
  }
  console.log("✅ verified: product doc contains required wording references");

  // Make sure product doc does not instruct deploy, secret reads, external sending, or destructive DB
  const docLower = productDocContent.toLowerCase();
  const prohibitedPrompts = [
    "run deploy",
    "read secrets",
    "write secrets",
    "send email",
    "send sms",
    "drop database",
    "truncate database"
  ];
  for (const prompt of prohibitedPrompts) {
    if (docLower.includes(prompt)) {
      throw new Error(`Product doc violates safety instruction check by including: "${prompt}"`);
    }
  }
  console.log("✅ verified: product doc does not instruct blocked actions");

  // 4. Verify self-test gate includes verify-0.3p
  const selfTestPath = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  if (!fs.existsSync(selfTestPath)) {
    throw new Error("scripts/ai-dev-factory-self-test-gate.mjs does not exist");
  }
  const selfTestContent = fs.readFileSync(selfTestPath, "utf8");
  if (!selfTestContent.includes("verify-0.3p") || !selfTestContent.includes("verify-0.3p.mjs")) {
    throw new Error("self-test gate script does not register verify-0.3p");
  }
  if (!selfTestContent.includes('selectedPhase === "0.3p"') && !selfTestContent.includes("selectedPhase === '0.3p'")) {
    throw new Error("self-test gate script does not filter for 0.3p phase");
  }
  console.log("✅ verified: self-test gate includes verify-0.3p configuration");

  // 5. Verify execution status doc mentions Phase 0.3P
  const execStatusPath = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  if (!fs.existsSync(execStatusPath)) {
    throw new Error("docs/ai-dev-factory-execution-status.md does not exist");
  }
  const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
  if (!execStatusContent.includes("Phase 0.3P")) {
    throw new Error("docs/ai-dev-factory-execution-status.md does not mention Phase 0.3P");
  }
  console.log("✅ verified: execution status doc references Phase 0.3P");

  console.log("🎉 ALL PHASE 0.3P VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
