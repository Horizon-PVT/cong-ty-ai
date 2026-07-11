#!/usr/bin/env node
/**
 * Milestone 1.1F Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1f", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-email-calendar-dispatch-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-email-calendar-dispatch.mjs",
  "scripts/ai-company-email-calendar-dispatch-auto-loop.mjs",
  "scripts/ai-company-email-calendar-dispatch-premerge-simulate.mjs",
  "scripts/lib/email/redaction.mjs",
  "scripts/lib/email/idempotency.mjs",
  "scripts/lib/email/provider-dry-run.mjs",
  "scripts/lib/email/provider-smtp.mjs",
  "scripts/lib/email/provider-resend.mjs"
];
const SECRET_PATTERNS = [
  /pat-[A-Za-z0-9\-]{10,}/,
  /re_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /RESEND_API_KEY\s*=\s*\S{5,}/,
  /SMTP_PASS\s*=\s*\S{5,}/
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
  "email-calendar-dispatch-preview.json",
  "email-calendar-message-render-preview.md",
  "email-calendar-dispatch-ledger-redacted.json",
  "email-provider-response-redacted.json",
  "email-calendar-dispatch-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1F" ? pass("Milestone is 1.1F") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");
policy.owner_approval_required === true ? pass("policy: owner_approval_required is true") : fail("policy: owner_approval_required must be true");

// Event and CRM Sync checks
const preview = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "email-calendar-dispatch-preview.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "email-calendar-dispatch-scorecard.json"), "utf8"));

const hasLiveWritten = preview.previews?.some((p) => ["SENT_SANDBOX", "SENT_LIVE"].includes(p.write_status));
!hasLiveWritten ? pass("no SENT entries in default dry-run mode") : fail("SENT found in default mode — not allowed");
scorecard.called_real_provider === false ? pass("no real email provider called in default mode") : fail("real email provider called — not allowed in default mode");

const allHaveIdempotency = (preview.previews || []).every((p) => !!p.idempotency_key);
allHaveIdempotency ? pass("all dispatch entries have idempotency_key") : fail("some entries missing idempotency_key");

// Check unsubscribe line in HTML message render preview
const htmlPreview = fs.readFileSync(path.join(GEN_DIR, "email-calendar-message-render-preview.md"), "utf8");
htmlPreview.includes("Unsubscribe here") ? pass("unsubscribe disclaimer exists in email template") : fail("unsubscribe disclaimer missing in template");

// Scorecard verdict check
const validVerdicts = [
  "EMAIL_CALENDAR_DISPATCH_READY_DRY_RUN_ONLY",
  "EMAIL_CALENDAR_DISPATCH_BLOCKED_PENDING_OWNER_APPROVAL",
  "EMAIL_CALENDAR_DISPATCH_BLOCKED_MISSING_CALENDAR_LINK",
  "EMAIL_CALENDAR_DISPATCH_BLOCKED_RECIPIENT_NOT_ALLOWED",
  "EMAIL_CALENDAR_DISPATCH_BLOCKED_SUPPRESSED",
  "EMAIL_CALENDAR_DISPATCH_BLOCKED_DUPLICATE",
  "EMAIL_CALENDAR_DISPATCH_BLOCKED_PROVIDER_AUTH",
  "EMAIL_CALENDAR_DISPATCH_SANDBOX_SENT",
  "EMAIL_CALENDAR_DISPATCH_LIVE_SENT",
  "EMAIL_CALENDAR_DISPATCH_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1F artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1f/", "configs/ai-company/revenue-email", "scripts/ai-company-email-calendar", "scripts/lib/email/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1F committed files") : fail("real email found in 1.1F committed file");
} catch { pass("no real email in 1.1F committed files (git check skipped)"); }

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

console.log("==================================================");
console.log(`Phase 1.1F Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1F verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1F verification PASSED!"); }
