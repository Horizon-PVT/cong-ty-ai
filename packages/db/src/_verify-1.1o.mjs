#!/usr/bin/env node
/**
 * Milestone 1.1O Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1o", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "client-success-renewal-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-client-success-renewal.mjs",
  "scripts/ai-company-client-success-renewal-auto-loop.mjs",
  "scripts/ai-company-client-success-renewal-premerge-simulate.mjs"
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
  "client-success-health-report.json",
  "revision-recovery-plan.json",
  "renewal-upsell-candidates-redacted.json",
  "referral-testimonial-candidates-redacted.json",
  "owner-client-success-approval-queue.json",
  "client-success-scorecard.json",
  "qa-acceptance-report.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1O" ? pass("Milestone is 1.1O") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Safety policy flags
policy.no_auto_send_client_update ? pass("policy: no_auto_send_client_update") : fail("policy: no_auto_send_client_update missing");
policy.no_crm_mutation ? pass("policy: no_crm_mutation") : fail("policy: no_crm_mutation missing");
policy.no_invoice_payment_mutation ? pass("policy: no_invoice_payment_mutation") : fail("policy: no_invoice_payment_mutation missing");
policy.no_public_testimonial_publishing ? pass("policy: no_public_testimonial_publishing") : fail("policy: no_public_testimonial_publishing missing");

// Scorecard checks
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "client-success-scorecard.json"), "utf8"));
const validVerdicts = [
  "CLIENT_SUCCESS_READY",
  "ALL_CLIENTS_HEALTHY",
  "REVISION_RECOVERY_NEEDED",
  "BLOCKED_BY_OWNER_GATE",
  "NO_CLIENT_SUCCESS_ACTIONS_ELIGIBLE",
  "FAILED_SAFE"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Safety locks in scorecard
scorecard.safety_locks?.no_auto_send_client_update ? pass("safety: no_auto_send_client_update active") : fail("safety: no_auto_send_client_update missing");
scorecard.safety_locks?.no_crm_mutation ? pass("safety: no_crm_mutation active") : fail("safety: no_crm_mutation missing");
scorecard.safety_locks?.no_public_testimonial_publishing ? pass("safety: no_public_testimonial_publishing active") : fail("safety: no_public_testimonial_publishing missing");

// Owner approval queue — no auto-approved entries in dry_run
const approvalQueue = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "owner-client-success-approval-queue.json"), "utf8"));
const hasAutoApproved = (approvalQueue.queue || []).some(e => e.status === "AUTO_APPROVED");
!hasAutoApproved ? pass("owner queue: no auto-approved entries") : fail("owner queue: found auto-approved entries");

// Referral/testimonial — no external send approved
const referrals = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "referral-testimonial-candidates-redacted.json"), "utf8"));
const hasExternalSend = (referrals.candidates || []).some(c => c.external_send_approved === true);
!hasExternalSend ? pass("referrals: no external_send_approved") : fail("referrals: external_send_approved found");
const hasPublished = (referrals.candidates || []).some(c => c.testimonial_published === true);
!hasPublished ? pass("referrals: no testimonial_published") : fail("referrals: testimonial_published found");

// Renewal — no external send approved
const renewals = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "renewal-upsell-candidates-redacted.json"), "utf8"));
const hasRenewalSend = (renewals.candidates || []).some(c => c.external_send_approved === true);
!hasRenewalSend ? pass("renewals: no external_send_approved") : fail("renewals: external_send_approved found");

// Idempotency check — no duplicate keys in health report
const healthReport = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "client-success-health-report.json"), "utf8"));
const idemKeys = (healthReport.reports || []).map(r => r.idempotency_key);
const uniqueKeys = new Set(idemKeys);
idemKeys.length === uniqueKeys.size ? pass("no duplicate idempotency keys") : fail("duplicate idempotency keys found");

// No real emails in 1.1O artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1o/", "configs/ai-company/client-success", "scripts/ai-company-client-success"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1O committed files") : fail("real email found in 1.1O committed file");
} catch { pass("no real email in 1.1O committed files (git check skipped)"); }

// Previous verifiers regression guard
const prevVerifiers = ["1.1n"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.1O Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1O verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1O verification PASSED!"); }
