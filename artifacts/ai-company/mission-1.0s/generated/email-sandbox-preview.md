# Email Sandbox Preview — Milestone 1.0S

> [!WARNING]
> **EMAIL SANDBOX ONLY**  
> **NOT SENT**  
> **NO REAL CUSTOMER CONTACT**  
> **NO GMAIL API CALL**  
> **NO SMTP CALL**  
> **NO CRM UPDATE**  
> **NO PAYMENT REQUEST**  
> **OWNER SANDBOX TOKEN REQUIRED**  
> **LIVE SEND NOT ENABLED**  

## Strategy & 10 Email Sandbox Questions

### q1_email_drafts_waiting_approval
Drafts for Spa Thanh Hóa, Nha khoa Thanh Hóa, and Homestay Sầm Sơn waiting for sandbox outbox write approval.

### q2_written_to_sandbox_outbox
An approved sandboxed email record is written locally into the daily-email-sandbox-payload.json outbox messages list.

### q3_demo_recipients
Simulated SME recipient email addresses marked clearly with is_demo = true (e.g. spa-thanhhoa-demo@example.com).

### q4_email_content
Subject: 'Đề xuất Giải pháp Web + Chatbot AI'; Body introducing Alex Minh AI and anchoring the 12.9M price point.

### q5_price_discount_safety
CFO confirmed all drafts respect the 12.9M price anchor with zero unapproved discounts.

### q6_token_required
Boss must approve each item by providing the OWNER_APPROVED_EMAIL_SANDBOX_TOKEN=<action_id> token.

### q7_real_sending_blocked
Yes. All SMTP and API calls are strictly stubbed, and any live execution is hard-locked.

### q8_future_live_effect
If live email mode is unlocked in future milestones, it would trigger real SMTP sends to Thanh Hoa SMEs.

### q9_audit_trail
Every sandbox write event is appended with a timestamp to email-action-ledger.json.

### q10_live_email_fixes
To enable live emails, the owner must update policy kill switch configurations and provide the OWNER_APPROVED_LIVE_TOKEN.

## Simulated Sandbox Email Outbox Messages

- **[SANDBOX_OUTBOX_WRITE_ONLY]** To: `cafe-thanhhoa-demo@example.com`, Subject: `Đề xuất Giải pháp tối ưu vận hành Cafe bằng Chatbot AI` (Action: `act_email_000`) written at `2026-07-04T09:24:50Z`
