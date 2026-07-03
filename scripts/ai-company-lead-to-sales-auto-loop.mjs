#!/usr/bin/env node
// scripts/ai-company-lead-to-sales-auto-loop.mjs
// Milestone 1.0O — Auto-Loop runner

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORKSPACE = process.cwd();
const LOGS_DIR = path.join(WORKSPACE, "logs");
const AUTO_LOOP_REPORT = path.join(LOGS_DIR, "lead-to-sales-auto-loop-report.json");

console.log("[Auto-Loop] Initializing 1.0O Lead-to-Sales Pipeline Auto-Loop...");

fs.mkdirSync(LOGS_DIR, { recursive: true });

let consecutivePasses = 0;
const targetConsecutivePasses = 2;
const maxAttempts = 5;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`\n[Auto-Loop] --- ATTEMPT ${attempt}/${maxAttempts} ---`);
  
  try {
    console.log("[Auto-Loop] Running mission runner...");
    execSync("node scripts/ai-company-run-lead-to-sales-mission.mjs", { stdio: "inherit" });
    
    console.log("[Auto-Loop] Running verifier...");
    execSync("node scripts/ai-company-lead-to-sales-verify.mjs", { stdio: "inherit" });
    
    consecutivePasses++;
    console.log(`[Auto-Loop] Attempt ${attempt} PASSED. Consecutive passes: ${consecutivePasses}/${targetConsecutivePasses}`);
    
    if (consecutivePasses >= targetConsecutivePasses) {
      console.log(`\n[Auto-Loop] Stable passes achieved: ${consecutivePasses}/${targetConsecutivePasses}`);
      break;
    }
  } catch (err) {
    console.error(`[Auto-Loop] Attempt ${attempt} FAILED: ${err.message}`);
    consecutivePasses = 0;
  }
  
  if (attempt === maxAttempts) {
    console.error("\n[Auto-Loop] Max attempts reached without achieving stable passes.");
    fs.writeFileSync(
      AUTO_LOOP_REPORT,
      JSON.stringify({ verdict: "LEAD_TO_SALES_MISSION_UNSTABLE", attempts: attempt, timestamp: "2026-07-03" }, null, 2)
    );
    process.exit(1);
  }
}

fs.writeFileSync(
  AUTO_LOOP_REPORT,
  JSON.stringify({ verdict: "LEAD_TO_SALES_MISSION_STABLE_PASS", timestamp: "2026-07-03" }, null, 2)
);
console.log("[Auto-Loop] Wrote logs/lead-to-sales-auto-loop-report.json");
console.log("[Auto-Loop] Final Verdict: LEAD_TO_SALES_MISSION_STABLE_PASS");
