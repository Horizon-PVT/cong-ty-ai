# Live Action Gateway Preview — Milestone 1.0R

> [!WARNING]
> **LIVE ACTION NOT ENABLED**  
> **DRY RUN ONLY**  
> **NO REAL CUSTOMER CONTACT**  
> **NO CRM UPDATE**  
> **NO PAYMENT REQUEST**  
> **OWNER TOKEN REQUIRED FOR FUTURE LIVE MODE**  
> **KILL SWITCH ACTIVE**  

## Strategy & 10 Live Action Questions

### q1_actions_eligible_live
Actions eligible for future live simulation are zalo/email messaging, crm record updates, and payment requests after gateway configuration.

### q2_actions_blocked_reason
All actions are currently blocked because the gateway is locked under LEVEL_0_LOCAL_ONLY mode and the emergency stop is active.

### q3_autonomy_level_required
autonomy_level_required depends on the action class (e.g. LEVEL_2_OWNER_APPROVED_LIVE_SEND for customer messages, LEVEL_3 for CRM deals).

### q4_future_live_effect
If live mode becomes enabled, actions will trigger actual external connector calls to HubSpot CRM, Zalo Official Account, or Email SMTP server.

### q5_owner_token_required
Future live execution requires explicit owner token OWNER_APPROVED_LIVE_TOKEN matched per action id.

### q6_connector_used
Connectorsconn_zalo_sme, conn_email_smtp, conn_facebook_page, and conn_crm_hubspot will translate actions into API commands.

### q7_risk_score
Risk score ranges from 10 (local logging) to 90 (payment requests and direct outbound communication).

### q8_kill_switch_active
Yes. live_actions_enabled is false, emergency_stop is true, and all daily limits are set to 0.

### q9_audit_trail
All Dry-Run actions are logged inside the live-action-ledger.json audit trail.

### q10_pre_live_fixes
To enable live mode, the owner must update kill_switch settings, switch autonomy level, and provide the OWNER_APPROVED_MERGE_PR token.

## Simulated Live Action Ledger

- **[DRY_RUN_SUCCESS]** Simulated send_zalo_message to [DEMO] Spa Thanh Hóa. Dry-run payload validated. (`act_live_001`) at `2026-04-19T08:39:24.000Z`
- **[BLOCKED]** Simulated update_crm_record to [DEMO] Nha khoa Thanh Hóa. Blocked by LEVEL_0_LOCAL_ONLY policy. (`act_live_002`) at `2026-04-19T08:39:34.000Z`
- **[DRY_RUN_SUCCESS]** Simulated create_payment_request for [DEMO] Homestay Sầm Sơn. Dry-run payload compiled. (`act_live_003`) at `2026-04-19T08:39:44.000Z`
- **[BLOCKED]** Simulated send_email to [DEMO] Thẩm mỹ viện Thanh Hóa. Blocked by kill switch emergency_stop. (`act_live_004`) at `2026-04-19T08:39:54.000Z`
- **[DRY_RUN_SUCCESS]** Simulated create_crm_deal for [DEMO] Phòng khám đa khoa Thanh Hóa. Dry-run payload compiled. (`act_live_005`) at `2026-04-19T08:40:04.000Z`
