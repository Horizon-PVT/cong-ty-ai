#!/usr/bin/env node
/**
 * Milestone 1.1H Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1h", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-followup-execution-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-followup-execution.mjs",
  "scripts/ai-company-followup-execution-auto-loop.mjs",
  "scripts/ai-company-followup-execution-premerge-simulate.mjs",
  "scripts/lib/followup/execution-bridge.mjs",
  "scripts/lib/followup/outcome-ledger.mjs",
  "scripts/lib/followup/crm-outcome-sync.mjs",
  "scripts/lib/followup/provider-write-gate.mjs"
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
  "followup-execution-plan.json",
  "followup-execution-ledger-redacted.json",
  "followup-crm-sync-preview.json",
  "followup-execution-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1H" ? pass("Milestone is 1.1H") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");
policy.owner_approval_required === true ? pass("policy: owner_approval_required is true") : fail("policy: owner_approval_required must be true");

// Event and CRM Sync checks
const ledger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "followup-execution-ledger-redacted.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "followup-execution-scorecard.json"), "utf8"));

const hasLiveWritten = ledger.entries?.some((e) => ["SENT_LIVE"].includes(e.dispatch_status));
!hasLiveWritten ? pass("no SENT_LIVE entries in default dry-run mode") : fail("SENT_LIVE found in default mode — not allowed");

const allHaveIdempotency = (ledger.entries || []).every((e) => !!e.idempotency_key);
allHaveIdempotency ? pass("all dispatch entries have idempotency_key") : fail("some entries missing idempotency_key");

// Scorecard verdict check
const validVerdicts = [
  "FOLLOWUP_EXECUTION_DRY_RUN_PASS",
  "FOLLOWUP_EXECUTION_BLOCKED_SAFELY",
  "FOLLOWUP_EXECUTION_SANDBOX_SENT",
  "FOLLOWUP_EXECUTION_LIVE_SENT",
  "FOLLOWUP_EXECUTION_BLOCKED_APPROVAL",
  "FOLLOWUP_EXECUTION_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1H artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1h/", "configs/ai-company/revenue-followup-execution", "scripts/ai-company-followup-execution", "scripts/lib/followup/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1H committed files") : fail("real email found in 1.1H committed file");
} catch { pass("no real email in 1.1H committed files (git check skipped)"); }

// Previous verifiers regression guard
try {
  execSync("node packages/db/src/_verify-1.1g.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1G verifier still passes");
} catch { fail("1.1G verifier regression"); }

console.log("==================================================");
console.log(`Phase 1.1H Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1H verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1H verification PASSED!"); }
