#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT_PATH = path.join(ROOT, "configs", "ai-company", "owner-decision-input.1.1j.json");

function setDecision(decision) {
  const data = { decisions: [{ recipient_id: "rec_pilot_002", decision, reason: "Auto-loop simulated choice" }] };
  fs.writeFileSync(INPUT_PATH, JSON.stringify(data, null, 2));
}

console.log("[1.1J Auto-Loop] Starting Owner Decision Execution auto-loop...");

const CASES = ["approve", "reject", "request_revision", "defer"];

for (const c of CASES) {
  console.log(`\n[Auto-Loop] Simulating decision case: ${c}...`);
  setDecision(c);

  try {
    execSync("node scripts/ai-company-owner-decision-execution.mjs --mode dry_run --timezone America/New_York", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.1j.mjs", { cwd: ROOT, stdio: "inherit" });
  } catch (e) {
    console.error(`[Auto-Loop] Decision case ${c} (dry_run) FAILED: ${e.message}`);
    process.exit(1);
  }

  console.log(`\n[Auto-Loop] Simulating decision case: ${c} (sandbox mode)...`);
  try {
    execSync("node scripts/ai-company-owner-decision-execution.mjs --mode sandbox --timezone America/New_York", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, OWNER_APPROVED_DECISION_COMMIT_TOKEN: "" }
    });
    execSync("node packages/db/src/_verify-1.1j.mjs", { cwd: ROOT, stdio: "inherit" });
  } catch (e) {
    console.error(`[Auto-Loop] Decision case ${c} (sandbox) FAILED: ${e.message}`);
    process.exit(1);
  }
}

// Reset to default approved
setDecision("approve");
console.log("\n[Auto-Loop] Reset decision parameters to default approve.");
console.log("[Auto-Loop] Auto-loop completed successfully!");
process.exit(0);
