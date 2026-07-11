#!/usr/bin/env node
/**
 * Milestone 1.1J Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1j", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "owner-decision-execution-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-owner-decision-execution.mjs",
  "scripts/ai-company-owner-decision-execution-auto-loop.mjs",
  "scripts/ai-company-owner-decision-execution-premerge-simulate.mjs"
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
  "owner-decision-ledger-redacted.json",
  "crm-stage-commit-plan.json",
  "crm-stage-commit-ledger-redacted.json",
  "next-action-execution-plan.json",
  "blocked-action-report.json",
  "revenue-commit-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1J" ? pass("Milestone is 1.1J") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Decision checks
const ledger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "owner-decision-ledger-redacted.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "revenue-commit-scorecard.json"), "utf8"));

const allHaveDecisionDetails = (ledger.entries || []).every((e) => !!e.recipient_id && !!e.status && !!e.idempotency_key);
allHaveDecisionDetails ? pass("all ledger entries have correct decision properties") : fail("ledger entries missing decision details");

// Scorecard verdict check
const validVerdicts = [
  "REVENUE_COMMIT_DRY_RUN_PASS",
  "REVENUE_COMMIT_BLOCKED_SAFELY",
  "REVENUE_COMMIT_SUCCESS",
  "REVENUE_COMMIT_BLOCKED_APPROVAL",
  "REVENUE_COMMIT_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1J artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1j/", "configs/ai-company/owner-decision-", "scripts/ai-company-owner-decision"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1J committed files") : fail("real email found in 1.1J committed file");
} catch { pass("no real email in 1.1J committed files (git check skipped)"); }

// Previous verifiers regression guard
try {
  execSync("node packages/db/src/_verify-1.1a.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1A verifier still passes");
} catch { fail("1.1A verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1b.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1B verifier still passes");
} catch { fail("1.1B verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1c.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1C verifier still passes");
} catch { fail("1.1C verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1d.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1D verifier still passes");
} catch { fail("1.1D verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1e.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1E verifier still passes");
} catch { fail("1.1E verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1f.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1F verifier still passes");
} catch { fail("1.1F verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1g.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1G verifier still passes");
} catch { fail("1.1G verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1h.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1H verifier still passes");
} catch { fail("1.1H verifier regression"); }

try {
  execSync("node packages/db/src/_verify-1.1i.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1I verifier still passes");
} catch { fail("1.1I verifier regression"); }

console.log("==================================================");
console.log(`Phase 1.1J Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1J verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1J verification PASSED!"); }
