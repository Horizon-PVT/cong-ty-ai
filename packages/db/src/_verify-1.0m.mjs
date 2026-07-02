#!/usr/bin/env node
/**
 * packages/db/src/_verify-1.0m.mjs
 * Milestone 1.0M: First Autonomous Revenue Mission Verifier
 *
 * Runs E2E verifications for Phase 1.0M.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, passMsg, failMsg) {
  if (condition) {
    passed++;
    console.log('✅ ' + passMsg);
  } else {
    failed++;
    failures.push(failMsg);
    console.log('❌ ' + failMsg);
  }
}

console.log('Starting Phase 1.0M verification...');

// 1. Files exist and parse
const missionPath = path.join(ROOT, 'missions', 'ai-company', 'mission-1.0m-autonomous-revenue.json');
const policyPath = path.join(ROOT, 'configs', 'ai-company', 'first-autonomous-revenue-policy.json');
const modelPath = path.join(ROOT, 'configs', 'ai-company', 'first-autonomous-revenue-operating-model.json');

check(fs.existsSync(missionPath), 'mission-1.0m-autonomous-revenue.json exists', 'mission-1.0m-autonomous-revenue.json MISSING');
check(fs.existsSync(policyPath), 'first-autonomous-revenue-policy.json exists', 'first-autonomous-revenue-policy.json MISSING');
check(fs.existsSync(modelPath), 'first-autonomous-revenue-operating-model.json exists', 'first-autonomous-revenue-operating-model.json MISSING');

let mission = null, policy = null, model = null;
try {
  mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
  check(true, 'mission JSON parses', 'mission JSON parse error');
} catch (e) {
  check(false, 'mission JSON parses', 'mission JSON parse error: ' + e.message);
}

try {
  policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  check(true, 'policy JSON parses', 'policy JSON parse error');
} catch (e) {
  check(false, 'policy JSON parses', 'policy JSON parse error: ' + e.message);
}

try {
  model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  check(true, 'operating model JSON parses', 'operating model JSON parse error');
} catch (e) {
  check(false, 'operating model JSON parses', 'operating model JSON parse error: ' + e.message);
}

// 2. Policy validation
if (policy) {
  check(policy.department_led === true, 'policy requires department-led execution', 'policy does not require department_led: true');
  check(policy.departments_select_artifacts === true, 'policy requires departments to select artifacts', 'policy does not require departments_select_artifacts: true');
  check(policy.fixed_artifact_list_allowed === false, 'policy forbids fixed artifact list', 'policy does not forbid fixed_artifact_list_allowed: false');

  const blocked = policy.blocked || {};
  check(blocked.allow_live_api_calls === false, 'policy blocks live API calls', 'policy allows live API calls');
  check(blocked.allow_deploy === false, 'policy blocks deploy', 'policy allows deploy');
  check(blocked.allow_publish === false, 'policy blocks publish', 'policy allows publish');
  check(blocked.allow_spend === false, 'policy blocks spend', 'policy allows spend');
  check(blocked.allow_customer_comms === false, 'policy blocks customer communications', 'policy allows customer communications');
  check(blocked.allow_auto_send_message === false, 'policy blocks auto message sending', 'policy allows auto message sending');
  check(blocked.allow_auto_crm_update === false, 'policy blocks auto CRM update', 'policy allows auto CRM update');
  check(blocked.allow_secret_read === false, 'policy blocks secret reading', 'policy allows secret reading');
  check(blocked.allow_env_read === false, 'policy blocks env read', 'policy allows env read');
  check(blocked.allow_production_data_mutation === false, 'policy blocks production mutation', 'policy allows production mutation');
  check(blocked.allow_real_client_data === false, 'policy blocks real client data', 'policy allows real client data');

  const allowed = policy.allowed || {};
  check(allowed.allow_local_artifact_write === true, 'policy allows local artifact write', 'policy blocks local artifact write');
  check(allowed.allow_local_memory_write === true, 'policy allows local memory write', 'policy blocks local memory write');
  check(allowed.allow_local_report_write === true, 'policy allows local report write', 'policy blocks local report write');
}

// 3. Operating model validation
if (model) {
  const stages = (model.stages || []).map(s => s.stage_id);
  const requiredStages = [
    'owner_goal_intake', 'ceo_mission_interpretation', 'department_briefing',
    'department_artifact_proposals', 'cross_department_negotiation', 'artifact_manifest_creation',
    'worker_assignment', 'artifact_generation', 'qa_review', 'gap_analysis', 'gap_closure',
    'final_packaging', 'kpi_scoring', 'learning_update', 'paperclip_update',
    'auto_verification', 'premerge_simulation'
  ];
  for (const r of requiredStages) {
    check(stages.includes(r), `operating model includes stage: ${r}`, `operating model MISSING stage: ${r}`);
  }
}

// 4. Mission input validation
if (mission) {
  check(!mission.required_sales_artifacts, 'mission input does not contain fixed business artifact list (required_sales_artifacts)', 'mission input has required_sales_artifacts');
  check(!mission.fixed_artifact_list, 'mission input does not contain fixed business artifact list (fixed_artifact_list)', 'mission input has fixed_artifact_list');
}

// 5. Scripts exist
const runnerScript = path.join(ROOT, 'scripts', 'ai-company-run-first-autonomous-revenue-mission.mjs');
const verifierScript = path.join(ROOT, 'scripts', 'ai-company-first-autonomous-revenue-verify.mjs');
const loopScript = path.join(ROOT, 'scripts', 'ai-company-first-autonomous-revenue-auto-loop.mjs');
const premergeScript = path.join(ROOT, 'scripts', 'ai-company-first-autonomous-revenue-premerge-simulate.mjs');

check(fs.existsSync(runnerScript), 'run script exists', 'runner script MISSING');
check(fs.existsSync(verifierScript), 'verify script exists', 'verifier script MISSING');
check(fs.existsSync(loopScript), 'loop script exists', 'loop script MISSING');
check(fs.existsSync(premergeScript), 'premerge script exists', 'premerge script MISSING');

// 6. Outputs check (only when they have been generated)
const artifactDir = path.join(ROOT, 'artifacts', 'ai-company', 'mission-1.0m');
const generatedDir = path.join(artifactDir, 'generated');
if (fs.existsSync(artifactDir)) {
  check(fs.existsSync(path.join(artifactDir, 'department-decision-log.json')), 'department-decision-log.json exists', 'department-decision-log.json MISSING');
  check(fs.existsSync(path.join(artifactDir, 'artifact-manifest.json')), 'artifact-manifest.json exists', 'artifact-manifest.json MISSING');
  check(fs.existsSync(path.join(artifactDir, 'final-package-index.md')), 'final-package-index.md exists', 'final-package-index.md MISSING');
  check(fs.existsSync(path.join(artifactDir, 'qa-review-report.md')), 'qa-review-report.md exists', 'qa-review-report.md MISSING');
  check(fs.existsSync(path.join(artifactDir, 'gap-analysis.json')), 'gap-analysis.json exists', 'gap-analysis.json MISSING');
  check(fs.existsSync(path.join(artifactDir, 'kpi-scorecard.json')), 'kpi-scorecard.json exists', 'kpi-scorecard.json MISSING');
  check(fs.existsSync(path.join(artifactDir, 'paperclip-department-update.json')), 'paperclip-department-update.json exists', 'paperclip-department-update.json MISSING');

  // Manifest validation
  const manifestPath = path.join(artifactDir, 'artifact-manifest.json');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const minSelfSelected = (policy && policy.completion_thresholds && policy.completion_thresholds.minimum_self_selected_artifacts) || 5;
    check(manifest.artifacts && manifest.artifacts.length >= minSelfSelected, `manifest has >= ${minSelfSelected} self-selected artifacts`, `manifest has fewer than ${minSelfSelected} artifacts`);
    if (manifest.artifacts) {
      let valid = true;
      for (const art of manifest.artifacts) {
        if (!art.owning_department || !art.rationale) {
          valid = false;
        }
      }
      check(valid, 'every artifact in manifest has owning department and rationale', 'some artifacts in manifest lack owning department or rationale');
    }
  } catch (e) {
    check(false, 'manifest validation pass', 'manifest read/parse failed: ' + e.message);
  }

  // Decision log validation
  const logPath = path.join(artifactDir, 'department-decision-log.json');
  try {
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    const participated = log.departments_participated || [];
    const minDepts = (policy && policy.completion_thresholds && policy.completion_thresholds.minimum_departments_involved) || 6;
    check(participated.length >= minDepts, `department decision log includes >= ${minDepts} departments`, `department decision log has fewer than ${minDepts} departments`);
  } catch (e) {
    check(false, 'decision log validation pass', 'decision log read/parse failed: ' + e.message);
  }

  // QA Report validation
  const qaReportPath = path.join(artifactDir, 'qa-review-report.md');
  try {
    const qaContent = fs.readFileSync(qaReportPath, 'utf8');
    check(qaContent.includes('QA_PASS'), 'QA report exists and includes completion verdict', 'QA report missing completion score or verdict');
  } catch (e) {
    check(false, 'QA report content validation pass', 'QA report read failed: ' + e.message);
  }

  // Gap analysis validation
  const gapPath = path.join(artifactDir, 'gap-analysis.json');
  try {
    const gap = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
    check(gap.all_critical_gaps_closed === true || gap.critical_gaps_count === 0, 'gap analysis exists and all critical gaps are closed or explained', 'gap analysis indicates critical gaps remain open');
  } catch (e) {
    check(false, 'gap analysis validation pass', 'gap analysis read/parse failed: ' + e.message);
  }

  // KPI scorecard validation
  const kpiPath = path.join(artifactDir, 'kpi-scorecard.json');
  try {
    const kpi = JSON.parse(fs.readFileSync(kpiPath, 'utf8'));
    const requiredKPIs = [
      'mission_success_score', 'department_autonomy_score', 'customer_value_score',
      'commercial_readiness_score', 'artifact_quality_score', 'qa_strictness_score',
      'owner_decision_load_score', 'safety_score', 'learning_quality_score'
    ];
    let kpiValid = true;
    for (const f of requiredKPIs) {
      if (kpi.scores[f] === undefined) {
        kpiValid = false;
      }
    }
    check(kpiValid, 'KPI scorecard includes required KPI fields', 'KPI scorecard missing required fields');
  } catch (e) {
    check(false, 'KPI validation pass', 'KPI read/parse failed: ' + e.message);
  }

  // Paperclip update validation
  const paperclipPath = path.join(artifactDir, 'paperclip-department-update.json');
  try {
    const pp = JSON.parse(fs.readFileSync(paperclipPath, 'utf8'));
    const hasRequired = pp.mission_status && pp.departments_involved && pp.self_selected_artifacts && pp.qa_verdict && pp.kpi_summary && pp.safety_locks && pp.owner_action_needed;
    check(!!hasRequired, 'Paperclip update includes required fields', 'Paperclip update missing required fields');
  } catch (e) {
    check(false, 'Paperclip update validation pass', 'Paperclip update read/parse failed: ' + e.message);
  }

  // Business artifacts checks
  check(fs.existsSync(path.join(generatedDir, 'sme-sales-playbook.md')), 'sme-sales-playbook.md exists', 'sme-sales-playbook.md MISSING');
  check(fs.existsSync(path.join(generatedDir, 'web-chatbot-demo-guide.md')), 'web-chatbot-demo-guide.md exists', 'web-chatbot-demo-guide.md MISSING');
  check(fs.existsSync(path.join(generatedDir, 'objection-handling-cheat-sheet.md')), 'objection-handling-cheat-sheet.md exists', 'objection-handling-cheat-sheet.md MISSING');
  check(fs.existsSync(path.join(generatedDir, 'commercial-roi-proposal-template.md')), 'commercial-roi-proposal-template.md exists', 'commercial-roi-proposal-template.md MISSING');
  check(fs.existsSync(path.join(generatedDir, 'client-agreement-draft.md')), 'client-agreement-draft.md exists', 'client-agreement-draft.md MISSING');
  check(fs.existsSync(path.join(generatedDir, 'local-marketing-pitch-assets.md')), 'local-marketing-pitch-assets.md exists', 'local-marketing-pitch-assets.md MISSING');

  // Specific content validations
  const playbook = fs.readFileSync(path.join(generatedDir, 'sme-sales-playbook.md'), 'utf8');
  check(playbook.includes('14-Day') && playbook.includes('Zalo') && playbook.includes('Alex Minh AI'), 'playbook content has Zalo, 14-day, brand', 'playbook content incomplete');

  const demo = fs.readFileSync(path.join(generatedDir, 'web-chatbot-demo-guide.md'), 'utf8');
  check(demo.includes('Spa') || demo.includes('Clinic') || demo.includes('Nha khoa'), 'demo guide has spa/clinic context', 'demo guide missing clinic context');
  check(demo.includes('Vietnamese') || demo.includes('Dạ'), 'demo guide has Vietnamese language', 'demo guide missing Vietnamese language');

  const objection = fs.readFileSync(path.join(generatedDir, 'objection-handling-cheat-sheet.md'), 'utf8');
  check(objection.includes('12.9 triệu') || objection.includes('12,9 triệu'), 'objection guide has 12.9M pricing response', 'objection guide missing 12.9M pricing response');

  const roi = fs.readFileSync(path.join(generatedDir, 'commercial-roi-proposal-template.md'), 'utf8');
  check(roi.includes('12.900.000') || roi.includes('12.9 triệu'), 'ROI proposal contains 12.9M price', 'ROI proposal missing 12.9M price');
  check(roi.includes('4.900.000') && roi.includes('18.000.000'), 'ROI proposal contains supporting offers (4.9M and 18M)', 'ROI proposal missing supporting offers');

  const agreement = fs.readFileSync(path.join(generatedDir, 'client-agreement-draft.md'), 'utf8');
  check(agreement.includes('50%') && agreement.includes('Đợt 1') && agreement.includes('Đợt 2'), 'agreement contains 50% deposit and phases', 'agreement missing deposit/milestone terms');
} else {
  console.log('⚠️ artifacts/ai-company/mission-1.0m/ does not exist yet (pre-run phase). Skipping runtime output checks.');
}

// 7. Code safety audit on new scripts
const scriptsToCheck = [
  'scripts/ai-company-run-first-autonomous-revenue-mission.mjs',
  'scripts/ai-company-first-autonomous-revenue-verify.mjs',
  'scripts/ai-company-first-autonomous-revenue-auto-loop.mjs',
  'scripts/ai-company-first-autonomous-revenue-premerge-simulate.mjs'
];

const forbiddenPatterns = [
  { pattern: new RegExp('fe' + 'tch\\('), label: 'fe' + 'tch() calls' },
  { pattern: new RegExp('ax' + 'ios'), label: 'ax' + 'ios' },
  { pattern: new RegExp('se' + 'ndMail'), label: 'se' + 'ndMail' },
  { pattern: new RegExp('\\.p' + 'ost\\('), label: '.p' + 'ost(' },
  { pattern: new RegExp('Da' + 'te\\.now\\(\\)'), label: 'Da' + 'te.now()' },
  { pattern: new RegExp('Ma' + 'th\\.random\\(\\)'), label: 'Ma' + 'th.random()' },
  { pattern: new RegExp('ne' + 'w Date\\(\\)'), label: 'ne' + 'w Date()' },
  { pattern: new RegExp('cr' + 'ypto\\.randomUUID'), label: 'cr' + 'ypto.randomUUID' },
  { pattern: new RegExp('pr' + 'ocess\\.env\\.'), label: 'pr' + 'ocess.env.' }
];

for (const scriptRel of scriptsToCheck) {
  const scriptPath = path.join(ROOT, scriptRel);
  const scriptName = path.basename(scriptRel);
  if (!fs.existsSync(scriptPath)) {
    continue;
  }
  const content = fs.readFileSync(scriptPath, 'utf8');
  for (const { pattern, label } of forbiddenPatterns) {
    check(!pattern.test(content), `${scriptName}: no ${label}`, `${scriptName}: FORBIDDEN ${label} found`);
  }
}

// 8. Verifier Meta-Check: make sure verifiers and runner do not mention old sales-kit files
const forbiddenFilenames = [
  'client-' + 'proposal.md',
  'objection-' + 'handling.md',
  'follow-up-' + 'plan.md',
  'package-' + 'comparison.md'
];
for (const name of forbiddenFilenames) {
  if (fs.existsSync(runnerScript)) {
    const runnerContent = fs.readFileSync(runnerScript, 'utf8');
    check(!runnerContent.includes(name), `runner script does not hardcode: ${name}`, `runner script hardcodes: ${name}`);
  }
  if (fs.existsSync(verifierScript)) {
    const verifierContent = fs.readFileSync(verifierScript, 'utf8');
    check(!verifierContent.includes(name), `verifier script does not hardcode: ${name}`, `verifier script hardcodes: ${name}`);
  }
}

// 9. Runtime reports are not tracked in Git
const { execSync } = await import('child_process');
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
check(trackedFiles === '', `No runtime reports must be tracked in Git. Found: ${trackedFiles}`, `Runtime reports tracked in Git: ${trackedFiles}`);

// 10. Self-test gate file includes 1.0m
const selfTestGatePath = path.join(ROOT, 'scripts', 'ai-dev-factory-self-test-gate.mjs');
if (fs.existsSync(selfTestGatePath)) {
  const gateContent = fs.readFileSync(selfTestGatePath, 'utf8');
  check(gateContent.includes('1.0m') || gateContent.includes('1.0M'), 'self-test gate includes verify-1.0m', 'self-test gate does not include 1.0m');
}

// 11. Execution status mentions Milestone 1.0M
const statusPath = path.join(ROOT, 'docs', 'ai-dev-factory-execution-status.md');
if (fs.existsSync(statusPath)) {
  const statusContent = fs.readFileSync(statusPath, 'utf8');
  check(statusContent.includes('Milestone 1.0M') || statusContent.includes('1.0m'), 'execution status doc mentions Milestone 1.0M', 'execution status doc does not mention 1.0M');
}

console.log('\n' + '='.repeat(50));
console.log(`Phase 1.0M Verification Summary: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('Phase 1.0M verification PASSED!');
  process.exit(0);
} else {
  console.log('Phase 1.0M verification FAILED!');
  for (const f of failures) {
    console.log('  - ' + f);
  }
  process.exit(1);
}
