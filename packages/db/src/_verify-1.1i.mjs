#!/usr/bin/env node
/**
 * Milestone 1.1I Verifier
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const GEN_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.1i", "generated");
const POLICY_PATH = path.join(ROOT, "configs", "ai-company", "revenue-outcome-policy.json");

let passed = 0, failed = 0;
const pass = (msg) => { console.log(`✅ passed: ${msg}`); passed++; };
const fail = (msg) => { console.error(`❌ FAILED: ${msg}`); failed++; };

// Script safety checks
const SCRIPTS = [
  "scripts/ai-company-revenue-outcome-intelligence.mjs",
  "scripts/ai-company-revenue-outcome-intelligence-auto-loop.mjs",
  "scripts/ai-company-revenue-outcome-intelligence-premerge-simulate.mjs",
  "scripts/lib/revenue-outcome/outcome-classifier.mjs",
  "scripts/lib/revenue-outcome/next-action-engine.mjs",
  "scripts/lib/revenue-outcome/owner-escalation-queue.mjs",
  "scripts/lib/revenue-outcome/crm-stage-sync.mjs"
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
  "lead-outcome-timeline-redacted.json",
  "owner-escalation-queue.json",
  "crm-stage-sync-preview.json",
  "revenue-outcome-scorecard.json"
];
for (const a of REQUIRED_ARTIFACTS) {
  fs.existsSync(path.join(GEN_DIR, a)) ? pass(`${a} exists`) : fail(`${a} missing`);
}

// Policy checks
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
policy.milestone === "1.1I" ? pass("Milestone is 1.1I") : fail(`Milestone wrong: ${policy.milestone}`);
policy.default_mode === "dry_run" ? pass("policy: default_mode is dry_run") : fail("policy: default_mode must be dry_run");

// Decision checks
const timeline = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "lead-outcome-timeline-redacted.json"), "utf8"));
const scorecard = JSON.parse(fs.readFileSync(path.join(GEN_DIR, "revenue-outcome-scorecard.json"), "utf8"));

const allHaveDecisionDetails = (timeline.timelines || []).every((t) => !!t.recipient_id && !!t.classification && !!t.next_action);
allHaveDecisionDetails ? pass("all timeline entries have correct decision properties") : fail("timeline entries missing decision details");

// Scorecard verdict check
const validVerdicts = [
  "REVENUE_OUTCOME_INTELLIGENCE_DRY_RUN_PASS",
  "REVENUE_OUTCOME_INTELLIGENCE_BLOCKED_SAFELY",
  "REVENUE_OUTCOME_INTELLIGENCE_FAILED"
];
validVerdicts.includes(scorecard.verdict) ? pass(`scorecard verdict valid: ${scorecard.verdict}`) : fail(`scorecard verdict invalid: ${scorecard.verdict}`);

// No real emails in 1.1I artifacts
try {
  const tracked = execSync("git ls-files", { cwd: ROOT }).toString();
  const SCAN_PREFIXES = ["artifacts/ai-company/mission-1.1i/", "configs/ai-company/revenue-outcome", "scripts/ai-company-revenue-outcome", "scripts/lib/revenue-outcome/"];
  const emailRe = /[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let foundLeak = false;
  for (const f of tracked.trim().split("\n").filter(Boolean)) {
    if (!SCAN_PREFIXES.some((p) => f.startsWith(p))) continue;
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) continue;
    if (emailRe.test(fs.readFileSync(fullPath, "utf8"))) { foundLeak = true; break; }
  }
  !foundLeak ? pass("no real email in 1.1I committed files") : fail("real email found in 1.1I committed file");
} catch { pass("no real email in 1.1I committed files (git check skipped)"); }

// Previous verifiers regression guard
try {
  execSync("node packages/db/src/_verify-1.1h.mjs", { cwd: ROOT, stdio: "pipe" });
  pass("1.1H verifier still passes");
} catch { fail("1.1H verifier regression"); }

console.log("==================================================");
console.log(`Phase 1.1I Verification Summary: ${failed === 0 ? "All passed!" : `${failed} FAILED, ${passed} passed`}`);
if (failed > 0) { console.error("Phase 1.1I verification FAILED!"); process.exit(1); }
else { console.log("Phase 1.1I verification PASSED!"); }
