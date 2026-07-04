import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const LOGS_DIR = path.join(ROOT, "logs");
const PREMERGE_REPORT = path.join(LOGS_DIR, "email-sandbox-premerge-simulate-report.json");

console.log("[Premerge Simulate] Initializing 1.0S Email Sandbox Premerge Simulation...");

fs.mkdirSync(LOGS_DIR, { recursive: true });

try {
  // 1. Run historical verifiers
  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0n.mjs...");
  execSync("node packages/db/src/_verify-1.0n.mjs", { stdio: "inherit", cwd: ROOT });

  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0o.mjs...");
  execSync("node packages/db/src/_verify-1.0o.mjs", { stdio: "inherit", cwd: ROOT });

  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0p.mjs...");
  execSync("node packages/db/src/_verify-1.0p.mjs", { stdio: "inherit", cwd: ROOT });

  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0q.mjs...");
  execSync("node packages/db/src/_verify-1.0q.mjs", { stdio: "inherit", cwd: ROOT });

  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0r.mjs...");
  execSync("node packages/db/src/_verify-1.0r.mjs", { stdio: "inherit", cwd: ROOT });

  // 2. Run current verifier
  console.log("[Premerge Simulate] Running verifier: packages/db/src/_verify-1.0s.mjs...");
  execSync("node packages/db/src/_verify-1.0s.mjs", { stdio: "inherit", cwd: ROOT });

  // 3. Confirm runtime reports not tracked in Git
  console.log("[Premerge Simulate] Checking Git tracking status of runtime reports...");
  const tracked = execSync(
    "git ls-files reports/email-sandbox/ reports/owner-approval-workbench/ reports/self-test/latest.json reports/self-test/latest.md",
    { encoding: "utf8", cwd: ROOT }
  ).trim();
  if (tracked !== "") {
    throw new Error(`Runtime reports must not be tracked in Git. Found: ${tracked}`);
  }
  console.log("[Premerge Simulate] ✅ No runtime reports are tracked in Git");

  // 4. Check that runner does not hardcode forbidden artifact names
  console.log("[Premerge Simulate] Checking verifier meta-safety rules...");
  const runnerSrc = fs.readFileSync(path.join(ROOT, "scripts/ai-company-run-email-sandbox-mission.mjs"), "utf8");
  const forbidden = ["client-proposal.md", "objection-handling.md", "follow-up-plan.md", "package-comparison.md"];
  for (const f of forbidden) {
    if (runnerSrc.includes(f)) {
      throw new Error(`Runner script must not hardcode legacy filename: ${f}`);
    }
  }
  console.log("[Premerge Simulate] ✅ Runner does not hardcode forbidden artifact names");

  fs.writeFileSync(
    PREMERGE_REPORT,
    JSON.stringify({ verdict: "EMAIL_SANDBOX_PREMERGE_PASS", timestamp: "2026-07-04" }, null, 2),
    "utf8"
  );
  console.log("[Premerge Simulate] Wrote logs/email-sandbox-premerge-simulate-report.json");
  console.log("[Premerge Simulate] Final Verdict: EMAIL_SANDBOX_PREMERGE_PASS");

} catch (err) {
  console.error(`[Premerge Simulate] Premerge simulation failed: ${err.message}`);
  fs.writeFileSync(
    PREMERGE_REPORT,
    JSON.stringify({ verdict: "EMAIL_SANDBOX_PREMERGE_FAIL", error: err.message, timestamp: "2026-07-04" }, null, 2),
    "utf8"
  );
  process.exit(1);
}
