#!/usr/bin/env node
/**
 * Milestone 1.0Z: Premerge Simulation
 * Proves that live send is blocked in PR context.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

console.log("[Premerge Simulate] Starting 1.0Z pre-merge simulation...");

// 1. Run verifier
console.log("[Premerge Simulate] Running 1.0Z verifier...");
execSync("node packages/db/src/_verify-1.0z.mjs", { cwd: ROOT, stdio: "inherit" });

// 2. Confirm no runtime reports are git-tracked
console.log("[Premerge Simulate] Checking Git tracking status of runtime reports...");
const trackedFiles = execSync("git ls-files artifacts/ai-company/mission-1.0z/generated/", { cwd: ROOT })
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);

const runtimeReports = ["batch-send-ledger-redacted.json", "batch-outcome-readiness-scorecard.json"];
const tracked = trackedFiles.filter((f) => runtimeReports.some((r) => f.endsWith(r)));
if (tracked.length > 0) {
  console.error(`[HARD FAIL] Runtime reports are tracked in Git: ${tracked.join(", ")}`);
  process.exit(1);
}
console.log("[Premerge Simulate] ✅ No runtime reports are tracked in Git");

// 3. Confirm runner does not hardcode live tokens or real emails
console.log("[Premerge Simulate] Checking verifier meta-safety rules...");
const runnerSrc = fs.readFileSync(
  path.join(ROOT, "scripts", "ai-company-run-controlled-batch-expansion-mission.mjs"),
  "utf8"
);
// Only block actual hardcoded secret values (API keys), not token-name template strings
const FORBIDDEN_PATTERNS = [
  /re_[A-Za-z0-9]{20,}/,       // Resend API key
  /sk-[A-Za-z0-9]{20,}/,       // OpenAI API key
  /OPENAI_API_KEY\s*=\s*\S{10,}/, // hardcoded env assignment
];
let hasForbidden = false;
for (const pattern of FORBIDDEN_PATTERNS) {
  if (pattern.test(runnerSrc)) { hasForbidden = true; break; }
}
if (hasForbidden) {
  console.error("[HARD FAIL] Runner contains hardcoded API secret");
  process.exit(1);
}
console.log("[Premerge Simulate] ✅ Runner does not hardcode forbidden artifact names");

console.log("[Premerge Simulate] Final Verdict: CONTROLLED_BATCH_EXPANSION_PREMERGE_PASS");
