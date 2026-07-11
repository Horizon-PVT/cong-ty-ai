/**
 * Email Dry-run Provider
 */

export const dryRunEmailProvider = {
  id: "dry_run",

  verifyAuth() {
    return { valid: true };
  },

  async sendEmail(params) {
    return {
      write_status: "DRY_RUN",
      message_id: `msg_dry_${params.dispatchId}`,
      called_real_provider: false,
      created_at: new Date().toISOString()
    };
  }
};
