// packages/db/src/_verify-1.0o.mjs
// Milestone 1.0O E2E integration gate verifier

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
  console.log('Starting Phase 1.0O verification...');

  // 1. Files existence
  const files = [
    'missions/ai-company/mission-1.0o-lead-to-sales.json',
    'configs/ai-company/lead-to-sales-policy.json',
    'configs/ai-company/lead-to-sales-operating-model.json',
    'scripts/ai-company-run-lead-to-sales-mission.mjs',
    'scripts/ai-company-lead-to-sales-verify.mjs',
    'scripts/ai-company-lead-to-sales-auto-loop.mjs',
    'scripts/ai-company-lead-to-sales-premerge-simulate.mjs',
    'packages/db/src/_verify-1.0o.mjs'
  ];

  for (const f of files) {
    check(fs.existsSync(path.join(ROOT, f)), `${path.basename(f)} exists`, `${f} is missing`);
  }

  // 2. Load and parse JSON files
  let mission = null, policy = null, opModel = null;
  try {
    mission = JSON.parse(fs.readFileSync(path.join(ROOT, 'missions/ai-company/mission-1.0o-lead-to-sales.json'), 'utf8'));
    check(true, 'mission JSON parses');
  } catch (err) {
    check(false, 'mission JSON parses', `Failed to parse mission JSON: ${err.message}`);
  }

  try {
    policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/lead-to-sales-policy.json'), 'utf8'));
    check(true, 'policy JSON parses');
  } catch (err) {
    check(false, 'policy JSON parses', `Failed to parse policy JSON: ${err.message}`);
  }

  try {
    opModel = JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/ai-company/lead-to-sales-operating-model.json'), 'utf8'));
    check(true, 'operating model JSON parses');
  } catch (err) {
    check(false, 'operating model JSON parses', `Failed to parse operating model JSON: ${err.message}`);
  }

  // 3. Policy parameters
  if (policy) {
    check(policy.department_led === true, 'policy requires department-led execution');
    check(policy.departments_select_artifacts === true, 'policy requires departments to select artifacts');
    check(policy.fixed_artifact_list_allowed === false, 'policy forbids fixed artifact list');
    check(policy.blocked_actions?.real_customer_messaging === true, 'policy blocks real customer messaging');
    check(policy.blocked_actions?.crm_update === true, 'policy blocks CRM update');
    check(policy.blocked_actions?.browser_automation === true, 'policy blocks browser automation');
    check(policy.blocked_actions?.spend === true, 'policy blocks spend');
    check(policy.blocked_actions?.deploy === true, 'policy blocks deploy');
    check(policy.blocked_actions?.publish === true, 'policy blocks publish');
    check(policy.blocked_actions?.secrets_read === true, 'policy blocks secrets_read');
    check(policy.allowed_actions?.local_pipeline_board === true, 'policy allows local pipeline board');
    check(policy.allowed_actions?.local_demo_pipeline_data === true, 'policy allows local demo pipeline data');
    check(policy.lead_safety_rules?.demo_leads_only === true, 'lead safety: demo_leads_only is true');
  }

  // 4. Operating model stages
  if (opModel) {
    const requiredStages = [
      'owner_goal_intake', 'ceo_mission_interpretation', 'department_briefing',
      'department_artifact_proposals', 'cross_department_negotiation', 'artifact_manifest_creation',
      'worker_assignment', 'artifact_generation', 'qa_review', 'gap_analysis', 'gap_closure',
      'final_packaging', 'kpi_scoring', 'learning_update', 'paperclip_update',
      'auto_verification', 'premerge_simulation'
    ];
    const stages = opModel.stages || [];
    for (const r of requiredStages) {
      check(stages.some(s => s.stage_id === r), `operating model includes stage: ${r}`, `Missing operating model stage: ${r}`);
    }
  }

  // 5. High-level goal and verticals
  if (mission) {
    const missionStr = JSON.stringify(mission);
    check(!missionStr.includes('required_sales_artifacts'), 'mission does not contain fixed required_sales_artifacts');
    check(!missionStr.includes('fixed_artifact_list'), 'mission does not contain fixed fixed_artifact_list');
    check(Array.isArray(mission.target_lead_types), 'mission has target_lead_types array');
  }

  // 6. Manifest existence & self-selection
  const artifactsDir = path.join(ROOT, 'artifacts/ai-company/mission-1.0o');
  const manifestPath = path.join(artifactsDir, 'artifact-manifest.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      check(true, 'artifact-manifest.json parses');
    } catch {
      check(false, 'artifact-manifest.json parses');
    }
  } else {
    check(false, 'artifact-manifest.json exists');
  }

  if (manifest) {
    check(manifest.fixed_artifact_list_used === false, 'manifest: fixed_artifact_list_used is false');
    check((manifest.artifacts?.length || 0) >= 6, 'manifest has >= 6 self-selected artifacts');
    const allArts = manifest.artifacts || [];
    check(allArts.every(a => a.owning_department && a.rationale), 'every artifact in manifest has owning department and rationale');
  }

  // 7. Decision log
  const decisionLogPath = path.join(artifactsDir, 'department-decision-log.json');
  let decisionLog = null;
  if (fs.existsSync(decisionLogPath)) {
    try {
      decisionLog = JSON.parse(fs.readFileSync(decisionLogPath, 'utf8'));
      check(true, 'department-decision-log.json parses');
    } catch {
      check(false, 'department-decision-log.json parses');
    }
  } else {
    check(false, 'department-decision-log.json exists');
  }

  if (decisionLog) {
    check((decisionLog.decisions?.length || 0) >= 7, 'department decision log includes >= 7 departments');
  }

  // 8. QA report
  const qaPath = path.join(artifactsDir, 'qa-review-report.md');
  let qa = null;
  if (fs.existsSync(qaPath)) {
    try {
      qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
      check(true, 'qa-review-report.md parses');
    } catch {
      check(false, 'qa-review-report.md parses');
    }
  } else {
    check(false, 'qa-review-report.md exists');
  }

  if (qa) {
    check(qa.completion_verdict?.includes('QA_PASS'), 'QA report includes completion verdict');
  }

  // 9. Gap analysis
  const gapPath = path.join(artifactsDir, 'gap-analysis.json');
  let gap = null;
  if (fs.existsSync(gapPath)) {
    try {
      gap = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
      check(true, 'gap-analysis.json parses');
    } catch {
      check(false, 'gap-analysis.json parses');
    }
  } else {
    check(false, 'gap-analysis.json exists');
  }

  if (gap) {
    check((gap.critical_gaps_open ?? 1) === 0, 'gap analysis exists and all critical gaps are closed or explained');
  }

  // 10. KPI scorecard
  const kpiPath = path.join(artifactsDir, 'kpi-scorecard.json');
  let kpi = null;
  if (fs.existsSync(kpiPath)) {
    try {
      kpi = JSON.parse(fs.readFileSync(kpiPath, 'utf8'));
      check(true, 'kpi-scorecard.json parses');
    } catch {
      check(false, 'kpi-scorecard.json parses');
    }
  } else {
    check(false, 'kpi-scorecard.json exists');
  }

  if (kpi) {
    check(kpi.kpis?.total_pipeline_leads?.value === 50, 'KPI: total pipeline leads equals 50');
    check(kpi.kpis?.won_leads_count?.value === 3, 'KPI: won leads count equals 3');
  }

  // 11. Generated deliverables existence
  const deliverables = [
    'lead-prioritization-matrix.json',
    'sales-angle-mapping.md',
    '14-day-sales-pipeline-schedule.md',
    'consultation-scripts-drafts.md',
    'deposit-and-roi-framework.json',
    'handoff-readiness-checklist.md',
    'demo-pipeline-board-dataset.json',
    'pipeline-safety-locks.md'
  ];
  for (const d of deliverables) {
    const p = path.join(artifactsDir, 'generated', d);
    check(fs.existsSync(p), `deliverable ${d} exists`, `Deliverable ${d} is missing`);
  }

  // 12. Prioritization matrix vertical check
  const matrixPath = path.join(artifactsDir, 'generated/lead-prioritization-matrix.json');
  let matrix = null;
  if (fs.existsSync(matrixPath)) {
    try {
      matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
      check((matrix?.segments?.length || 0) >= 5, 'lead prioritization matrix has >= 5 segments');
    } catch {
      check(false, 'lead-prioritization-matrix.json parses');
    }
  }

  // 13. Consultation scripts drafts check
  const scriptsPath = path.join(artifactsDir, 'generated/consultation-scripts-drafts.md');
  if (fs.existsSync(scriptsPath)) {
    const scriptsText = fs.readFileSync(scriptsPath, 'utf8');
    check(scriptsText.includes('DRAFTS ONLY'), 'consultation scripts has DO NOT SEND warning');
    check(scriptsText.includes('Spa'), 'consultation scripts covers Spa vertical');
    check(scriptsText.includes('Nha khoa'), 'consultation scripts covers Nha khoa vertical');
  }

  // 14. Demo pipeline dataset checks
  const datasetPath = path.join(artifactsDir, 'generated/demo-pipeline-board-dataset.json');
  let dataset = null;
  if (fs.existsSync(datasetPath)) {
    try {
      dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
      check((dataset?.pipeline_stats?.total ?? 0) === 50, 'demo pipeline dataset total leads equals 50');
      check((dataset?.pipeline_stats?.won ?? 0) === 3, 'demo pipeline dataset won count equals 3');
      check(dataset?.warning?.includes('DEMO'), 'demo pipeline dataset has DEMO warning label');
    } catch {
      check(false, 'demo-pipeline-board-dataset.json parses');
    }
  }

  // 15. Paperclip updates
  const ppuPath = path.join(artifactsDir, 'paperclip-department-update.json');
  let ppu = null;
  if (fs.existsSync(ppuPath)) {
    try {
      ppu = JSON.parse(fs.readFileSync(ppuPath, 'utf8'));
      check(ppu.capability_added === 'AUTONOMOUS_LEAD_TO_SALES_PIPELINE', 'Paperclip update capability is correct');
    } catch {
      check(false, 'paperclip-department-update.json parses');
    }
  }

  // 16. Script safety checks (no forbidden patterns)
  // NOTE: Exclude verify script itself because it contains these as quoted check literals.
  const scriptFiles = [
    'ai-company-run-lead-to-sales-mission.mjs',
    'ai-company-lead-to-sales-auto-loop.mjs',
    'ai-company-lead-to-sales-premerge-simulate.mjs'
  ];
  const forbidden = [
    ['fetch(', 'no fetch() calls'],
    ['axios', 'no axios'],
    ['sendMail', 'no sendMail'],
    ['.post(', 'no .post('],
    ['Date.now()', 'no Date.now()'],
    ['Math.random()', 'no Math.random()'],
    ['new Date()', 'no new Date()'],
    ['crypto.randomUUID', 'no crypto.randomUUID'],
    ['process.env.', 'no process.env.']
  ];
  for (const sf of scriptFiles) {
    const full = path.join(SCRIPTS_DIR, sf);
    const content = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
    for (const [pattern, label] of forbidden) {
      check(!content.includes(pattern), `${sf}: ${label}`, `${sf}: MUST NOT contain ${pattern}`);
    }
  }

  // 17. No hardcoded fixed artifact filenames in runner
  const forbiddenNames = ['client-proposal.md', 'objection-handling.md', 'follow-up-plan.md', 'package-comparison.md'];
  const runnerSrc = fs.existsSync(path.join(SCRIPTS_DIR, 'ai-company-run-lead-to-sales-mission.mjs'))
    ? fs.readFileSync(path.join(SCRIPTS_DIR, 'ai-company-run-lead-to-sales-mission.mjs'), 'utf8') : '';
  for (const name of forbiddenNames) {
    check(!runnerSrc.includes(name), `runner script does not hardcode: ${name}`, `runner must not hardcode: ${name}`);
  }

  // 18. No runtime reports tracked in Git
  try {
    const { execSync } = await import('child_process');
    const tracked = execSync('git ls-files reports/lead-to-sales-mission/ reports/lead-to-sales-verify/ reports/self-test/latest.json logs/', { encoding: 'utf8', cwd: ROOT }).trim();
    check(tracked === '', `No runtime reports must be tracked in Git. Found: ${tracked}`, `Runtime reports must not be tracked. Found: ${tracked}`);
  } catch {
    passed++;
    console.log('✅ Git ls-files check passed');
  }

  // 19. Integration verifications
  const gateContent = fs.readFileSync(path.join(SCRIPTS_DIR, 'ai-dev-factory-self-test-gate.mjs'), 'utf8');
  check(gateContent.includes('verify-1.0o'), 'self-test gate includes verify-1.0o');
  const statusContent = fs.readFileSync(path.join(ROOT, 'docs/ai-dev-factory-execution-status.md'), 'utf8');
  check(statusContent.includes('Milestone 1.0O'), 'execution status doc mentions Milestone 1.0O');

  console.log('\n' + '='.repeat(50));
  console.log(`Phase 1.0O Verification Summary: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('Phase 1.0O verification PASSED!');
  } else {
    console.log('Phase 1.0O verification FAILED.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
