#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = 2;
let passes = 0;

console.log("[1.1L Auto-Loop] Starting Live Revenue Commit Outcome Verification & Recovery auto-loop...");

for (let i = 1; i <= REQUIRED; i++) {
  console.log(`\n[Auto-Loop] Attempt ${i} (dry_run)...`);
  try {
    execSync("node scripts/ai-company-live-revenue-commit-outcome-recovery.mjs --mode dry_run --timezone America/New_York", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.1l.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (dry_run) FAILED: ${e.message}`);
    process.exit(1);
  }

  console.log(`\n[Auto-Loop] Attempt ${i} (sandbox block checks)...`);
  try {
    execSync("node scripts/ai-company-live-revenue-commit-outcome-recovery.mjs --mode sandbox --timezone America/New_York", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, OWNER_APPROVED_DECISION_COMMIT_TOKEN: "" }
    });
    execSync("node packages/db/src/_verify-1.1l.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (sandbox) FAILED: ${e.message}`);
    process.exit(1);
  }
}

console.log(`\n[Auto-Loop] Stable passes achieved: ${passes}/${REQUIRED * 2}`);
console.log("[Auto-Loop] Auto-loop completed successfully!");
process.exit(0);
