/**
 * Eligibility checks for Milestone 1.1C.
 * Enforces suppression checks, consent presence, and validates candidate fields.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Load suppression list from prior milestones (1.0Y, 1.0Z).
 */
export function loadSuppressedRecipients(rootPath) {
  const suppressed = new Set();

  // Try loading from 1.0Y suppression update plan
  const ySuppressionPath = path.join(rootPath, "artifacts", "ai-company", "mission-1.0y", "generated", "suppression-update-plan.json");
  if (fs.existsSync(ySuppressionPath)) {
    try {
      const plan = JSON.parse(fs.readFileSync(ySuppressionPath, "utf8"));
      for (const entry of plan.suppressions || []) {
        if (entry.recipient_id) suppressed.add(entry.recipient_id);
      }
    } catch (e) { /* ignore */ }
  }

  // Try loading from 1.0Z suppression registry delta
  const zSuppressionPath = path.join(rootPath, "artifacts", "ai-company", "mission-1.0z", "generated", "suppression-registry-delta.json");
  if (fs.existsSync(zSuppressionPath)) {
    try {
      const delta = JSON.parse(fs.readFileSync(zSuppressionPath, "utf8"));
      for (const entry of delta.new_suppressions || []) {
        if (entry.recipient_id) suppressed.add(entry.recipient_id);
      }
    } catch (e) { /* ignore */ }
  }

  return Array.from(suppressed);
}

/**
 * Checks if a candidate is eligible for conversation loop automation / scheduling.
 * Returns { eligible: boolean, reason?: string }
 */
export function evaluateEligibility(candidate, suppressedList = []) {
  if (!candidate.recipient_id) {
    return { eligible: false, reason: "MISSING_RECIPIENT_ID" };
  }

  if (suppressedList.includes(candidate.recipient_id) || candidate.outcome === "opt-out" || candidate.outcome === "bounce") {
    return { eligible: false, reason: "SUPPRESSED_RECIPIENT" };
  }

  // Consent check
  if (!candidate.consent_source) {
    return { eligible: false, reason: "MISSING_CONSENT_SOURCE" };
  }

  // Outcome check - only positive or qualified interest are eligible
  const allowedOutcomes = ["positive_reply", "qualified_interest"];
  if (!allowedOutcomes.includes(candidate.outcome)) {
    return { eligible: false, reason: "INELIGIBLE_OUTCOME" };
  }

  return { eligible: true };
}
