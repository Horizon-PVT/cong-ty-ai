/**
 * Calendar Scheduling Gate — enforces safety checklist before event creation.
 */
import { MEETING_STATUSES } from "../revenue-conversation/types.mjs";
import { evaluateEligibility } from "../revenue-conversation/eligibility.mjs";
import { dryRunMeetingProvider } from "./provider-dry-run.mjs";
import { fakeMeetingProvider } from "./provider-fake-http.mjs";

const PROVIDERS = {
  dry_run: dryRunMeetingProvider,
  google_calendar: fakeMeetingProvider,
  calendly: fakeMeetingProvider
};

/**
 * Process a scheduling action.
 *
 * @param {object} params
 * @param {object} params.action - Scheduling action
 * @param {string} params.provider - 'dry_run' | 'google_calendar' | 'calendly'
 * @param {string} params.mode - 'dry_run' | 'sandbox' | 'live'
 * @param {string} [params.ownerToken] - OWNER_APPROVED_MEETING_TOKEN value
 * @param {string[]} [params.suppressedList] - List of suppressed recipient IDs
 * @param {Array} [params.existingLedger] - Existing scheduled meetings (conflict check)
 * @param {object} [params.providerConfig] - Config keys (secrets from env)
 */
export async function processSchedulingAction({
  action,
  provider = "dry_run",
  mode = "dry_run",
  ownerToken,
  suppressedList = [],
  existingLedger = [],
  providerConfig = {}
}) {
  const actionId = action.meeting_action_id;
  const recipientId = action.recipient_id;

  // 1. Validate action shape
  if (!actionId || !recipientId) {
    return _blocked(action, "INVALID_ACTION_SHAPE", "meeting_action_id or recipient_id missing", provider, mode);
  }

  // 2. Eligibility & Suppression checks
  const eligibility = evaluateEligibility(action, suppressedList);
  if (!eligibility.eligible) {
    return _blocked(action, eligibility.reason || "INELIGIBLE", "Lead failed eligibility audit", provider, mode);
  }

  // 3. Conflict / double-booking check
  const hasConflict = existingLedger.some(
    (e) => e.recipient_id === recipientId && 
      [MEETING_STATUSES.SCHEDULED_SANDBOX, MEETING_STATUSES.SCHEDULED_LIVE].includes(e.write_status)
  );
  if (hasConflict) {
    return _blocked(action, "CONFLICTING_MEETING", "Lead already has a scheduled meeting", provider, mode);
  }

  // 4. Dry-run provider execution (never needs token)
  if (mode === "dry_run") {
    return PROVIDERS.dry_run.schedule({ ...action, mode }, {});
  }

  // 5. Enforce owner approval token for sandbox/live
  const expectedToken = `OWNER_APPROVED_MEETING_TOKEN=meeting_action_${actionId}_1_1c`;
  if (!ownerToken || !ownerToken.startsWith(`OWNER_APPROVED_MEETING_TOKEN=meeting_action_${actionId}_1_1c`)) {
    return _blocked(action, "MISSING_OWNER_TOKEN", `Required: ${expectedToken}`, provider, mode);
  }

  // 6. Validate calendar provider config
  const prov = PROVIDERS[provider];
  if (!prov) {
    return _blocked(action, "UNKNOWN_PROVIDER", `Provider ${provider} not supported`, provider, mode);
  }

  const validation = prov.validateConfig(providerConfig);
  if (!validation.valid) {
    return _blocked(action, "PROVIDER_CONFIG_MISSING", validation.error, provider, mode);
  }

  // 7. Write scheduling action
  return prov.schedule({ ...action, mode }, providerConfig);
}

function _blocked(action, reason, message, provider, mode) {
  return {
    meeting_action_id: action.meeting_action_id,
    recipient_id: action.recipient_id,
    provider,
    mode,
    write_status: reason === "PROVIDER_CONFIG_MISSING"
      ? MEETING_STATUSES.FAILED
      : MEETING_STATUSES.BLOCKED_PENDING_OWNER_APPROVAL,
    blocked_reason: reason,
    error: message,
    called_real_provider: false,
    created_at: new Date().toISOString()
  };
}
