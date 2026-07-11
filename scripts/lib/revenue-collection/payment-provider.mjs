/**
 * Payment provider and proposal utility library.
 */

export function buildProposal(lead) {
  return {
    recipient_id: lead.recipient_id,
    proposal_title: "AI Automation Implementation Services",
    amount: 1500,
    currency: "USD",
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  };
}

export async function requestPayment(lead, { mode, token }) {
  const isLive = mode === "live" && token && token.length > 0;

  return {
    recipient_id: lead.recipient_id,
    amount: 1500,
    status: isLive ? "PAYMENT_REQUESTED_LIVE" : "PAYMENT_REQUESTED_SANDBOX",
    idempotency_key: `pay_${lead.recipient_id}_1_1m`,
    created_at: new Date().toISOString()
  };
}

export function redactPayment(result) {
  const redacted = { ...result };
  // Redact customer raw details if any
  delete redacted.raw_token;
  delete redacted.customer_email;
  return redacted;
}
