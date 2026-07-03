#!/usr/bin/env node
// scripts/ai-company-revenue-command-center-verify.mjs
// Milestone 1.0P — Revenue Command Center Verifier

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORKSPACE = process.cwd();
const REPORTS_DIR = path.join(WORKSPACE, "reports/revenue-command-center");
const VERIFY_REPORT = path.join(REPORTS_DIR, "verify-report.json");

console.log("[1.0P Verify] Running Revenue Command Center verifier...");

fs.mkdirSync(REPORTS_DIR, { recursive: true });

try {
  execSync("node packages/db/src/_verify-1.0p.mjs", { stdio: "inherit" });
  
  fs.writeFileSync(
    VERIFY_REPORT,
    JSON.stringify({ verdict: "REVENUE_COMMAND_CENTER_VERIFY_PASS", timestamp: "2026-07-03" }, null, 2)
  );
  console.log("[1.0P Verify] ✅ Verification PASSED.");
  console.log("[1.0P Verify] Final Verdict: REVENUE_COMMAND_CENTER_VERIFY_PASS");
} catch (err) {
  console.error(`[1.0P Verify] Verification FAILED: ${err.message}`);
  fs.writeFileSync(
    VERIFY_REPORT,
    JSON.stringify({ verdict: "REVENUE_COMMAND_CENTER_VERIFY_FAIL", error: err.message, timestamp: "2026-07-03" }, null, 2)
  );
  process.exit(1);
}
