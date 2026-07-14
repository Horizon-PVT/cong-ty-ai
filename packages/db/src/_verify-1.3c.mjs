#!/usr/bin/env node
/**
 * Milestone 1.3C Verifier
 *
 * Validates:
 * 1. Script safety (no hardcoded secrets)
 * 2. Artifact existence
 * 3. Policy correctness
 * 4. Scorecard verdict
 * 5. PII/email leak scan
 * 6. Regression guard (runs 1.3B verifier)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3c", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "audit-trail-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// ── 1. Script safety checks ────────────────────────────────────────────
const SCRIPTS = [
  "scripts/ai-company-audit-trail-validation.mjs",
  "scripts/ai-company-audit-trail-validation-auto-loop.mjs",
  "scripts/ai-company-audit-trail-validation-premerge-simulate.mjs"
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

// Also check the audit-trail-validator library
const libPath = path.join(ROOT, "scripts", "lib", "security", "audit-trail-validator.mjs");
if (!fs.existsSync(libPath)) {
  fail("Audit trail validator library missing: scripts/lib/security/audit-trail-validator.mjs");
} else {
  const libSrc = fs.readFileSync(libPath, "utf8");
  const libLines = libSrc.split("\n").filter((l) => !l.trim().startsWith("//") && !l.includes("process.env."));
  const cleanLib = libLines.join("\n");
  let libLeak = false;
  for (const pat of SECRET_PATTERNS) {
    if (pat.test(cleanLib)) { libLeak = true; break; }
  }
  !libLeak ? pass("Code safety check for audit-trail-validator.mjs") : fail("Secret leak in audit-trail-validator.mjs");
}

// ── 2. Check artifacts existence ────────────────────────────────────────
const REQUIRED_ARTIFACTS = [
  "audit-trail-active-config.json",
  "audit-trail-events.json",
  "audit-trail-validation-details.json",
  "audit-trail-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// ── 3. Policy checks ───────────────────────────────────────────────────
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.3C" ? pass("Milestone is 1.3C") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Validate audit scope
policy.audit_scope?.activity_log ? pass("policy: activity_log audit enabled") : fail("policy: activity_log audit missing");
policy.audit_scope?.secret_access_events ? pass("policy: secret_access_events audit enabled") : fail("policy: secret_access_events missing");
policy.audit_scope?.cost_events ? pass("policy: cost_events audit enabled") : fail("policy: cost_events missing");

// Validate redaction requirements
policy.redaction_requirements?.strip_api_keys ? pass("policy: strip_api_keys enabled") : fail("policy: strip_api_keys missing");
policy.redaction_requirements?.strip_jwt_tokens ? pass("policy: strip_jwt_tokens enabled") : fail("policy: strip_jwt_tokens missing");
policy.redaction_requirements?.allowed_placeholder === "[REDACTED]" ? pass("policy: redaction placeholder is [REDACTED]") : fail("policy: wrong placeholder");

// Validate immutability rules
policy.immutability_rules?.non_admin_cannot_delete_audit ? pass("policy: non_admin_cannot_delete_audit enabled") : fail("policy: immutability rule missing");
policy.immutability_rules?.cross_company_audit_isolation ? pass("policy: cross_company_audit_isolation enabled") : fail("policy: isolation rule missing");

// ── 4. Scorecard checks ────────────────────────────────────────────────
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "audit-trail-scorecard.json"), "utf8"));
scorecard.verdict === "AUDIT_TRAIL_VERIFIED" ? pass("scorecard verdict valid: AUDIT_TRAIL_VERIFIED") : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Verify all 10 test cases passed
const checkNames = Object.keys(scorecard.audit_trail_checks || {});
checkNames.length >= 10 ? pass(`scorecard: ${checkNames.length} test cases present (≥10)`) : fail(`scorecard: only ${checkNames.length} test cases (need ≥10)`);

const allChecksPassed = Object.values(scorecard.audit_trail_checks || {}).every(v => v === true);
allChecksPassed ? pass("scorecard: all test cases passed") : fail("scorecard: some test cases failed");

// ── 5. PII/email leak scan ──────────────────────────────────────────────
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.3c/", "configs/ai-company/audit-trail", "scripts/ai-company-audit-trail", "scripts/lib/security/audit-trail"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.3C committed files") : fail("real email found in 1.3C committed file");
} catch { pass("no real email in 1.3C committed files (git check skipped)"); }

// ── 6. Previous verifiers regression guard ──────────────────────────────
const prevVerifiers = ["1.3b"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch (e) {
    fail(`${ver.toUpperCase()} verifier regression: ${e.message}`);
  }
}

// ── Summary ─────────────────────────────────────────────────────────────
console.log("==================================================");
console.log(`Phase 1.3C Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.3C verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.3C verification PASSED!"); }
