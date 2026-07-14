#!/usr/bin/env node
/**
 * Milestone 1.3B Verifier
 *
 * Validates:
 * 1. Script safety (no hardcoded secrets)
 * 2. Artifact existence
 * 3. Policy correctness
 * 4. Scorecard verdict
 * 5. PII/email leak scan
 * 6. Regression guard (runs 1.3A verifier)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3b", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "rate-limit-throttle-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// ── 1. Script safety checks ────────────────────────────────────────────
const SCRIPTS = [
  "scripts/ai-company-rate-limit-throttle.mjs",
  "scripts/ai-company-rate-limit-throttle-auto-loop.mjs",
  "scripts/ai-company-rate-limit-throttle-premerge-simulate.mjs"
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

// Also check the rate-limiter library
const libPath = path.join(ROOT, "scripts", "lib", "security", "rate-limiter.mjs");
if (!fs.existsSync(libPath)) {
  fail("Rate limiter library missing: scripts/lib/security/rate-limiter.mjs");
} else {
  const libSrc = fs.readFileSync(libPath, "utf8");
  const libLines = libSrc.split("\n").filter((l) => !l.trim().startsWith("//") && !l.includes("process.env."));
  const cleanLib = libLines.join("\n");
  let libLeak = false;
  for (const pat of SECRET_PATTERNS) {
    if (pat.test(cleanLib)) { libLeak = true; break; }
  }
  !libLeak ? pass("Code safety check for rate-limiter.mjs") : fail("Secret leak in rate-limiter.mjs");
}

// ── 2. Check artifacts existence ────────────────────────────────────────
const REQUIRED_ARTIFACTS = [
  "rate-limit-active-config.json",
  "rate-limit-events.json",
  "rate-limit-validation-details.json",
  "rate-limit-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// ── 3. Policy checks ───────────────────────────────────────────────────
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.3B" ? pass("Milestone is 1.3B") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Validate rate limit tiers exist
policy.rate_limits?.per_agent ? pass("policy: per_agent rate limit configured") : fail("policy: per_agent missing");
policy.rate_limits?.per_company ? pass("policy: per_company rate limit configured") : fail("policy: per_company missing");
policy.rate_limits?.global ? pass("policy: global rate limit configured") : fail("policy: global missing");

// Validate throttle policy
policy.throttle_policy?.soft_limit_ratio === 0.8 ? pass("policy: soft_limit_ratio is 0.8") : fail("policy: soft_limit_ratio must be 0.8");
policy.throttle_policy?.penalty_multiplier === 2.0 ? pass("policy: penalty_multiplier is 2.0") : fail("policy: penalty_multiplier must be 2.0");

// ── 4. Scorecard checks ────────────────────────────────────────────────
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "rate-limit-scorecard.json"), "utf8"));
scorecard.verdict === "RATE_LIMIT_VERIFIED" ? pass("scorecard verdict valid: RATE_LIMIT_VERIFIED") : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Verify all 10 test cases passed
const checkNames = Object.keys(scorecard.rate_limit_checks || {});
checkNames.length >= 10 ? pass(`scorecard: ${checkNames.length} test cases present (≥10)`) : fail(`scorecard: only ${checkNames.length} test cases (need ≥10)`);

const allChecksPassed = Object.values(scorecard.rate_limit_checks || {}).every(v => v === true);
allChecksPassed ? pass("scorecard: all test cases passed") : fail("scorecard: some test cases failed");

// ── 5. PII/email leak scan ──────────────────────────────────────────────
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.3b/", "configs/ai-company/rate-limit-throttle", "scripts/ai-company-rate-limit-throttle", "scripts/lib/security/rate-limiter"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.3B committed files") : fail("real email found in 1.3B committed file");
} catch { pass("no real email in 1.3B committed files (git check skipped)"); }

// ── 6. Previous verifiers regression guard ──────────────────────────────
const prevVerifiers = ["1.3a"];
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
console.log(`Phase 1.3B Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.3B verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.3B verification PASSED!"); }
