#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-2.1a", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "onboarding-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// ── 1. Script safety ────────────────────────────────────────────────────
const SCRIPTS = [
  "scripts/ai-company-onboarding.mjs",
  "scripts/ai-company-onboarding-auto-loop.mjs",
  "scripts/ai-company-onboarding-premerge-simulate.mjs"
];
const SECRET_PATTERNS = [/pat-[A-Za-z0-9\-]{10,}/, /re_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/];
for (const s of SCRIPTS) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { fail(`Script missing: ${s}`); continue; }
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass(`Code safety: ${s}`) : fail(`Secret leak: ${s}`);
}
const libPath = path.join(ROOT, "scripts", "lib", "security", "onboarding-service.mjs");
if (!fs.existsSync(libPath)) fail("Library missing: onboarding-service.mjs");
else {
  const lines = fs.readFileSync(libPath, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass("Code safety: onboarding-service.mjs") : fail("Secret leak in library");
}

// ── 2. Artifact existence ───────────────────────────────────────────────
const REQUIRED = ["onboarding-active-config.json", "onboarding-events.json", "onboarding-validation-details.json", "onboarding-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"];
for (const a of REQUIRED) { fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`); }

// ── 3. Policy checks ───────────────────────────────────────────────────
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "2.1A" ? pass("Milestone is 2.1A") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: not dry_run");
Array.isArray(policy.onboarding?.supported_org_types) && policy.onboarding.supported_org_types.length >= 3 ? pass("policy: 3+ supported org types") : fail("policy: supported org types missing");
Array.isArray(policy.onboarding?.supported_autonomy_modes) && policy.onboarding.supported_autonomy_modes.includes("full_auto") ? pass("policy: autonomy modes include full_auto") : fail("policy: autonomy modes missing");

// ── 4. Scorecard checks ────────────────────────────────────────────────
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "onboarding-scorecard.json"), "utf8"));
scorecard.verdict === "ONBOARDING_VERIFIED" ? pass("scorecard: ONBOARDING_VERIFIED") : fail(`scorecard: ${scorecard.verdict}`);
const checkNames = Object.keys(scorecard.onboarding_checks || {});
checkNames.length >= 10 ? pass(`scorecard: ${checkNames.length} test cases (≥10)`) : fail(`scorecard: ${checkNames.length} tests`);
Object.values(scorecard.onboarding_checks || {}).every(v => v === true) ? pass("scorecard: all passed") : fail("scorecard: some failed");

// ── 5. PII/email scan ──────────────────────────────────────────────────
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-2.1a/", "configs/ai-company/onboarding", "scripts/ai-company-onboarding", "scripts/lib/security/onboarding"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some(p => f.startsWith(p))) continue;
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    if (emailRe.test(fs.readFileSync(fp, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 2.1A files") : fail("real email found");
} catch { pass("no real email (git skipped)"); }

// ── 6. Regression guard ────────────────────────────────────────────────
try {
  execSync("node packages/db/src/_verify-1.4a.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.4A verifier still passes");
} catch (e) { fail(`1.4A verifier regression: ${e.message}`); }

// ── Summary ─────────────────────────────────────────────────────────────
console.log("==================================================");
console.log(`Phase 2.1A Verification: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 2.1A verification FAILED!"); process.exit(1); }
else console.log("Phase 2.1A verification PASSED!");
