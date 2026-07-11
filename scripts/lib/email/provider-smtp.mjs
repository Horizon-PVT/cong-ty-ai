/**
 * SMTP Email Provider Wrapper
 */

export const smtpEmailProvider = {
  id: "smtp",

  verifyAuth(config = {}) {
    const host = config.host || process.env.SMTP_HOST;
    const port = config.port || process.env.SMTP_PORT;
    const user = config.user || process.env.SMTP_USER;
    const pass = config.pass || process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      return { valid: false, error: "SMTP configuration is incomplete (host, port, user, pass required)" };
    }

    return { valid: true };
  },

  async sendEmail(params = {}) {
    const auth = this.verifyAuth(params.config);
    if (!auth.valid) {
      return {
        write_status: "FAILED",
        error: auth.error,
        called_real_provider: false,
        created_at: new Date().toISOString()
      };
    }

    const mode = params.mode || "sandbox";

    if (process.env.EMAIL_FAKE_PROVIDER === "true") {
      return {
        write_status: mode === "live" ? "SENT_LIVE" : "SENT_SANDBOX",
        message_id: `msg_smtp_fake_${params.dispatchId}`,
        called_real_provider: false,
        fake_http: true,
        created_at: new Date().toISOString()
      };
    }

    // SMTP live logic: We don't import nodemailer to keep dependencies minimal unless needed
    return {
      write_status: "FAILED",
      error: "SMTP nodemailer transporter not loaded. Set EMAIL_FAKE_PROVIDER=true for testing.",
      called_real_provider: false,
      created_at: new Date().toISOString()
    };
  }
};
