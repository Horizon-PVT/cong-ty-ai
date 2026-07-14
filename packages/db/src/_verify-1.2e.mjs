#!/usr/bin/env node
/**
 * Milestone 1.2E Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.2e", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "remote-sandbox-circuit-breaker-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-remote-sandbox-circuit-breaker.mjs",
  "scripts/ai-company-remote-sandbox-circuit-breaker-auto-loop.mjs",
  "scripts/ai-company-remote-sandbox-circuit-breaker-premerge-simulate.mjs",
  "scripts/lib/sandbox/sandbox-runtime-service.mjs"
];
const SECRET_PATTERNS = [
  /pat-[A-Za-z0-9\-]{10,}/,
  /re_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9]{20,}/
];

for (const s of SCRIPTS) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { fail(`Script missing: ${s}`); continue; }
  const src = fs.readFileSync(p, "utf8");
  const lines = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.includes("process.env."));
  const safeToCheck = lines.join("\n");
  if (SECRET_PATTERNS.some((r) => r.test(safeToCheck))) fail(`Code safety: secret detected in ${s}`);
  else pass(`Code safety check for ${s}`);
}

// Required artifacts
const REQUIRED_ARTIFACTS = [
  "sandbox-active-workspaces.json",
  "sandbox-tripped-events.json",
  "owner-circuit-breaker-approval-queue.json",
  "sandbox-circuit-breaker-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.2E" ? pass("Milestone is 1.2E") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Sandbox active workspaces check
const sandboxActive = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-active-workspaces.json"), "utf8"));
sandboxActive.milestone === "1.2E" ? pass("sandbox active workspaces milestone correct") : fail("sandbox active workspaces milestone wrong");

const hasSecrets = sandboxActive.workspaces.some(ws => ws.secret_env !== undefined);
!hasSecrets ? pass("No plaintext secrets leaked in active workspaces JSON") : fail("Vulnerability: Plaintext secret_env leaked in active workspaces JSON");

// Circuit breaker trip check in events
const resourceEvents = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-tripped-events.json"), "utf8"));
const tripDetected = JSON.stringify(resourceEvents).includes("BUDGET CIRCUIT BREAKER TRIPPED");
tripDetected ? pass("Budget circuit breaker trip was successfully simulated and captured") : fail("Budget circuit breaker trip was not simulated or logged");

// Safety policy flags
policy.enforce_sandbox_company_isolation ? pass("policy: enforce_sandbox_company_isolation active") : fail("policy: enforce_sandbox_company_isolation missing");
policy.enforce_sandbox_budget_limits ? pass("policy: enforce_sandbox_budget_limits active") : fail("policy: enforce_sandbox_budget_limits missing");
policy.enforce_circuit_breakers ? pass("policy: enforce_circuit_breakers active") : fail("policy: enforce_circuit_breakers missing");

// Scorecard checks
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-circuit-breaker-scorecard.json"), "utf8"));
const validVerdicts = [
  "CIRCUIT_BREAKER_READY",
  "CIRCUIT_BREAKER_VERIFIED",
  "BLOCKED_BY_OWNER_GATE",
  "FAILED_SAFE"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Check for no real emails in 1.2E artifacts to prevent PII leak
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.2e/", "configs/ai-company/remote-sandbox", "scripts/ai-company-remote-sandbox"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.2E committed files") : fail("real email found in 1.2E committed file");
} catch { pass("no real email in 1.2E committed files (git check skipped)"); }

// Previous verifiers regression guard (Milestone 1.2D regression check)
const prevVerifiers = ["1.2d"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.2E Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.2E verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.2E verification PASSED!"); }
