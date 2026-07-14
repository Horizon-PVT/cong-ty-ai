/**
 * Work Product & Deliverables Simulator — Shared library for Milestone 3.1A
 *
 * Simulates:
 * - Deliverable metadata schema registration & versioning
 * - Whitelist format checking (case-insensitive extension checks)
 * - File size boundary validation
 * - Cross-tenant read/write isolation checks
 * - SSRF mitigation in URL preview parsing
 * - PR Link format validation
 * - Secrets & PII scrubbing in metadata
 */

import path from "node:path";

export class DeliverablesService {
  constructor(policy) {
    this.policy = policy;
    /** @type {Map<string, object>} id -> deliverable */
    this._deliverables = new Map();
    this._auditTrail = [];
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

  // ── Validation Helpers ───────────────────────────────────────────────

  validateFormat(filename) {
    if (typeof filename !== "string") return false;
    // Prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return false;
    }
    const ext = filename.split(".").pop().toLowerCase();
    return this.policy.deliverables.supported_formats.includes(ext);
  }

  validateSize(sizeBytes) {
    return sizeBytes <= this.policy.deliverables.max_size_bytes;
  }

  validatePRLink(url) {
    if (typeof url !== "string") return false;
    const prPattern = /^https?:\/\/(www\.)?(github|gitlab)\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/pull\/[0-9]+(\/|\?|#|$)/i;
    return prPattern.test(url);
  }

  // ── SSRF Validation for URLs ──────────────────────────────────────────

  isSafeUrl(urlStr) {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return false;
      }
      const host = parsed.hostname.toLowerCase();
      // Block localhost / loopback (including brackets for IPv6)
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]" || host === "0.0.0.0") {
        return false;
      }
      // Block private IP spaces (rough check)
      if (
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        host.startsWith("169.254.") ||
        (host.startsWith("172.") && host.split(".").length === 4 && Number(host.split(".")[1]) >= 16 && Number(host.split(".")[1]) <= 31)
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // ── Core API ──────────────────────────────────────────────────────────

  registerDeliverable(actor, payload) {
    if (!payload || typeof payload !== "object") {
      return { status: 400, error: "Invalid payload object" };
    }
    const { id, filename, sizeBytes, type, url, metadata = {} } = payload;
    const companyId = actor.companyId;

    // 1. Whitelist format check
    if (type !== "url" && type !== "pr" && !this.validateFormat(filename)) {
      return { status: 400, error: "Unsupported deliverable file format or directory traversal detected" };
    }

    // 2. Size boundary check
    if (type !== "url" && type !== "pr" && !this.validateSize(sizeBytes)) {
      return { status: 400, error: "Deliverable size exceeds policy limit" };
    }

    // 3. PR Link validation
    if (type === "pr" && !this.validatePRLink(url)) {
      return { status: 400, error: "Invalid PR Link format" };
    }

    // 4. SSRF Check for URLs
    if (type === "url") {
      if (!this.isSafeUrl(url)) {
        return { status: 400, error: "SSRF vulnerability detected: private ranges and invalid protocols are blocked" };
      }
    }

    // 5. Cross-tenant update check (hijack check)
    const existing = this._deliverables.get(id);
    if (existing) {
      if (existing.companyId !== companyId) {
        this._recordAudit({ action: "unauthorized_write_attempt", id, companyId, actor: actor.userId });
        return { status: 403, error: "403 Forbidden: Tenant mismatch on deliverable update" };
      }
    }

    // 6. Scrub metadata PII / secrets
    const cleanMeta = {};
    for (const [k, v] of Object.entries(metadata)) {
      cleanMeta[k] = this.sanitizeInput(v);
    }

    const version = existing ? existing.version + 1 : 1;
    const deliverable = {
      id,
      companyId,
      filename: filename ? this.sanitizeInput(filename) : null,
      sizeBytes,
      type,
      url: url ? this.sanitizeInput(url) : null,
      version,
      metadata: cleanMeta,
      registeredBy: actor.userId,
      registeredAt: new Date().toISOString(),
    };

    // Parse mock preview metadata for safe URLs
    if (type === "url") {
      deliverable.previewMeta = {
        title: `Preview for ${new URL(url).hostname}`,
        fetchedAt: new Date().toISOString(),
        status: "200 OK",
      };
    }

    this._deliverables.set(id, deliverable);
    this._recordAudit({ action: existing ? "deliverable_updated" : "deliverable_registered", id, companyId, actor: actor.userId });

    return {
      status: 200,
      deliverable,
    };
  }

  getDeliverable(actor, id) {
    const deliverable = this._deliverables.get(id);
    if (!deliverable) {
      return { status: 404, error: "Deliverable not found" };
    }

    // Tenant isolation read check
    if (deliverable.companyId !== actor.companyId) {
      this._recordAudit({ action: "unauthorized_read_attempt", id, companyId: actor.companyId, actor: actor.userId });
      return { status: 403, error: "Access denied: Tenant boundary violation" };
    }

    return {
      status: 200,
      deliverable,
    };
  }

  _recordAudit(event) {
    this._auditTrail.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  resetAll() {
    this._deliverables.clear();
    this._auditTrail = [];
  }
}
