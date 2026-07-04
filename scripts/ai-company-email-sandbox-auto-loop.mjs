import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

console.log(`[Auto-Loop] Initializing auto-loop verification for Milestone 1.0S...`);

const maxAttempts = 3;
const targetPasses = 2;
let consecutivePasses = 0;
const history = [];

const SIMULATED_TIMESTAMPS = [
  "2026-07-04T09:25:40Z",
  "2026-07-04T09:25:50Z",
  "2026-07-04T09:26:00Z"
];

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`\n[Auto-Loop] Attempt ${attempt}/${maxAttempts}...`);
  const timestamp = SIMULATED_TIMESTAMPS[(attempt - 1) % SIMULATED_TIMESTAMPS.length];

  let runPassed = false;
  let errorMsg = null;

  try {
    console.log(`[Auto-Loop] Running mission runner...`);
    execSync(`node scripts/ai-company-run-email-sandbox-mission.mjs --apply`, { stdio: "inherit", cwd: ROOT });

    console.log(`[Auto-Loop] Running verifier...`);
    execSync(`node scripts/ai-company-email-sandbox-verify.mjs`, { stdio: "inherit", cwd: ROOT });

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
  milestone: "1.0S",
  consecutivePasses,
  targetPasses,
  history,
  stable: consecutivePasses >= targetPasses,
  finalVerdict: consecutivePasses >= targetPasses ? "EMAIL_SANDBOX_STABLE_PASS" : "EMAIL_SANDBOX_STABLE_FAIL"
};

fs.writeFileSync(
  path.join(logsDir, "email-sandbox-auto-loop-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);
console.log(`[Auto-Loop] Wrote logs/email-sandbox-auto-loop-report.json`);

if (consecutivePasses < targetPasses) {
  console.error(`[Auto-Loop] Failed to achieve stable passes.`);
  process.exit(1);
} else {
  console.log(`[Auto-Loop] Auto-loop completed successfully!`);
  process.exit(0);
}
