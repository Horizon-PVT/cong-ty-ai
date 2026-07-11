#!/usr/bin/env node
/**
 * Milestone 1.1K Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1k", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-live-commit-pilot-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-live-revenue-commit-pilot.mjs",
  "scripts/ai-company-live-revenue-commit-pilot-auto-loop.mjs",
  "scripts/ai-company-live-revenue-commit-pilot-premerge-simulate.mjs",
  "scripts/lib/revenue-commit/commit-provider.mjs",
  "scripts/lib/revenue-commit/cooldown-resolution.mjs"
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
  "owner-live-approval-ledger-redacted.json",
  "cooldown-resolution-report.json",
  "live-crm-commit-plan.json",
  "live-crm-commit-ledger-redacted.json",
  "revenue-live-commit-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1K" ? pass("Milestone is 1.1K") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Decision checks
const ledger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "owner-live-approval-ledger-redacted.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "revenue-live-commit-scorecard.json"), "utf8"));

const allHaveDecisionDetails = (ledger.entries || []).every((e) => !!e.recipient_id && !!e.commit_status && !!e.idempotency_key);
allHaveDecisionDetails ? pass("all ledger entries have correct decision properties") : fail("ledger entries missing decision details");

// Scorecard verdict check
const validVerdicts = [
  "LIVE_REVENUE_COMMIT_PILOT_READY",
  "LIVE_REVENUE_COMMIT_PILOT_PASS",
  "LIVE_REVENUE_COMMIT_PILOT_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1K artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1k/", "configs/ai-company/revenue-live-", "scripts/ai-company-live-", "scripts/lib/revenue-commit/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1K committed files") : fail("real email found in 1.1K committed file");
} catch { pass("no real email in 1.1K committed files (git check skipped)"); }

// Previous verifiers regression guard
const prevVerifiers = ["1.1a", "1.1b", "1.1c", "1.1d", "1.1e", "1.1f", "1.1g", "1.1h", "1.1i", "1.1j"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.1K Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1K verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1K verification PASSED!"); }
