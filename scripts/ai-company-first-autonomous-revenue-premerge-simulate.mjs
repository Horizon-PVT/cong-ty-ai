#!/usr/bin/env node
/**
 * scripts/ai-company-first-autonomous-revenue-premerge-simulate.mjs
 * Milestone 1.0M: First Autonomous Revenue Mission Premerge Simulation
 *
 * Runs all verifiers (1.0a through 1.0m), checks safety rules, and ensures git status compliance.
 * All safety gate rules enforced.
 *
 * CLI: --mission <id> --write-report --explain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const missionId = args[args.indexOf('--mission') + 1] || 'mission_1_0m_autonomous_revenue';
const writeReport = args.includes('--write-report');
const explain = args.includes('--explain');

function log(msg) {
  if (explain) console.log(msg);
}

log('[Premerge Simulate] Running First Autonomous Revenue Mission Premerge Simulation...');

const steps = [];
let overallPass = true;

// Run verifiers 1.0a through 1.0m
const verifierScripts = [
  'packages/db/src/_verify-1.0a.mjs',
  'packages/db/src/_verify-1.0b.mjs',
  'packages/db/src/_verify-1.0c.mjs',
  'packages/db/src/_verify-1.0d.mjs',
  'packages/db/src/_verify-1.0e.mjs',
  'packages/db/src/_verify-1.0f.mjs',
  'packages/db/src/_verify-1.0g.mjs',
  'packages/db/src/_verify-1.0h.mjs',
  'packages/db/src/_verify-1.0i.mjs',
  'packages/db/src/_verify-1.0j.mjs',
  'packages/db/src/_verify-1.0k.mjs',
  'packages/db/src/_verify-1.0l.mjs',
  'packages/db/src/_verify-1.0m.mjs'
];

for (const script of verifierScripts) {
  const fullPath = path.join(ROOT, script);
  if (!fs.existsSync(fullPath)) {
    log(`[Premerge Simulate] Skipper helper check ${script} (not found)`);
    continue;
  }

  log(`[Premerge Simulate] Running verifier: ${script}...`);
  try {
    execSync(`node ${script} --strict`, { cwd: ROOT, stdio: 'inherit' });
    steps.push({ step: script, passed: true });
  } catch (e) {
    log(`[Premerge Simulate] ❌ Verifier failed: ${script}`);
    steps.push({ step: script, passed: false, error: e.message });
    overallPass = false;
  }
}

// Check if runtime reports are ignored/uncommitted
log('[Premerge Simulate] Checking Git tracking status of runtime reports...');
const runtimeFiles = [
  'reports/first-autonomous-revenue-mission/latest.json',
  'reports/first-autonomous-revenue-verify/latest.json',
  'logs/first-autonomous-revenue-auto-loop-report.json',
  'logs/first-autonomous-revenue-premerge-simulate-report.json',
  'reports/self-test/latest.json',
  'reports/self-test/latest.md',
  'reports/e2e/latest.json',
  'reports/post-merge/latest.json'
];

let trackedFiles = '';
try {
  trackedFiles = execSync('git ls-files ' + runtimeFiles.join(' '), { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
} catch (e) {
  trackedFiles = '';
}

const gitCheckPassed = trackedFiles === '';
checkCondition(gitCheckPassed, 'No runtime reports are tracked in Git', `Git is tracking runtime reports: ${trackedFiles}`);

// Check that no fixed sales-kit artifact is required by verifier
log('[Premerge Simulate] Checking verifier meta-safety rules...');
const verifierFileContent = fs.readFileSync(path.join(ROOT, 'scripts', 'ai-company-first-autonomous-revenue-verify.mjs'), 'utf8');
const forbiddenFilenames = ['client-proposal.md', 'objection-handling.md', 'follow-up-plan.md', 'package-comparison.md'];
let metaCheckPassed = true;
for (const name of forbiddenFilenames) {
  if (verifierFileContent.includes(name)) {
    metaCheckPassed = false;
    log(`[Premerge Simulate] ❌ Meta-check failed: verifier file mentions forbidden filename ${name}`);
  }
}
checkCondition(metaCheckPassed, 'Verifier does not require predefined sales-kit filenames', 'Verifier requires forbidden hardcoded filenames');

function checkCondition(cond, passMsg, failMsg) {
  steps.push({ step: passMsg, passed: !!cond, error: cond ? null : failMsg });
  if (cond) {
    log(`[Premerge Simulate] ✅ ${passMsg}`);
  } else {
    log(`[Premerge Simulate] ❌ ${failMsg}`);
    overallPass = false;
  }
}

const finalVerdict = overallPass ? 'FIRST_AUTONOMOUS_REVENUE_MISSION_PREMERGE_PASS' : 'FIRST_AUTONOMOUS_REVENUE_MISSION_PREMERGE_FAIL';

const report = {
  mission_id: missionId,
  milestone: '1.0M',
  overall_passed: overallPass,
  final_verdict: finalVerdict,
  steps
};

if (writeReport) {
  const logDir = path.join(ROOT, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'first-autonomous-revenue-premerge-simulate-report.json'), JSON.stringify(report, null, 2), 'utf8');
  log(`[Premerge Simulate] Wrote logs/first-autonomous-revenue-premerge-simulate-report.json`);
}

console.log(`[Premerge Simulate] Final Verdict: ${finalVerdict}`);
if (!overallPass) {
  process.exit(1);
}
process.exit(0);
