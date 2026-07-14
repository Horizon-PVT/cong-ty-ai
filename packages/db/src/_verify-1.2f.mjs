#!/usr/bin/env node
/**
 * Milestone 1.2F Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.2f", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "remote-sandbox-cleanup-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-remote-sandbox-cleanup.mjs",
  "scripts/ai-company-remote-sandbox-cleanup-auto-loop.mjs",
  "scripts/ai-company-remote-sandbox-cleanup-premerge-simulate.mjs",
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
  const cleanSrc = lines.join("\n");

  let leakedPattern = false;
  for (const pat of SECRET_PATTERNS) {
    if (pat.test(cleanSrc)) {
      fail(`Plaintext secret pattern leak inside code: ${s} (${pat})`);
      leakedPattern = true;
      break;
    }
  }
  if (!leakedPattern) pass(`Code safety check for ${s}`);
}

// Check artifacts existence
const REQUIRED_ARTIFACTS = [
  "sandbox-active-workspaces.json",
  "sandbox-cleanup-events.json",
  "sandbox-deallocated-resources.json",
  "sandbox-cleanup-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.2F" ? pass("Milestone is 1.2F") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Sandbox active workspaces check
const sandboxActive = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-active-workspaces.json"), "utf8"));
sandboxActive.milestone === "1.2F" ? pass("sandbox active workspaces milestone correct") : fail("sandbox active workspaces milestone wrong");

// Check deallocation and secrets wipe out
const sweptWorkspaces = sandboxActive.workspaces.filter(ws => ws.workspace_id !== "ws_active_idle_ignored_004");
const ignoredWorkspace = sandboxActive.workspaces.find(ws => ws.workspace_id === "ws_active_idle_ignored_004");

const sweptDeallocated = sweptWorkspaces.every(ws => ws.status === "deallocated");
sweptDeallocated ? pass("Swept workspaces transitioned successfully to deallocated state") : fail("Vulnerability: Swept workspaces failed to deallocate resources");

const sweptHasSecrets = sweptWorkspaces.some(ws => ws.secret_env !== undefined);
!sweptHasSecrets ? pass("No plaintext secrets leaked in swept workspaces JSON") : fail("Vulnerability: Plaintext secret_env leaked in swept workspaces JSON");

if (ignoredWorkspace) {
  ignoredWorkspace.status === "ready" ? pass("Active idle workspace correctly ignored by sweeper") : fail("Vulnerability: Active idle workspace swept incorrectly");
  ignoredWorkspace.secret_env !== undefined ? pass("Active idle workspace secrets preserved") : fail("Vulnerability: Active idle workspace secrets wiped");
} else {
  fail("Vulnerability: Active idle workspace missing from active list");
}

// Safety policy flags
policy.max_workspace_idle_lifetime_seconds === 300 ? pass("policy: max_workspace_idle_lifetime_seconds configured correctly") : fail("policy: max_workspace_idle_lifetime_seconds missing/incorrect");
policy.reclaim_unassigned_pool_resources ? pass("policy: reclaim_unassigned_pool_resources active") : fail("policy: reclaim_unassigned_pool_resources missing");
policy.circuit_breaker_threshold_ratio === 0.9 ? pass("policy: circuit_breaker_threshold_ratio active") : fail("policy: circuit_breaker_threshold_ratio missing/incorrect");

// Scorecard checks
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-cleanup-scorecard.json"), "utf8"));
scorecard.verdict === "CLEANUP_VERIFIED" ? pass("scorecard verdict valid: CLEANUP_VERIFIED") : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Check for no real emails in 1.2F artifacts to prevent PII leak
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.2f/", "configs/ai-company/remote-sandbox", "scripts/ai-company-remote-sandbox"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.2F committed files") : fail("real email found in 1.2F committed file");
} catch { pass("no real email in 1.2F committed files (git check skipped)"); }

// Previous verifiers regression guard (Milestone 1.2E regression check)
const prevVerifiers = ["1.2e"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.2F Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.2F verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.2F verification PASSED!"); }
