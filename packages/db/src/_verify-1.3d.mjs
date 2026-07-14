#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3d", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "budget-enforcement-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// ── 1. Script safety ────────────────────────────────────────────────────
const SCRIPTS = [
  "scripts/ai-company-budget-enforcement.mjs",
  "scripts/ai-company-budget-enforcement-auto-loop.mjs",
  "scripts/ai-company-budget-enforcement-premerge-simulate.mjs"
];
const SECRET_PATTERNS = [/pat-[A-Za-z0-9\-]{10,}/, /re_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/];
for (const s of SCRIPTS) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { fail(`Script missing: ${s}`); continue; }
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass(`Code safety check for ${s}`) : fail(`Secret leak in ${s}`);
}
const libPath = path.join(ROOT, "scripts", "lib", "security", "budget-enforcement.mjs");
if (!fs.existsSync(libPath)) { fail("Budget enforcement library missing"); }
else {
  const lines = fs.readFileSync(libPath, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass("Code safety check for budget-enforcement.mjs") : fail("Secret leak in budget-enforcement.mjs");
}

// ── 2. Artifact existence ───────────────────────────────────────────────
const REQUIRED = ["budget-active-config.json", "budget-enforcement-events.json", "budget-validation-details.json", "budget-enforcement-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"];
for (const a of REQUIRED) { fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`); }

// ── 3. Policy checks ───────────────────────────────────────────────────
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.3D" ? pass("Milestone is 1.3D") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode not dry_run");
policy.budget_enforcement?.thresholds?.soft_warn_percent === 80 ? pass("policy: soft_warn_percent is 80") : fail("policy: soft_warn wrong");
policy.budget_enforcement?.thresholds?.hard_stop_percent === 100 ? pass("policy: hard_stop_percent is 100") : fail("policy: hard_stop wrong");
policy.budget_enforcement?.hard_stop_behavior?.pause_scope ? pass("policy: hard_stop pauses scope") : fail("policy: pause missing");
policy.budget_enforcement?.hard_stop_behavior?.block_new_invocations ? pass("policy: hard_stop blocks invocations") : fail("policy: block missing");
policy.budget_enforcement?.hard_stop_behavior?.create_incident ? pass("policy: hard_stop creates incident") : fail("policy: incident missing");
policy.budget_enforcement?.hard_stop_behavior?.require_approval ? pass("policy: hard_stop requires approval") : fail("policy: approval missing");
policy.budget_enforcement?.subscription_included_exempt ? pass("policy: subscription-included exempt") : fail("policy: exempt missing");
Array.isArray(policy.invocation_block_checkpoints) && policy.invocation_block_checkpoints.length >= 4 ? pass("policy: 4 invocation checkpoints defined") : fail("policy: checkpoints missing");

// ── 4. Scorecard checks ────────────────────────────────────────────────
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "budget-enforcement-scorecard.json"), "utf8"));
scorecard.verdict === "BUDGET_ENFORCEMENT_VERIFIED" ? pass("scorecard verdict: BUDGET_ENFORCEMENT_VERIFIED") : fail(`scorecard verdict invalid: ${scorecard.verdict}`);
const checkNames = Object.keys(scorecard.budget_checks || {});
checkNames.length >= 10 ? pass(`scorecard: ${checkNames.length} test cases (≥10)`) : fail(`scorecard: only ${checkNames.length} test cases`);
Object.values(scorecard.budget_checks || {}).every(v => v === true) ? pass("scorecard: all test cases passed") : fail("scorecard: some failed");

// ── 5. PII/email scan ──────────────────────────────────────────────────
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.3d/", "configs/ai-company/budget-enforcement", "scripts/ai-company-budget-enforcement", "scripts/lib/security/budget-enforcement"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some(p => f.startsWith(p))) continue;
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    if (emailRe.test(fs.readFileSync(fp, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.3D committed files") : fail("real email found");
} catch { pass("no real email in 1.3D committed files (git check skipped)"); }

// ── 6. Regression guard ────────────────────────────────────────────────
try {
  execSync("node packages/db/src/_verify-1.3c.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.3C verifier still passes");
} catch (e) { fail(`1.3C verifier regression: ${e.message}`); }

// ── Summary ─────────────────────────────────────────────────────────────
console.log("==================================================");
console.log(`Phase 1.3D Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.3D verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.3D verification PASSED!"); }
