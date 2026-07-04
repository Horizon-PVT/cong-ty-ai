import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

console.log(`[Auto-Loop] Initializing auto-loop verification for Milestone 1.0R...`);

const maxAttempts = 3;
const targetPasses = 2;
let consecutivePasses = 0;
const history = [];

// Deterministic Time
let simulatedTime = 1776587944000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`\n[Auto-Loop] Attempt ${attempt}/${maxAttempts}...`);
  simulatedTime += 20000;
  const timestamp = new Date(simulatedTime).toISOString();

  let runPassed = false;
  let errorMsg = null;

  try {
    console.log(`[Auto-Loop] Running mission runner...`);
    execSync(`node scripts/ai-company-run-live-action-gateway-mission.mjs --apply`, { stdio: "inherit", cwd: ROOT });

    console.log(`[Auto-Loop] Running verifier...`);
    execSync(`node scripts/ai-company-live-action-gateway-verify.mjs`, { stdio: "inherit", cwd: ROOT });

    runPassed = true;
    consecutivePasses++;
    console.log(`[Auto-Loop] Attempt ${attempt} PASSED. Consecutive passes: ${consecutivePasses}/${targetPasses}`);
  } catch (err) {
    consecutivePasses = 0;
    errorMsg = err.message;
    console.error(`[Auto-Loop] Attempt ${attempt} FAILED:`, errorMsg);
  }

  history.push({
    attempt,
    timestamp,
    passed: runPassed,
    error: errorMsg
  });

  if (consecutivePasses >= targetPasses) {
    console.log(`\n[Auto-Loop] Stable passes achieved: ${consecutivePasses}/${targetPasses}`);
    break;
  }
}

const logsDir = path.join(ROOT, "logs");
fs.mkdirSync(logsDir, { recursive: true });

const report = {
  milestone: "1.0R",
  consecutivePasses,
  targetPasses,
  history,
  stable: consecutivePasses >= targetPasses,
  finalVerdict: consecutivePasses >= targetPasses ? "LIVE_ACTION_GATEWAY_STABLE_PASS" : "LIVE_ACTION_GATEWAY_STABLE_FAIL"
};

fs.writeFileSync(
  path.join(logsDir, "live-action-gateway-auto-loop-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);
console.log(`[Auto-Loop] Wrote logs/live-action-gateway-auto-loop-report.json`);

if (consecutivePasses < targetPasses) {
  console.error(`[Auto-Loop] Failed to achieve stable passes.`);
  process.exit(1);
} else {
  console.log(`[Auto-Loop] Auto-loop completed successfully!`);
  process.exit(0);
}
