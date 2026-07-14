/**
 * Company Memory Bindings & Local Markdown Provider Simulator — Shared library for Milestone 5.1A
 *
 * Simulates:
 * - Company-scoped memory bindings and per-agent overrides
 * - Markdown, text, and JSON memory reads/writes
 * - Secure relative-path traversal defense (preventing sibling directory bypass)
 * - Multi-tenant isolation checking
 * - Detailed provenance logging for operations
 * - PII/Secrets scrubbing with whitelisted domains allowed
 */

import path from "node:path";

export class MemoryService {
  constructor(policy) {
    this.policy = policy;
    this.memoryRoot = path.resolve(policy.memory?.default_root || "./memory/ai-company");
    this._memories = new Map(); // filepath -> content
    this._bindings = new Map(); // companyId:agentId -> filepath
    this._auditTrail = [];
  }

  // ── Input Sanitization ───────────────────────────────────────────────

  sanitizeInput(str) {
    if (typeof str !== "string") return str;
    let clean = str;
    clean = clean.replace(/sk-[a-zA-Z0-9_-]{32,}/g, "[REDACTED_API_KEY]");
    clean = clean.replace(/pat-[a-zA-Z0-9-]{10,}/g, "[REDACTED_PAT]");
    clean = clean.replace(/re_[a-zA-Z0-9]{20,}/g, "[REDACTED_REF]");
    // Scrub email with negative lookahead to protect whitelisted domains
    clean = clean.replace(/[a-zA-Z0-9._%+-]+@(?!example\.com|example\.org|test\.com|paperclip\.dev)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
    return clean;
  }

  // ── Path Verification & Traversal Protection ─────────────────────────

  verifyPath(filePath) {
    const resolvedPath = path.resolve(this.memoryRoot, filePath);
    const relative = path.relative(this.memoryRoot, resolvedPath);
    // Secure traversal validation
    const isSafe = !relative.startsWith("..") && !path.isAbsolute(relative) && relative !== "";
    return {
      isSafe,
      resolvedPath,
    };
  }

  // ── Bindings Management ──────────────────────────────────────────────

  bindMemory(actor, agentId, filename) {
    const key = `${actor.companyId}:${agentId || "default"}`;
    const { isSafe, resolvedPath } = this.verifyPath(filename);
    if (!isSafe) {
      return { status: 403, error: "Security Error: Directory traversal detected" };
    }
    this._bindings.set(key, resolvedPath);
    return { status: 200, bindingKey: key, filePath: resolvedPath };
  }

  // ── Memory Core API ──────────────────────────────────────────────────

  writeMemory(actor, filename, content, format, provenance = {}) {
    const companyId = actor.companyId;

    // 1. Whitelist format check
    if (!this.policy.memory.supported_formats.includes(format)) {
      return { status: 400, error: `Unsupported memory format "${format}"` };
    }

    // 2. Traversal defense
    const { isSafe, resolvedPath } = this.verifyPath(filename);
    if (!isSafe) {
      return { status: 403, error: "Security Error: Directory traversal detected" };
    }

    // 3. Multi-tenant company boundary check (via file path naming convention or directory layout)
    // We enforce that files belonging to comp_X must have path starting with comp_X or companyRoot/comp_X
    const relative = path.relative(this.memoryRoot, resolvedPath);
    if (!relative.startsWith(companyId)) {
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    // Scrub secrets & PII
    const cleanContent = this.sanitizeInput(content);

    // Write content
    this._memories.set(resolvedPath, cleanContent);

    // Save provenance audit
    this._recordAudit({
      action: "memory_written",
      filePath: resolvedPath,
      companyId,
      actor: actor.userId,
      format,
      provenance: {
        company_id: companyId,
        agent_id: provenance.agent_id || "default",
        project_id: provenance.project_id || "default",
        issue_id: provenance.issue_id || "default",
        run_id: provenance.run_id || "default",
      },
    });

    return { status: 200, resolvedPath, content: cleanContent };
  }

  readMemory(actor, filename, format, provenance = {}) {
    const companyId = actor.companyId;

    if (!this.policy.memory.supported_formats.includes(format)) {
      return { status: 400, error: `Unsupported memory format "${format}"` };
    }

    const { isSafe, resolvedPath } = this.verifyPath(filename);
    if (!isSafe) {
      return { status: 403, error: "Security Error: Directory traversal detected" };
    }

    // Multi-tenant check
    const relative = path.relative(this.memoryRoot, resolvedPath);
    if (!relative.startsWith(companyId)) {
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    const content = this._memories.get(resolvedPath) || "";

    this._recordAudit({
      action: "memory_read",
      filePath: resolvedPath,
      companyId,
      actor: actor.userId,
      format,
      provenance: {
        company_id: companyId,
        agent_id: provenance.agent_id || "default",
        project_id: provenance.project_id || "default",
        issue_id: provenance.issue_id || "default",
        run_id: provenance.run_id || "default",
      },
    });

    return { status: 200, content };
  }

  lookupMemoryBinding(actor, agentId, provenance = {}) {
    const companyId = actor.companyId;
    // Check agent specific binding, fall back to default company binding
    let filePath = this._bindings.get(`${companyId}:${agentId}`);
    if (!filePath) {
      filePath = this._bindings.get(`${companyId}:default`);
    }

    if (!filePath) {
      return { status: 404, error: "No memory binding found" };
    }

    // Tenant check
    const relative = path.relative(this.memoryRoot, filePath);
    if (!relative.startsWith(companyId)) {
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    const content = this._memories.get(filePath) || "";

    this._recordAudit({
      action: "memory_lookup",
      filePath,
      companyId,
      actor: actor.userId,
      provenance: {
        company_id: companyId,
        agent_id: agentId || "default",
        project_id: provenance.project_id || "default",
        issue_id: provenance.issue_id || "default",
        run_id: provenance.run_id || "default",
      },
    });

    return { status: 200, filePath, content };
  }

  _recordAudit(event) {
    this._auditTrail.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  resetAll() {
    this._memories.clear();
    this._bindings.clear();
    this._auditTrail = [];
  }
}
