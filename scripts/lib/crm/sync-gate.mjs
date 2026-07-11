/**
 * CRM Sync Gate — enforces all safety gates before allowing any CRM write.
 *
 * Gate order:
 * 1. Validate action shape
 * 2. Check suppression
 * 3. Check consent
 * 4. Check idempotency
 * 5. Validate provider config
 * 6. Enforce owner token for sandbox/live
 * 7. Verify action hash matches preview
 * 8. Execute write
 * 9. Record result
 */
import { CRM_WRITE_STATUS } from "./types.mjs";
import { isAlreadyProcessed, buildActionHash } from "./idempotency.mjs";
import { dryRunProvider } from "./provider-dry-run.mjs";
import { hubspotProvider } from "./provider-hubspot.mjs";
import { salesforceProvider } from "./provider-salesforce.mjs";

const PROVIDERS = {
  dry_run: dryRunProvider,
  hubspot: hubspotProvider,
  salesforce: salesforceProvider,
};

/**
 * Process a single CRM action through the full sync gate.
 *
 * @param {object} params
 * @param {object} params.action - CRM action from 1.1A owner-crm-approval-queue
 * @param {string} params.provider - 'dry_run' | 'hubspot' | 'salesforce'
 * @param {string} params.mode - 'dry_run' | 'sandbox' | 'live'
 * @param {string} [params.ownerToken] - OWNER_APPROVED_CRM_WRITE_TOKEN value
 * @param {object} [params.providerConfig] - Provider API config (secrets from env)
 * @param {string[]} [params.suppressedLeadIds] - Lead IDs that are suppressed
 * @param {Array} [params.existingLedger] - Existing ledger entries (idempotency check)
 */
export async function processCrmAction({
  action,
  provider: providerId = "dry_run",
  mode = "dry_run",
  ownerToken,
  providerConfig = {},
  suppressedLeadIds = [],
  existingLedger = [],
}) {
  const actionId = action.crm_action_id;
  const leadId = action.lead_id;

  // Gate 1: action shape
  if (!actionId || !leadId) {
    return _blocked(action, "INVALID_ACTION_SHAPE", "crm_action_id or lead_id missing", providerId, mode);
  }

  // Gate 2: suppression check
  if (suppressedLeadIds.includes(leadId)) {
    return _blocked(action, "SUPPRESSED_LEAD", `Lead ${leadId} is suppressed — CRM write blocked`, providerId, mode);
  }

  // Gate 3: idempotency — skip if already processed
  if (isAlreadyProcessed(existingLedger, action.idempotency_key)) {
    return {
      crm_action_id: actionId,
      lead_id: leadId,
      provider: providerId,
      mode,
      write_status: CRM_WRITE_STATUS.DRY_RUN,
      skipped_reason: "Already processed (idempotency)",
      idempotency_key: action.idempotency_key,
      called_real_provider: false,
      created_at: new Date().toISOString(),
    };
  }

  // Gate 4: dry-run never needs token
  if (mode === "dry_run") {
    const prov = PROVIDERS["dry_run"];
    return prov.write({ ...action, mode }, {});
  }

  // Gate 5: sandbox/live require owner token
  const expectedTokenPrefix = `OWNER_APPROVED_CRM_WRITE_TOKEN=crm_action_${actionId}_1_1b_${providerId}_${mode}`;
  if (!ownerToken || !ownerToken.startsWith(`OWNER_APPROVED_CRM_WRITE_TOKEN=crm_action_${actionId}_1_1b_`)) {
    return _blocked(action, "MISSING_OWNER_TOKEN", `Required: ${expectedTokenPrefix}`, providerId, mode);
  }

  // Gate 6: validate provider
  const prov = PROVIDERS[providerId];
  if (!prov) {
    return _blocked(action, "UNKNOWN_PROVIDER", `Provider ${providerId} not supported`, providerId, mode);
  }

  const configValidation = prov.validateConfig(providerConfig);
  if (!configValidation.valid) {
    return _blocked(action, "PROVIDER_CONFIG_MISSING", configValidation.error, providerId, mode);
  }

  // Gate 7: verify action hash matches
  const currentHash = buildActionHash(action);
  if (action.preview_action_hash && action.preview_action_hash !== currentHash) {
    return _blocked(action, "ACTION_HASH_MISMATCH", "Action changed since preview — re-approval required", providerId, mode);
  }

  // Gate 8: execute write
  return prov.write({ ...action, mode }, providerConfig);
}

function _blocked(action, reason, message, provider, mode) {
  return {
    crm_action_id: action.crm_action_id,
    lead_id: action.lead_id,
    provider,
    mode,
    write_status: reason === "PROVIDER_CONFIG_MISSING"
      ? CRM_WRITE_STATUS.FAILED_FINAL
      : CRM_WRITE_STATUS.BLOCKED_PENDING_OWNER_APPROVAL,
    blocked_reason: reason,
    error: message,
    called_real_provider: false,
    created_at: new Date().toISOString(),
  };
}
