#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = 2;
let passes = 0;

console.log("[1.1G Auto-Loop] Starting Follow-up Trigger auto-loop...");

for (let i = 1; i <= REQUIRED; i++) {
  console.log(`\n[Auto-Loop] Attempt ${i} (dry_run)...`);
  try {
    execSync("node scripts/ai-company-followup-trigger.mjs --mode dry_run --timezone America/New_York", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.1g.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (dry_run) FAILED: ${e.message}`);
    process.exit(1);
  }

  console.log(`\n[Auto-Loop] Attempt ${i} (sandbox with signal overrides)...`);
  try {
    // Override a recipient signal to replied to test terminal response gate
    execSync("node scripts/ai-company-followup-trigger.mjs --mode sandbox --timezone America/New_York --signal=rec_pilot_002:replied", {
      cwd: ROOT,
      stdio: "inherit"
    });
    execSync("node packages/db/src/_verify-1.1g.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (sandbox) FAILED: ${e.message}`);
    process.exit(1);
  }
}

console.log(`\n[Auto-Loop] Stable passes achieved: ${passes}/${REQUIRED * 2}`);
console.log("[Auto-Loop] Auto-loop completed successfully!");
process.exit(0);
