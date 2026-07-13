import crypto from "node:crypto";

export class SandboxRuntimeService {
  constructor(policy) {
    this.policy = policy;
  }

  async resolveSecrets(companyId, secretRefs) {
    const resolved = {};
    const manifest = [];

    for (const ref of secretRefs) {
      // Enforce cross-company access block
      if (this.policy.prevent_cross_company_secret_refs && ref.owning_company_id !== companyId) {
        throw new Error(`Security Violation: Agent of company ${companyId} attempted to access secret of company ${ref.owning_company_id}`);
      }

      resolved[ref.env_key] = ref.plaintext_value;
      manifest.push({
        env_key: ref.env_key,
        secret_id: ref.secret_id,
        version: ref.version || "latest",
        injected: true,
        redacted: true
      });
    }

    return { resolved, manifest };
  }

  redactOutput(text, resolvedSecrets) {
    if (!this.policy.enable_redaction_scanner || !text) return text;
    let redacted = text;
    for (const key of Object.keys(resolvedSecrets)) {
      const val = resolvedSecrets[key];
      if (val && val.length > 2) {
        // Redact exact match of the secret material
        const escaped = val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const re = new RegExp(escaped, "g");
        redacted = redacted.replace(re, "[REDACTED]");
      }
    }
    return redacted;
  }

  async provisionWorkspace(req, opts = {}) {
    const { company_id, agent_id, repo_ref, branch_ref = "master", budget, secret_refs = [] } = req;
    const { mode = "dry_run", token } = opts;

    if (this.policy.enforce_sandbox_company_isolation && !company_id) {
      throw new Error("Sandbox Isolation Violation: company_id is required.");
    }

    if (this.policy.enforce_sandbox_budget_limits && (budget === undefined || budget <= 0)) {
      throw new Error("Sandbox Isolation Violation: budget limit must be greater than 0.");
    }

    // Token Gate for live/sandbox modes
    const isApproved = token && token.startsWith(this.policy.required_live_token_prefix);
    if ((mode === "sandbox" || mode === "live") && !isApproved) {
      return {
        workspace_id: `ws_gated_${company_id || "unknown"}`,
        status: "failed",
        last_error: `Gated: Valid token with prefix ${this.policy.required_live_token_prefix} is required.`,
        created_at: new Date().toISOString()
      };
    }

    // Resolve secrets (with cross-company check)
    let secretEnv = {};
    let secretManifest = [];
    try {
      const res = await this.resolveSecrets(company_id, secret_refs);
      secretEnv = res.resolved;
      secretManifest = res.manifest;
    } catch (e) {
      return {
        workspace_id: `ws_failed_${company_id || "unknown"}`,
        company_id,
        agent_id,
        repo_ref,
        branch_ref,
        provider: "dry_run_provider",
        status: "failed",
        allocated_budget: budget,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: e.message
      };
    }

    // Check E2B API Key presence in sandbox/live modes
    let provider = "dry_run_provider";
    let external_workspace_id = "";
    const mockId = crypto.randomUUID().slice(0, 8);
    const workspace_id = `ws_${company_id || "default"}_${mockId}`;

    if (mode === "sandbox" || mode === "live") {
      const apiKey = process.env.E2B_API_KEY;
      if (!apiKey || apiKey.trim() === "") {
        return {
          workspace_id,
          company_id,
          agent_id,
          repo_ref,
          branch_ref,
          provider: "e2b_sandbox_api",
          status: "failed",
          allocated_budget: budget,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: "E2B Integration Error: E2B_API_KEY environment variable is missing or empty."
        };
      }
      provider = "e2b_sandbox_api";
      external_workspace_id = `ext_e2b_${mockId}`;
    } else {
      provider = "dry_run_provider";
      external_workspace_id = `ext_dryrun_${mockId}`;
    }

    return {
      workspace_id,
      company_id,
      agent_id,
      repo_ref,
      branch_ref,
      provider,
      status: "ready",
      external_workspace_id,
      allocated_budget: budget,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
      secret_env: secretEnv, // Ephemeral memory only
      secret_manifest: secretManifest // Persistable redacted manifest
    };
  }

  async invokeRun(workspace, command, mode = "dry_run") {
    if (workspace.status !== "ready") {
      throw new Error(`Cannot invoke run in workspace state: ${workspace.status}`);
    }

    workspace.status = "running";
    workspace.updated_at = new Date().toISOString();

    const secretEnv = workspace.secret_env || {};

    // Mock execution logs
    let rawOutput = `[Command Executed] ${command}`;
    if (command.includes("echo")) {
      // Simulate command echo leak
      const key = command.split(" ").pop().replace("$", "");
      if (secretEnv[key]) {
        rawOutput += `\nOutput material value is: ${secretEnv[key]}`;
      } else {
        rawOutput += `\nOutput material value is empty.`;
      }
    }

    // Auto redact scanner check
    const redactedOutput = this.redactOutput(rawOutput, secretEnv);

    const events = [
      { timestamp: new Date().toISOString(), type: "provision", message: "Workspace sandbox verified." },
      { timestamp: new Date().toISOString(), type: "exec", message: `Running command: ${command}` },
      { timestamp: new Date().toISOString(), type: "output", message: redactedOutput }
    ];

    workspace.status = "stopped";
    workspace.updated_at = new Date().toISOString();

    // Ephemeral cleanup immediately after execution
    delete workspace.secret_env;

    return {
      success: true,
      events,
      terminal_state: workspace.status
    };
  }

  async stopWorkspace(workspace) {
    workspace.status = "stopping";
    workspace.updated_at = new Date().toISOString();
    workspace.status = "stopped";
    workspace.updated_at = new Date().toISOString();
    return workspace;
  }

  async collectArtifacts(workspace) {
    if (workspace.status !== "stopped") {
      throw new Error("Workspace must be stopped to collect artifacts.");
    }
    return [
      { name: "build-log.txt", size: 1204, content_preview: "[INFO] Sandbox build completed." },
      { name: "artifacts-report.json", size: 450, content_preview: "{\"verdict\":\"PASS\"}" }
    ];
  }
}

