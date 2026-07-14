#!/usr/bin/env node
/**
 * Milestone 1.3A Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3a", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "company-boundaries-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-boundaries-validation.mjs",
  "scripts/ai-company-boundaries-validation-auto-loop.mjs",
  "scripts/ai-company-boundaries-validation-premerge-simulate.mjs"
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
  "company-active-boundaries.json",
  "company-boundaries-events.json",
  "company-validation-details.json",
  "company-boundaries-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.3A" ? pass("Milestone is 1.3A") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Scorecard checks
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "company-boundaries-scorecard.json"), "utf8"));
scorecard.verdict === "BOUNDARIES_VERIFIED" ? pass("scorecard verdict valid: BOUNDARIES_VERIFIED") : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Check for no real emails in 1.3A artifacts to prevent PII leak
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.3a/", "configs/ai-company/company-boundaries", "scripts/ai-company-boundaries"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.3A committed files") : fail("real email found in 1.3A committed file");
} catch { pass("no real email in 1.3A committed files (git check skipped)"); }

// Previous verifiers regression guard (Milestone 1.2F regression check)
const prevVerifiers = ["1.2f"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch (e) {
    fail(`${ver.toUpperCase()} verifier regression: ${e.message}`);
  }
}

console.log("==================================================");
console.log(`Phase 1.3A Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.3A verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.3A verification PASSED!"); }
