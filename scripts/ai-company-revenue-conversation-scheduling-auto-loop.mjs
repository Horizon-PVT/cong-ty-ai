#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = 2;
let passes = 0;

console.log("[1.1C Auto-Loop] Starting Revenue Conversation Scheduling auto-loop...");

for (let i = 1; i <= REQUIRED + 1; i++) {
  console.log(`\n[Auto-Loop] Attempt ${i}...`);
  try {
    execSync("node scripts/ai-company-revenue-conversation-scheduling.mjs --provider dry_run --mode dry_run", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.1c.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
    console.log(`[Auto-Loop] Attempt ${i} PASSED. Consecutive passes: ${passes}/${REQUIRED}`);
    if (passes >= REQUIRED) {
      console.log(`\n[Auto-Loop] Stable passes achieved: ${passes}/${REQUIRED}`);
      console.log("[Auto-Loop] Auto-loop completed successfully!");
      process.exit(0);
    }
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} FAILED: ${e.message}`);
    process.exit(1);
  }
}
