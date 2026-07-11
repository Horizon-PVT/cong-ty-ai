/**
 * Dry-run CRM provider — never calls real endpoints.
 * Used as default in all CI and default-mode runs.
 */
import { CRM_WRITE_STATUS } from "./types.mjs";
import { redactProviderResponse } from "./redaction.mjs";
import { buildIdempotencyKey, buildActionHash } from "./idempotency.mjs";

export const dryRunProvider = {
  id: "dry_run",

  validateConfig(_config) {
    // No config required for dry run
    return { valid: true };
  },

  async preview(action) {
    return {
      crm_action_id: action.crm_action_id,
      lead_id: action.lead_id,
      provider: "dry_run",
      mode: "dry_run",
      operation: action.operation ?? "UPSERT_CONTACT_OR_DEAL",
      fields_redacted: {
        contact: "[REDACTED]",
        stage: action.fields_redacted?.stage ?? "qualified_interest",
        next_action: "owner_review_required",
      },
      write_status: CRM_WRITE_STATUS.DRY_RUN,
      idempotency_key: buildIdempotencyKey({
        milestone: "1.1B",
        crmActionId: action.crm_action_id,
        provider: "dry_run",
        mode: "dry_run",
      }),
      action_hash: buildActionHash(action),
      called_real_provider: false,
    };
  },

  async write(action, _config) {
    // Dry-run never writes
    const preview = await this.preview(action);
    return {
      ...preview,
      write_status: CRM_WRITE_STATUS.DRY_RUN,
      provider_object_id: null,
      provider_request_hash: buildActionHash(action),
      provider_response_redacted: redactProviderResponse({ action: "DRY_RUN_SKIPPED", status: "ok" }),
      called_real_provider: false,
      created_at: new Date().toISOString(),
    };
  },
};
