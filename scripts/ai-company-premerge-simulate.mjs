// ai-company-premerge-simulate.mjs
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

console.log("[Premerge Simulate] Initializing Pre-Merge Simulation for PR #26...");

const checks = {
  self_test_gate: "FAIL",
  verify_1_0i: "FAIL",
  adapter_validate: "FAIL"
};

let status = "PASS";

// 1. Adapter validate
try {
  console.log("[Premerge Simulate] Running adapter validation...");
  execSync("node scripts/ai-company-paperclip-read-adapter-validate.mjs --target all --write-report --explain", { cwd: repoRoot, stdio: "inherit" });
  checks.adapter_validate = "PASS";
} catch (e) {
  status = "FAIL";
  console.error(`[Premerge Simulate] Adapter validation failed: ${e.message}`);
}

// 2. verify-1.0i
try {
  console.log("[Premerge Simulate] Running verify-1.0i verifier...");
  execSync("node packages/db/src/_verify-1.0i.mjs", { cwd: repoRoot, stdio: "inherit" });
  checks.verify_1_0i = "PASS";
} catch (e) {
  status = "FAIL";
  console.error(`[Premerge Simulate] verify-1.0i verifier failed: ${e.message}`);
}

// 3. self-test gate
try {
  console.log("[Premerge Simulate] Running self-test gate...");
  execSync("node scripts/ai-dev-factory-self-test-gate.mjs --phase 1.0i --dry-run --write-report", { cwd: repoRoot, stdio: "inherit" });
  checks.self_test_gate = "PASS";
} catch (e) {
  status = "FAIL";
  console.error(`[Premerge Simulate] Self-test gate failed: ${e.message}`);
}

const finalReport = {
  premerge_status: status,
  checks
};

const logsDir = path.join(repoRoot, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(logsDir, "premerge-simulate-report.json"),
  JSON.stringify(finalReport, null, 2) + "\n"
);
console.log(`[Premerge Simulate] Report saved to logs/premerge-simulate-report.json`);

if (status === "FAIL") {
  console.error("[Premerge Simulate] Pre-merge simulation FAILED.");
  process.exit(1);
}

console.log("[Premerge Simulate] Success.");
