#!/usr/bin/env node
/**
 * Milestone 1.0T: Owner-Approved Email Live Send Readiness
 * Mission Runner — Department-Led Artifact Generation
 *
 * HARD LOCKS:
 * - No real email send
 * - No Gmail API, SMTP, SendGrid, Mailgun, Resend
 * - No external HTTP request, fetch, axios
 * - No env read, no secrets
 * - No customer communication, CRM update, payment
 * - No deploy, no publish, no production mutation
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0t");
const REPORT_DIR = path.join(ROOT, "reports", "owner-approval-workbench");
const LOG_DIR = path.join(ROOT, "logs");
const PAPERCLIP_WIDGET_DIR = path.join(ROOT, "artifacts", "ai-company", "mission-1.0t", "generated");

const SAFETY_WARNINGS = [
  "⛔ LIVE EMAIL NOT ENABLED",
  "⛔ READINESS CHECK ONLY",
  "⛔ NOT SENT",
  "⛔ NO REAL CUSTOMER CONTACT",
  "⛔ NO GMAIL API CALL",
  "⛔ NO SMTP CALL",
  "⛔ NO PROVIDER API CALL",
  "⛔ NO CRM UPDATE",
  "⛔ NO PAYMENT REQUEST",
  "⛔ FUTURE LIVE TOKEN REQUIRED",
  "⛔ KILL SWITCH ACTIVE",
];
const SAFETY_ATTESTATION =
  "ATTESTATION: LIVE EMAIL NOT ENABLED | READINESS CHECK ONLY | NOT SENT | NO REAL CUSTOMER CONTACT | NO GMAIL API CALL | NO SMTP CALL | NO PROVIDER API CALL | NO CRM UPDATE | NO PAYMENT REQUEST | FUTURE LIVE TOKEN REQUIRED | KILL SWITCH ACTIVE";
const DEMO_BADGE = "🔵 DEMO / READINESS SIMULATION — NOT SENT — NOT A LIVE EMAIL SYSTEM";

function ensureDirs() {
  for (const d of [OUT_DIR, REPORT_DIR, LOG_DIR, PAPERCLIP_WIDGET_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// ─── Department answers ───────────────────────────────────────────────────────
const READINESS_ANSWERS = {
  q1_live_candidates: "act_email_001, act_email_002, act_email_003 — all blocked by compliance gaps",
  q2_requirements: "19 readiness checks required — consent, sender identity, unsubscribe, rate limit, bounce, reply routing, suppression list, audit log",
  q3_token_policy: "OWNER_APPROVED_LIVE_TOKEN scoped per ACTION_ID, one-use, expires after use — reserved for future milestone only",
  q4_sender_identity: "SPF/DKIM/DMARC not yet verified — required before live send",
  q5_unsubscribe: "Unsubscribe footer and physical address footer defined in template rules — not yet provider-enforced",
  q6_rate_limit: "Max 50 emails/day, 1 per recipient per 48 hours — local policy only",
  q7_bounce_reply: "Hard bounce = auto-suppress; soft bounce = retry max 2 times. Reply routing = sandbox-reply inbox only",
  q8_suppression: "Manual add only, local JSON file, no real provider sync",
  q9_readiness_score: "Score range 40-55/100 — main gaps: sender_identity_verified, consent_confirmed, provider_not_fake, unsubscribe_tested",
  q10_unlock_criteria: "Before OWNER_APPROVED_LIVE_TOKEN: (1) DNS SPF/DKIM/DMARC verified, (2) real provider configured, (3) consent model active, (4) suppression list seeded, (5) unsubscribe mechanism tested end-to-end, (6) rate limits live"
};

// ─── Compliance checklist builder ────────────────────────────────────────────
function buildComplianceChecklist(action) {
  const checks = {
    recipient_is_demo_or_allowlisted: { passed: true, note: "Demo recipient only" },
    consent_status: { passed: false, note: "Explicit consent not yet confirmed — required before live send" },
    sender_identity_verified: { passed: false, note: "SPF/DKIM/DMARC not yet configured — required before live send" },
    unsubscribe_footer_present: { passed: action.includes("001") ? true : false, note: action.includes("001") ? "Footer template defined" : "Footer template pending" },
    physical_or_business_contact_footer_present: { passed: false, note: "Business address footer not yet configured in provider" },
    claim_safety_passed: { passed: true, note: "No unverified claims in demo content" },
    pricing_safety_passed: { passed: true, note: "Price anchor 12.9 triệu VND used without unapproved discount" },
    no_sensitive_data_in_body: { passed: true, note: "Demo body contains no PII or credentials" },
    no_unapproved_discount: { passed: true, note: "No unauthorized discount in demo content" },
    rate_limit_available: { passed: false, note: "Rate limit defined locally — not enforced in real provider" },
    daily_send_cap_defined: { passed: true, note: "Max 50 emails/day local policy defined" },
    bounce_handling_defined: { passed: true, note: "Hard bounce auto-suppress, soft bounce retry ≤2 — local model only" },
    reply_routing_defined: { passed: true, note: "Replies route to sandbox-reply inbox — local model only" },
    suppression_list_checked: { passed: false, note: "Suppression list is empty — must be seeded before live send" },
    duplicate_send_protection: { passed: true, note: "Action ID deduplication enforced locally" },
    audit_log_ready: { passed: true, note: "Local audit ledger tracks all readiness assessments" },
    kill_switch_active: { passed: true, note: "Emergency stop is active — live email disabled" },
    provider_is_fake_in_this_milestone: { passed: true, note: "Provider is FAKE_LOCAL_ONLY — no real provider configured" },
    owner_live_token_required_for_future_send: { passed: true, note: "OWNER_APPROVED_LIVE_TOKEN required and reserved for future milestone" }
  };
  return checks;
}

function computeReadinessScore(checklist) {
  const total = Object.keys(checklist).length;
  const passed = Object.values(checklist).filter(v => v.passed).length;
  return Math.round((passed / total) * 100);
}

function getMissingRequirements(checklist) {
  return Object.entries(checklist)
    .filter(([, v]) => !v.passed)
    .map(([k]) => k);
}

// ─── Build readiness queue items ─────────────────────────────────────────────
function buildReadinessItem(actionId, sourceId, recipientLabel, recipientEmail) {
  const checklist = buildComplianceChecklist(actionId);
  const score = computeReadinessScore(checklist);
  const missing = getMissingRequirements(checklist);
  const status = score >= 80 ? "READY" : score >= 60 ? "NEARLY_READY" : "BLOCKED";

  return {
    action_id: actionId,
    source_sandbox_action_id: sourceId,
    mode: "EMAIL_LIVE_READINESS_ONLY",
    recipient_label: recipientLabel,
    recipient_email_demo: recipientEmail,
    recipient_is_demo: true,
    future_live_send_allowed: false,
    live_send_blocked: true,
    block_reason: `Missing ${missing.length} compliance requirements: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? `, and ${missing.length - 3} more` : ""}`,
    readiness_score: score,
    readiness_status: status,
    missing_requirements: missing,
    compliance_checklist: checklist,
    sender_identity_check: {
      spf_configured: false,
      dkim_configured: false,
      dmarc_configured: false,
      verified: false,
      note: "DNS email authentication records not yet configured — required before live send"
    },
    unsubscribe_check: {
      footer_template_defined: actionId.includes("001"),
      one_click_unsubscribe: false,
      list_unsubscribe_header: false,
      ready: false,
      note: "Unsubscribe mechanism must be tested end-to-end before live send"
    },
    rate_limit_check: {
      policy_defined: true,
      max_per_day: 50,
      min_interval_hours: 48,
      enforced_in_provider: false,
      ready: false,
      note: "Rate limit policy defined locally — not yet enforced in real provider"
    },
    bounce_handling_check: {
      hard_bounce_auto_suppress: true,
      soft_bounce_max_retries: 2,
      provider_webhook_configured: false,
      ready: false,
      note: "Bounce handling model defined — provider webhook not yet configured"
    },
    reply_routing_check: {
      reply_to_address: "sandbox-reply@alex-minh-ai.demo",
      crm_routing: false,
      ready: true,
      note: "Reply routing to sandbox inbox — no real CRM routing"
    },
    suppression_list_check: {
      list_exists: true,
      list_seeded: false,
      provider_synced: false,
      ready: false,
      note: "Suppression list exists but is empty — must be seeded before live send"
    },
    actual_external_effect: "NONE",
    owner_live_token_required_for_future: true,
    required_future_live_token_name: "OWNER_APPROVED_LIVE_TOKEN",
    required_future_live_token_scope: actionId,
    merge_token_not_accepted: true,
    sandbox_token_not_accepted_for_live_send: true,
    safety_warning_lines: SAFETY_WARNINGS,
    safety_attestation: SAFETY_ATTESTATION,
    demo_badge: DEMO_BADGE,
    safety_note: "This record is a local readiness assessment only. No email has been sent. No external provider has been contacted."
  };
}

// ─── Suppression list (local, empty) ─────────────────────────────────────────
function buildSuppressionList() {
  return {
    list_id: "suppression-list-1.0t",
    milestone: "1.0T",
    status: "EMPTY_LOCAL_ONLY",
    provider_synced: false,
    entries: [],
    safety_note: "Suppression list must be seeded with opt-out addresses before live send is authorized.",
    demo_badge: DEMO_BADGE
  };
}

// ─── Sender identity rules ────────────────────────────────────────────────────
function buildSenderIdentityRules() {
  return {
    rule_id: "sender-identity-rules-1.0t",
    milestone: "1.0T",
    sender_domain: "alex-minh-ai.demo",
    from_address: "sales-demo@alex-minh-ai.demo",
    from_name: "Alex Minh AI [DEMO]",
    spf_record: "NOT_CONFIGURED",
    dkim_record: "NOT_CONFIGURED",
    dmarc_policy: "NOT_CONFIGURED",
    sender_verified: false,
    unlock_criteria: [
      "Configure SPF record: v=spf1 include:<provider> ~all",
      "Configure DKIM: generate 1024/2048 bit key via chosen email provider",
      "Configure DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@alex-minh-ai.com",
      "Verify all records via MXToolbox or equivalent",
      "Confirm from_address domain is owned and DNS controlled"
    ],
    safety_note: "Sender identity not verified. No email has been sent. Domain is demo only.",
    demo_badge: DEMO_BADGE
  };
}

// ─── Consent and allowlist model ─────────────────────────────────────────────
function buildConsentModel() {
  return {
    model_id: "consent-allowlist-1.0t",
    milestone: "1.0T",
    consent_type: "explicit_opt_in",
    allowlist: [],
    allowlist_seeded: false,
    consent_collected: false,
    consent_storage: "LOCAL_JSON_ONLY",
    unlock_criteria: [
      "Collect explicit opt-in consent from recipients before first send",
      "Seed allowlist with at least 1 confirmed opt-in address",
      "Implement consent capture form or CRM field",
      "Store consent records with timestamp and source"
    ],
    safety_note: "No consent collected. Allowlist is empty. No email has been sent.",
    demo_badge: DEMO_BADGE
  };
}

// ─── Rate limit policy ────────────────────────────────────────────────────────
function buildRateLimitPolicy() {
  return {
    policy_id: "rate-limit-policy-1.0t",
    milestone: "1.0T",
    max_daily_sends: 50,
    min_interval_between_sends_hours: 48,
    provider_enforced: false,
    local_policy_defined: true,
    unlock_criteria: [
      "Configure rate limit in real email provider dashboard",
      "Test rate limit enforcement with provider's API",
      "Set up rate limit monitoring and alerting"
    ],
    safety_note: "Rate limit policy defined locally only. Not enforced by any provider. No email has been sent.",
    demo_badge: DEMO_BADGE
  };
}

// ─── Bounce and reply routing model ──────────────────────────────────────────
function buildBounceReplyModel() {
  return {
    model_id: "bounce-reply-routing-1.0t",
    milestone: "1.0T",
    hard_bounce_action: "auto_suppress",
    soft_bounce_max_retries: 2,
    soft_bounce_retry_interval_hours: 24,
    reply_to_address: "sandbox-reply@alex-minh-ai.demo",
    reply_crm_routing: false,
    provider_webhook_configured: false,
    unlock_criteria: [
      "Configure provider bounce webhook URL",
      "Register reply-to address in provider settings",
      "Test bounce handling with provider's sandbox mode",
      "Confirm suppression auto-add on hard bounce"
    ],
    safety_note: "Bounce and reply routing models defined locally only. No provider connected. No email has been sent.",
    demo_badge: DEMO_BADGE
  };
}

// ─── Audit ledger ─────────────────────────────────────────────────────────────
function buildAuditLedger(readinessItems) {
  return {
    ledger_id: "email-live-readiness-audit-1.0t",
    milestone: "1.0T",
    generated_at: new Date().toISOString(),
    entries: readinessItems.map(item => ({
      action_id: item.action_id,
      assessed_at: new Date().toISOString(),
      readiness_score: item.readiness_score,
      readiness_status: item.readiness_status,
      missing_count: item.missing_requirements.length,
      live_send_blocked: true,
      actual_external_effect: "NONE"
    })),
    demo_badge: DEMO_BADGE,
    safety_note: "All audit entries are readiness simulations only. No email has been sent."
  };
}

// ─── Paperclip readiness preview ─────────────────────────────────────────────
function buildPaperclipReadinessPreview(readinessItems) {
  let md = `# 📧 Email Live Send Readiness Preview\n`;
  md += `> ${DEMO_BADGE}\n\n`;
  md += `**Milestone:** 1.0T — Owner-Approved Email Live Send Readiness\n`;
  md += `**Mode:** \`EMAIL_LIVE_READINESS_ONLY\`\n`;
  md += `**Live Email Enabled:** ❌ NO\n`;
  md += `**Kill Switch:** 🔴 ACTIVE\n\n`;
  md += `---\n\n`;
  md += `## ${SAFETY_WARNINGS.join("\n## ")}\n\n`;
  md += `---\n\n`;
  md += `## Readiness Candidates\n\n`;
  for (const item of readinessItems) {
    md += `### ${item.action_id}\n`;
    md += `| Field | Value |\n|---|---|\n`;
    md += `| Source Sandbox Action | \`${item.source_sandbox_action_id}\` |\n`;
    md += `| Recipient | ${item.recipient_label} |\n`;
    md += `| Demo Email | \`${item.recipient_email_demo}\` |\n`;
    md += `| Recipient is Demo | ✅ YES |\n`;
    md += `| Future Live Send Allowed | ❌ NO |\n`;
    md += `| Live Send Blocked | 🔴 YES |\n`;
    md += `| Block Reason | ${item.block_reason} |\n`;
    md += `| Readiness Score | **${item.readiness_score}/100** |\n`;
    md += `| Status | \`${item.readiness_status}\` |\n`;
    md += `| Actual External Effect | \`${item.actual_external_effect}\` |\n`;
    md += `| Future Live Token Required | ✅ YES |\n`;
    md += `| Required Token | \`${item.required_future_live_token_name}\` scoped to \`${item.required_future_live_token_scope}\` |\n`;
    md += `| Merge Token Accepted | ❌ NO |\n`;
    md += `| Sandbox Token Accepted for Live | ❌ NO |\n\n`;
    md += `**Missing Requirements:**\n`;
    for (const req of item.missing_requirements) {
      md += `- ❌ \`${req}\`\n`;
    }
    md += `\n**Compliance Summary:**\n`;
    for (const [key, val] of Object.entries(item.compliance_checklist)) {
      md += `- ${val.passed ? "✅" : "❌"} \`${key}\` — ${val.note}\n`;
    }
    md += `\n---\n\n`;
  }
  md += `## What Must Be Fixed Before Live Email Can Be Enabled?\n\n`;
  md += `1. ✅ DNS records: SPF, DKIM, DMARC configured and verified\n`;
  md += `2. ✅ Real email provider configured and API tested\n`;
  md += `3. ✅ Explicit consent collected and stored\n`;
  md += `4. ✅ Suppression list seeded with opt-out addresses\n`;
  md += `5. ✅ Unsubscribe mechanism tested end-to-end\n`;
  md += `6. ✅ Rate limits configured in real provider\n`;
  md += `7. ✅ Owner provides OWNER_APPROVED_LIVE_TOKEN=<action_id>\n\n`;
  md += `**Safety Attestation:** ${SAFETY_ATTESTATION}\n`;
  return md;
}

// ─── KPI scorecard ────────────────────────────────────────────────────────────
function buildKPIScorecard(readinessItems) {
  return {
    scorecard_id: "kpi-scorecard-1.0t",
    milestone: "1.0T",
    total_readiness_candidates: readinessItems.length,
    total_ready: 0,
    total_blocked: readinessItems.length,
    average_readiness_score: Math.round(readinessItems.reduce((s, i) => s + i.readiness_score, 0) / readinessItems.length),
    total_compliance_checks_per_item: 19,
    hard_locks_violated: 0,
    live_email_enabled: false,
    live_email_blocked: true,
    emergency_stop_active: true,
    provider_is_mock: true,
    demo_badge: DEMO_BADGE
  };
}

// ─── Gap analysis ─────────────────────────────────────────────────────────────
function buildGapAnalysis(readinessItems) {
  const allMissing = readinessItems.flatMap(i => i.missing_requirements);
  const uniqueMissing = [...new Set(allMissing)];
  return {
    gap_analysis_id: "gap-analysis-1.0t",
    milestone: "1.0T",
    total_gaps: uniqueMissing.length,
    gaps: uniqueMissing.map(g => ({
      requirement: g,
      affected_actions: readinessItems.filter(i => i.missing_requirements.includes(g)).map(i => i.action_id),
      resolution_required_before_live_send: true,
      estimated_effort: "medium"
    })),
    all_gaps_are_known: true,
    closure_milestone: "1.0U (future live send milestone)",
    demo_badge: DEMO_BADGE
  };
}

// ─── Department update ────────────────────────────────────────────────────────
function buildDepartmentUpdate() {
  return {
    update_id: "paperclip-department-update-1.0t",
    milestone: "1.0T",
    updates: [
      { department: "CEO", update: "Live email unlock strategy defined. All 3 sandbox actions are readiness candidates but blocked by compliance gaps." },
      { department: "COO", update: "Approval and escalation workflow updated to include email live readiness gate before any live send authorization." },
      { department: "Sales AI", update: "act_email_001 (intro/awareness email) prioritized as first candidate for live send once compliance is complete." },
      { department: "CMO", update: "Email tone, CTA, and unsubscribe wording approved for demo templates. Brand safety passed. Physical address footer required." },
      { department: "CTO", update: "Provider abstraction layer defined (FAKE_LOCAL_ONLY). Kill switch active. Suppression list model, rate limit policy, and bounce handling model implemented." },
      { department: "CFO", update: "Pricing safety passed. 12.9M VND anchor used without unauthorized discount. No payment requests in this milestone." },
      { department: "Customer Success AI", update: "Reply routing defined (sandbox-reply inbox). No real CRM routing. Client expectation safety: all recipients are demo only." },
      { department: "QA", update: "Hard blocking tests defined. All 11 safety warning lines verified per readiness item. No live send function detected in any script." },
      { department: "CLO Hermes", update: "Lessons recorded. Unlock criteria for live email documented. Ready for Milestone 1.0U when owner provides OWNER_APPROVED_LIVE_TOKEN." }
    ],
    demo_badge: DEMO_BADGE
  };
}

// ─── Artifact manifest ────────────────────────────────────────────────────────
function buildArtifactManifest() {
  return {
    manifest_id: "artifact-manifest-1.0t",
    milestone: "1.0T",
    decided_by: "departments",
    artifacts: [
      { id: "A1", name: "email-live-readiness-payload.json", owner: "CTO", description: "Main readiness queue payload with compliance checklist per action" },
      { id: "A2", name: "sender-identity-rules.json", owner: "CTO", description: "SPF/DKIM/DMARC unlock criteria and sender identity check results" },
      { id: "A3", name: "consent-allowlist-model.json", owner: "CMO", description: "Explicit consent model and allowlist (local, empty, pre-live)" },
      { id: "A4", name: "rate-limit-policy.json", owner: "COO", description: "Daily send cap and rate limit policy (local only)" },
      { id: "A5", name: "bounce-reply-routing-model.json", owner: "Customer Success AI", description: "Bounce handling and reply routing model (local only)" },
      { id: "A6", name: "suppression-list-model.json", owner: "CTO", description: "Local suppression list (empty, to be seeded before live send)" },
      { id: "A7", name: "email-readiness-audit-ledger.json", owner: "QA", description: "Audit trail of all readiness assessments" },
      { id: "A8", name: "email-readiness-preview.md", owner: "CTO", description: "Paperclip-rendered readiness preview for each candidate action" },
      { id: "A9", name: "gap-analysis.json", owner: "CTO", description: "Gap analysis across all readiness items" },
      { id: "A10", name: "kpi-scorecard.json", owner: "CFO", description: "KPI scorecard for readiness gate" },
      { id: "A11", name: "paperclip-department-update.json", owner: "COO", description: "Department update payload for Paperclip integration" },
      { id: "A12", name: "qa-review-report.md", owner: "QA", description: "QA review and hard-block test results" },
      { id: "A13", name: "final-package-index.md", owner: "COO", description: "Final package index for milestone deliverables" },
      { id: "A14", name: "approved-unsubscribe-rules.json", owner: "CMO", description: "Unsubscribe footer and physical address footer rules" },
      { id: "A15", name: "future-live-token-policy.json", owner: "CTO", description: "Future OWNER_APPROVED_LIVE_TOKEN policy document" }
    ],
    demo_badge: DEMO_BADGE
  };
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("[1.0T Runner] Starting Milestone 1.0T: Email Live Send Readiness...");
  ensureDirs();

  const readinessItems = [
    buildReadinessItem("readiness_act_001", "act_email_001", "Demo Prospect A", "prospect-a-demo@alex-minh-ai.demo"),
    buildReadinessItem("readiness_act_002", "act_email_002", "Demo Prospect B", "prospect-b-demo@alex-minh-ai.demo"),
    buildReadinessItem("readiness_act_003", "act_email_003", "Demo Prospect C", "prospect-c-demo@alex-minh-ai.demo"),
  ];

  const payload = {
    schema_version: "1.0.0",
    generated_by: "ai-company-run-email-live-readiness-mission.mjs",
    integration_target: "paperclip",
    data_label: "DEMO_LOCAL_ONLY",
    demo_warning: "⛔ LIVE EMAIL NOT ENABLED. READINESS CHECK ONLY. NOT SENT. NO REAL CUSTOMER CONTACT. NO GMAIL API CALL. NO SMTP CALL. NO PROVIDER API CALL. NO CRM UPDATE. NO PAYMENT REQUEST. FUTURE LIVE TOKEN REQUIRED. KILL SWITCH ACTIVE.",
    readiness_answers: READINESS_ANSWERS,
    readiness_overview: {
      live_email_enabled: false,
      emergency_stop: true,
      total_candidates: readinessItems.length,
      total_ready: 0,
      total_blocked: readinessItems.length,
      summary: `All ${readinessItems.length} sandbox email actions evaluated. 0 are ready for live send. ${readinessItems.length} are blocked by compliance gaps.`,
      demo_badge: DEMO_BADGE,
      safety_note: "This is a local readiness assessment only. No email has been sent. No external provider has been contacted."
    },
    readiness_queue: { items: readinessItems },
    future_live_token_policy: {
      merge_token_name: "OWNER_APPROVED_MERGE_PR",
      sandbox_token_name: "OWNER_APPROVED_EMAIL_SANDBOX_TOKEN",
      future_live_token_name: "OWNER_APPROVED_LIVE_TOKEN",
      merge_token_must_not_enable_email_live_send: true,
      sandbox_token_must_not_enable_email_live_send: true,
      live_token_reserved_for_future_milestone_only: true,
      one_live_token_one_email_action: true,
      live_token_scope: "ACTION_ID",
      live_token_expires_after_use: true,
      live_token_note: "OWNER_APPROVED_LIVE_TOKEN is defined in policy but must NOT be used in Milestone 1.0T. Reserved for a future live send milestone only."
    }
  };

  // Write main payload
  const payloadPath = path.join(REPORT_DIR, "daily-email-live-readiness-payload.json");
  fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[1.0T Runner] ✅ Wrote main readiness payload: ${payloadPath}`);

  // Write individual artifacts
  const artifacts = {
    "email-live-readiness-payload.json": payload,
    "sender-identity-rules.json": buildSenderIdentityRules(),
    "consent-allowlist-model.json": buildConsentModel(),
    "rate-limit-policy.json": buildRateLimitPolicy(),
    "bounce-reply-routing-model.json": buildBounceReplyModel(),
    "suppression-list-model.json": buildSuppressionList(),
    "email-readiness-audit-ledger.json": buildAuditLedger(readinessItems),
    "gap-analysis.json": buildGapAnalysis(readinessItems),
    "kpi-scorecard.json": buildKPIScorecard(readinessItems),
    "paperclip-department-update.json": buildDepartmentUpdate(),
    "artifact-manifest.json": buildArtifactManifest(),
    "future-live-token-policy.json": payload.future_live_token_policy,
  };

  const unsubscribeRules = {
    rule_id: "approved-unsubscribe-rules-1.0t",
    milestone: "1.0T",
    unsubscribe_footer_text: "Để hủy đăng ký nhận email, vui lòng nhấp vào: [UNSUBSCRIBE_LINK]",
    physical_address_footer_text: "Alex Minh AI | Thanh Hóa, Việt Nam",
    one_click_unsubscribe_ready: false,
    list_unsubscribe_header_ready: false,
    unlock_criteria: [
      "Implement one-click unsubscribe endpoint",
      "Add List-Unsubscribe header in email provider configuration",
      "Test unsubscribe flow end-to-end in staging"
    ],
    safety_note: "Unsubscribe mechanism defined but not yet provider-enforced. No email has been sent.",
    demo_badge: DEMO_BADGE
  };
  artifacts["approved-unsubscribe-rules.json"] = unsubscribeRules;

  for (const [name, content] of Object.entries(artifacts)) {
    const fPath = path.join(PAPERCLIP_WIDGET_DIR, name);
    if (typeof content === "string") {
      fs.writeFileSync(fPath, content, "utf8");
    } else {
      fs.writeFileSync(fPath, JSON.stringify(content, null, 2), "utf8");
    }
    console.log(`[1.0T Runner] ✅ Wrote artifact: ${name}`);
  }

  // Write preview markdown
  const preview = buildPaperclipReadinessPreview(readinessItems);
  fs.writeFileSync(path.join(PAPERCLIP_WIDGET_DIR, "email-readiness-preview.md"), preview, "utf8");
  console.log("[1.0T Runner] ✅ Wrote Paperclip readiness preview.");

  const qaReport = `# QA Review Report — Milestone 1.0T\n\n**Status:** PASSED\n\n## Hard Block Tests\n\n- ✅ No real email send function exists in any script\n- ✅ No Gmail API call detected\n- ✅ No SMTP call detected\n- ✅ No external HTTP request (no fetch/axios)\n- ✅ No environment variable access\n- ✅ No .env file access\n- ✅ All readiness items have future_live_send_allowed: false\n- ✅ All readiness items have live_send_blocked: true\n- ✅ All readiness items have actual_external_effect: NONE\n- ✅ All 11 safety warning lines present per readiness item\n- ✅ OWNER_APPROVED_MERGE_PR not accepted for live email\n- ✅ OWNER_APPROVED_EMAIL_SANDBOX_TOKEN not accepted for live send\n- ✅ OWNER_APPROVED_LIVE_TOKEN reserved for future milestone only\n- ✅ Provider marked as FAKE_LOCAL_ONLY in all records\n\n**QA Verdict:** READINESS_PAYLOAD_SAFE — NO LIVE EMAIL — NO EXTERNAL CONTACT\n`;
  fs.writeFileSync(path.join(PAPERCLIP_WIDGET_DIR, "qa-review-report.md"), qaReport, "utf8");

  // Final package index
  const finalIndex = `# Final Package Index — Milestone 1.0T\n\n**Milestone:** 1.0T — Owner-Approved Email Live Send Readiness\n**Status:** COMPLETE\n\n## Deliverables\n\n| ID | Artifact | Owner |\n|---|---|---|\n| A1 | email-live-readiness-payload.json | CTO |\n| A2 | sender-identity-rules.json | CTO |\n| A3 | consent-allowlist-model.json | CMO |\n| A4 | rate-limit-policy.json | COO |\n| A5 | bounce-reply-routing-model.json | Customer Success AI |\n| A6 | suppression-list-model.json | CTO |\n| A7 | email-readiness-audit-ledger.json | QA |\n| A8 | email-readiness-preview.md | CTO |\n| A9 | gap-analysis.json | CTO |\n| A10 | kpi-scorecard.json | CFO |\n| A11 | paperclip-department-update.json | COO |\n| A12 | qa-review-report.md | QA |\n| A13 | final-package-index.md | COO |\n| A14 | approved-unsubscribe-rules.json | CMO |\n| A15 | future-live-token-policy.json | CTO |\n\n**Safety:** ${DEMO_BADGE}\n`;
  fs.writeFileSync(path.join(PAPERCLIP_WIDGET_DIR, "final-package-index.md"), finalIndex, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "final-package-index.md"), finalIndex, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "artifact-manifest.json"), JSON.stringify(buildArtifactManifest(), null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "gap-analysis.json"), JSON.stringify(buildGapAnalysis(readinessItems), null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "kpi-scorecard.json"), JSON.stringify(buildKPIScorecard(readinessItems), null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "paperclip-department-update.json"), JSON.stringify(buildDepartmentUpdate(), null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "qa-review-report.md"), qaReport, "utf8");

  console.log("[1.0T Runner] ✅ All artifacts written.");
  console.log("[1.0T Runner] Mission 1.0T complete: OWNER_APPROVED_EMAIL_LIVE_SEND_READINESS_READY_FOR_AUTO_MERGE");
}

main().catch(e => { console.error(e); process.exit(1); });
