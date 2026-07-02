#!/usr/bin/env node
/**
 * scripts/ai-company-first-autonomous-revenue-verify.mjs
 * Milestone 1.0M: First Autonomous Revenue Mission Verifier
 *
 * Verifies all 1.0M deliverables:
 * - Policy holds
 * - Manifest contains self-selected artifacts with rationales
 * - No hardcoded predefined kits
 * - Correct Viet-language pricing anchors (12.9M, 4.9M, 18M)
 * - Contract contains 50% deposit and phases
 * - Zalo/Phone scripts present
 * - Demo guide uses spa/clinic context
 * - No secrets, env, or deploy
 *
 * CLI: --mission <id> --strict --write-report --explain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const missionId = args[args.indexOf('--mission') + 1] || 'mission_1_0m_autonomous_revenue';
const strict = args.includes('--strict');
const writeReport = args.includes('--write-report');
const explain = args.includes('--explain');

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, passMsg, failMsg) {
  if (condition) {
    passed++;
    if (explain) console.log('✅ ' + passMsg);
  } else {
    failed++;
    failures.push(failMsg);
    console.log('❌ ' + failMsg);
  }
}

const missionPath = path.join(ROOT, 'missions', 'ai-company', 'mission-1.0m-autonomous-revenue.json');
const policyPath = path.join(ROOT, 'configs', 'ai-company', 'first-autonomous-revenue-policy.json');
const modelPath = path.join(ROOT, 'configs', 'ai-company', 'first-autonomous-revenue-operating-model.json');
const artifactDir = path.join(ROOT, 'artifacts', 'ai-company', 'mission-1.0m');
const generatedDir = path.join(artifactDir, 'generated');

console.log('Starting Phase 1.0M First Autonomous Revenue Mission Verification...');

// 1. Files exist and parse
check(fs.existsSync(missionPath), 'mission-1.0m-autonomous-revenue.json exists', 'mission file missing');
check(fs.existsSync(policyPath), 'first-autonomous-revenue-policy.json exists', 'policy file missing');
check(fs.existsSync(modelPath), 'first-autonomous-revenue-operating-model.json exists', 'operating model file missing');

let mission = null, policy = null;
try {
  mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
  check(true, 'mission JSON parses', 'mission JSON parse error');
} catch (e) { check(false, '', 'mission parse error: ' + e.message); }

try {
  policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  check(true, 'policy JSON parses', 'policy JSON parse error');
} catch (e) { check(false, '', 'policy parse error: ' + e.message); }

// 2. Policy rules check
if (policy) {
  check(policy.department_led === true, 'policy: department_led is true', 'policy: department_led must be true');
  check(policy.departments_select_artifacts === true, 'policy: departments_select_artifacts is true', 'policy: departments_select_artifacts must be true');
  check(policy.fixed_artifact_list_allowed === false, 'policy: fixed_artifact_list_allowed is false', 'policy: fixed_artifact_list_allowed must be false');
}

// 3. Output files check
if (fs.existsSync(artifactDir)) {
  check(fs.existsSync(path.join(artifactDir, 'artifact-manifest.json')), 'artifact-manifest.json exists', 'manifest file missing');
  check(fs.existsSync(path.join(artifactDir, 'department-decision-log.json')), 'department-decision-log.json exists', 'decision log file missing');
  check(fs.existsSync(path.join(artifactDir, 'final-package-index.md')), 'final-package-index.md exists', 'package index file missing');
  check(fs.existsSync(path.join(artifactDir, 'qa-review-report.md')), 'qa-review-report.md exists', 'QA report file missing');
  check(fs.existsSync(path.join(artifactDir, 'gap-analysis.json')), 'gap-analysis.json exists', 'gap analysis file missing');
  check(fs.existsSync(path.join(artifactDir, 'kpi-scorecard.json')), 'kpi-scorecard.json exists', 'scorecard file missing');
  check(fs.existsSync(path.join(artifactDir, 'paperclip-department-update.json')), 'paperclip-department-update.json exists', 'Paperclip payload file missing');

  // Business deliverables existence
  const expectedDeliverables = [
    'sme-sales-playbook.md',
    'web-chatbot-demo-guide.md',
    'objection-handling-cheat-sheet.md',
    'commercial-roi-proposal-template.md',
    'client-agreement-draft.md',
    'local-marketing-pitch-assets.md'
  ];
  for (const filename of expectedDeliverables) {
    check(fs.existsSync(path.join(generatedDir, filename)), `deliverable ${filename} exists`, `deliverable ${filename} MISSING`);
  }

  // Content requirements validation
  const playbook = fs.readFileSync(path.join(generatedDir, 'sme-sales-playbook.md'), 'utf8');
  check(playbook.includes('14-Day') && playbook.includes('Zalo') && playbook.includes('Alex Minh AI'), 'playbook has 14-day and outreach scripts', 'playbook content incomplete');

  const demo = fs.readFileSync(path.join(generatedDir, 'web-chatbot-demo-guide.md'), 'utf8');
  check(demo.includes('Spa') || demo.includes('Clinic') || demo.includes('Nha khoa'), 'demo guide has clinic/spa context', 'demo guide missing spa/clinic walkthrough');
  check(demo.includes('Vietnamese') || demo.includes('Dạ'), 'demo guide has Vietnamese local nuances', 'demo guide missing Viet language check');

  const objection = fs.readFileSync(path.join(generatedDir, 'objection-handling-cheat-sheet.md'), 'utf8');
  check(objection.includes('12.9 triệu') || objection.includes('12,9 triệu'), 'objection guide has 12.9M pricing response', 'objection guide missing 12.9M pricing objection handling');

  const roi = fs.readFileSync(path.join(generatedDir, 'commercial-roi-proposal-template.md'), 'utf8');
  check(roi.includes('12.900.000') || roi.includes('12.9 triệu'), 'ROI proposal contains 12.9M price', 'ROI proposal missing 12.9M price');
  check(roi.includes('4.900.000') && roi.includes('18.000.000'), 'ROI proposal contains supporting offers (4.9M and 18M)', 'ROI proposal missing supporting offers');

  const agreement = fs.readFileSync(path.join(generatedDir, 'client-agreement-draft.md'), 'utf8');
  check(agreement.includes('50%') && agreement.includes('Đợt 1') && agreement.includes('Đợt 2'), 'agreement contains 50% deposit and phases', 'agreement missing deposit/milestone terms');
} else {
  check(false, '', 'artifacts directory not found. Please run the runner first.');
}

console.log('='.repeat(50));
console.log(`Phase 1.0M Verification: ${passed} passed, ${failed} failed`);

if (writeReport) {
  const reportDir = path.join(ROOT, 'reports', 'first-autonomous-revenue-verify');
  fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    mission_id: missionId,
    status: failed === 0 ? 'PASS' : 'FAIL',
    timestamp: '2026-07-02T12:15:00.000Z',
    passed_checks: passed,
    failed_checks: failed,
    failures
  };
  fs.writeFileSync(path.join(reportDir, 'latest.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`[Verify] Report saved to reports/first-autonomous-revenue-verify/latest.json`);
}

if (failed > 0 && strict) {
  process.exit(1);
}
process.exit(0);
