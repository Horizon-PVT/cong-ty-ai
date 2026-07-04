# 📧 One-Action Email Live Pilot Harness Preview
> 🔵 DEMO / PILOT HARNESS SIMULATION — NOT SENT — NOT A LIVE EMAIL SYSTEM

**Milestone:** 1.0U — One-Action Pilot Harness
**Mode:** `EMAIL_LIVE_PILOT_HARNESS_ONLY`
**Live Email Enabled:** ❌ NO
**Kill Switch:** 🔴 ACTIVE

---

## ⛔ LIVE PILOT NOT ENABLED
## ⛔ HARNESS ONLY
## ⛔ NOT SENT
## ⛔ OWNER ALLOWLIST ONLY
## ⛔ NO REAL CUSTOMER CONTACT
## ⛔ NO GMAIL API CALL
## ⛔ NO SMTP CALL
## ⛔ NO PROVIDER API CALL
## ⛔ NO CRM UPDATE
## ⛔ NO PAYMENT REQUEST
## ⛔ FAKE PROVIDER ONLY
## ⛔ FUTURE LIVE TOKEN REQUIRED
## ⛔ KILL SWITCH ACTIVE

---

## Pilot Candidate Details

| Field | Value |
|---|---|
| Pilot Action ID | `pilot_email_action_001` |
| Source Readiness Action | `readiness_act_001` |
| Recipient Label | Boss Owner |
| Recipient Kind | `OWNER_ALLOWLIST_PLACEHOLDER` |
| Recipient is Customer | ❌ NO |
| Recipient is Demo/Placeholder | ✅ YES |
| Recipient Email Placeholder | `owner-allowlist@alex-minh-ai.demo` |
| Subject | **Hệ thống Bán hàng Web + Chatbot AI Tự động cho SME Thanh Hóa** |
| Body Preview | *Chào Anh, Alex Minh AI đã sẵn sàng triển khai hệ thống Web + Chatbot AI với mức giá 12.9 triệu...* |
| Offer | Web + Chatbot AI |
| Price Anchor | 12.9 triệu VND |
| CTA | Review & approve pilot send |
| Future Live Send Allowed | ❌ NO |
| Pilot Send Blocked | 🔴 YES |
| Block Reason | Milestone 1.0U is a local harness only. Real send requires OWNER_APPROVED_LIVE_TOKEN in a future milestone. |
| Provider Status | `FAKE_LOCAL_ONLY` |
| Provider Ready | ❌ NO |
| Fake Provider Result | `SIMULATED_DELIVERY_PENDING_OWNER_TOKEN` |
| Actual External Effect | `NONE` |
| Future Live Token Required | ✅ YES |
| Required Token | `OWNER_APPROVED_LIVE_TOKEN` scoped to `pilot_email_action_001` |
| Merge Token Accepted | ❌ NO |
| Sandbox Token Accepted for Pilot | ❌ NO |
| Idempotency Key | `idemp_pilot_001_a6b7c8d9` |
| Duplicate Send Protection | ✅ ENABLED |
| Retry Policy | `DISABLED` |
| Kill Switch Active | 🔴 YES |

### Audit Trail Entry:
```json
{
  "event": "pilot_readiness_check",
  "timestamp": "2026-07-04T09:43:23.593Z",
  "status": "BLOCKED",
  "reason": "Milestone 1.0U is local harness only. Live sending is disabled.",
  "actual_external_effect": "NONE"
}
```

## What Must Be True Before a Real One-Email Test is Allowed?

1. ✅ DNS SPF, DKIM, and DMARC fully configured and verified in production.
2. ✅ Real provider configured and tested in sandboxed safe mode.
3. ✅ Owner inputs the explicit live token: `OWNER_APPROVED_LIVE_TOKEN=pilot_email_action_001`.
4. ✅ Allowlist is strictly locked to Boss's real email address (cannot be a customer).
5. ✅ Idempotency checks pass successfully, verifying this exact ID has never been sent before.

**Safety Attestation:** ATTESTATION: LIVE PILOT NOT ENABLED | HARNESS ONLY | NOT SENT | OWNER ALLOWLIST ONLY | NO REAL CUSTOMER CONTACT | NO GMAIL API CALL | NO SMTP CALL | NO PROVIDER API CALL | NO CRM UPDATE | NO PAYMENT REQUEST | FAKE PROVIDER ONLY | FUTURE LIVE TOKEN REQUIRED | KILL SWITCH ACTIVE
