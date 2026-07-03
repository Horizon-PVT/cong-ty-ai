// packages/db/src/_verify-1.0q.mjs
// Milestone 1.0Q E2E integration gate verifier — Owner Approval Workbench

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../');

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
  console.log('Starting Phase 1.0Q verification...');

  // 1. Files existence
  const files = [
    'missions/ai-company/mission-1.0q-owner-approval-workbench.json',
    'configs/ai-company/owner-approval-workbench-policy.json',
    'configs/ai-company/owner-approval-workbench-operating-model.json',
    'configs/ai-company/owner-approval-workbench-widget-map.json',
    'schemas/ai-company/owner-approval-workbench-payload.schema.json',
    'scripts/ai-company-run-owner-approval-workbench-mission.mjs',
    'scripts/ai-company-owner-approval-workbench-verify.mjs',
    'scripts/ai-company-owner-approval-workbench-auto-loop.mjs',
    'scripts/ai-company-owner-approval-workbench-premerge-simulate.mjs',
    'packages/db/src/_verify-1.0q.mjs'
  ];

  for (const f of files) {
    check(fs.existsSync(path.join(ROOT, f)), `${path.basename(f)} exists`, `${f} is missing`);
  }

  // 2. Load and parse JSON files
  let mission = null, policy = null, opModel = null, widgetMap = null, schema = null;

  try {
    mission = JSON.parse(fs.readFileSync(path.join(ROOT, 'missions/ai-company/mission-1.0q-owner-approval-workbench.json'), 'utf8'));
    check(true, 'mission JSON parses');
  } catch (err) {
    check(false, 'mission JSON parses', `Failed: ${err.message}`);
  }

  try {
    policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/owner-approval-workbench-policy.json'), 'utf8'));
    check(true, 'policy JSON parses');
  } catch (err) {
    check(false, 'policy JSON parses', `Failed: ${err.message}`);
  }

  try {
    opModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/owner-approval-workbench-operating-model.json'), 'utf8'));
    check(true, 'operating model JSON parses');
  } catch (err) {
    check(false, 'operating model JSON parses', `Failed: ${err.message}`);
  }

  try {
    widgetMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/owner-approval-workbench-widget-map.json'), 'utf8'));
    check(true, 'widget map JSON parses');
  } catch (err) {
    check(false, 'widget map JSON parses', `Failed: ${err.message}`);
  }

  try {
    schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/ai-company/owner-approval-workbench-payload.schema.json'), 'utf8'));
    check(true, 'payload schema JSON parses');
  } catch (err) {
    check(false, 'payload schema JSON parses', `Failed: ${err.message}`);
  }

  // 3. Policy compliance checks
  if (policy) {
    check(policy.department_led === true, 'policy requires department-led execution');
    check(policy.departments_select_artifacts === true, 'policy requires departments to select artifacts');
    check(policy.fixed_artifact_list_allowed === false, 'policy forbids fixed artifact list');
    check(policy.hard_locks?.local_only === true, 'policy blocks non-local actions');
    check(policy.hard_locks?.no_real_customer_messaging === true, 'policy blocks real customer messaging');
    check(policy.hard_locks?.no_crm_update === true, 'policy blocks CRM update');
    check(policy.hard_locks?.no_email_send === true, 'policy blocks email send');
    check(policy.hard_locks?.no_zalo_send === true, 'policy blocks Zalo send');
    check(policy.hard_locks?.no_sms_send === true, 'policy blocks SMS send');
    check(policy.hard_locks?.no_facebook_meta_message === true, 'policy blocks Facebook send');
    check(policy.hard_locks?.no_browser_automation === true, 'policy blocks browser automation');
    check(policy.hard_locks?.no_spend === true, 'policy blocks spend');
    check(policy.hard_locks?.no_deploy === true, 'policy blocks deploy');
    check(policy.hard_locks?.no_publish === true, 'policy blocks publish');
    check(policy.hard_locks?.no_secrets_read === true, 'policy blocks secrets_read');
    check(policy.allowed?.local_approval_queue === true, 'policy allows local approval queue');
    check(policy.allowed?.local_approval_state_machine === true, 'policy allows state machine');
    check(policy.allowed?.local_draft_revision_workflow === true, 'policy allows local draft revision workflow');
    check(policy.demo_data_policy?.demo_leads_only === true, 'lead safety: demo_leads_only is true');
    check(policy.demo_data_policy?.must_label_demo_data === true, 'demo data must be labeled');
  }

  // 4. Mission checks
  if (mission) {
    check(!mission.required_command_center_artifacts, 'mission does not contain fixed required_command_center_artifacts');
    check(!mission.fixed_artifact_list, 'mission does not contain fixed fixed_artifact_list');
    check(Array.isArray(mission.approval_workbench_questions), 'mission has approval_workbench_questions array');
    check(mission.approval_workbench_questions?.length === 10, 'mission has exactly 10 approval-workbench questions');
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
    check(widgetMap.widgets?.length >= 5, 'widget map has >= 5 approval workbench widgets');
    const widgetIds = (widgetMap.widgets || []).map(w => w.widget_id);
    check(widgetIds.includes('owner_approval_workbench_overview'), 'widget map includes overview widget');
    check(widgetIds.includes('owner_approval_workbench_queue'), 'widget map includes queue widget');
    check(widgetIds.includes('owner_approval_workbench_details'), 'widget map includes details widget');
    check(widgetIds.includes('owner_approval_workbench_actions'), 'widget map includes actions widget');
    check(widgetIds.includes('owner_approval_workbench_audit_trail'), 'widget map includes audit_trail widget');
    
    // Check specific required fields for safety
    const briefWidget = (widgetMap.widgets || []).find(w => w.widget_id === 'owner_approval_workbench_overview');
    check(
      briefWidget && (briefWidget.required_fields.includes('demo_badge') || briefWidget.required_fields.includes('safety_note')),
      'widget map overview requires demo_badge or safety_note'
    );
  }

  // 7. Schema checks
  if (schema) {
    check(schema.properties?.workbench_overview?.required?.includes('demo_badge'), 'schema requires demo_badge field');
    check(schema.properties?.workbench_details?.required?.includes('safety_warning_lines'), 'schema requires safety_warning_lines');
    check(schema.properties?.workbench_actions?.required?.includes('local_only_mode'), 'schema requires local_only_mode');
    check(schema.properties?.workbench_audit_trail?.required?.includes('logs'), 'schema requires logs in audit trail');
  }

  // 8. Deliverables exist (if generated)
  const deliverables = [
    'artifacts/ai-company/mission-1.0q/artifact-manifest.json',
    'artifacts/ai-company/mission-1.0q/generated/daily-approval-workbench-payload.json',
    'artifacts/ai-company/mission-1.0q/generated/owner-revision-requests.json',
    'artifacts/ai-company/mission-1.0q/generated/audit-trail-model.json',
    'artifacts/ai-company/mission-1.0q/generated/pricing-discount-rules.json',
    'artifacts/ai-company/mission-1.0q/generated/handoff-approval-criteria.json',
    'artifacts/ai-company/mission-1.0q/generated/approval-workbench-preview.md',
    'artifacts/ai-company/mission-1.0q/qa-review-report.md',
    'artifacts/ai-company/mission-1.0q/gap-analysis.json',
    'artifacts/ai-company/mission-1.0q/kpi-scorecard.json',
    'artifacts/ai-company/mission-1.0q/paperclip-department-update.json',
    'artifacts/ai-company/mission-1.0q/final-package-index.md'
  ];

  const hasDeliverables = deliverables.every(d => fs.existsSync(path.join(ROOT, d)));
  if (!hasDeliverables) {
    console.log('⚠️ Deliverables missing. Run the mission runner script to generate them.');
    check(false, 'all deliverables exist');
  } else {
    check(true, 'all deliverables exist');

    // 9. Detailed content validation of deliverables
    const manifestFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts/ai-company/mission-1.0q/artifact-manifest.json'), 'utf8'));
    check(manifestFile.fixed_artifact_list_used === false, 'manifest: fixed_artifact_list_used is false');
    check(manifestFile.artifacts?.length >= 5, 'manifest has >= 5 self-selected artifacts');
    for (const a of manifestFile.artifacts || []) {
      check(a.owning_department && a.rationale, `artifact ${path.basename(a.artifact_file)} has department and rationale`);
    }

    const qaReportText = fs.readFileSync(path.join(ROOT, 'artifacts/ai-company/mission-1.0q/qa-review-report.md'), 'utf8');
    check(qaReportText.includes('Audit Verdict: PASS'), 'QA report includes PASS verdict');

    const gapFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts/ai-company/mission-1.0q/gap-analysis.json'), 'utf8'));
    check(gapFile.gaps_detected?.length === 0, 'gap analysis: all gaps resolved');

    const kpiFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts/ai-company/mission-1.0q/kpi-scorecard.json'), 'utf8'));
    check(kpiFile.questions_answered === 10, 'KPI: 10 questions answered');
    check(kpiFile.safety_locks_enumerated >= 8, 'KPI: >= 8 safety locks enumerated');
    check(kpiFile.local_mode_active === true, 'KPI: local_mode_active is true');

    // Payload validation
    const payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts/ai-company/mission-1.0q/generated/daily-approval-workbench-payload.json'), 'utf8'));
    check(payload.data_label === 'DEMO_LOCAL_ONLY', 'payload has DEMO_LOCAL_ONLY label');
    check(!!payload.demo_warning, 'payload has demo_warning');
    check(!!payload.command_center_answers, 'payload has command_center_answers');

    // Questions checks
    const qAnswers = payload.command_center_answers || {};
    check(!!qAnswers.q1_actions_need_approval, 'answers Q1: Which actions need Boss approval?');
    check(!!qAnswers.q2_what_boss_approves, 'answers Q2: What exactly is Boss approving?');
    check(!!qAnswers.q3_is_action_safe, 'answers Q3: Is this message/proposal/discount safe?');
    check(!!qAnswers.q4_what_happens_if_approved, 'answers Q4: What will happen if Boss approves?');
    check(!!qAnswers.q5_what_is_blocked_automatically, 'answers Q5: What is blocked from happening automatically?');
    check(!!qAnswers.q6_can_boss_request_rewrite, 'answers Q6: Can Boss request a rewrite?');
    check(!!qAnswers.q7_can_boss_reject_or_park, 'answers Q7: Can Boss reject or park the action?');
    check(!!qAnswers.q8_is_lead_action_demo_only, 'answers Q8: Is the lead/action demo-only or real-ready?');
    check(!!qAnswers.q9_is_there_full_audit_trail, 'answers Q9: Is there a full audit trail?');
    check(!!qAnswers.q10_what_is_next_safe_step, 'answers Q10: What is the next safe step after approval?');

    // Safety wording on cards check
    const details = payload.workbench_details || {};
    const warningLines = details.safety_warning_lines || [];
    check(warningLines.includes('LOCAL APPROVAL ONLY'), 'details safety card contains: LOCAL APPROVAL ONLY');
    check(warningLines.includes('NOT SENT'), 'details safety card contains: NOT SENT');
    check(warningLines.includes('NO REAL CUSTOMER CONTACT'), 'details safety card contains: NO REAL CUSTOMER CONTACT');
    check(warningLines.includes('NO CRM UPDATE'), 'details safety card contains: NO CRM UPDATE');
    check(warningLines.includes('NO REVENUE CLAIM'), 'details safety card contains: NO REVENUE CLAIM');

    // Local demo indicators in sections
    const sections = ['workbench_overview', 'workbench_details', 'workbench_actions', 'workbench_audit_trail'];
    for (const sec of sections) {
      check(payload[sec]?.demo_badge === 'DEMO / SIMULATION', `widget section ${sec} has demo_badge`);
      check(payload[sec]?.safety_note === 'No real customers contacted. No real revenue. No real conversion.', `widget section ${sec} has safety_note`);
    }

    const queueItems = payload.workbench_queue?.items || [];
    check(queueItems.length === 5, 'approval queue contains exactly 5 items');
    for (const item of queueItems) {
      check(item.lead_name.startsWith('[DEMO]'), `lead name '${item.lead_name}' is marked [DEMO]`);
      check(item.demo_badge === 'DEMO / SIMULATION', `queue item ${item.action_id} has demo_badge`);
      check(item.safety_note === 'No real customers contacted. No real revenue. No real conversion.', `queue item ${item.action_id} has safety_note`);
    }

    // Reports existence
    check(fs.existsSync(path.join(ROOT, 'reports/owner-approval-workbench/daily-approval-workbench-payload.json')), 'reports/owner-approval-workbench/daily-approval-workbench-payload.json exists for Paperclip');
  }

  // 10. Script safety checks (no fetch, axios, sendMail, Date.now, Math.random, process.env, new Date, crypto)
  const scripts = [
    'scripts/ai-company-run-owner-approval-workbench-mission.mjs',
    'scripts/ai-company-owner-approval-workbench-auto-loop.mjs',
    'scripts/ai-company-owner-approval-workbench-premerge-simulate.mjs'
  ];

  for (const s of scripts) {
    const sPath = path.join(ROOT, s);
    if (fs.existsSync(sPath)) {
      const src = fs.readFileSync(sPath, 'utf8');
      const basename = path.basename(s);
      check(!src.includes('fetch('), `${basename}: no fetch() calls`);
      check(!src.includes('axios'), `${basename}: no axios`);
      check(!src.includes('sendMail'), `${basename}: no sendMail`);
      check(!src.includes('.post('), `${basename}: no .post(`);
      check(!src.includes('Date.now()'), `${basename}: no Date.now()`);
      check(!src.includes('Math.random()'), `${basename}: no Math.random()`);
      check(!src.includes('new Date('), `${basename}: no new Date()`);
      check(!src.includes('crypto.randomUUID'), `${basename}: no crypto.randomUUID`);
      check(!src.includes('process.env.'), `${basename}: no process.env.`);
    }
  }

  // 11. Integration checks
  const selfTestGateSrc = fs.readFileSync(path.join(ROOT, 'scripts/ai-dev-factory-self-test-gate.mjs'), 'utf8');
  check(selfTestGateSrc.includes('verify-1.0q'), 'self-test gate includes verify-1.0q');
  check(selfTestGateSrc.includes('1.0q'), 'self-test gate includes 1.0q phase');

  const execStatusSrc = fs.readFileSync(path.join(ROOT, 'docs/ai-dev-factory-execution-status.md'), 'utf8');
  check(execStatusSrc.includes('Milestone 1.0Q'), 'execution status doc mentions Milestone 1.0Q');

  console.log(`\n==================================================`);
  console.log(`Phase 1.0Q Verification Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log(`❌ Phase 1.0Q verification FAILED!`);
    console.log('Errors:');
    errors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  } else {
    console.log(`Phase 1.0Q verification PASSED!`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
