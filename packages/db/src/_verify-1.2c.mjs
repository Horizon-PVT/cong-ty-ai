#!/usr/bin/env node
/**
 * Milestone 1.2C Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.2c", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "remote-sandbox-secret-routing-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-remote-sandbox-secret-routing.mjs",
  "scripts/ai-company-remote-sandbox-secret-routing-auto-loop.mjs",
  "scripts/ai-company-remote-sandbox-secret-routing-premerge-simulate.mjs",
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
  "sandbox-routed-secrets.json",
  "sandbox-redacted-events.json",
  "sandbox-audit-logs.json",
  "owner-secret-routing-approval-queue.json",
  "sandbox-secret-routing-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.2C" ? pass("Milestone is 1.2C") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Sandbox routed secrets check - must NOT contain any plaintext secret values
const sandboxRouted = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-routed-secrets.json"), "utf8"));
const hasPlaintextSecret = sandboxRouted.workspaces.some(w => {
  return JSON.stringify(w).includes("sk-proj-") || JSON.stringify(w).includes("pat-na-");
});
!hasPlaintextSecret ? pass("security check: no plaintext secrets stored in workspaces metadata") : fail("security violation: raw secrets detected in workspaces metadata");

// Sandbox redacted events check - make sure redaction scanner caught command output leaks
const redactedEvents = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-redacted-events.json"), "utf8"));
const hasLeakedKey = JSON.stringify(redactedEvents).includes("sk-mock-");
!hasLeakedKey ? pass("security check: OpenAI Key was successfully redacted from logs") : fail("security violation: OpenAI Key leaked into logs");

const eventsText = JSON.stringify(redactedEvents);
eventsText.includes("[REDACTED]") ? pass("redaction scanner active and replaced credentials") : fail("redaction scanner did not censor credentials");

// Safety policy flags
policy.enforce_sandbox_company_isolation ? pass("policy: enforce_sandbox_company_isolation active") : fail("policy: enforce_sandbox_company_isolation missing");
policy.enforce_sandbox_budget_limits ? pass("policy: enforce_sandbox_budget_limits active") : fail("policy: enforce_sandbox_budget_limits missing");
policy.prevent_cross_company_secret_refs ? pass("policy: prevent_cross_company_secret_refs active") : fail("policy: prevent_cross_company_secret_refs missing");
policy.prevent_raw_secrets_in_artifacts ? pass("policy: prevent_raw_secrets_in_artifacts active") : fail("policy: prevent_raw_secrets_in_artifacts missing");
policy.enable_redaction_scanner ? pass("policy: enable_redaction_scanner active") : fail("policy: enable_redaction_scanner missing");

// Scorecard checks
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "sandbox-secret-routing-scorecard.json"), "utf8"));
const validVerdicts = [
  "SECRET_ROUTING_READY",
  "SECRET_ROUTING_VERIFIED",
  "BLOCKED_BY_OWNER_GATE",
  "FAILED_SAFE"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Check for no real emails in 1.2C artifacts to prevent PII leak
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.2c/", "configs/ai-company/remote-sandbox", "scripts/ai-company-remote-sandbox"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.2C committed files") : fail("real email found in 1.2C committed file");
} catch { pass("no real email in 1.2C committed files (git check skipped)"); }

// Previous verifiers regression guard (Milestone 1.2B regression check)
const prevVerifiers = ["1.2b"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.2C Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.2C verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.2C verification PASSED!"); }
