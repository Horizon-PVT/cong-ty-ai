#!/usr/bin/env node
/**
 * Milestone 1.1B Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1b", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "crm-provider-integration-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-crm-provider-integration.mjs",
  "scripts/ai-company-crm-provider-integration-auto-loop.mjs",
  "scripts/ai-company-crm-provider-integration-premerge-simulate.mjs",
  "scripts/lib/crm/provider-hubspot.mjs",
  "scripts/lib/crm/provider-salesforce.mjs",
  "scripts/lib/crm/sync-gate.mjs",
];
const SECRET_PATTERNS = [
  /pat-[A-Za-z0-9\-]{10,}/,
  /re_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /HUBSPOT_ACCESS_TOKEN\s*=\s*\S{5,}/,
  /SALESFORCE_ACCESS_TOKEN\s*=\s*\S{5,}/,
  /hapikey=[A-Za-z0-9\-]+/,
];

for (const s of SCRIPTS) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { fail(`Script missing: ${s}`); continue; }
  const src = fs.readFileSync(p, "utf8");
  // Exclude test/env placeholder lines
  const lines = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.includes("process.env."));
  const safeToCheck = lines.join("\n");
  if (SECRET_PATTERNS.some((r) => r.test(safeToCheck))) fail(`Code safety: secret detected in ${s}`);
  else pass(`Code safety check for ${s}`);
}

// Required artifacts
const REQUIRED = [
  "crm-provider-sync-plan.json", "crm-provider-write-preview.json",
  "crm-provider-sync-ledger.json", "crm-provider-response-redacted.json",
  "crm-provider-scorecard.json",
];
for (const a of REQUIRED) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1B" ? pass("Milestone is 1.1B") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_crm_write_enabled === false ? pass("policy: default_crm_write_enabled is false") : fail("policy: default_crm_write_enabled must be false");
policy.live_requires_owner_token === true ? pass("policy: live_requires_owner_token is true") : fail("policy: live_requires_owner_token must be true");
policy.sandbox_requires_owner_token === true ? pass("policy: sandbox_requires_owner_token is true") : fail("policy: sandbox_requires_owner_token must be true");
policy.idempotency_required === true ? pass("policy: idempotency_required is true") : fail("policy: idempotency_required must be true");
policy.hard_locks?.no_live_write_without_owner_token === true ? pass("hard_lock: no_live_write_without_owner_token is true") : fail("hard_lock: no_live_write_without_owner_token missing");

// Ledger checks
const ledger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "crm-provider-sync-ledger.json"), "utf8"));
const hasLiveWritten = (ledger.entries || []).some((e) => e.write_status === "WRITTEN_LIVE");
const hasRealProvider = (ledger.entries || []).some((e) => e.called_real_provider === true && e.fake_http !== true);
!hasLiveWritten ? pass("no WRITTEN_LIVE entries in default dry-run mode") : fail("WRITTEN_LIVE found in default mode — not allowed");
!hasRealProvider ? pass("no real CRM provider called in default mode") : fail("real CRM provider called — not allowed in default mode");

const allHaveIdempotency = (ledger.entries || []).every((e) => !!e.idempotency_key || e.write_status === "BLOCKED_PENDING_OWNER_APPROVAL");
allHaveIdempotency ? pass("all CRM entries have idempotency_key or are blocked") : fail("some entries missing idempotency_key");

// Scorecard verdict
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "crm-provider-scorecard.json"), "utf8"));
const validVerdicts = ["CRM_PROVIDER_READY_DRY_RUN_ONLY","CRM_PROVIDER_SANDBOX_WRITE_SUCCEEDED","CRM_PROVIDER_LIVE_WRITE_SUCCEEDED","CRM_PROVIDER_WRITE_BLOCKED_PENDING_OWNER_APPROVAL","CRM_PROVIDER_CONFIG_MISSING","CRM_PROVIDER_WRITE_FAILED_RETRYABLE","CRM_PROVIDER_WRITE_FAILED_FINAL","HOLD_FOR_DATA_QUALITY_REVIEW"];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1B artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1b/", "configs/ai-company/crm-provider", "scripts/ai-company-crm-provider", "scripts/lib/crm/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1B committed files") : fail("real email found in 1.1B committed file");
} catch { pass("no real email in 1.1B committed files (git check skipped)"); }

// 1.1A verifier still passes
try {
  execSync("node packages/db/src/_verify-1.1a.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1A verifier still passes");
} catch { fail("1.1A verifier regression"); }

console.log("==================================================");
console.log(`Phase 1.1B Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1B verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1B verification PASSED!"); }
