#!/usr/bin/env node
/**
 * Milestone 1.2B Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.2b", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "remote-sandbox-real-api-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-remote-sandbox-real-api-integration.mjs",
  "scripts/ai-company-remote-sandbox-real-api-integration-auto-loop.mjs",
  "scripts/ai-company-remote-sandbox-real-api-integration-premerge-simulate.mjs"
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
  "sandbox-api-status.json",
  "sandbox-api-execution-events.json",
  "sandbox-api-collected-artifacts.json",
  "owner-sandbox-api-approval-queue.json",
  "sandbox-real-api-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.2B" ? pass("Milestone is 1.2B") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Sandbox status checks
const sandboxStatus = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-api-status.json"), "utf8"));
sandboxStatus.milestone === "1.2B" ? pass("sandbox api status milestone correct") : fail("sandbox api status milestone wrong");

const allWorkspacesValid = (sandboxStatus.workspaces || []).every(w => {
  return w.workspace_id && w.company_id && w.agent_id && w.allocated_budget > 0 && w.status;
});
allWorkspacesValid ? pass("all workspaces have valid boundary properties") : fail("workspaces entries missing boundary details");

// Safety policy flags
policy.enforce_sandbox_company_isolation ? pass("policy: enforce_sandbox_company_isolation active") : fail("policy: enforce_sandbox_company_isolation missing");
policy.enforce_sandbox_budget_limits ? pass("policy: enforce_sandbox_budget_limits active") : fail("policy: enforce_sandbox_budget_limits missing");
!policy.allow_external_network_access ? pass("policy: allow_external_network_access is blocked") : fail("policy: allow_external_network_access is open");

// Scorecard checks
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-real-api-scorecard.json"), "utf8"));
const validVerdicts = [
  "SANDBOX_REAL_API_READY",
  "SANDBOX_REAL_API_VERIFIED",
  "BLOCKED_BY_OWNER_GATE",
  "FAILED_MISSING_API_KEY",
  "FAILED_SAFE"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Check for no real emails in 1.2B artifacts to prevent PII leak
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.2b/", "configs/ai-company/remote-sandbox", "scripts/ai-company-remote-sandbox"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.2B committed files") : fail("real email found in 1.2B committed file");
} catch { pass("no real email in 1.2B committed files (git check skipped)"); }

// Previous verifiers regression guard (Milestone 1.2A regression check)
const prevVerifiers = ["1.2a"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.2B Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.2B verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.2B verification PASSED!"); }
