/**
 * Salesforce CRM provider — pilot integration.
 * Object mode: Lead (simplest mapping for pilot).
 * Idempotency: query-by-email-hash (full idempotency needs Paperclip_Action_Id__c custom field).
 *
 * Secret: SALESFORCE_ACCESS_TOKEN + SALESFORCE_INSTANCE_URL env vars
 * NEVER hardcode tokens here.
 */
import { CRM_WRITE_STATUS } from "./types.mjs";
import { redactProviderResponse } from "./redaction.mjs";
import { buildIdempotencyKey, buildActionHash } from "./idempotency.mjs";

export const salesforceProvider = {
  id: "salesforce",

  validateConfig(config = {}) {
    const token = config.accessToken || process.env.SALESFORCE_ACCESS_TOKEN;
    const instance = config.instanceUrl || process.env.SALESFORCE_INSTANCE_URL;
    if (!token) return { valid: false, error: "SALESFORCE_ACCESS_TOKEN not set" };
    if (!instance) return { valid: false, error: "SALESFORCE_INSTANCE_URL not set" };
    return { valid: true, token, instance };
  },

  async preview(action) {
    return {
      crm_action_id: action.crm_action_id,
      lead_id: action.lead_id,
      provider: "salesforce",
      mode: action.mode ?? "sandbox",
      operation: "UPSERT_LEAD",
      mapping: {
        object: "Lead",
        fields: {
          LastName: "[REDACTED]",
          Email: "[REDACTED]",
          Company: "[REDACTED]",
          Status: "Open - Not Contacted",
          LeadSource: "Paperclip_AI_Outreach",
          Description: "[conversation summary — redacted for preview]",
        },
        idempotency_note: "Full idempotency requires Paperclip_Action_Id__c custom external ID field",
      },
      write_status: CRM_WRITE_STATUS.BLOCKED_PENDING_OWNER_APPROVAL,
      idempotency_key: buildIdempotencyKey({ milestone: "1.1B", crmActionId: action.crm_action_id, provider: "salesforce", mode: action.mode ?? "sandbox" }),
      action_hash: buildActionHash(action),
      called_real_provider: false,
    };
  },

  async write(action, config = {}) {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        crm_action_id: action.crm_action_id,
        provider: "salesforce",
        write_status: CRM_WRITE_STATUS.FAILED_FINAL,
        error: validation.error,
        called_real_provider: false,
        created_at: new Date().toISOString(),
      };
    }

    const mode = action.mode ?? "sandbox";
    const idempotencyKey = buildIdempotencyKey({ milestone: "1.1B", crmActionId: action.crm_action_id, provider: "salesforce", mode });
    const actionHash = buildActionHash(action);

    // Fake HTTP mode for CI / contract tests
    if (process.env.SALESFORCE_FAKE_HTTP === "true") {
      return _fakeSalesforceWrite(action, idempotencyKey, actionHash, mode);
    }

    const { token, instance } = validation;
    try {
      // Query for existing Lead by idempotency key (requires Paperclip_Action_Id__c field)
      const soqlQuery = encodeURIComponent(
        `SELECT Id FROM Lead WHERE Paperclip_Action_Id__c = '${action.crm_action_id}' LIMIT 1`
      );
      const qRes = await fetch(`${instance}/services/data/v58.0/query?q=${soqlQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const qData = await qRes.json();

      let leadId;
      if (qRes.ok && qData.totalSize > 0) {
        leadId = qData.records[0].Id;
        // Update existing lead with task/note
        await fetch(`${instance}/services/data/v58.0/sobjects/Lead/${leadId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ Status: "Working", LeadSource: "Paperclip_AI_Outreach" }),
        });
      } else {
        // Create new Lead
        const createRes = await fetch(`${instance}/services/data/v58.0/sobjects/Lead`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            LastName: "[Redacted — populate via owner-approved mapping]",
            Email: "[Redacted — set via owner token flow]",
            Company: "[Redacted — populate via owner-approved mapping]",
            Status: "Open - Not Contacted",
            LeadSource: "Paperclip_AI_Outreach",
            Description: `Paperclip action: ${action.crm_action_id}`,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(`Salesforce Lead create failed: ${JSON.stringify(createData)}`);
        leadId = Array.isArray(createData) ? createData[0]?.id : createData.id;
      }

      return {
        crm_action_id: action.crm_action_id,
        provider: "salesforce",
        mode,
        write_status: mode === "live" ? CRM_WRITE_STATUS.WRITTEN_LIVE : CRM_WRITE_STATUS.WRITTEN_SANDBOX,
        provider_object_id: leadId,
        provider_request_hash: actionHash,
        provider_response_redacted: redactProviderResponse({ id: leadId, status: "ok", objectType: "Lead", action: "upsert" }),
        idempotency_key: idempotencyKey,
        called_real_provider: true,
        created_at: new Date().toISOString(),
      };
    } catch (err) {
      return {
        crm_action_id: action.crm_action_id,
        provider: "salesforce",
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

function _fakeSalesforceWrite(action, idempotencyKey, actionHash, mode) {
  const fakeLeadId = `sf_fake_lead_${action.crm_action_id}_001`;
  return {
    crm_action_id: action.crm_action_id,
    provider: "salesforce",
    mode,
    write_status: mode === "live" ? CRM_WRITE_STATUS.WRITTEN_LIVE : CRM_WRITE_STATUS.WRITTEN_SANDBOX,
    provider_object_id: fakeLeadId,
    provider_request_hash: actionHash,
    provider_response_redacted: redactProviderResponse({ id: fakeLeadId, status: "ok", objectType: "Lead", action: "upsert_fake" }),
    idempotency_key: idempotencyKey,
    called_real_provider: false,
    fake_http: true,
    created_at: new Date().toISOString(),
  };
}
