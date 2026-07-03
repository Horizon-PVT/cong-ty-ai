#!/usr/bin/env node
// scripts/ai-company-owner-approval-workbench-verify.mjs
// Milestone 1.0Q — Owner Approval Workbench Verifier

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORKSPACE = process.cwd();
const REPORTS_DIR = path.join(WORKSPACE, "reports/owner-approval-workbench");
const VERIFY_REPORT = path.join(REPORTS_DIR, "verify-report.json");

console.log("[1.0Q Verify] Running Owner Approval Workbench verifier...");

fs.mkdirSync(REPORTS_DIR, { recursive: true });

try {
  execSync("node packages/db/src/_verify-1.0q.mjs", { stdio: "inherit" });
  
  fs.writeFileSync(
    VERIFY_REPORT,
    JSON.stringify({ verdict: "OWNER_APPROVAL_WORKBENCH_VERIFY_PASS", timestamp: "2026-07-03" }, null, 2)
  );
  console.log("[1.0Q Verify] ✅ Verification PASSED.");
  console.log("[1.0Q Verify] Final Verdict: OWNER_APPROVAL_WORKBENCH_VERIFY_PASS");
} catch (err) {
  console.error(`[1.0Q Verify] Verification FAILED: ${err.message}`);
  fs.writeFileSync(
    VERIFY_REPORT,
    JSON.stringify({ verdict: "OWNER_APPROVAL_WORKBENCH_VERIFY_FAIL", error: err.message, timestamp: "2026-07-03" }, null, 2)
  );
  process.exit(1);
}
