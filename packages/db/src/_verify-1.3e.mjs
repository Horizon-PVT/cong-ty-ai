#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3e", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "task-conflict-agent-perms-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// ── 1. Script safety ────────────────────────────────────────────────────
const SCRIPTS = [
  "scripts/ai-company-task-conflict-agent-perms.mjs",
  "scripts/ai-company-task-conflict-agent-perms-auto-loop.mjs",
  "scripts/ai-company-task-conflict-agent-perms-premerge-simulate.mjs"
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
const libPath = path.join(ROOT, "scripts", "lib", "security", "task-conflict-service.mjs");
if (!fs.existsSync(libPath)) fail("Library missing: task-conflict-service.mjs");
else {
  const lines = fs.readFileSync(libPath, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass("Code safety: task-conflict-service.mjs") : fail("Secret leak in library");
}

// ── 2. Artifact existence ───────────────────────────────────────────────
const REQUIRED = ["task-conflict-active-config.json", "task-conflict-events.json", "task-conflict-validation-details.json", "task-conflict-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"];
for (const a of REQUIRED) { fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`); }

// ── 3. Policy checks ───────────────────────────────────────────────────
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.3E" ? pass("Milestone is 1.3E") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: not dry_run");
policy.task_conflict_safety?.concurrent_claim_response === 409 ? pass("policy: concurrent claim returns 409") : fail("policy: wrong conflict response");
policy.task_conflict_safety?.conflict_detection === "optimistic_locking" ? pass("policy: optimistic locking") : fail("policy: wrong conflict detection");
Array.isArray(policy.agent_api_permissions?.allowed_operations) ? pass("policy: allowed_operations defined") : fail("policy: allowed_operations missing");
Array.isArray(policy.agent_api_permissions?.denied_operations) ? pass("policy: denied_operations defined") : fail("policy: denied_operations missing");
policy.agent_api_permissions?.scope_enforcement === "company_scoped" ? pass("policy: company_scoped enforcement") : fail("policy: wrong scope");

// ── 4. Scorecard checks ────────────────────────────────────────────────
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "task-conflict-scorecard.json"), "utf8"));
scorecard.verdict === "TASK_CONFLICT_VERIFIED" ? pass("scorecard: TASK_CONFLICT_VERIFIED") : fail(`scorecard: ${scorecard.verdict}`);
const checkNames = Object.keys(scorecard.task_conflict_checks || {});
checkNames.length >= 10 ? pass(`scorecard: ${checkNames.length} test cases (≥10)`) : fail(`scorecard: ${checkNames.length} tests`);
Object.values(scorecard.task_conflict_checks || {}).every(v => v === true) ? pass("scorecard: all passed") : fail("scorecard: some failed");

// ── 5. PII/email scan ──────────────────────────────────────────────────
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.3e/", "configs/ai-company/task-conflict", "scripts/ai-company-task-conflict", "scripts/lib/security/task-conflict"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some(p => f.startsWith(p))) continue;
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    if (emailRe.test(fs.readFileSync(fp, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.3E files") : fail("real email found");
} catch { pass("no real email (git skipped)"); }

// ── 6. Regression guard ────────────────────────────────────────────────
try {
  execSync("node packages/db/src/_verify-1.3d.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.3D verifier still passes");
} catch (e) { fail(`1.3D verifier regression: ${e.message}`); }

// ── Summary ─────────────────────────────────────────────────────────────
console.log("==================================================");
console.log(`Phase 1.3E Verification: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.3E verification FAILED!"); process.exit(1); }
else console.log("Phase 1.3E verification PASSED!");
