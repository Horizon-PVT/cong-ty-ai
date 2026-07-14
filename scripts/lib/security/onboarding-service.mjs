/**
 * Guided Onboarding & Starter Org Generation Simulator — Shared library for Milestone 2.1A
 *
 * Simulates:
 * - Onboarding interview process
 * - Whitelist input validation
 * - Environment Doctor checking credentials securely (safe regex format checks, no key value leak)
 * - Input sanitization & PII/Secrets scrubbing
 * - Generating Starter Company structures (Goals, Agents, Tasks)
 * - Task queuing
 */

export class OnboardingService {
  constructor(policy) {
    this.policy = policy;
    this._companies = new Map();
    this._agents = new Map();
    this._tasks = new Map();
    this._queue = [];
    this._auditTrail = [];
  }

  // ── Onboarding Interview & Whitelist Validation ──────────────────────

  validateInputs(inputs) {
    const { orgType, autonomyMode, ownerName, companyName } = inputs;

    // 1. Whitelist Org Type
    const supportedOrgs = this.policy.onboarding.supported_org_types;
    if (!supportedOrgs.includes(orgType)) {
      return { valid: false, error: `Invalid org type "${orgType}". Supported: ${supportedOrgs.join(", ")}` };
    }

    // 2. Whitelist Autonomy Mode
    const supportedAutonomy = this.policy.onboarding.supported_autonomy_modes;
    if (!supportedAutonomy.includes(autonomyMode)) {
      return { valid: false, error: `Invalid autonomy mode "${autonomyMode}". Supported: ${supportedAutonomy.join(", ")}` };
    }

    if (!ownerName || !ownerName.trim()) {
      return { valid: false, error: "Owner name is required" };
    }

    return { valid: true };
  }

  // ── Input Sanitization & Secrets Redaction ───────────────────────────

  sanitizeInput(str) {
    if (typeof str !== "string") return str;
    // Strip common secret patterns
    let clean = str;
    // OpenAI/Anthropic/Stripe key shapes
    clean = clean.replace(/sk-[a-zA-Z0-9_-]{32,}/g, "[REDACTED_API_KEY]");
    clean = clean.replace(/pat-[a-zA-Z0-9-]{10,}/g, "[REDACTED_PAT]");
    clean = clean.replace(/re_[a-zA-Z0-9]{20,}/g, "[REDACTED_REF]");
    // Simple email scrub
    clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
    return clean;
  }

  // ── Environment Doctor ────────────────────────────────────────────────

  runDoctorCheck(envMock = {}) {
    const results = {};
    const recommendedRuntime = { primary: "Codex", fallback: "Codex" };

    // Check credential presence & shape using safe regex without logging raw values
    const anthropicKey = envMock.ANTHROPIC_API_KEY || "";
    const openaiKey = envMock.OPENAI_API_KEY || "";

    const hasAnthropic = anthropicKey.startsWith("sk-") && anthropicKey.length >= 32;
    const hasOpenai = openaiKey.startsWith("sk-") && openaiKey.length >= 32;

    results.ANTHROPIC_API_KEY = hasAnthropic ? "PRESENT_VALID_FORMAT" : "MISSING_OR_INVALID";
    results.OPENAI_API_KEY = hasOpenai ? "PRESENT_VALID_FORMAT" : "MISSING_OR_INVALID";

    if (hasAnthropic) {
      recommendedRuntime.primary = "Claude";
      recommendedRuntime.fallback = "Codex";
    } else if (hasOpenai) {
      recommendedRuntime.primary = "GPT-4";
      recommendedRuntime.fallback = "Codex";
    } else {
      recommendedRuntime.primary = "Codex";
      recommendedRuntime.fallback = "Codex";
    }

    return {
      credentialsCheck: results,
      recommendedRuntime,
    };
  }

  // ── Org Generation & Task Queuing ────────────────────────────────────

  generateStarterOrg(inputs, doctorResults) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      throw new Error(`Onboarding validation failed: ${validation.error}`);
    }

    const orgType = inputs.orgType;
    const template = this.policy.onboarding.default_templates[orgType] || {
      company_name: "AI Default Org",
      roles: ["CEO"],
      initial_task: "Initialize organization",
    };

    const companyId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sanitizedCompanyName = this.sanitizeInput(inputs.companyName || template.company_name);
    const sanitizedOwnerName = this.sanitizeInput(inputs.ownerName);

    // 1. Create Company
    const company = {
      id: companyId,
      name: sanitizedCompanyName,
      owner: sanitizedOwnerName,
      orgType,
      autonomyMode: inputs.autonomyMode,
      runtime: doctorResults.recommendedRuntime.primary,
    };
    this._companies.set(companyId, company);

    // 2. Create Goal
    const goal = {
      id: `goal_${Date.now()}`,
      companyId,
      description: `Establish successful ${orgType} operations`,
    };

    // 3. Create Agents
    const agents = [];
    const roles = template.roles || [];
    for (const role of roles) {
      const agent = {
        id: `agent_${role.toLowerCase()}_${Math.random().toString(36).slice(2, 6)}`,
        companyId,
        role,
        status: "idle",
      };
      this._agents.set(agent.id, agent);
      agents.push(agent);
    }

    // 4. Create initial task & queue it
    const taskId = `task_${Date.now()}`;
    const task = {
      id: taskId,
      companyId,
      title: template.initial_task,
      status: "open",
      assigneeAgentId: agents[0]?.id || null,
    };
    this._tasks.set(taskId, task);

    // Queue task
    this._queue.push({
      taskId,
      companyId,
      enqueuedAt: new Date().toISOString(),
    });

    this._recordAudit({
      action: "onboarding_completed",
      companyId,
      actor: sanitizedOwnerName,
      orgType,
    });

    return {
      company,
      goal,
      agents,
      task,
      queueLength: this._queue.length,
    };
  }

  _recordAudit(event) {
    this._auditTrail.push({
      ...event,
      timestamp: new Date().toISOString(),
      id: `audit_${Date.now()}`,
    });
  }

  resetAll() {
    this._companies.clear();
    this._agents.clear();
    this._tasks.clear();
    this._queue = [];
    this._auditTrail = [];
  }
}
