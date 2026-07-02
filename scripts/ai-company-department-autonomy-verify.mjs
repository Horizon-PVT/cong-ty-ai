#!/usr/bin/env node
/**
 * ai-company-department-autonomy-verify.mjs
 * Milestone 1.0L: Department Autonomy Verifier
 *
 * Verifies that:
 * - All control outputs exist and are valid
 * - Policy enforces department-led execution
 * - NO fixed business artifact list is required
 * - Departments actually chose artifacts
 * - QA, gap analysis, KPI, Paperclip update all exist
 * - Safety locks are intact
 *
 * CLI: --mission <id> --strict --write-report --explain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const missionId = args[args.indexOf('--mission') + 1] || 'mission_1_0l_department_autonomy';
const strict = args.includes('--strict');
const writeReport = args.includes('--write-report');
const explain = args.includes('--explain');

let passed = 0;
let failed = 0;
const failures = [];

function pass(msg) {
  passed++;
  console.log('✅ ' + msg);
}

function fail(msg) {
  failed++;
  failures.push(msg);
  console.log('❌ ' + msg);
}

function check(condition, passMsg, failMsg) {
  if (condition) pass(passMsg);
  else fail(failMsg);
}

// ─── Paths ────────────────────────────────────────────────────────────────────
const missionPath = path.join(ROOT, 'missions', 'ai-company', 'mission-1.0l-department-autonomy.json');
const policyPath = path.join(ROOT, 'configs', 'ai-company', 'department-autonomy-policy.json');
const modelPath = path.join(ROOT, 'configs', 'ai-company', 'department-autonomy-operating-model.json');
const artifactDir = path.join(ROOT, 'artifacts', 'ai-company', 'mission-1.0l');
const generatedDir = path.join(artifactDir, 'generated');

console.log('Starting Phase 1.0L Department Autonomy Verification...');

// ─── 1. File Existence ────────────────────────────────────────────────────────
check(fs.existsSync(missionPath), 'mission input exists', 'mission input MISSING: mission-1.0l-department-autonomy.json');
check(fs.existsSync(policyPath), 'department autonomy policy exists', 'department autonomy policy MISSING');
check(fs.existsSync(modelPath), 'department operating model exists', 'department operating model MISSING');

// ─── 2. Parse Files ───────────────────────────────────────────────────────────
let mission, policy, model;
try {
  mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
  pass('mission input parses as valid JSON');
} catch(e) { fail('mission input JSON parse error: ' + e.message); }

try {
  policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  pass('department autonomy policy parses as valid JSON');
} catch(e) { fail('policy JSON parse error: ' + e.message); }

try {
  model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  pass('department operating model parses as valid JSON');
} catch(e) { fail('operating model JSON parse error: ' + e.message); }

// ─── 3. Mission Input Validation ─────────────────────────────────────────────
if (mission) {
  check(!mission.required_sales_artifacts, 'mission input does NOT contain required_sales_artifacts (correct)', 'mission input contains forbidden required_sales_artifacts');
  check(!mission.fixed_artifact_list, 'mission input does NOT contain fixed_artifact_list (correct)', 'mission input contains forbidden fixed_artifact_list');
  check(mission.department_autonomy_required === true, 'mission has department_autonomy_required: true', 'mission missing department_autonomy_required: true');
  check(mission.departments_must_select_artifacts === true, 'mission has departments_must_select_artifacts: true', 'mission missing departments_must_select_artifacts: true');
  check(mission.owner_goal && mission.owner_goal.length > 10, 'mission has owner_goal', 'mission owner_goal is empty');
  check(!!mission.known_offer_anchors, 'mission has known_offer_anchors', 'mission missing known_offer_anchors');
}

// ─── 4. Policy Validation ─────────────────────────────────────────────────────
if (policy) {
  check(policy.department_led === true, 'policy has department_led: true', 'policy missing department_led: true');
  check(policy.departments_select_artifacts === true, 'policy has departments_select_artifacts: true', 'policy missing departments_select_artifacts: true');
  check(policy.fixed_artifact_list_allowed === false, 'policy has fixed_artifact_list_allowed: false', 'policy missing fixed_artifact_list_allowed: false');
  check(policy.artifact_manifest_required === true, 'policy has artifact_manifest_required: true', 'policy missing artifact_manifest_required: true');
  check(policy.department_decision_log_required === true, 'policy has department_decision_log_required: true', 'policy missing department_decision_log_required');
  check(policy.qa_review_required === true, 'policy has qa_review_required: true', 'policy missing qa_review_required');
  check(policy.gap_analysis_required === true, 'policy has gap_analysis_required: true', 'policy missing gap_analysis_required');
  check(policy.capability_first === true, 'policy has capability_first: true', 'policy missing capability_first');
  check(policy.owner_manual_qa_required === false, 'policy has owner_manual_qa_required: false', 'policy missing owner_manual_qa_required: false');

  // Blocked actions
  const blocked = policy.blocked || {};
  check(blocked.allow_live_api_calls === false, 'policy blocks live API calls', 'policy does NOT block live API calls');
  check(blocked.allow_deploy === false, 'policy blocks deploy', 'policy does NOT block deploy');
  check(blocked.allow_publish === false, 'policy blocks publish', 'policy does NOT block publish');
  check(blocked.allow_spend === false, 'policy blocks spend', 'policy does NOT block spend');
  check(blocked.allow_customer_comms === false, 'policy blocks customer communications', 'policy does NOT block customer comms');
  check(blocked.allow_auto_send_message === false, 'policy blocks auto send message', 'policy does NOT block auto send message');
  check(blocked.allow_auto_crm_update === false, 'policy blocks auto CRM update', 'policy does NOT block auto CRM update');
  check(blocked.allow_secret_read === false, 'policy blocks secret reading', 'policy does NOT block secret reading');
  check(blocked.allow_env_read === false, 'policy blocks env read', 'policy does NOT block env read');
  check(blocked.allow_production_data_mutation === false, 'policy blocks production data mutation', 'policy does NOT block production data mutation');
  check(blocked.allow_real_client_data === false, 'policy blocks real client data', 'policy does NOT block real client data');

  // Allowed
  const allowed = policy.allowed || {};
  check(allowed.allow_local_artifact_write === true, 'policy allows local artifact write', 'policy does NOT allow local artifact write');
  check(allowed.allow_local_memory_write === true, 'policy allows local memory write', 'policy does NOT allow local memory write');
  check(allowed.allow_local_report_write === true, 'policy allows local report write', 'policy does NOT allow local report write');

  // Thresholds
  const thresholds = policy.completion_thresholds || {};
  check(thresholds.minimum_departments_involved >= 6, 'policy minimum_departments_involved >= 6', 'policy minimum_departments_involved < 6');
  check(thresholds.minimum_self_selected_artifacts >= 5, 'policy minimum_self_selected_artifacts >= 5', 'policy minimum_self_selected_artifacts < 5');
}

// ─── 5. Operating Model Validation ───────────────────────────────────────────
if (model) {
  const requiredStages = [
    'owner_goal_intake', 'ceo_mission_interpretation', 'department_briefing',
    'department_artifact_proposals', 'cross_department_negotiation', 'artifact_manifest_creation',
    'worker_assignment', 'artifact_generation', 'qa_review', 'gap_analysis', 'gap_closure',
    'final_packaging', 'kpi_scoring', 'learning_update', 'paperclip_update',
    'auto_verification', 'premerge_simulation'
  ];
  const modelStageIds = (model.stages || []).map(s => s.stage_id);
  for (const stageId of requiredStages) {
    check(modelStageIds.includes(stageId), `operating model includes stage: ${stageId}`, `operating model MISSING stage: ${stageId}`);
  }
}

// ─── 6. Control Output Existence ─────────────────────────────────────────────
const controlOutputs = [
  'department-decision-log.json',
  'artifact-manifest.json',
  'final-package-index.md',
  'qa-review-report.md',
  'gap-analysis.json',
  'kpi-scorecard.json',
  'paperclip-department-update.json'
];

for (const f of controlOutputs) {
  check(fs.existsSync(path.join(artifactDir, f)), `control output exists: ${f}`, `control output MISSING: ${f}`);
}

check(fs.existsSync(generatedDir), 'generated artifact directory exists', 'generated artifact directory MISSING');

// ─── 7. Artifact Manifest Validation ─────────────────────────────────────────
const manifestPath = path.join(artifactDir, 'artifact-manifest.json');
if (fs.existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    pass('artifact-manifest.json parses as valid JSON');
  } catch(e) { fail('artifact-manifest.json JSON parse error: ' + e.message); }

  if (manifest) {
    const minArtifacts = (policy && policy.completion_thresholds && policy.completion_thresholds.minimum_self_selected_artifacts) || 5;
    check(manifest.fixed_artifact_list_used === false, 'artifact manifest confirms no fixed artifact list was used', 'artifact manifest does NOT confirm fixed_artifact_list_used: false');
    check(manifest.artifacts && manifest.artifacts.length >= minArtifacts, `artifact manifest has >= ${minArtifacts} self-selected artifacts (found ${manifest.artifacts ? manifest.artifacts.length : 0})`, `artifact manifest has FEWER than ${minArtifacts} artifacts`);

    if (manifest.artifacts) {
      for (const art of manifest.artifacts) {
        check(!!art.owning_department, `artifact ${art.artifact_id} has owning_department`, `artifact ${art.artifact_id} MISSING owning_department`);
        check(!!art.purpose, `artifact ${art.artifact_id} has purpose`, `artifact ${art.artifact_id} MISSING purpose`);
        check(!!art.customer_value, `artifact ${art.artifact_id} has customer_value`, `artifact ${art.artifact_id} MISSING customer_value`);
        check(!!art.business_goal_mapping, `artifact ${art.artifact_id} has business_goal_mapping`, `artifact ${art.artifact_id} MISSING business_goal_mapping`);
        check(!!art.acceptance_criteria, `artifact ${art.artifact_id} has acceptance_criteria`, `artifact ${art.artifact_id} MISSING acceptance_criteria`);
        check(!!art.safety_review_status, `artifact ${art.artifact_id} has safety_review_status`, `artifact ${art.artifact_id} MISSING safety_review_status`);
      }
    }
  }
}

// ─── 8. Department Decision Log Validation ───────────────────────────────────
const decisionLogPath = path.join(artifactDir, 'department-decision-log.json');
if (fs.existsSync(decisionLogPath)) {
  let log;
  try {
    log = JSON.parse(fs.readFileSync(decisionLogPath, 'utf8'));
    pass('department-decision-log.json parses as valid JSON');
  } catch(e) { fail('department-decision-log.json parse error: ' + e.message); }

  if (log) {
    const requiredDepts = ['CEO', 'COO', 'CMO', 'CTO', 'CFO', 'QA'];
    const participated = log.departments_participated || [];
    for (const dept of requiredDepts) {
      check(participated.includes(dept), `department participated: ${dept}`, `department DID NOT participate: ${dept}`);
    }
    const minDepts = (policy && policy.completion_thresholds && policy.completion_thresholds.minimum_departments_involved) || 6;
    check(participated.length >= minDepts, `at least ${minDepts} departments participated (found ${participated.length})`, `fewer than ${minDepts} departments participated`);
  }
}

// ─── 9. QA Review Validation ─────────────────────────────────────────────────
const qaReportPath = path.join(artifactDir, 'qa-review-report.md');
if (fs.existsSync(qaReportPath)) {
  const qaContent = fs.readFileSync(qaReportPath, 'utf8');
  check(qaContent.includes('Product Completeness') || qaContent.includes('product_completeness'), 'QA report includes product completeness score', 'QA report MISSING product completeness score');
  check(qaContent.includes('Commercial Readiness') || qaContent.includes('commercial_readiness'), 'QA report includes commercial readiness score', 'QA report MISSING commercial readiness score');
  check(qaContent.includes('Safety') || qaContent.includes('safety_score'), 'QA report includes safety score', 'QA report MISSING safety score');
  check(qaContent.includes('QA_PASS') || qaContent.includes('PASS'), 'QA report includes final verdict', 'QA report MISSING final verdict');
}

// ─── 10. Gap Analysis Validation ─────────────────────────────────────────────
const gapPath = path.join(artifactDir, 'gap-analysis.json');
if (fs.existsSync(gapPath)) {
  let gap;
  try {
    gap = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
    pass('gap-analysis.json parses as valid JSON');
  } catch(e) { fail('gap-analysis.json parse error: ' + e.message); }

  if (gap) {
    check(gap.all_critical_gaps_closed === true || gap.critical_gaps_count === 0, 'all critical gaps are closed or none exist', 'critical gaps remain OPEN');
    check(!!gap.conclusion, 'gap analysis has conclusion explaining result', 'gap analysis MISSING conclusion');
  }
}

// ─── 11. KPI Scorecard Validation ────────────────────────────────────────────
const kpiPath = path.join(artifactDir, 'kpi-scorecard.json');
if (fs.existsSync(kpiPath)) {
  let kpi;
  try {
    kpi = JSON.parse(fs.readFileSync(kpiPath, 'utf8'));
    pass('kpi-scorecard.json parses as valid JSON');
  } catch(e) { fail('kpi-scorecard.json parse error: ' + e.message); }

  if (kpi && kpi.scores) {
    const requiredKPIs = [
      'mission_success_score', 'department_autonomy_score', 'customer_value_score',
      'commercial_readiness_score', 'artifact_quality_score', 'qa_strictness_score',
      'owner_decision_load_score', 'safety_score', 'learning_quality_score'
    ];
    for (const field of requiredKPIs) {
      check(kpi.scores[field] !== undefined, `KPI scorecard has field: ${field}`, `KPI scorecard MISSING field: ${field}`);
    }
  }
}

// ─── 12. Paperclip Update Validation ─────────────────────────────────────────
const paperclipPath = path.join(artifactDir, 'paperclip-department-update.json');
if (fs.existsSync(paperclipPath)) {
  let pp;
  try {
    pp = JSON.parse(fs.readFileSync(paperclipPath, 'utf8'));
    pass('paperclip-department-update.json parses as valid JSON');
  } catch(e) { fail('paperclip-department-update.json parse error: ' + e.message); }

  if (pp) {
    check(!!pp.mission_status, 'Paperclip update has mission_status', 'Paperclip update MISSING mission_status');
    check(!!pp.departments_involved, 'Paperclip update has departments_involved', 'Paperclip update MISSING departments_involved');
    check(!!pp.self_selected_artifacts, 'Paperclip update has self_selected_artifacts', 'Paperclip update MISSING self_selected_artifacts');
    check(!!pp.qa_verdict, 'Paperclip update has qa_verdict', 'Paperclip update MISSING qa_verdict');
    check(!!pp.kpi_summary, 'Paperclip update has kpi_summary', 'Paperclip update MISSING kpi_summary');
    check(!!pp.safety_locks, 'Paperclip update has safety_locks', 'Paperclip update MISSING safety_locks');
    check(!!pp.owner_action_needed, 'Paperclip update has owner_action_needed', 'Paperclip update MISSING owner_action_needed');
    check(!!pp.recommended_next_milestone, 'Paperclip update has recommended_next_milestone', 'Paperclip update MISSING recommended_next_milestone');
  }
}

// ─── 13. Code Safety Audit ───────────────────────────────────────────────────
const scriptsToCheck = [
  'scripts/ai-company-run-department-autonomy-mission.mjs',
  'scripts/ai-company-department-autonomy-verify.mjs',
  'scripts/ai-company-department-autonomy-auto-loop.mjs',
  'scripts/ai-company-department-autonomy-premerge-simulate.mjs'
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
    fail(`script exists: ${scriptName}`);
    continue;
  }
  pass(`script exists: ${scriptName}`);
  const content = fs.readFileSync(scriptPath, 'utf8');
  for (const { pattern, label } of forbiddenPatterns) {
    check(!pattern.test(content), `${scriptName}: no ${label}`, `${scriptName}: FORBIDDEN ${label} found`);
  }
}

// ─── 14. Verifier Meta-Check ──────────────────────────────────────────────────
// Ensure this verifier itself does NOT require old hardcoded artifact filenames
const thisFile = fs.readFileSync(path.join(ROOT, 'scripts', 'ai-company-department-autonomy-verify.mjs'), 'utf8');
const forbiddenFilenames = [
  'client-' + 'proposal.md',
  'objection-' + 'handling.md',
  'follow-up-' + 'plan.md',
  'package-' + 'comparison.md'
];
for (const name of forbiddenFilenames) {
  check(!thisFile.includes(name), `verifier does NOT require hardcoded: ${name}`, `verifier REQUIRES forbidden hardcoded artifact: ${name}`);
}

// ─── 15. Runner Meta-Check ───────────────────────────────────────────────────
const runnerPath = path.join(ROOT, 'scripts', 'ai-company-run-department-autonomy-mission.mjs');
if (fs.existsSync(runnerPath)) {
  const runnerContent = fs.readFileSync(runnerPath, 'utf8');
  for (const name of forbiddenFilenames) {
    check(!runnerContent.includes(name), `runner does NOT hardcode: ${name}`, `runner HARDCODES forbidden artifact: ${name}`);
  }
}

// ─── 16. Runtime Reports Not Tracked ─────────────────────────────────────────
const { execSync } = await import('child_process');
const runtimeFiles = [
  'reports/department-autonomy-mission/latest.json',
  'reports/department-autonomy-verify/latest.json',
  'logs/department-autonomy-auto-loop-report.json',
  'logs/department-autonomy-premerge-simulate-report.json',
  'reports/self-test/latest.json',
  'reports/self-test/latest.md',
  'reports/e2e/latest.json',
  'reports/post-merge/latest.json'
];
let trackedFiles = '';
try {
  trackedFiles = execSync('git ls-files ' + runtimeFiles.join(' '), { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
} catch(e) { trackedFiles = ''; }
check(trackedFiles === '', `No runtime reports tracked in Git. Found: ${trackedFiles}`, `Runtime reports are tracked in Git: ${trackedFiles}`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log(`Phase 1.0L Verification: ${passed} passed, ${failed} failed`);

if (writeReport) {
  const reportDir = path.join(ROOT, 'reports', 'department-autonomy-verify');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'latest.json'), JSON.stringify({
    mission_id: missionId,
    passed,
    failed,
    failures,
    verdict: failed === 0 ? 'PASS' : 'FAIL'
  }, null, 2), 'utf8');
}

if (failed === 0) {
  console.log('Phase 1.0L verification PASSED!');
  process.exit(0);
} else {
  console.log('Phase 1.0L verification FAILED!');
  for (const f of failures) console.log('  FAIL: ' + f);
  if (strict) process.exit(1);
}
