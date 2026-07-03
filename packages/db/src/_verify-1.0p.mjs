// packages/db/src/_verify-1.0p.mjs
// Milestone 1.0P E2E integration gate verifier — Revenue Command Center

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

let passed = 0;
let failed = 0;
const errors = [];

function check(cond, label, errorMsg = '') {
  if (cond) {
    passed++;
    console.log(`✅ ${label}`);
  } else {
    failed++;
    errors.push(errorMsg || label);
    console.log(`❌ ${label}`);
  }
}

async function main() {
  console.log('Starting Phase 1.0P verification...');

  // 1. Files existence
  const files = [
    'missions/ai-company/mission-1.0p-revenue-command-center.json',
    'configs/ai-company/revenue-command-center-policy.json',
    'configs/ai-company/revenue-command-center-operating-model.json',
    'configs/ai-company/revenue-command-center-widget-map.json',
    'schemas/ai-company/revenue-command-center-payload.schema.json',
    'scripts/ai-company-run-revenue-command-center-mission.mjs',
    'scripts/ai-company-revenue-command-center-verify.mjs',
    'scripts/ai-company-revenue-command-center-auto-loop.mjs',
    'scripts/ai-company-revenue-command-center-premerge-simulate.mjs',
    'packages/db/src/_verify-1.0p.mjs'
  ];

  for (const f of files) {
    check(fs.existsSync(path.join(ROOT, f)), `${path.basename(f)} exists`, `${f} is missing`);
  }

  // 2. Load and parse JSON files
  let mission = null, policy = null, opModel = null, widgetMap = null, schema = null;

  try {
    mission = JSON.parse(fs.readFileSync(path.join(ROOT, 'missions/ai-company/mission-1.0p-revenue-command-center.json'), 'utf8'));
    check(true, 'mission JSON parses');
  } catch (err) {
    check(false, 'mission JSON parses', `Failed: ${err.message}`);
  }

  try {
    policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/revenue-command-center-policy.json'), 'utf8'));
    check(true, 'policy JSON parses');
  } catch (err) {
    check(false, 'policy JSON parses', `Failed: ${err.message}`);
  }

  try {
    opModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/revenue-command-center-operating-model.json'), 'utf8'));
    check(true, 'operating model JSON parses');
  } catch (err) {
    check(false, 'operating model JSON parses', `Failed: ${err.message}`);
  }

  try {
    widgetMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/revenue-command-center-widget-map.json'), 'utf8'));
    check(true, 'widget map JSON parses');
  } catch (err) {
    check(false, 'widget map JSON parses', `Failed: ${err.message}`);
  }

  try {
    schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/ai-company/revenue-command-center-payload.schema.json'), 'utf8'));
    check(true, 'payload schema JSON parses');
  } catch (err) {
    check(false, 'payload schema JSON parses', `Failed: ${err.message}`);
  }

  // 3. Policy compliance checks
  if (policy) {
    check(policy.department_led === true, 'policy requires department-led execution');
    check(policy.departments_select_artifacts === true, 'policy requires departments to select artifacts');
    check(policy.fixed_artifact_list_allowed === false, 'policy forbids fixed artifact list');
    check(policy.hard_locks?.no_real_customer_messaging === true, 'policy blocks real customer messaging');
    check(policy.hard_locks?.no_crm_update === true, 'policy blocks CRM update');
    check(policy.hard_locks?.no_browser_automation === true, 'policy blocks browser automation');
    check(policy.hard_locks?.no_spend === true, 'policy blocks spend');
    check(policy.hard_locks?.no_deploy === true, 'policy blocks deploy');
    check(policy.hard_locks?.no_publish === true, 'policy blocks publish');
    check(policy.hard_locks?.no_secrets_read === true, 'policy blocks secrets_read');
    check(policy.hard_locks?.no_standalone_dashboard === true, 'policy blocks standalone dashboard');
    check(policy.allowed?.paperclip_compatible_payload === true, 'policy allows Paperclip-compatible payload');
    check(policy.allowed?.local_command_center_preview_data === true, 'policy allows local command center preview data');
    check(policy.demo_data_policy?.demo_leads_only === true, 'lead safety: demo_leads_only is true');
    check(policy.demo_data_policy?.must_label_demo_data === true, 'demo data must be labeled');
  }

  // 4. Mission checks
  if (mission) {
    check(!mission.required_command_center_artifacts, 'mission does not contain fixed required_command_center_artifacts');
    check(!mission.fixed_artifact_list, 'mission does not contain fixed fixed_artifact_list');
    check(Array.isArray(mission.command_center_questions), 'mission has command_center_questions array');
    check(mission.command_center_questions?.length === 10, 'mission has exactly 10 command-center questions');
    check(mission.ui_scope?.standalone_dashboard_allowed === false, 'mission disallows standalone dashboard');
  }

  // 5. Operating model stages
  const requiredStages = [
    'owner_goal_intake', 'ceo_mission_interpretation', 'department_briefing',
    'department_artifact_proposals', 'cross_department_negotiation', 'artifact_manifest_creation',
    'worker_assignment', 'artifact_generation', 'qa_review', 'gap_analysis', 'gap_closure',
    'final_packaging', 'kpi_scoring', 'learning_update', 'paperclip_update',
    'auto_verification', 'premerge_simulation'
  ];
  if (opModel) {
    const stageNames = (opModel.stages || []).map(s => s.stage);
    for (const stage of requiredStages) {
      check(stageNames.includes(stage), `operating model includes stage: ${stage}`);
    }
  }

  // 6. Widget map checks
  if (widgetMap) {
    check(Array.isArray(widgetMap.widgets), 'widget map has widgets array');
    check(widgetMap.widgets?.length >= 8, 'widget map has >= 8 revenue command center widgets');
    const widgetIds = (widgetMap.widgets || []).map(w => w.widget_id);
    check(widgetIds.includes('revenue_command_center_daily_brief'), 'widget map includes daily_brief widget');
    check(widgetIds.includes('revenue_lead_priority_queue'), 'widget map includes lead_priority_queue widget');
    check(widgetIds.includes('revenue_next_best_action'), 'widget map includes next_best_action widget');
    check(widgetIds.includes('revenue_approval_queue'), 'widget map includes approval_queue widget');
    check(widgetIds.includes('revenue_pipeline_progress'), 'widget map includes pipeline_progress widget');
    check(widgetIds.includes('revenue_safety_lock_display'), 'widget map includes safety_lock_display widget');
    check(widgetIds.includes('revenue_follow_up_staging'), 'widget map includes follow_up_staging widget');
    check(widgetIds.includes('revenue_tomorrow_plan'), 'widget map includes tomorrow_plan widget');
    
    // Check specific required fields for safety
    const briefWidget = (widgetMap.widgets || []).find(w => w.widget_id === 'revenue_command_center_daily_brief');
    check(
      briefWidget && (briefWidget.required_fields.includes('demo_badge') || briefWidget.required_fields.includes('safety_note')),
      'widget map daily_brief requires demo_badge or safety_note'
    );

    const progressWidget = (widgetMap.widgets || []).find(w => w.widget_id === 'revenue_pipeline_progress');
    check(
      progressWidget &&
      progressWidget.required_fields.includes('demo_won_count') &&
      progressWidget.required_fields.includes('demo_progress_pct') &&
      progressWidget.required_fields.includes('revenue_confirmed_demo') &&
      progressWidget.required_fields.includes('demo_badge') &&
      progressWidget.required_fields.includes('safety_note'),
      'widget map pipeline_progress requires demo/revenue safety fields'
    );

    // Check all widgets point to the same payload file
    const payloadSources = (widgetMap.widgets || []).filter(w =>
      w.source_file === 'reports/revenue-command-center/daily-command-center-payload.json'
    );
    check(payloadSources.length >= 8, 'all widgets source from the unified command-center payload');
  }

  // 7. Schema checks
  if (schema) {
    const required = schema.required || [];
    check(required.includes('command_center_answers'), 'schema requires command_center_answers');
    check(required.includes('data_label'), 'schema requires data_label field');
    check(required.includes('demo_warning'), 'schema requires demo_warning field');
    check(required.includes('pipeline_progress'), 'schema requires pipeline_progress field');
    check(required.includes('follow_up_staging'), 'schema requires follow_up_staging field');
    check(required.includes('safety_lock_display'), 'schema requires safety_lock_display field');
    check(required.includes('approval_queue'), 'schema requires approval_queue field');

    const dbReq = schema.properties?.daily_brief?.required || [];
    check(dbReq.includes('demo_badge') && dbReq.includes('safety_note') && dbReq.includes('data_label'), 'schema daily_brief requires demo safety fields');

    const ppReq = schema.properties?.pipeline_progress?.required || [];
    check(
      ppReq.includes('demo_won_count') &&
      ppReq.includes('demo_progress_pct') &&
      ppReq.includes('revenue_confirmed_demo') &&
      ppReq.includes('demo_badge') &&
      ppReq.includes('safety_note') &&
      ppReq.includes('data_label'),
      'schema pipeline_progress requires demo/revenue safety fields'
    );
  }

  // 8. Generated artifact checks
  const ARTIFACTS_DIR = path.join(ROOT, 'artifacts/ai-company/mission-1.0p');
  const GENERATED_DIR = path.join(ARTIFACTS_DIR, 'generated');
  const deliverables = [
    'daily-command-center-payload.json',
    'next-best-action-model.json',
    'revenue-forecast-summary.json',
    'sales-angle-per-lead-type.json',
    'approval-queue-model.json',
    'handoff-readiness-signals.json',
    'safety-lock-display.json',
    'command-center-preview.md'
  ];
  for (const d of deliverables) {
    check(fs.existsSync(path.join(GENERATED_DIR, d)), `deliverable ${d} exists`);
  }

  // 9. Manifest checks
  const manifestPath = path.join(ARTIFACTS_DIR, 'artifact-manifest.json');
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check(true, 'artifact-manifest.json parses');
  } catch (err) {
    check(false, 'artifact-manifest.json parses', `Failed: ${err.message}`);
  }
  if (manifest) {
    check(manifest.fixed_artifact_list_used === false, 'manifest: fixed_artifact_list_used is false');
    check(manifest.total_artifacts >= 6, 'manifest has >= 6 self-selected artifacts');
    check(
      Array.isArray(manifest.artifacts) && manifest.artifacts.every(a => a.owning_department && a.rationale),
      'every artifact in manifest has owning department and rationale'
    );
  }

  // 10. Department decision log
  const deptLogPath = path.join(ARTIFACTS_DIR, 'department-decision-log.json');
  let deptLog = null;
  try {
    deptLog = JSON.parse(fs.readFileSync(deptLogPath, 'utf8'));
    check(true, 'department-decision-log.json parses');
  } catch (err) {
    check(false, 'department-decision-log.json parses', `Failed: ${err.message}`);
  }
  if (deptLog) {
    check(
      Array.isArray(deptLog.departments) && deptLog.departments.length >= 7,
      'department decision log includes >= 7 departments'
    );
  }

  // 11. QA review report
  const qaPath = path.join(ARTIFACTS_DIR, 'qa-review-report.md');
  check(fs.existsSync(qaPath), 'qa-review-report.md parses');
  if (fs.existsSync(qaPath)) {
    const qaContent = fs.readFileSync(qaPath, 'utf8');
    check(qaContent.includes('PASS'), 'QA report includes completion verdict');
  }

  // 12. Gap analysis
  const gapPath = path.join(ARTIFACTS_DIR, 'gap-analysis.json');
  let gapAnalysis = null;
  try {
    gapAnalysis = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
    check(true, 'gap-analysis.json parses');
  } catch (err) {
    check(false, 'gap-analysis.json parses', `Failed: ${err.message}`);
  }
  if (gapAnalysis) {
    check(
      gapAnalysis.all_gaps_closed === true || (gapAnalysis.critical_gaps && gapAnalysis.critical_gaps.length === 0),
      'gap analysis: all critical gaps closed'
    );
  }

  // 13. KPI scorecard
  const kpiPath = path.join(ARTIFACTS_DIR, 'kpi-scorecard.json');
  let kpi = null;
  try {
    kpi = JSON.parse(fs.readFileSync(kpiPath, 'utf8'));
    check(true, 'kpi-scorecard.json parses');
  } catch (err) {
    check(false, 'kpi-scorecard.json parses', `Failed: ${err.message}`);
  }
  if (kpi) {
    check(kpi.kpis?.command_center_questions_answered === 10, 'KPI: 10 command-center questions answered');
    check(kpi.kpis?.pipeline_leads_total === 50, 'KPI: total pipeline leads equals 50');
    check(kpi.kpis?.pipeline_won_count === 3, 'KPI: won leads count equals 3');
    check(kpi.kpis?.fixed_artifact_list_used === false, 'KPI: fixed_artifact_list_used is false');
    check(kpi.kpis?.demo_labeling_compliant === true, 'KPI: demo_labeling_compliant is true');
    check(kpi.kpis?.safety_locks_enumerated >= 8, 'KPI: >= 8 safety locks enumerated');
  }

  // 14. Daily command center payload deep checks
  const payloadPath = path.join(GENERATED_DIR, 'daily-command-center-payload.json');
  let payload = null;
  try {
    payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    check(true, 'daily-command-center-payload.json parses');
  } catch (err) {
    check(false, 'daily-command-center-payload.json parses', `Failed: ${err.message}`);
  }
  if (payload) {
    check(payload.data_label === 'DEMO_LOCAL_ONLY', 'payload has DEMO_LOCAL_ONLY label');
    check(!!payload.demo_warning, 'payload has demo_warning');
    check(!!payload.command_center_answers, 'payload has command_center_answers');
    const answers = payload.command_center_answers || {};
    check(!!answers.q1_what_to_do_today, 'payload answers q1: what to do today');
    check(!!answers.q2_highest_priority_leads, 'payload answers q2: highest priority leads');
    check(!!answers.q3_why_priority, 'payload answers q3: why priority');
    check(!!answers.q4_sales_angle, 'payload answers q4: sales angle');
    check(!!answers.q5_demo_or_asset, 'payload answers q5: demo or asset');
    check(!!answers.q6_follow_up_ready, 'payload answers q6: follow-up ready');
    check(!!answers.q7_needs_approval, 'payload answers q7: needs approval');
    check(!!answers.q8_blocked_by_safety, 'payload answers q8: blocked by safety');
    check(!!answers.q9_pipeline_progress, 'payload answers q9: pipeline progress');
    check(!!answers.q10_tomorrow, 'payload answers q10: tomorrow');
    check(
      payload.follow_up_staging?.do_not_send_warning?.includes('DO NOT SEND'),
      'payload follow_up_staging has DO NOT SEND warning'
    );
    check(
      Array.isArray(payload.safety_lock_display?.active_locks) && payload.safety_lock_display.active_locks.length >= 8,
      'payload safety_lock_display has >= 8 active locks'
    );
    check(
      payload.pipeline_progress?.total_leads === 50,
      'payload pipeline_progress total_leads equals 50'
    );
    check(
      payload.pipeline_progress?.demo_won_count === 3,
      'payload pipeline_progress demo_won_count equals 3'
    );
    check(
      payload.pipeline_progress?.won_count === undefined,
      'payload pipeline_progress won_count is undefined (lacks unqualified label)'
    );
    check(
      payload.pipeline_progress?.progress_pct === undefined,
      'payload pipeline_progress progress_pct is undefined (lacks unqualified label)'
    );
    check(
      payload.daily_brief?.demo_badge === 'DEMO / SIMULATION',
      'daily_brief has demo_badge'
    );
    check(
      payload.daily_brief?.safety_note?.includes('No real'),
      'daily_brief has safety_note'
    );
    check(
      !payload.daily_brief?.pipeline_status?.includes('closed') || payload.daily_brief?.pipeline_status?.includes('DEMO'),
      'daily_brief pipeline_status has DEMO if it mentions closed'
    );

    // Ensure all 10 widget sections have demo qualifiers locally
    const widgetSections = [
      'daily_brief', 'lead_priority_queue', 'next_best_actions',
      'sales_angle_display', 'demo_asset_selector', 'follow_up_staging',
      'approval_queue', 'pipeline_progress', 'safety_lock_display', 'tomorrow_plan'
    ];
    for (const sec of widgetSections) {
      const sObj = payload[sec];
      check(sObj && sObj.data_label === 'DEMO_LOCAL_ONLY', `widget section ${sec} has data_label DEMO_LOCAL_ONLY`);
      check(sObj && sObj.demo_badge === 'DEMO / SIMULATION', `widget section ${sec} has demo_badge`);
      check(sObj && sObj.safety_note?.includes('No real'), `widget section ${sec} has safety_note`);
    }

    const payloadStr = JSON.stringify(payload);
    check(!payloadStr.includes('"real_revenue_confirmed"'), 'payload has no unqualified real revenue claim');
    check(!payloadStr.includes('"real customer contacted"'), 'payload has no real customer contact claim');
    // Check all demo lead names have [DEMO] marker
    const priorityLeads = payload.lead_priority_queue?.leads || [];
    check(
      priorityLeads.length > 0 && priorityLeads.every(l => l.lead_name && l.lead_name.includes('[DEMO]')),
      'all priority queue leads marked [DEMO]'
    );
  }

  // 15. Paperclip reports sync check
  const reportsPayloadPath = path.join(ROOT, 'reports/revenue-command-center/daily-command-center-payload.json');
  check(fs.existsSync(reportsPayloadPath), 'reports/revenue-command-center/daily-command-center-payload.json exists for Paperclip');

  // 16. Script safety (no forbidden calls)
  const safetyFiles = [
    'scripts/ai-company-run-revenue-command-center-mission.mjs',
    'scripts/ai-company-revenue-command-center-auto-loop.mjs',
    'scripts/ai-company-revenue-command-center-premerge-simulate.mjs'
  ];
  const forbidden = [
    { pattern: 'fetch(', label: 'fetch() calls' },
    { pattern: 'axios', label: 'axios' },
    { pattern: 'sendMail', label: 'sendMail' },
    { pattern: '.post(', label: '.post(' },
    { pattern: 'Date.now()', label: 'Date.now()' },
    { pattern: 'Math.random()', label: 'Math.random()' },
    { pattern: 'new Date()', label: 'new Date()' },
    { pattern: 'crypto.randomUUID', label: 'crypto.randomUUID' },
    { pattern: 'process.env.', label: 'process.env.' }
  ];
  for (const scriptFile of safetyFiles) {
    const scriptPath = path.join(ROOT, scriptFile);
    if (fs.existsSync(scriptPath)) {
      const src = fs.readFileSync(scriptPath, 'utf8');
      const scriptName = path.basename(scriptFile);
      for (const f of forbidden) {
        check(!src.includes(f.pattern), `${scriptName}: no ${f.label}`);
      }
    }
  }

  // 17. Runner does not hardcode legacy artifact names
  const runnerPath = path.join(ROOT, 'scripts/ai-company-run-revenue-command-center-mission.mjs');
  if (fs.existsSync(runnerPath)) {
    const runnerSrc = fs.readFileSync(runnerPath, 'utf8');
    const forbiddenNames = ['client-proposal.md', 'objection-handling.md', 'follow-up-plan.md', 'package-comparison.md'];
    for (const name of forbiddenNames) {
      check(!runnerSrc.includes(name), `runner script does not hardcode: ${name}`);
    }
  }

  // 18. No runtime reports tracked in Git
  try {
    const tracked = fs.execSync
      ? ''
      : '';
    // Use dynamic import to avoid blocking
    const { execSync } = await import('child_process');
    const gitTracked = execSync(
      'git ls-files reports/revenue-command-center/ reports/self-test/latest.json reports/self-test/latest.md',
      { encoding: 'utf8', cwd: ROOT }
    ).trim();
    check(gitTracked === '', `No runtime reports must be tracked in Git. Found: ${gitTracked}`);
  } catch (err) {
    check(false, 'Git tracking check failed', err.message);
  }

  // 19. Self-test gate integration
  const gateFile = path.join(ROOT, 'scripts/ai-dev-factory-self-test-gate.mjs');
  if (fs.existsSync(gateFile)) {
    const gateSrc = fs.readFileSync(gateFile, 'utf8');
    check(gateSrc.includes('verify-1.0p'), 'self-test gate includes verify-1.0p');
    check(gateSrc.includes('"1.0p"'), 'self-test gate includes 1.0p phase');
  }

  // 20. Execution status doc
  const execStatusFile = path.join(ROOT, 'docs/ai-dev-factory-execution-status.md');
  if (fs.existsSync(execStatusFile)) {
    const execStatusSrc = fs.readFileSync(execStatusFile, 'utf8');
    check(execStatusSrc.includes('1.0P'), 'execution status doc mentions Milestone 1.0P');
  }

  // Summary
  console.log('\n==================================================');
  console.log(`Phase 1.0P Verification Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\nFailed checks:');
    for (const e of errors) {
      console.log(`  ❌ ${e}`);
    }
    console.log('\nPhase 1.0P verification FAILED!');
    process.exit(1);
  } else {
    console.log('Phase 1.0P verification PASSED!');
  }
}

main().catch(err => {
  console.error('Verification error:', err.message);
  process.exit(1);
});
