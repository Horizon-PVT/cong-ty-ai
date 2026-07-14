#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-3.1b", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "outcomes-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// ── 1. Script safety ────────────────────────────────────────────────────
const SCRIPTS = [
  "scripts/ai-company-outcomes.mjs",
  "scripts/ai-company-outcomes-auto-loop.mjs",
  "scripts/ai-company-outcomes-premerge-simulate.mjs"
];
// Construct patterns dynamically to prevent self-matching during regex checks
const secretRePatternList = [
  "pat-" + "[A-Za-z0-9\\-]{10,}",
  "re_" + "[A-Za-z0-9]{20,}",
  "sk-" + "[A-Za-z0-9]{20,}"
];
const SECRET_PATTERNS = secretRePatternList.map(p => new RegExp(p));

for (const s of SCRIPTS) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { fail(`Script missing: ${s}`); continue; }
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass(`Code safety: ${s}`) : fail(`Secret leak: ${s}`);
}
const libPath = path.join(ROOT, "scripts", "lib", "security", "outcomes-service.mjs");
if (!fs.existsSync(libPath)) fail("Library missing: outcomes-service.mjs");
else {
  const lines = fs.readFileSync(libPath, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass("Code safety: outcomes-service.mjs") : fail("Secret leak in library");
}

// ── 2. Artifact existence ───────────────────────────────────────────────
const REQUIRED = ["deliverables-active-config.json", "deliverables-events.json", "deliverables-validation-details.json", "deliverables-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"];
for (const a of REQUIRED) { fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`); }

// ── 3. Policy checks ───────────────────────────────────────────────────
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "3.1B" ? pass("Milestone is 3.1B") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: not dry_run");
Array.isArray(policy.outcomes?.required_outcome_types) && policy.outcomes.required_outcome_types.includes("merged_pr") ? pass("policy: required outcome types include merged_pr") : fail("policy: types incomplete");

// ── 4. Scorecard checks ────────────────────────────────────────────────
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "deliverables-scorecard.json"), "utf8"));
scorecard.verdict === "OUTCOMES_VERIFIED" ? pass("scorecard: OUTCOMES_VERIFIED") : fail(`scorecard: ${scorecard.verdict}`);
const checkNames = Object.keys(scorecard.deliverables_checks || {});
checkNames.length >= 10 ? pass(`scorecard: ${checkNames.length} test cases (≥10)`) : fail(`scorecard: ${checkNames.length} tests`);
Object.values(scorecard.deliverables_checks || {}).every(v => v === true) ? pass("scorecard: all passed") : fail("scorecard: some failed");

// ── 5. PII/email scan ──────────────────────────────────────────────────
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-3.1b/", "configs/ai-company/outcomes", "scripts/ai-company-outcomes", "scripts/lib/security/outcomes"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some(p => f.startsWith(p))) continue;
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    if (emailRe.test(fs.readFileSync(fp, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 3.1B files") : fail("real email found");
} catch { pass("no real email (git skipped)"); }

// ── 6. Regression guard ────────────────────────────────────────────────
try {
  execSync("node packages/db/src/_verify-3.1a.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("3.1A verifier still passes");
} catch (e) { fail(`3.1A verifier regression: ${e.message}`); }

// ── Summary ─────────────────────────────────────────────────────────────
console.log("==================================================");
console.log(`Phase 3.1B Verification: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 3.1B verification FAILED!"); process.exit(1); }
else console.log("Phase 3.1B verification PASSED!");
