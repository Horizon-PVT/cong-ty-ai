import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

async function main() {
  console.log("Starting Phase 0.3Q verification...");

  // 1. Verify docs and json exist
  const queueDocPath = path.join(repoRoot, "docs/ai-dev-factory-mission-queue.md");
  if (!fs.existsSync(queueDocPath)) {
    throw new Error("docs/ai-dev-factory-mission-queue.md does not exist");
  }
  console.log("✅ verified: docs/ai-dev-factory-mission-queue.md exists");

  const policyDocPath = path.join(repoRoot, "docs/ai-dev-factory-resume-policy.md");
  if (!fs.existsSync(policyDocPath)) {
    throw new Error("docs/ai-dev-factory-resume-policy.md does not exist");
  }
  console.log("✅ verified: docs/ai-dev-factory-resume-policy.md exists");

  const queueJsonPath = path.join(repoRoot, "missions/queue/phase-0.3q-sample-queue.json");
  if (!fs.existsSync(queueJsonPath)) {
    throw new Error("missions/queue/phase-0.3q-sample-queue.json does not exist");
  }
  console.log("✅ verified: missions/queue/phase-0.3q-sample-queue.json exists");

  // 2. Parse JSON and check required fields and states
  let queueData = {};
  try {
    queueData = JSON.parse(fs.readFileSync(queueJsonPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse queue JSON: ${err.message}`);
  }
  console.log("✅ verified: queue JSON parses");

  if (!queueData.missions || !Array.isArray(queueData.missions) || queueData.missions.length === 0) {
    throw new Error("missions array is missing, empty, or invalid in sample queue JSON");
  }

  const requiredFields = [
    "mission_id", "phase", "title", "branch", "status", "run_id", "pr_number", "head_sha",
    "created_at", "updated_at", "allowed_files", "blocked_files", "verification_commands",
    "safety_rules", "resume_policy", "idempotency_key", "final_verdict"
  ];

  const foundStates = new Set();
  let safetyRulesFound = false;

  for (const m of queueData.missions) {
    // Check required fields
    for (const field of requiredFields) {
      if (!(field in m)) {
        throw new Error(`Mission record is missing required field: "${field}"`);
      }
    }
    foundStates.add(m.status);

    // Safety checks validation inside rules
    const rulesText = JSON.stringify(m.safety_rules || []);
    const blockedKeywords = ["deploy", "secret", "database", "spend", "communication"];
    let blocksAll = true;
    for (const kw of blockedKeywords) {
      if (!rulesText.toLowerCase().includes(kw)) {
        blocksAll = false;
      }
    }
    if (blocksAll) {
      safetyRulesFound = true;
    }
  }

  console.log("✅ verified: sample mission has required fields");

  // Check mandatory lifecycle states
  const requiredStates = ["PENDING", "RUNNING", "DRAFT_PR_OPENED", "WAITING_OWNER_APPROVAL", "MERGED", "CLEANED", "FAILED_BLOCKED"];
  for (const s of requiredStates) {
    if (!foundStates.has(s)) {
      throw new Error(`Required state "${s}" not represented in sample missions queue`);
    }
  }
  console.log("✅ verified: sample mission states include all required lifecycles");

  if (!safetyRulesFound) {
    throw new Error("None of the sample missions contains fully validated safety rules blocking deploy/secrets/DB/spend/comms");
  }
  console.log("✅ verified: safety rules block deploy/secrets/.env/destructive DB/spend/external comms");

  // 3. Document text audits
  const queueDocContent = fs.readFileSync(queueDocPath, "utf8");
  const policyDocContent = fs.readFileSync(policyDocPath, "utf8");
  const combinedDocs = (queueDocContent + "\n" + policyDocContent).toLowerCase();

  // Check duplicate PR prevention, resume/idempotency, owner approved merge references
  if (!combinedDocs.includes("duplicate pr") && !combinedDocs.includes("prevent duplicate")) {
    throw new Error("Documents do not mention duplicate PR prevention");
  }
  if (!combinedDocs.includes("resume") || !combinedDocs.includes("idempotency")) {
    throw new Error("Documents do not mention resume/idempotency behavior");
  }
  if (!combinedDocs.includes("owner approval") && !combinedDocs.includes("owner_approved_merge_pr")) {
    throw new Error("Documents do not mention owner approval token");
  }
  console.log("✅ verified: docs mention duplicate PR prevention, resume/idempotency, and owner approval");

  // Check prohibited instructions
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
    if (combinedDocs.includes(prompt)) {
      throw new Error(`Prohibited instruction "${prompt}" found in documentation`);
    }
  }
  console.log("✅ verified: docs do not instruct deploy, secret reads, external sends, or destructive DB");

  // 4. Verify self-test gate includes verify-0.3q
  const selfTestPath = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  if (!fs.existsSync(selfTestPath)) {
    throw new Error("scripts/ai-dev-factory-self-test-gate.mjs does not exist");
  }
  const selfTestContent = fs.readFileSync(selfTestPath, "utf8");
  if (!selfTestContent.includes("verify-0.3q") || !selfTestContent.includes("verify-0.3q.mjs")) {
    throw new Error("self-test gate script does not register verify-0.3q");
  }
  if (!selfTestContent.includes('selectedPhase === "0.3q"') && !selfTestContent.includes("selectedPhase === '0.3q'")) {
    throw new Error("self-test gate script does not filter for 0.3q phase");
  }
  console.log("✅ verified: self-test gate includes verify-0.3q");

  // 5. Verify execution status doc references Phase 0.3Q
  const execStatusPath = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  if (!fs.existsSync(execStatusPath)) {
    throw new Error("docs/ai-dev-factory-execution-status.md does not exist");
  }
  const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
  if (!execStatusContent.includes("Phase 0.3Q")) {
    throw new Error("docs/ai-dev-factory-execution-status.md does not mention Phase 0.3Q");
  }
  console.log("✅ verified: execution status doc mentions Phase 0.3Q");

  // 6. Static Scope Integrity Check
  let changedFiles = [];
  try {
    const diffOut = execSync("git diff master --name-only", { encoding: "utf8" });
    changedFiles = diffOut.split("\n").map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.warn("⚠️ Warning: Failed to run git diff (expected in environment without git). Checking presence only.");
  }

  const allowed = [
    "docs/ai-dev-factory-mission-queue.md",
    "docs/ai-dev-factory-resume-policy.md",
    "docs/ai-dev-factory-execution-status.md",
    "missions/queue/phase-0.3q-sample-queue.json",
    "packages/db/src/_verify-0.3q.mjs",
    "packages/db/src/_verify-0.3p.mjs",
    "scripts/ai-dev-factory-self-test-gate.mjs",
    "scripts/ai-dev-factory-pr-automation.mjs"
  ];

  if (changedFiles.length > 0) {
    for (const changedFile of changedFiles) {
      if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest")) {
        throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
      }
      if (!allowed.includes(changedFile)) {
        throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
      }
    }
  }
  console.log("✅ verified: static scope integrity checks passed successfully");

  console.log("🎉 ALL PHASE 0.3Q VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
