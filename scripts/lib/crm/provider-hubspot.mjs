/**
 * HubSpot CRM provider — pilot integration.
 * Mode: test_portal (sandbox). Live requires owner token.
 *
 * API: HubSpot v3 Objects (Contacts, Notes)
 * Idempotency: search-before-create with paperclip_idempotency_key custom property
 *
 * Secret: HUBSPOT_ACCESS_TOKEN env var (Private App token, prefix: pat-)
 * NEVER hardcode tokens here.
 */
import { CRM_WRITE_STATUS } from "./types.mjs";
import { redactProviderResponse, looksLikeSecret } from "./redaction.mjs";
import { buildIdempotencyKey, buildActionHash } from "./idempotency.mjs";

const HUBSPOT_BASE = "https://api.hubapi.com";

export const hubspotProvider = {
  id: "hubspot",

  validateConfig(config = {}) {
    const token = config.accessToken || process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) return { valid: false, error: "HUBSPOT_ACCESS_TOKEN not set" };
    if (looksLikeSecret(token) && !token.startsWith("pat-")) {
      return { valid: false, error: "HUBSPOT_ACCESS_TOKEN format unexpected — expected pat- prefix" };
    }
    return { valid: true, token };
  },

  async preview(action) {
    return {
      crm_action_id: action.crm_action_id,
      lead_id: action.lead_id,
      provider: "hubspot",
      mode: action.mode ?? "sandbox",
      operation: action.operation ?? "UPSERT_CONTACT_OR_DEAL",
      mapping: {
        contact: { email: "[REDACTED]", company: "[REDACTED]", stage: action.fields_redacted?.stage },
        note: { body: "[conversation summary — redacted for preview]" },
        idempotency_property: "paperclip_idempotency_key",
      },
      write_status: CRM_WRITE_STATUS.BLOCKED_PENDING_OWNER_APPROVAL,
      idempotency_key: buildIdempotencyKey({ milestone: "1.1B", crmActionId: action.crm_action_id, provider: "hubspot", mode: action.mode ?? "sandbox" }),
      action_hash: buildActionHash(action),
      called_real_provider: false,
    };
  },

  async write(action, config = {}) {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        crm_action_id: action.crm_action_id,
        provider: "hubspot",
        write_status: CRM_WRITE_STATUS.FAILED_FINAL,
        error: validation.error,
        called_real_provider: false,
        created_at: new Date().toISOString(),
      };
    }

    const mode = action.mode ?? "sandbox";
    const idempotencyKey = buildIdempotencyKey({ milestone: "1.1B", crmActionId: action.crm_action_id, provider: "hubspot", mode });
    const actionHash = buildActionHash(action);

    // Fake HTTP mode for CI / contract tests — env flag
    if (process.env.HUBSPOT_FAKE_HTTP === "true") {
      return _fakeHubspotWrite(action, idempotencyKey, actionHash, mode);
    }

    // Real sandbox/live call
    const token = validation.token;
    try {
      // Step 1: search-before-create idempotency
      const searchRes = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts/search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: "paperclip_idempotency_key", operator: "EQ", value: idempotencyKey }] }],
          properties: ["id", "paperclip_idempotency_key"],
          limit: 1,
        }),
      });
      const searchData = await searchRes.json();

      let contactId;
      if (searchData.total > 0) {
        contactId = searchData.results[0].id;
        // Already created — attach note only if not already attached
      } else {
        // Step 2: create contact (with redacted fields — owner must configure mapping)
        const createRes = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            properties: {
              paperclip_idempotency_key: idempotencyKey,
              paperclip_action_id: action.crm_action_id,
              lifecyclestage: "lead",
              hs_lead_status: "NEW",
            },
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(`HubSpot contact create failed: ${JSON.stringify(createData)}`);
        contactId = createData.id;
      }

      // Step 3: attach note
      await fetch(`${HUBSPOT_BASE}/crm/v3/objects/notes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: {
            hs_note_body: `[Paperclip 1.1B] Action ${action.crm_action_id} synced. Lead: ${action.lead_id}. Stage: ${action.fields_redacted?.stage ?? "qualified_interest"}.`,
            hs_timestamp: Date.now().toString(),
          },
          associations: [{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }],
        }),
      });

      return {
        crm_action_id: action.crm_action_id,
        provider: "hubspot",
        mode,
        write_status: mode === "live" ? CRM_WRITE_STATUS.WRITTEN_LIVE : CRM_WRITE_STATUS.WRITTEN_SANDBOX,
        provider_object_id: contactId,
        provider_request_hash: actionHash,
        provider_response_redacted: redactProviderResponse({ id: contactId, status: "ok", objectType: "contact", action: "upsert" }),
        idempotency_key: idempotencyKey,
        called_real_provider: true,
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      return {
        crm_action_id: action.crm_action_id,
        provider: "hubspot",
        mode,
        write_status: CRM_WRITE_STATUS.FAILED_RETRYABLE,
        error: err.message,
        provider_request_hash: actionHash,
        idempotency_key: idempotencyKey,
        called_real_provider: true,
        created_at: new Date().toISOString(),
      };
    }
  },
};

function _fakeHubspotWrite(action, idempotencyKey, actionHash, mode) {
  const fakeContactId = `hs_fake_${action.crm_action_id}_001`;
  return {
    crm_action_id: action.crm_action_id,
    provider: "hubspot",
    mode,
    write_status: mode === "live" ? CRM_WRITE_STATUS.WRITTEN_LIVE : CRM_WRITE_STATUS.WRITTEN_SANDBOX,
    provider_object_id: fakeContactId,
    provider_request_hash: actionHash,
    provider_response_redacted: redactProviderResponse({ id: fakeContactId, status: "ok", objectType: "contact", action: "upsert_fake" }),
    idempotency_key: idempotencyKey,
    called_real_provider: false,
    fake_http: true,
    created_at: new Date().toISOString(),
  };
}
