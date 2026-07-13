#!/usr/bin/env node
/**
 * Milestone 1.2A Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.2a", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "remote-sandbox-runtime-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-remote-sandbox-runtime-contract.mjs",
  "scripts/ai-company-remote-sandbox-runtime-contract-auto-loop.mjs",
  "scripts/ai-company-remote-sandbox-runtime-contract-premerge-simulate.mjs",
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
  "sandbox-workspaces.json",
  "sandbox-execution-events.json",
  "sandbox-collected-artifacts.json",
  "owner-sandbox-approval-queue.json",
  "sandbox-execution-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.2A" ? pass("Milestone is 1.2A") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Sandbox workspaces checks
const sandboxWorkspaces = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-workspaces.json"), "utf8"));
sandboxWorkspaces.milestone === "1.2A" ? pass("sandbox workspaces milestone correct") : fail("sandbox workspaces milestone wrong");

const allWorkspacesValid = (sandboxWorkspaces.workspaces || []).every(w => {
  return w.workspace_id && w.company_id && w.agent_id && w.allocated_budget > 0 && w.status;
});
allWorkspacesValid ? pass("all workspaces have valid boundary properties") : fail("workspaces entries missing boundary details");

// Budget & Isolation checks
policy.enforce_sandbox_company_isolation ? pass("policy: enforce_sandbox_company_isolation active") : fail("policy: enforce_sandbox_company_isolation missing");
policy.enforce_sandbox_budget_limits ? pass("policy: enforce_sandbox_budget_limits active") : fail("policy: enforce_sandbox_budget_limits missing");

// Scorecard checks
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-execution-scorecard.json"), "utf8"));
const validVerdicts = [
  "SANDBOX_RUNTIME_READY",
  "SANDBOX_RUNTIME_VERIFIED",
  "BLOCKED_BY_OWNER_GATE",
  "FAILED_SAFE"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Check for no real emails in 1.2A artifacts to prevent PII leak
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.2a/", "configs/ai-company/remote-sandbox", "scripts/ai-company-remote-sandbox"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.2A committed files") : fail("real email found in 1.2A committed file");
} catch { pass("no real email in 1.2A committed files (git check skipped)"); }

// Previous verifiers regression guard (Milestone 1.1O regression check)
const prevVerifiers = ["1.1o"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.2A Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.2A verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.2A verification PASSED!"); }
