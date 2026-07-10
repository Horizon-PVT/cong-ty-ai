# 📧 Boss Allowlist Test Gate Preview
> 🔵 DEMO / BOSS ALLOWLIST TEST GATE SIMULATION — NOT SENT — NOT A LIVE EMAIL SYSTEM

**Milestone:** 1.0V — Boss Allowlist Test Gate
**Mode:** `EMAIL_BOSS_ALLOWLIST_TEST_GATE_ONLY`
**Live Test Send in PR:** ❌ NO
**Kill Switch:** 🔴 ACTIVE

---

## ⛔ LIVE TEST SEND NOT ENABLED IN PR
## ⛔ BOSS ALLOWLIST ONLY
## ⛔ NOT SENT
## ⛔ ONE EMAIL ONLY
## ⛔ NO REAL CUSTOMER CONTACT
## ⛔ NO GMAIL API CALL IN PR
## ⛔ NO SMTP CALL IN PR
## ⛔ NO PROVIDER API CALL IN PR
## ⛔ NO CRM UPDATE
## ⛔ NO PAYMENT REQUEST
## ⛔ RUNTIME LIVE TOKEN REQUIRED
## ⛔ RETRY DISABLED
## ⛔ DUPLICATE SEND PROTECTION REQUIRED
## ⛔ KILL SWITCH REQUIRED

---

## Future Test Action Details

| Field | Value |
|---|---|
| Gate ID | `boss_test_gate_001` |
| Milestone | `1.0V` |
| Source Pilot Action ID | `pilot_email_action_001` |
| Recipient Kind | `BOSS_ALLOWLIST_RUNTIME_ONLY` |
| Recipient is Customer | ❌ NO |
| Recipient Email Placeholder | `boss-runtime-allowlist-placeholder@alex-minh-ai.demo` |
| Recipient Runtime Required | ✅ YES (real email address is never stored in repo) |
| Subject | **Hệ thống Bán hàng Web + Chatbot AI Tự động cho SME Thanh Hóa** |
| Body Preview | *Chào Anh, Alex Minh AI đã sẵn sàng triển khai hệ thống Web + Chatbot AI với mức giá 12.9 triệu...* |
| Offer | Web + Chatbot AI |
| Price Anchor | 12.9 triệu VND |
| CTA | Execute Boss live test send |
| Live Send Enabled in PR | ❌ NO |
| Future Runtime Send Allowed | ❌ NO (during PR/CI) |
| Send Blocked in PR | 🔴 YES |
| Block Reason | Milestone 1.0V is local test gate only. Real send requires runtime command with OWNER_APPROVED_LIVE_TOKEN post-merge. |
| Provider Status in PR | `FAKE_LOCAL_ONLY` |
| Provider Ready in PR | ❌ NO |
| Actual External Effect | `NONE` |
| Required Token | `OWNER_APPROVED_LIVE_TOKEN` formatted as `OWNER_APPROVED_LIVE_TOKEN=pilot_email_action_001` |
| Merge Token Accepted | ❌ NO |
| Sandbox Token Accepted | ❌ NO |
| Idempotency Key | `idemp_test_boss_001_v1` |
| Duplicate Send Protection | ✅ ENABLED |
| Retry Policy | `DISABLED` |
| Kill Switch Active in PR | 🔴 YES |

### Audit Ledger Expected Fields:
```json
[
  "gate_id",
  "timestamp",
  "idempotency_key",
  "recipient_validation",
  "live_token_validation",
  "kill_switch_preflight",
  "delivery_status",
  "actual_external_effect"
]
```

## What Must Be True Before the Test Email is Sent?

1. ✅ PR merged cleanly to master.
2. ✅ Operator triggers the post-merge command with `--recipient` parameter.
3. ✅ Live token matches `OWNER_APPROVED_LIVE_TOKEN=pilot_email_action_001`.
4. ✅ Verification checks pass, confirming target is not a customer.
5. ✅ Idempotency key checked successfully; no duplicate send occurred.

**Safety Attestation:** ATTESTATION: LIVE TEST SEND NOT ENABLED IN PR | BOSS ALLOWLIST ONLY | NOT SENT | ONE EMAIL ONLY | NO REAL CUSTOMER CONTACT | NO GMAIL API CALL IN PR | NO SMTP CALL IN PR | NO PROVIDER API CALL IN PR | NO CRM UPDATE | NO PAYMENT REQUEST | RUNTIME LIVE TOKEN REQUIRED | RETRY DISABLED | DUPLICATE SEND PROTECTION REQUIRED | KILL SWITCH REQUIRED
