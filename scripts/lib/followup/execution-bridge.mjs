/**
 * Bridges follow-up plan execution to email delivery providers.
 */
import { dryRunEmailProvider } from "../email/provider-dry-run.mjs";
import { smtpEmailProvider } from "../email/provider-smtp.mjs";
import { resendEmailProvider } from "../email/provider-resend.mjs";

const PROVIDERS = {
  dry_run: dryRunEmailProvider,
  smtp: smtpEmailProvider,
  resend: resendEmailProvider
};

export async function executeFollowupDispatch({
  providerName,
  recipientId,
  subject,
  html,
  text,
  idempotencyKey,
  mode,
  config = {}
}) {
  const provider = PROVIDERS[providerName] || dryRunEmailProvider;
  
  // Call provider sendEmail method
  return provider.sendEmail({
    dispatchId: `fup_${recipientId}`,
    to: "client@example.com", // Redacted dummy value in code
    subject,
    html,
    text,
    idempotencyKey,
    mode,
    config
  });
}
