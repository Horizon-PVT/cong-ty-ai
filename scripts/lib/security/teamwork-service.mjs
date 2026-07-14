/**
 * Team Invite, Membership & Deployment Auth Simulator — Shared library for Milestone 6.1A
 *
 * Implements:
 * - Deployment Authentication modes: local_trusted, authenticated_private, authenticated_public
 * - Membership invite flows and company roster tracking with strict isolation
 * - Role-Based Access Control (RBAC): Owner, Board, Operator, Viewer
 * - Session registration and expiration checking
 * - Command user attribution and PII/Secret sanitization
 */

import path from "node:path";

export class TeamworkService {
  constructor(policy) {
    this.policy = policy;
    this.deploymentMode = policy.teamwork?.allowed_deployment_modes[0] || "local_trusted";
    this._sessions = new Map(); // token -> { companyId, userId, role, createdAt }
    this._invites = new Map(); // token -> { companyId, email, role, used }
    this._members = new Map(); // companyId -> Map(userId -> { email, role })
    this._auditTrail = [];

    // Initialize default Owner for test companies
    this._initCompanyOwner("comp_1", "user_owner", "owner@example.com");
    this._initCompanyOwner("comp_2", "user_owner2", "owner2@example.com");
  }

  _initCompanyOwner(companyId, userId, email) {
    if (!this._members.has(companyId)) {
      this._members.set(companyId, new Map());
    }
    this._members.get(companyId).set(userId, { email, role: "Owner" });
  }

  // ── Input Sanitization ───────────────────────────────────────────────

  sanitizeInput(str) {
    if (typeof str !== "string") return str;
    let clean = str;
    clean = clean.replace(/sk-[a-zA-Z0-9_-]{32,}/g, "[REDACTED_API_KEY]");
    clean = clean.replace(/pat-[a-zA-Z0-9-]{10,}/g, "[REDACTED_PAT]");
    clean = clean.replace(/re_[a-zA-Z0-9]{20,}/g, "[REDACTED_REF]");
    clean = clean.replace(/invite_[a-zA-Z0-9_-]+/g, "[REDACTED_INVITE_TOKEN]");
    clean = clean.replace(/session_[a-zA-Z0-9_-]+/g, "[REDACTED_SESSION_TOKEN]");
    // Scrub email with exact domain matching to protect whitelisted domains
    clean = clean.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, username, domain) => {
      const whitelisted = ["example.com", "example.org", "test.com", "paperclip.dev"];
      if (whitelisted.includes(domain.toLowerCase())) {
        return match;
      }
      return "[REDACTED_EMAIL]";
    });
    return clean;
  }

  // ── Deployment Mode Gates ───────────────────────────────────────────

  setDeploymentMode(mode) {
    if (this.policy.teamwork.allowed_deployment_modes.includes(mode)) {
      this.deploymentMode = mode;
      return { status: 200, mode };
    }
    return { status: 400, error: `Unsupported deployment mode "${mode}"` };
  }

  authenticateRequest(token) {
    if (this.deploymentMode === "local_trusted") {
      return { status: 200, user: { userId: "local_user", role: "Owner", companyId: "comp_1" } };
    }

    if (!token) {
      if (this.deploymentMode === "authenticated_public") {
        // Public deployment allows unauthenticated Viewers by default
        return { status: 200, user: { userId: "anonymous_guest", role: "Viewer", companyId: "comp_1" } };
      }
      return { status: 401, error: "Authentication required: Missing session token" };
    }

    const session = this._sessions.get(token);
    if (!session) {
      return { status: 401, error: "Authentication failed: Invalid session token" };
    }

    // Expiration check
    const elapsed = Date.now() - session.createdAt;
    if (elapsed > this.policy.teamwork.session_expiration_ms) {
      this._sessions.delete(token);
      return { status: 401, error: "Authentication failed: Session expired" };
    }

    return { status: 200, user: { userId: session.userId, role: session.role, companyId: session.companyId } };
  }

  // ── Invite & Membership Flows ───────────────────────────────────────

  inviteUser(actor, email, role) {
    const companyId = actor.companyId;

    // RBAC: Only Owner can invite
    if (actor.role !== "Owner") {
      return { status: 403, error: "Access denied: Only Owner can invite users" };
    }

    if (!this.policy.teamwork.supported_roles.includes(role)) {
      return { status: 400, error: `Unsupported user role "${role}"` };
    }

    const cleanEmail = this.sanitizeInput(email);
    const inviteToken = `invite_${Math.random().toString(36).substring(2, 10)}`;

    this._invites.set(inviteToken, {
      companyId,
      email: cleanEmail,
      role,
      used: false
    });

    this._recordAudit({
      action: "invite_sent",
      actor: actor.userId,
      companyId,
      email: cleanEmail,
      role,
      inviteToken
    });

    return { status: 200, inviteToken };
  }

  acceptInvite(inviteToken, companyId, userId, email) {
    const invite = this._invites.get(inviteToken);
    if (!invite || invite.companyId !== companyId || invite.used) {
      return { status: 400, error: "Invalid, expired, or mismatching invite token" };
    }

    invite.used = true;

    if (!this._members.has(companyId)) {
      this._members.set(companyId, new Map());
    }

    const roster = this._members.get(companyId);
    roster.set(userId, {
      email: this.sanitizeInput(email),
      role: invite.role
    });

    this._recordAudit({
      action: "invite_accepted",
      userId,
      companyId,
      role: invite.role
    });

    return { status: 200, message: "Invite accepted successfully, membership activated" };
  }

  getMembers(actor) {
    const companyId = actor.companyId;

    // Tenant check: Enforce company isolation
    if (!this._members.has(companyId)) {
      return { status: 200, members: [] };
    }

    const roster = this._members.get(companyId);
    const list = Array.from(roster.entries()).map(([userId, info]) => ({
      userId,
      email: info.email,
      role: info.role
    }));

    return { status: 200, members: list };
  }

  // ── Role-Based Access Control (RBAC) ────────────────────────────────

  authorizeAction(actor, action) {
    const role = actor.role;

    if (action === "change_budget" || action === "change_roles") {
      if (role === "Owner") return { status: 200, allowed: true };
    } else if (action === "approve_issue") {
      if (role === "Owner" || role === "Board") return { status: 200, allowed: true };
    } else if (action === "run_command") {
      if (role === "Owner" || role === "Board" || role === "Operator") return { status: 200, allowed: true };
    } else if (action === "read_memory") {
      return { status: 200, allowed: true };
    }

    return { status: 403, error: `Access denied: Role "${role}" is not authorized for action "${action}"` };
  }

  // ── Sessions management ──────────────────────────────────────────────

  createSession(companyId, userId, role) {
    const token = `session_${Math.random().toString(36).substring(2, 12)}`;
    this._sessions.set(token, {
      companyId,
      userId,
      role,
      createdAt: Date.now()
    });
    return token;
  }

  _recordAudit(event) {
    const sanitizedEvent = {};
    for (const [k, v] of Object.entries(event)) {
      sanitizedEvent[k] = typeof v === "string" ? this.sanitizeInput(v) : v;
    }
    this._auditTrail.push({
      ...sanitizedEvent,
      timestamp: new Date().toISOString(),
    });
  }

  resetAll() {
    this._sessions.clear();
    this._invites.clear();
    this._members.clear();
    this._auditTrail = [];
    this._initCompanyOwner("comp_1", "user_owner", "owner@example.com");
    this._initCompanyOwner("comp_2", "user_owner2", "owner2@example.com");
  }
}
