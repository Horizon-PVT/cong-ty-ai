/**
 * Auto Mode Semantics & Cloud Sandbox Runtime Simulator — Shared library for Milestone 4.1B
 *
 * Simulates:
 * - Auto Mode running loops (running, paused, waiting_input, waiting_approval, failed, cancelled)
 * - Interrupt/Resume board commands (pause, resume, restart, cancel)
 * - Sandbox driver with directory traversal and command injection protection
 * - Budget limit execution blocks
 * - Output/Log scrubbing of secrets and email PII
 */

import path from "node:path";

export class AutoRuntimeService {
  constructor(policy) {
    this.policy = policy;
    this.sandboxRoot = path.resolve(policy.sandbox?.root_dir || "./sandbox");
    this._status = "stopped"; // stopped, running, paused, waiting_input, waiting_approval, failed, cancelled
    this._executionStep = 0;
    this._budgetSpent = 0;
    this._budgetLimit = policy.safety?.budget_limit || 1000;
    this._auditTrail = [];
    this._files = new Map(); // path -> content
  }

  // ── Input Sanitization ───────────────────────────────────────────────

  sanitizeInput(str) {
    if (typeof str !== "string") return str;
    let clean = str;
    clean = clean.replace(/sk-[a-zA-Z0-9_-]{32,}/g, "[REDACTED_API_KEY]");
    clean = clean.replace(/pat-[a-zA-Z0-9-]{10,}/g, "[REDACTED_PAT]");
    clean = clean.replace(/re_[a-zA-Z0-9]{20,}/g, "[REDACTED_REF]");
    clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
    return clean;
  }

  // ── Auto Mode State Machine ──────────────────────────────────────────

  startAutoMode(actor) {
    if (this._budgetSpent >= this._budgetLimit) {
      this._status = "stopped";
      return { status: 400, error: "Cannot start auto mode: budget limit exhausted" };
    }

    this._status = "running";
    this._executionStep = 0;
    this._recordAudit({ action: "auto_mode_started", actor: actor.userId });
    return { status: 200, state: this._status };
  }

  progressStep(actor) {
    if (this._status !== "running") {
      return { status: 400, error: `Cannot progress: Agent is in state "${this._status}"` };
    }

    // Cost accumulation
    this._budgetSpent += 50; // Each step costs $50
    if (this._budgetSpent >= this._budgetLimit) {
      this._status = "stopped";
      this._recordAudit({ action: "budget_exhaustion_stopped" });
      return { status: 400, error: "Auto Mode stopped cleanly: budget limit exhausted" };
    }

    this._executionStep++;
    this._recordAudit({ action: "step_executed", step: this._executionStep });
    return { status: 200, state: this._status, step: this._executionStep };
  }

  setWaitingState(actor, state) {
    if (state !== "waiting_input" && state !== "waiting_approval") {
      return { status: 400, error: "Invalid waiting state" };
    }
    this._status = state;
    this._recordAudit({ action: "state_changed_to_waiting", state });
    return { status: 200, state: this._status };
  }

  // ── Operator Can Cantervent (Interrupt / Resume) ──────────────────────

  handleInterrupt(actor, command) {
    if (!this.policy.runtime.interrupt_commands.includes(command)) {
      return { status: 400, error: `Invalid interrupt command "${command}"` };
    }

    const oldStatus = this._status;

    if (command === "pause") {
      if (this._status !== "running") {
        return { status: 400, error: "Can only pause a running session" };
      }
      this._status = "paused";
    } else if (command === "resume") {
      if (this._status !== "paused" && this._status !== "waiting_input" && this._status !== "waiting_approval") {
        return { status: 400, error: "Session is not in a resumeable state" };
      }
      this._status = "running";
    } else if (command === "restart") {
      this._status = "running";
      this._executionStep = 0;
    } else if (command === "cancel") {
      this._status = "cancelled";
    }

    this._recordAudit({ action: "interrupt_received", command, oldStatus, newStatus: this._status, actor: actor.userId });
    return { status: 200, state: this._status };
  }

  // ── Cloud Sandbox Driver (Secure Actions) ───────────────────────────

  executeSandboxCapability(actor, capability, params = {}) {
    if (!this.policy.runtime.supported_capabilities.includes(capability)) {
      return { status: 400, error: `Capability "${capability}" is not allowed by policy` };
    }

    if (capability === "file_read") {
      const { filePath } = params;
      // 1. Directory Traversal Defense
      const resolvedPath = path.resolve(this.sandboxRoot, filePath);
      if (!resolvedPath.startsWith(this.sandboxRoot)) {
        return { status: 400, error: "Security Error: Sandbox directory traversal detected" };
      }

      const content = this._files.get(resolvedPath) || "Default safe data";
      return { status: 200, content: this.sanitizeInput(content) };
    }

    if (capability === "file_write") {
      const { filePath, content } = params;
      // 1. Directory Traversal Defense
      const resolvedPath = path.resolve(this.sandboxRoot, filePath);
      if (!resolvedPath.startsWith(this.sandboxRoot)) {
        return { status: 400, error: "Security Error: Sandbox directory traversal detected" };
      }

      this._files.set(resolvedPath, content);
      return { status: 200, message: "File written successfully" };
    }

    if (capability === "shell_exec") {
      const { command, args = [] } = params;
      // 2. Command Injection Defenses
      const dangerousConcat = /[;&|`$()]/;
      if (dangerousConcat.test(command) || args.some(arg => dangerousConcat.test(arg))) {
        return { status: 400, error: "Security Error: Shell command injection detected" };
      }

      if (!this.policy.sandbox.allowed_commands.includes(command)) {
        return { status: 400, error: `Security Error: Command "${command}" is not whitelisted` };
      }

      // Simulate execution output and scrub secrets/PII
      const rawOutput = `Output from executing "${command} ${args.join(" ")}" on sandbox host`;
      return {
        status: 200,
        stdout: this.sanitizeInput(rawOutput),
        stderr: "",
      };
    }

    return { status: 400, error: "Unknown capability" };
  }

  recordBudgetSpent(amount) {
    if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
      throw new Error("Invalid budget spent amount: must be a non-negative number");
    }
    this._budgetSpent += amount;
  }

  _recordAudit(event) {
    this._auditTrail.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  resetAll() {
    this._status = "stopped";
    this._executionStep = 0;
    this._budgetSpent = 0;
    this._auditTrail = [];
    this._files.clear();
  }
}
