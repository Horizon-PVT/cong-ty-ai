/**
 * Memory Hooks & Organizational Learning Simulator — Shared library for Milestone 5.1B
 *
 * Reuses MemoryService for traversal protection, tenant isolation, PII scrubbing, and core read/write operations.
 * Implements:
 * - pre-run hydrate context injection
 * - post-run fact extraction and playbook generation
 * - proposal-based configuration/skill adjustments (no automatic edits)
 * - audit trail provenance validation
 */

import { MemoryService } from "./memory-service.mjs";

export class LearningService {
  constructor(policy) {
    this.policy = policy;
    this.memoryService = new MemoryService(policy);
    this._blockerCounts = new Map(); // companyId:agentId -> blockerReason[]
  }

  // ── Memory Hooks ─────────────────────────────────────────────────────

  preRunHydrate(actor, agentId, runContext, provenance = {}) {
    const provCheck = this.memoryService.validateProvenance(actor.companyId, provenance);
    if (!provCheck.valid) {
      return { status: 400, error: provCheck.error };
    }

    // Lookup memory binding using MemoryService
    const lookupRes = this.memoryService.lookupMemoryBinding(actor, agentId, provenance);
    if (lookupRes.status === 200) {
      runContext.agentMemory = lookupRes.content;
      return { status: 200, hydrated: true, content: lookupRes.content };
    }

    return { status: lookupRes.status, error: lookupRes.error || "No memory to hydrate" };
  }

  postRunCapture(actor, agentId, runOutput, provenance = {}) {
    const provCheck = this.memoryService.validateProvenance(actor.companyId, provenance);
    if (!provCheck.valid) {
      return { status: 400, error: provCheck.error };
    }

    const companyId = actor.companyId;

    // 1. Extract new facts from run outputs and save to tenant memory
    if (runOutput.extractedFacts && runOutput.extractedFacts.length > 0) {
      const fileName = `${companyId}/facts.json`;
      const currentFactsRes = this.memoryService.readMemory(actor, fileName, "json", provenance);
      let factsList = [];
      if (currentFactsRes.status === 200 && currentFactsRes.content) {
        try { factsList = JSON.parse(currentFactsRes.content); } catch { factsList = []; }
      }
      factsList.push(...runOutput.extractedFacts);
      const writeRes = this.memoryService.writeMemory(actor, fileName, JSON.stringify(factsList), "json", provenance);
      if (writeRes.status !== 200) return writeRes;
    }

    // 2. Playbook generation for successful runs (quality >= 0.8)
    const threshold = this.policy.hooks.playbook_min_quality_score || 0.8;
    if (runOutput.status === "success" && runOutput.quality >= threshold) {
      const playbookName = `${companyId}/playbooks/playbook_${agentId || "default"}.md`;
      const playbookContent = `# Playbook for ${agentId || "default"}\nQuality: ${runOutput.quality}\nSteps:\n${runOutput.steps || "Default steps"}`;
      const writeRes = this.memoryService.writeMemory(actor, playbookName, playbookContent, "markdown", provenance);
      if (writeRes.status !== 200) return writeRes;
    }

    // 3. Repeated blockers check to propose agent configuration updates
    if (runOutput.status === "failed" && runOutput.blocker) {
      const key = `${companyId}:${agentId || "default"}`;
      if (!this._blockerCounts.has(key)) {
        this._blockerCounts.set(key, []);
      }
      const blockers = this._blockerCounts.get(key);
      blockers.push(runOutput.blocker);

      if (blockers.length >= 2) {
        // Repeated blockers! Propose agent configuration update
        const proposalFileName = `${companyId}/proposed-updates.json`;
        const proposalContent = {
          proposed_at: new Date().toISOString(),
          agent_id: agentId || "default",
          reason: `Repeated blocker encountered: ${runOutput.blocker}`,
          proposed_config_changes: {
            max_retries: 5,
            fallback_provider: "alternative_model_pool"
          }
        };
        const writeRes = this.memoryService.writeMemory(actor, proposalFileName, JSON.stringify(proposalContent), "json", provenance);
        if (writeRes.status !== 200) return writeRes;
      }
    }

    return { status: 200, message: "Post-run capture executed successfully" };
  }

  manualCapture(actor, filename, fact, provenance = {}) {
    const provCheck = this.memoryService.validateProvenance(actor.companyId, provenance);
    if (!provCheck.valid) {
      return { status: 400, error: provCheck.error };
    }

    // Delegate to MemoryService writeMemory
    return this.memoryService.writeMemory(actor, filename, fact, "markdown", provenance);
  }

  proposeSkillUpdate(actor, agentId, skillName, newTemplate, provenance = {}) {
    const provCheck = this.memoryService.validateProvenance(actor.companyId, provenance);
    if (!provCheck.valid) {
      return { status: 400, error: provCheck.error };
    }

    const companyId = actor.companyId;
    const proposalFile = `${companyId}/proposed_skills.json`;
    const proposalContent = {
      proposed_at: new Date().toISOString(),
      agent_id: agentId || "default",
      skill_name: skillName,
      template_update: newTemplate
    };

    return this.memoryService.writeMemory(actor, proposalFile, JSON.stringify(proposalContent), "json", provenance);
  }

  resetAll() {
    this.memoryService.resetAll();
    this._blockerCounts.clear();
  }
}
