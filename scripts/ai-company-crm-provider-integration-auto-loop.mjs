#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = 2;
let passes = 0;
console.log("[1.1B Auto-Loop] Starting CRM provider integration auto-loop...");
for (let i = 1; i <= REQUIRED + 1; i++) {
  console.log(`\n[Auto-Loop] Attempt ${i}...`);
  try {
    execSync("node scripts/ai-company-crm-provider-integration.mjs --provider dry_run --mode dry_run", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.1b.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
    console.log(`[Auto-Loop] Attempt ${i} PASSED. Consecutive passes: ${passes}/${REQUIRED}`);
    if (passes >= REQUIRED) { console.log(`\n[Auto-Loop] Stable passes: ${passes}/${REQUIRED}`); console.log("[Auto-Loop] Auto-loop completed successfully!"); process.exit(0); }
  } catch (e) { console.error(`[Auto-Loop] Attempt ${i} FAILED: ${e.message}`); passes = 0; process.exit(1); }
}
