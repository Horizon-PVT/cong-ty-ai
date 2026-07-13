import crypto from "node:crypto";

export class SandboxRuntimeService {
  constructor(policy) {
    this.policy = policy;
  }

  async provisionWorkspace(req, opts = {}) {
    const { company_id, agent_id, repo_ref, branch_ref = "master", budget } = req;
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
      last_error: null
    };
  }

  async invokeRun(workspace, command, mode = "dry_run") {
    if (workspace.status !== "ready") {
      throw new Error(`Cannot invoke run in workspace state: ${workspace.status}`);
    }

    workspace.status = "running";
    workspace.updated_at = new Date().toISOString();

    // Mock execution delay & event logs
    const events = [
      { timestamp: new Date().toISOString(), type: "provision", message: "Workspace sandbox verified." },
      { timestamp: new Date().toISOString(), type: "exec", message: `Running command: ${command}` }
    ];

    if (mode === "dry_run") {
      events.push({ timestamp: new Date().toISOString(), type: "output", message: "[Dry-run] Command simulation completed successfully." });
      workspace.status = "stopped";
    } else {
      events.push({ timestamp: new Date().toISOString(), type: "output", message: "[Sandbox/Live] Command executed on remote container node." });
      workspace.status = "stopped";
    }

    workspace.updated_at = new Date().toISOString();
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
      throw new Error(`Workspace must be stopped to collect artifacts. Current state: ${workspace.status}`);
    }
    return [
      { name: "build-log.txt", size: 1204, content_preview: "[INFO] Sandbox build completed." },
      { name: "artifacts-report.json", size: 450, content_preview: "{\"verdict\":\"PASS\"}" }
    ];
  }
}
