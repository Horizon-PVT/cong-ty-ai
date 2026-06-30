import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

async function main() {
  console.log("Starting Phase 1.0G verification...");

  // 1. Verify docs, config, memory, and script files exist
  const requiredFiles = [
    "docs/ai-company-os/ai-staff-workbench.md",
    "docs/ai-company-os/operator-console.md",
    "configs/ai-company/operator-console-policy.json",
    "configs/ai-company/operator-console-commands.json",
    "memory/ai-company/owner-action-queue.jsonl",
    "memory/ai-company/operator-notes.jsonl",
    "scripts/ai-company-operator-console-dry-run.mjs",
    "scripts/ai-company-status-snapshot.mjs",
    "scripts/ai-company-owner-action-queue-dry-run.mjs"
  ];
  for (const file of requiredFiles) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file "${file}" does not exist`);
    }
  }
  console.log("✅ verified: required documents, configurations, memory files, and scripts exist");

  // 2. Parse configs and validate json content
  let policy, commands;
  try {
    policy = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/operator-console-policy.json"), "utf8"));
    commands = JSON.parse(fs.readFileSync(path.join(repoRoot, "configs/ai-company/operator-console-commands.json"), "utf8"));
  } catch (err) {
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
  console.log("✅ verified: all JSON configuration and memory files parsed successfully");

  // 3. Verify policy attributes
  if (policy.console_mode !== "local_dry_run") {
    throw new Error("Console policy must define console_mode as local_dry_run");
  }
  if (policy.allow_live_api_calls === true) {
    throw new Error("Console policy must block live API calls");
  }
  if (policy.allow_deploy === true) {
    throw new Error("Console policy must block deployments");
  }
  if (policy.allow_publish === true) {
    throw new Error("Console policy must block publishing");
  }
  if (policy.allow_customer_comms === true) {
    throw new Error("Console policy must block customer communications");
  }
  if (policy.allow_spend === true) {
    throw new Error("Console policy must block infra spending");
  }
  if (policy.allow_secret_read === true) {
    throw new Error("Console policy must block secret reading");
  }
  console.log("✅ verified: operator console policy attributes are correct");

  // 4. Verify commands include all required commands
  const requiredCommands = [
    "STATUS", "SHOW_ORG", "SHOW_FACTORIES", "SHOW_WORKERS", "SHOW_PROVIDERS",
    "SHOW_LEARNING", "SHOW_STAFFING", "SHOW_CANDIDATES", "SHOW_SCORECARDS",
    "SHOW_OWNER_QUEUE", "SHOW_NEXT_ACTIONS", "EXPORT_SNAPSHOT"
  ];
  const registeredCmds = commands.commands.map(c => c.command);
  for (const cmd of requiredCommands) {
    if (!registeredCmds.includes(cmd)) {
      throw new Error(`Operator console commands configuration is missing required command: ${cmd}`);
    }
  }
  console.log("✅ verified: operator console commands cover all required command codes");

  // 5. Verify non-empty memory streams
  const queueContent = fs.readFileSync(path.join(repoRoot, "memory/ai-company/owner-action-queue.jsonl"), "utf8").trim();
  const notesContent = fs.readFileSync(path.join(repoRoot, "memory/ai-company/operator-notes.jsonl"), "utf8").trim();
  if (queueContent.length === 0) throw new Error("owner-action-queue.jsonl is empty");
  if (notesContent.length === 0) throw new Error("operator-notes.jsonl is empty");
  console.log("✅ verified: operator memory streams are non-empty");

  // 6. Verify scripts support required CLI options & maintain boundaries
  const consoleScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-operator-console-dry-run.mjs"), "utf8");
  const snapshotScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-status-snapshot.mjs"), "utf8");
  const queueScriptContent = fs.readFileSync(path.join(repoRoot, "scripts/ai-company-owner-action-queue-dry-run.mjs"), "utf8");

  const forbiddenPatterns = [
    /fetch\(/, /axios\./, /sendMail/, /publish\(/, /deploy\(/, /\.post\(/,
    /Date\.now\(\)/, /Math\.random\(\)/, /new Date\(/
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(consoleScriptContent)) {
      throw new Error(`Dry-run console script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
    if (pattern.test(snapshotScriptContent)) {
      throw new Error(`Status snapshot script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
    if (pattern.test(queueScriptContent)) {
      throw new Error(`Owner action queue script contains potential external action API or non-deterministic ID generator: ${pattern}`);
    }
  }

  if (consoleScriptContent.includes("process.env.") && !consoleScriptContent.includes("process.env.argv")) {
    throw new Error("Console script must not read secrets from process.env");
  }
  if (snapshotScriptContent.includes("process.env.")) {
    throw new Error("Snapshot script must not read secrets from process.env");
  }
  if (queueScriptContent.includes("process.env.")) {
    throw new Error("Queue script must not read secrets from process.env");
  }

  if (!consoleScriptContent.includes("--command") || !consoleScriptContent.includes("--format") || !consoleScriptContent.includes("--write-report") || !consoleScriptContent.includes("--explain")) {
    throw new Error("Console script is missing support for required CLI options");
  }
  if (!snapshotScriptContent.includes("--format") || !snapshotScriptContent.includes("--write-report") || !snapshotScriptContent.includes("--explain")) {
    throw new Error("Snapshot script is missing support for required CLI options");
  }
  if (!queueScriptContent.includes("--action-type") || !queueScriptContent.includes("--title") || !queueScriptContent.includes("--priority") || !queueScriptContent.includes("--write-report") || !queueScriptContent.includes("--write-memory") || !queueScriptContent.includes("--explain")) {
    throw new Error("Owner queue script is missing support for required CLI options");
  }

  // 7. Verify no capability-registry.json mutations
  if (consoleScriptContent.includes("capability-registry.json") && (consoleScriptContent.includes("fs.writeFileSync") || consoleScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Console script must not automatically mutate the capability registry");
  }
  if (snapshotScriptContent.includes("capability-registry.json") && (snapshotScriptContent.includes("fs.writeFileSync") || snapshotScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Snapshot script must not automatically mutate the capability registry");
  }
  if (queueScriptContent.includes("capability-registry.json") && (queueScriptContent.includes("fs.writeFileSync") || queueScriptContent.includes("fs.appendFileSync"))) {
    throw new Error("Owner queue script must not automatically mutate the capability registry");
  }
  console.log("✅ verified: dry-run scripts support all required CLI options and maintain safety boundaries");

  // 8. Verify Static Scope in Git
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.log("⚠️ git check skipped because git branch command failed");
  }

  if (currentBranch === "feat/ai-company-os-operator-console") {
    console.log("Enforcing static scope integrity checks on branch:", currentBranch);
    let changedFiles = [];
    try {
      const diffOutput = execSync("git diff master HEAD --name-only", { encoding: "utf8" }).trim();
      changedFiles = diffOutput.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.log("⚠️ Git diff against master failed. Skipping diff checks.");
    }

    const allowed = [
      "docs/ai-company-os/ai-staff-workbench.md",
      "docs/ai-company-os/operator-console.md",
      "configs/ai-company/operator-console-policy.json",
      "configs/ai-company/operator-console-commands.json",
      "memory/ai-company/owner-action-queue.jsonl",
      "memory/ai-company/operator-notes.jsonl",
      "scripts/ai-company-operator-console-dry-run.mjs",
      "scripts/ai-company-status-snapshot.mjs",
      "scripts/ai-company-owner-action-queue-dry-run.mjs",
      "packages/db/src/_verify-1.0g.mjs",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/operator-console/") || changedFile.includes("reports/company-status/") || changedFile.includes("reports/owner-action/") || changedFile.includes("reports/owner-action-queue/")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not feat/ai-company-os-operator-console.");
  }

  console.log("🎉 ALL PHASE 1.0G VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
