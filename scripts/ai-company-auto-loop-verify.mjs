// ai-company-auto-loop-verify.mjs
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

console.log("[Auto-Loop Verify] Initializing E2E Auto-Verification Loop...");

const maxIterations = 5;
const consecutiveRequired = 2;

const commandsToRun = [
  {
    name: "adapter_validate",
    cmd: "node scripts/ai-company-paperclip-read-adapter-validate.mjs --target all --write-report --explain"
  },
  {
    name: "widget_company_status",
    cmd: "node scripts/ai-company-paperclip-widget-payload-dry-run.mjs --widget company_status --format json --write-report --explain"
  },
  {
    name: "widget_owner_action_queue",
    cmd: "node scripts/ai-company-paperclip-widget-payload-dry-run.mjs --widget owner_action_queue --format json --write-report --explain"
  },
  {
    name: "verify_1_0i",
    cmd: "node packages/db/src/_verify-1.0i.mjs"
  },
  {
    name: "self_test_gate",
    cmd: "node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0i --dry-run --write-report"
  }
];

const iterationResults = [];
let consecutivePasses = 0;
let converged = false;

for (let iter = 1; iter <= maxIterations; iter++) {
  console.log(`\n--- Iteration ${iter}/${maxIterations} ---`);
  const steps = [];
  let allPass = true;

  for (const step of commandsToRun) {
    console.log(`[Auto-Loop Verify] Running step: ${step.name}...`);
    try {
      execSync(step.cmd, { cwd: repoRoot, stdio: "inherit" });
      steps.push({ name: step.name, status: "PASS" });
    } catch (err) {
      console.log(`[Auto-Loop Verify] Step failed: ${step.name}`);
      steps.push({ name: step.name, status: "FAIL", error: err.message });
      allPass = false;
    }
  }

  iterationResults.push({
    iteration: iter,
    steps,
    status: allPass ? "PASS" : "FAIL"
  });

  if (allPass) {
    consecutivePasses++;
    console.log(`[Auto-Loop Verify] Iteration ${iter} PASSED. Consecutive passes: ${consecutivePasses}/${consecutiveRequired}`);
  } else {
    consecutivePasses = 0;
    console.log(`[Auto-Loop Verify] Iteration ${iter} FAILED. Resetting consecutive passes.`);
  }

  if (consecutivePasses >= consecutiveRequired) {
    converged = true;
    console.log(`[Auto-Loop Verify] Convergence achieved after ${iter} iterations.`);
    break;
  }
}

const finalReport = {
  iteration_results: iterationResults,
  convergence_status: converged ? "converged" : "failed",
  stable_passes: consecutivePasses
};

const logsDir = path.join(repoRoot, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(logsDir, "ai-loop-report.json"),
  JSON.stringify(finalReport, null, 2) + "\n"
);
console.log(`[Auto-Loop Verify] Report saved to logs/ai-loop-report.json`);

if (!converged) {
  console.error("[Auto-Loop Verify] Convergence FAILED. Validation is unstable.");
  process.exit(1);
}

console.log("[Auto-Loop Verify] Success.");
