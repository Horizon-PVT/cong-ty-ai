/**
 * CLI Run & Doctor Repair Simulator — Shared library for Milestone 2.1B
 *
 * Simulates:
 * - Onboarding CLI run redirection
 * - Doctor checks execution & Port / DB repair
 * - Tailscale detection
 * - CEO invite link bootstrapping
 * - Secrets & PII scrubbing
 */

export class CliRunService {
  constructor(policy) {
    this.policy = policy;
    this._logs = [];
    this._warnings = [];
  }

  // ── Input Sanitization & Secrets Redaction ───────────────────────────

  sanitizeInput(str) {
    if (typeof str !== "string") return str;
    let clean = str;
    clean = clean.replace(/sk-[a-zA-Z0-9_-]{32,}/g, "[REDACTED_API_KEY]");
    clean = clean.replace(/pat-[a-zA-Z0-9-]{10,}/g, "[REDACTED_PAT]");
    clean = clean.replace(/re_[a-zA-Z0-9]{20,}/g, "[REDACTED_REF]");
    clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
    return clean;
  }

  // ── CLI Run Redirect ──────────────────────────────────────────────────

  checkConfigExists(configPath) {
    if (!configPath || configPath.includes("missing")) {
      return { exists: false, action: "redirect_to_onboarding" };
    }
    return { exists: true, action: "start_doctor_checks" };
  }

  // ── Doctor Checks & Auto-Repair ────────────────────────────────────────

  /**
   * Run doctor checks and perform auto-repair if enabled.
   * @param {object} env — port, databaseUrl, databaseMode, tailscaleActive
   */
  runDoctorChecksAndRepair(env) {
    const policyConfig = this.policy.cli_run;
    const checks = {
      port_availability: "PASS",
      db_connectivity: "PASS",
      credential_keys: "PASS",
      tailscale_status: "PASS",
    };

    let selectedPort = env.port || 3100;
    let selectedDbMode = env.databaseMode || "postgres";
    const warnings = [];
    const errors = [];

    // 1. Port Availability Check
    if (env.portConflict) {
      if (policyConfig.auto_repair_enabled) {
        let repaired = false;
        const maxRetries = policyConfig.max_port_retries || 10;
        for (let i = 1; i <= maxRetries; i++) {
          const candidatePort = (env.port || 3100) + i;
          if (!env.busyPorts?.includes(candidatePort)) {
            selectedPort = candidatePort;
            repaired = true;
            warnings.push(`Port conflict detected on port ${env.port}; auto-repaired to ${selectedPort}`);
            break;
          }
        }
        if (!repaired) {
          checks.port_availability = "FAIL";
          errors.push(`Port conflict on port ${env.port} and all ${maxRetries} retry attempts failed`);
        }
      } else {
        checks.port_availability = "FAIL";
        errors.push(`Port conflict on port ${env.port}; auto-repair disabled`);
      }
    }

    // 2. DB Connectivity Check
    if (env.dbConnectionError) {
      if (policyConfig.auto_repair_enabled) {
        selectedDbMode = "embedded-postgres";
        warnings.push("Database connection failed; auto-repaired by falling back to embedded-postgres mode");
      } else {
        checks.db_connectivity = "FAIL";
        errors.push("Database connection failed; auto-repair disabled");
      }
    }

    // 3. Tailscale Status Check
    let resolvedHost = env.host || "127.0.0.1";
    if (env.tailscaleActive) {
      resolvedHost = "100.115.92.5"; // Mapped tailscale IP
    }

    this._warnings.push(...warnings);

    return {
      status: errors.length > 0 ? "FAILED" : "PASSED",
      checks,
      resolvedPort: selectedPort,
      resolvedDbMode: selectedDbMode,
      resolvedHost,
      warnings,
      errors,
    };
  }

  // ── Bootstrap Invite Link ─────────────────────────────────────────────

  generateBootstrapCeoInvite(host, port, email) {
    // Construct bootstrap link securely
    const token = "boot_" + Math.random().toString(36).substring(2, 10);
    const url = `http://${host}:${port}/invite/ceo?email=${encodeURIComponent(email)}&token=${token}`;
    return {
      token,
      url,
    };
  }

  getWarnings() {
    return [...this._warnings];
  }

  resetAll() {
    this._logs = [];
    this._warnings = [];
  }
}
