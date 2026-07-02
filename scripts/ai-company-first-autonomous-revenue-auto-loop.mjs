#!/usr/bin/env node
/**
 * scripts/ai-company-first-autonomous-revenue-auto-loop.mjs
 * Milestone 1.0M: First Autonomous Revenue Mission Auto-Loop
 *
 * Runs first autonomous revenue mission and verifier iteratively to guarantee stability.
 * All safety gate rules enforced.
 *
 * CLI: --mission <id> --max-iterations <n> --stable-passes <n> --write-report --explain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const missionId = args[args.indexOf('--mission') + 1] || 'mission_1_0m_autonomous_revenue';
const maxIterationsArg = args[args.indexOf('--max-iterations') + 1];
const maxIterations = maxIterationsArg ? parseInt(maxIterationsArg, 10) : 5;
const stablePassesArg = args[args.indexOf('--stable-passes') + 1];
const stablePasses = stablePassesArg ? parseInt(stablePassesArg, 10) : 2;
const writeReport = args.includes('--write-report');
const explain = args.includes('--explain');

function log(msg) {
  if (explain) console.log(msg);
}

log('[Auto-Loop] Initializing First Autonomous Revenue Mission Auto-Loop...');

let passesInARow = 0;
let totalIterations = 0;
const history = [];

// Deterministic ID generator using iteration counter and missionId
function getLoopId(iter) {
  const input = `autoloop_1_0m_${missionId}_${iter}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `al_1_0m_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

while (totalIterations < maxIterations && passesInARow < stablePasses) {
  totalIterations++;
  log(`\n[Auto-Loop] Iteration ${totalIterations}/${maxIterations}...`);

  const runId = getLoopId(totalIterations);
  let missionPassed = false;
  let verifyPassed = false;
  let missionError = null;
  let verifyError = null;

  // 1. Run mission
  try {
    const cmd = `node scripts/ai-company-run-first-autonomous-revenue-mission.mjs --mission ${missionId} --write-artifacts --write-memory --write-report --explain`;
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    missionPassed = true;
  } catch (e) {
    missionError = e.message;
  }

  // 2. Run verifier
  if (missionPassed) {
    try {
      const cmd = `node scripts/ai-company-first-autonomous-revenue-verify.mjs --mission ${missionId} --strict --write-report --explain`;
      execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
      verifyPassed = true;
    } catch (e) {
      verifyError = e.message;
    }
  }

  const iterationPassed = missionPassed && verifyPassed;
  history.push({
    iteration: totalIterations,
    run_id: runId,
    mission_passed: missionPassed,
    verify_passed: verifyPassed,
    mission_error: missionError,
    verify_error: verifyError,
    passed: iterationPassed
  });

  if (iterationPassed) {
    passesInARow++;
    log(`[Auto-Loop] Iteration ${totalIterations} PASSED. Stable passes in a row: ${passesInARow}/${stablePasses}`);
  } else {
    passesInARow = 0;
    log(`[Auto-Loop] Iteration ${totalIterations} FAILED. Stable passes reset to 0.`);
  }
}

const finalVerdict = passesInARow >= stablePasses ? 'FIRST_AUTONOMOUS_REVENUE_MISSION_STABLE_PASS' : 'FIRST_AUTONOMOUS_REVENUE_MISSION_STABLE_FAIL';

const report = {
  mission_id: missionId,
  milestone: '1.0M',
  max_iterations: maxIterations,
  stable_passes_required: stablePasses,
  iterations_run: totalIterations,
  stable_passes_achieved: passesInARow,
  final_verdict: finalVerdict,
  history
};

if (writeReport) {
  const logDir = path.join(ROOT, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'first-autonomous-revenue-auto-loop-report.json'), JSON.stringify(report, null, 2), 'utf8');
  log(`[Auto-Loop] Wrote logs/first-autonomous-revenue-auto-loop-report.json`);
}

console.log(`[Auto-Loop] Final Verdict: ${finalVerdict}`);
if (finalVerdict !== 'FIRST_AUTONOMOUS_REVENUE_MISSION_STABLE_PASS') {
  process.exit(1);
}
process.exit(0);
