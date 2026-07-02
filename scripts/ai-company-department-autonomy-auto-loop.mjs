#!/usr/bin/env node
/**
 * ai-company-department-autonomy-auto-loop.mjs
 * Milestone 1.0L: Department Autonomy Mission Auto-Loop
 *
 * Runs department autonomy mission and verifier iteratively to guarantee stability.
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
const missionId = args[args.indexOf('--mission') + 1] || 'mission_1_0l_department_autonomy';
const maxIterationsArg = args[args.indexOf('--max-iterations') + 1];
const maxIterations = maxIterationsArg ? parseInt(maxIterationsArg, 10) : 5;
const stablePassesArg = args[args.indexOf('--stable-passes') + 1];
const stablePasses = stablePassesArg ? parseInt(stablePassesArg, 10) : 2;
const writeReport = args.includes('--write-report');
const explain = args.includes('--explain');

function log(msg) {
  if (explain) console.log(msg);
}

log('[Auto-Loop] Initializing Department Autonomy Mission Auto-Loop...');

let passesInARow = 0;
let totalIterations = 0;
const history = [];

// Deterministic ID generator using iteration counter and missionId
function getLoopId(iter) {
  const input = `autoloop_${missionId}_${iter}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return `al_${Math.abs(hash).toString(16).padStart(8, '0')}`;
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
    const cmd = `node scripts/ai-company-run-department-autonomy-mission.mjs --mission ${missionId} --write-artifacts --write-memory --write-report --explain`;
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    missionPassed = true;
  } catch (e) {
    missionError = e.message;
  }

  // 2. Run verifier
  if (missionPassed) {
    try {
      const cmd = `node scripts/ai-company-department-autonomy-verify.mjs --mission ${missionId} --strict --write-report --explain`;
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

const finalVerdict = passesInARow >= stablePasses ? 'DEPARTMENT_AUTONOMY_STABLE_PASS' : 'DEPARTMENT_AUTONOMY_STABLE_FAIL';

const report = {
  mission_id: missionId,
  milestone: '1.0L',
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
  fs.writeFileSync(path.join(logDir, 'department-autonomy-auto-loop-report.json'), JSON.stringify(report, null, 2), 'utf8');
  log(`[Auto-Loop] Wrote logs/department-autonomy-auto-loop-report.json`);
}

console.log(`[Auto-Loop] Final Verdict: ${finalVerdict}`);
if (finalVerdict !== 'DEPARTMENT_AUTONOMY_STABLE_PASS') {
  process.exit(1);
}
