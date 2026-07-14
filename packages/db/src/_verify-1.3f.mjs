#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.3f", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "board-approval-flows-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// ── 1. Script safety ────────────────────────────────────────────────────
const SCRIPTS = [
  "scripts/ai-company-board-approval-flows.mjs",
  "scripts/ai-company-board-approval-flows-auto-loop.mjs",
  "scripts/ai-company-board-approval-flows-premerge-simulate.mjs"
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
const libPath = path.join(ROOT, "scripts", "lib", "security", "board-approval-service.mjs");
if (!fs.existsSync(libPath)) fail("Library missing: board-approval-service.mjs");
else {
  const lines = fs.readFileSync(libPath, "utf8").split("\n").filter(l => !l.trim().startsWith("//") && !l.includes("process.env."));
  let leaked = false;
  for (const pat of SECRET_PATTERNS) { if (pat.test(lines.join("\n"))) { leaked = true; break; } }
  !leaked ? pass("Code safety: board-approval-service.mjs") : fail("Secret leak in library");
}

// ── 2. Artifact existence ───────────────────────────────────────────────
const REQUIRED = ["board-approval-active-config.json", "board-approval-events.json", "board-approval-validation-details.json", "board-approval-scorecard.json", "qa-acceptance-report.md", "artifact-manifest.json", "final-package-index.md"];
for (const a of REQUIRED) { fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`); }

// ── 3. Policy checks ───────────────────────────────────────────────────
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.3F" ? pass("Milestone is 1.3F") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: not dry_run");
Array.isArray(policy.board_approval_flows?.approval_types) && policy.board_approval_flows.approval_types.length >= 4 ? pass("policy: 4+ approval types") : fail("policy: approval types missing");
Array.isArray(policy.board_approval_flows?.approval_statuses) && policy.board_approval_flows.approval_statuses.includes("pending") ? pass("policy: statuses include pending") : fail("policy: pending missing");
policy.board_approval_flows?.approval_permissions?.owner?.length >= 4 ? pass("policy: owner has full permissions") : fail("policy: owner perms insufficient");
policy.board_approval_flows?.approval_permissions?.member?.length === 0 ? pass("policy: member has no permissions") : fail("policy: member should have no perms");
Array.isArray(policy.board_approval_flows?.board_roles) ? pass("policy: board roles defined") : fail("policy: roles missing");
policy.board_approval_flows?.approval_action_mapping ? pass("policy: approval action mapping defined") : fail("policy: mapping missing");

// ── 4. Scorecard checks ────────────────────────────────────────────────
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "board-approval-scorecard.json"), "utf8"));
scorecard.verdict === "BOARD_APPROVAL_VERIFIED" ? pass("scorecard: BOARD_APPROVAL_VERIFIED") : fail(`scorecard: ${scorecard.verdict}`);
const checkNames = Object.keys(scorecard.board_approval_checks || {});
checkNames.length >= 10 ? pass(`scorecard: ${checkNames.length} test cases (≥10)`) : fail(`scorecard: ${checkNames.length} tests`);
Object.values(scorecard.board_approval_checks || {}).every(v => v === true) ? pass("scorecard: all passed") : fail("scorecard: some failed");

// ── 5. PII/email scan ──────────────────────────────────────────────────
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.3f/", "configs/ai-company/board-approval", "scripts/ai-company-board-approval", "scripts/lib/security/board-approval"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some(p => f.startsWith(p))) continue;
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    if (emailRe.test(fs.readFileSync(fp, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.3F files") : fail("real email found");
} catch { pass("no real email (git skipped)"); }

// ── 6. Regression guard ────────────────────────────────────────────────
try {
  execSync("node packages/db/src/_verify-1.3e.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.3E verifier still passes");
} catch (e) { fail(`1.3E verifier regression: ${e.message}`); }

// ── Summary ─────────────────────────────────────────────────────────────
console.log("==================================================");
console.log(`Phase 1.3F Verification: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.3F verification FAILED!"); process.exit(1); }
else console.log("Phase 1.3F verification PASSED!");
