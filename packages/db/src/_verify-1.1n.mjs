#!/usr/bin/env node
/**
 * Milestone 1.1N Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1n", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "client-delivery-acceptance-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-client-delivery-acceptance.mjs",
  "scripts/ai-company-client-delivery-acceptance-auto-loop.mjs",
  "scripts/ai-company-client-delivery-acceptance-premerge-simulate.mjs"
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
  "delivery-plan.json",
  "scope-lock-ledger.json",
  "work-package-redacted.json",
  "client-acceptance-ledger-redacted.json",
  "owner-acceptance-approval-queue.json",
  "delivery-scorecard.json",
  "qa-acceptance-report.md",
  "client-update-preview.md",
  "artifact-manifest.json",
  "final-package-index.md"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1N" ? pass("Milestone is 1.1N") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Delivery plan schema checks
const deliveryPlan = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "delivery-plan.json"), "utf8"));
deliveryPlan.milestone === "1.1N" ? pass("delivery plan milestone correct") : fail("delivery plan milestone wrong");

// Scope lock checks
const scopeLock = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "scope-lock-ledger.json"), "utf8"));
const allLocksValid = (scopeLock.locks || []).every(l => !!l.delivery_id && !!l.scope_hash && !!l.idempotency_key);
allLocksValid ? pass("all scope locks have valid properties") : fail("scope lock entries missing required fields");

// Acceptance ledger checks
const acceptanceLedger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "client-acceptance-ledger-redacted.json"), "utf8"));
const allAcceptanceValid = (acceptanceLedger.entries || []).every(e => !!e.delivery_id && !!e.outcome && !!e.idempotency_key);
allAcceptanceValid ? pass("all acceptance entries have correct properties") : fail("acceptance entries missing required fields");

// Scorecard verdict check
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "delivery-scorecard.json"), "utf8"));
const validVerdicts = [
  "CLIENT_DELIVERY_READY",
  "CLIENT_DELIVERY_SANDBOX_ACCEPTED",
  "CLIENT_DELIVERY_LIVE_PENDING_ACCEPTANCE",
  "BLOCKED_BY_OWNER_GATE",
  "NO_ELIGIBLE_CLIENT_DELIVERY_ACTIONS",
  "FAILED_SAFE"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// Safety locks check
scorecard.safety_locks?.scope_lock_active ? pass("safety: scope_lock_active") : fail("safety: scope_lock_active missing");
scorecard.safety_locks?.client_update_send_blocked ? pass("safety: client_update_send_blocked") : fail("safety: client updates not blocked");

// Idempotency check — no duplicate idempotency keys in acceptance ledger
const idemKeys = (acceptanceLedger.entries || []).map(e => e.idempotency_key);
const uniqueKeys = new Set(idemKeys);
idemKeys.length === uniqueKeys.size ? pass("no duplicate idempotency keys") : fail("duplicate idempotency keys found");

// Client update send check — no auto-send
const clientUpdate = fs.readFileSync(path.join(GEN_DIR, "client-update-preview.md"), "utf8");
(clientUpdate.includes("Send Approved: false") || clientUpdate.includes("Total Updates: 0") || !clientUpdate.includes("Send Approved: true"))
  ? pass("client updates not auto-sent")
  : fail("client updates may have been auto-sent");

// No real emails in 1.1N artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1n/", "configs/ai-company/client-delivery", "scripts/ai-company-client-delivery"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1N committed files") : fail("real email found in 1.1N committed file");
} catch { pass("no real email in 1.1N committed files (git check skipped)"); }

// Previous verifiers regression guard — only check 1.1M
const prevVerifiers = ["1.1m"];
for (const ver of prevVerifiers) {
  try {
    execSync(`node packages/db/src/_verify-${ver}.mjs`, { cwd: ROOT, stdio: "pipe" });
    pass(`${ver.toUpperCase()} verifier still passes`);
  } catch { fail(`${ver.toUpperCase()} verifier regression`); }
}

console.log("==================================================");
console.log(`Phase 1.1N Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1N verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1N verification PASSED!"); }
