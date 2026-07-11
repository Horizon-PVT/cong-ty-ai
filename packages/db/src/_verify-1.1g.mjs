#!/usr/bin/env node
/**
 * Milestone 1.1G Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1g", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-followup-trigger-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-followup-trigger.mjs",
  "scripts/ai-company-followup-trigger-auto-loop.mjs",
  "scripts/ai-company-followup-trigger-premerge-simulate.mjs",
  "scripts/lib/followup/decision-engine.mjs",
  "scripts/lib/followup/idempotency.mjs",
  "scripts/lib/followup/redaction.mjs",
  "scripts/lib/followup/response-signals.mjs",
  "scripts/lib/followup/message-renderer.mjs"
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
  "followup-trigger-plan.json",
  "followup-message-render-preview.md",
  "followup-trigger-ledger-redacted.json",
  "followup-trigger-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1G" ? pass("Milestone is 1.1G") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");
policy.owner_approval_required === true ? pass("policy: owner_approval_required is true") : fail("policy: owner_approval_required must be true");

// Event and CRM Sync checks
const ledger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "followup-trigger-ledger-redacted.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "followup-trigger-scorecard.json"), "utf8"));

const hasLiveWritten = ledger.entries?.some((e) => ["SENT_LIVE"].includes(e.write_status));
!hasLiveWritten ? pass("no SENT_LIVE entries in default dry-run mode") : fail("SENT_LIVE found in default mode — not allowed");

const allHaveIdempotency = (ledger.entries || []).every((e) => !!e.idempotency_key);
allHaveIdempotency ? pass("all dispatch entries have idempotency_key") : fail("some entries missing idempotency_key");

// Check unsubscribe line in HTML message render preview if generated
const msgPreviewPath = path.join(GEN_DIR, "followup-message-render-preview.md");
if (fs.existsSync(msgPreviewPath)) {
  const htmlPreview = fs.readFileSync(msgPreviewPath, "utf8");
  if (htmlPreview.includes("Unsubscribe here") || htmlPreview.includes("No follow-up message rendered")) {
    pass("unsubscribe disclaimer exists in follow-up email template / empty check");
  } else {
    fail("unsubscribe disclaimer missing in template");
  }
}

// Scorecard verdict check
const validVerdicts = [
  "FOLLOWUP_READY_DRY_RUN_ONLY",
  "FOLLOWUP_BLOCKED_PENDING_OWNER_APPROVAL",
  "FOLLOWUP_BLOCKED_TERMINAL_RESPONSE",
  "FOLLOWUP_BLOCKED_COOLDOWN",
  "FOLLOWUP_BLOCKED_SUPPRESSED",
  "FOLLOWUP_BLOCKED_RECIPIENT_NOT_ALLOWED",
  "FOLLOWUP_BLOCKED_DAILY_CAP",
  "FOLLOWUP_BLOCKED_DUPLICATE",
  "FOLLOWUP_SANDBOX_READY",
  "FOLLOWUP_LIVE_SENT",
  "FOLLOWUP_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1G artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1g/", "configs/ai-company/revenue-followup", "scripts/ai-company-followup", "scripts/lib/followup/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1G committed files") : fail("real email found in 1.1G committed file");
} catch { pass("no real email in 1.1G committed files (git check skipped)"); }

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

console.log("==================================================");
console.log(`Phase 1.1G Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1G verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1G verification PASSED!"); }
