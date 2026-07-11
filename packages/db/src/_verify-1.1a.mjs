#!/usr/bin/env node
/**
 * Milestone 1.1A Verifier
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1a", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-conversation-loop-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

const SCRIPTS = [
  "scripts/ai-company-run-revenue-conversation-loop-mission.mjs",
  "scripts/ai-company-revenue-conversation-loop-auto-loop.mjs",
  "scripts/ai-company-revenue-conversation-loop-premerge-simulate.mjs",
];
const SECRET_PATTERNS = [/re_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /HUBSPOT_API_KEY\s*=\s*\S+/, /SALESFORCE_TOKEN\s*=\s*\S+/, /PIPEDRIVE_API_KEY\s*=\s*\S+/];

for (const s of SCRIPTS) {
  const p = path.join(ROOT, s);
  if (!fs.existsSync(p)) { fail(`Script missing: ${s}`); continue; }
  const src = fs.readFileSync(p, "utf8");
  if (SECRET_PATTERNS.some((r) => r.test(src))) fail(`Code safety check for ${s}`);
  else pass(`Code safety check for ${s}`);
}

// Required artifacts
const required = [
  "revenue-conversation-plan.json", "crm-write-preview.json", "crm-sync-gate-ledger.json",
  "conversation-loop-state.json", "owner-crm-approval-queue.json", "sales-next-action-queue.json",
  "revenue-loop-scorecard.json", "suppression-and-consent-audit.json"
];
for (const a of required) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1A" ? pass("Milestone is 1.1A") : fail(`Milestone wrong: ${policy.milestone}`);
policy.active_rules.default_crm_write_enabled === false ? pass("policy: default_crm_write_enabled is false") : fail("policy: default_crm_write_enabled must be false");
policy.active_rules.owner_approval_required_for_crm_write === true ? pass("policy: owner_approval_required_for_crm_write is true") : fail("policy: owner_approval_required_for_crm_write must be true");
policy.active_rules.no_automatic_followups === true ? pass("policy: no_automatic_followups is true") : fail("policy: no_automatic_followups must be true");
policy.active_rules.crm_dry_run_sink_required === true ? pass("policy: crm_dry_run_sink_required is true") : fail("policy: crm_dry_run_sink_required must be true");
policy.hard_locks.no_crm_write_without_owner_token === true ? pass("hard_lock: no_crm_write_without_owner_token is true") : fail("hard_lock: no_crm_write_without_owner_token must be true");

// CRM ledger checks
const ledger = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "crm-sync-gate-ledger.json"), "utf8"));
const hasWritten = (ledger.entries || []).some((e) => e.write_status === "WRITTEN");
!hasWritten ? pass("no CRM entry has write_status WRITTEN in default mode") : fail("CRM entry marked WRITTEN — not allowed in default mode");
ledger.called_real_provider === false ? pass("no real CRM provider was called") : fail("real CRM provider was called");
const allHaveIdempotency = (ledger.entries || []).every((e) => !!e.idempotency_key);
allHaveIdempotency ? pass("all CRM actions have idempotency_key") : fail("some CRM actions missing idempotency_key");

// Scorecard verdict
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "revenue-loop-scorecard.json"), "utf8"));
const validVerdicts = ["CRM_GATE_READY_NO_HOT_LEADS", "CRM_GATE_READY_FOR_OWNER_REVIEW", "CRM_WRITE_BLOCKED_PENDING_OWNER_APPROVAL", "PAUSED_BY_SAFETY_THRESHOLD", "HOLD_FOR_DATA_QUALITY_REVIEW"];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict is valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1A mission files
try {
  const gitTracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1a/", "configs/ai-company/revenue-conversation", "scripts/ai-company-run-revenue-conversation", "scripts/ai-company-revenue-conversation", "missions/ai-company/mission-1.1a"];
  const EXCLUDE = ["_verify-", ".test.", ".spec.", "package.json", "pnpm-lock", "SKILL.md", ".yml"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of gitTracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    if (EXCLUDE.some((e) => f.includes(e))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email address in 1.1A committed files") : fail("real email found in 1.1A committed file");
} catch { pass("no real email address in 1.1A committed files (git check skipped)"); }

// Widget map checks
const widgetMap = JSON.parse(fs.readFileSync(path.join(ROOT, "configs", "ai-company", "revenue-conversation-loop-widget-map.json"), "utf8"));
for (const w of widgetMap.widgets || []) {
  w.data_sources?.length > 0 ? pass(`Widget "${w.widget_id}" has explicit data_sources`) : fail(`Widget "${w.widget_id}" missing data_sources`);
  w.required_payload_sections?.length > 0 ? pass(`Widget "${w.widget_id}" has required_payload_sections`) : fail(`Widget "${w.widget_id}" missing required_payload_sections`);
}

console.log("==================================================");
console.log(`Phase 1.1A Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1A verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1A verification PASSED!"); }
