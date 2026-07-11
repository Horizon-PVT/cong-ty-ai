/**
 * Resend API Email Provider Wrapper
 */

export const resendEmailProvider = {
  id: "resend",

  verifyAuth(config = {}) {
    const key = config.apiKey || process.env.RESEND_API_KEY;
    const from = config.from || process.env.EMAIL_FROM;

    if (!key) {
      return { valid: false, error: "RESEND_API_KEY is not set" };
    }
    if (!from) {
      return { valid: false, error: "EMAIL_FROM is not set" };
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
        message_id: `msg_resend_fake_${params.dispatchId}`,
        called_real_provider: false,
        fake_http: true,
        created_at: new Date().toISOString()
      };
    }

    // Real API request
    const apiKey = params.config?.apiKey || process.env.RESEND_API_KEY;
    const from = params.config?.from || process.env.EMAIL_FROM;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Resend API failed: ${JSON.stringify(err)}`);
      }
      const data = await res.json();
      return {
        write_status: mode === "live" ? "SENT_LIVE" : "SENT_SANDBOX",
        message_id: data.id,
        called_real_provider: true,
        created_at: new Date().toISOString()
      };
    } catch (err) {
      return {
        write_status: "FAILED_RETRYABLE",
        error: err.message,
        called_real_provider: true,
        created_at: new Date().toISOString()
      };
    }
  }
};
