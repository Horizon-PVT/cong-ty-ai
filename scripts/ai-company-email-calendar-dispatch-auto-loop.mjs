#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = 2;
let passes = 0;

console.log("[1.1F Auto-Loop] Starting Email Calendar Dispatch auto-loop...");

for (let i = 1; i <= REQUIRED; i++) {
  console.log(`\n[Auto-Loop] Attempt ${i} (dry_run)...`);
  try {
    execSync("node scripts/ai-company-email-calendar-dispatch.mjs --provider dry_run --mode dry_run --timezone America/New_York", { cwd: ROOT, stdio: "inherit" });
    execSync("node packages/db/src/_verify-1.1f.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (dry_run) FAILED: ${e.message}`);
    process.exit(1);
  }

  console.log(`\n[Auto-Loop] Attempt ${i} (sandbox)...`);
  try {
    execSync("node scripts/ai-company-email-calendar-dispatch.mjs --provider resend --mode sandbox --timezone America/New_York", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, EMAIL_FAKE_PROVIDER: "true" }
    });
    execSync("node packages/db/src/_verify-1.1f.mjs", { cwd: ROOT, stdio: "inherit" });
    passes++;
  } catch (e) {
    console.error(`[Auto-Loop] Attempt ${i} (sandbox) FAILED: ${e.message}`);
    process.exit(1);
  }
}

console.log(`\n[Auto-Loop] Stable passes achieved: ${passes}/${REQUIRED * 2}`);
console.log("[Auto-Loop] Auto-loop completed successfully!");
process.exit(0);
