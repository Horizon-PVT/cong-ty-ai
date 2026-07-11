/**
 * Loader utility for candidate data from prior milestones (1.0Y, 1.0Z, 1.1B).
 */
import fs from "node:fs";
import path from "node:path";

export function loadCandidates(rootPath) {
  const yLedgerPath = path.join(rootPath, "artifacts", "ai-company", "mission-1.0y", "generated", "outcome-classification-ledger.json");
  const zHandoffPath = path.join(rootPath, "artifacts", "ai-company", "mission-1.0z", "generated", "sales-handoff-package.json");
  const bLedgerPath = path.join(rootPath, "artifacts", "ai-company", "mission-1.1b", "generated", "crm-provider-sync-ledger.json");

  let outcomeLedger = { classifications: [] };
  let salesHandoff = { hot_leads: [] };
  let crmSyncLedger = { entries: [] };

  if (fs.existsSync(yLedgerPath)) {
    try { outcomeLedger = JSON.parse(fs.readFileSync(yLedgerPath, "utf8")); } catch (e) { /* ignore */ }
  }
  if (fs.existsSync(zHandoffPath)) {
    try { salesHandoff = JSON.parse(fs.readFileSync(zHandoffPath, "utf8")); } catch (e) { /* ignore */ }
  }
  if (fs.existsSync(bLedgerPath)) {
    try { crmSyncLedger = JSON.parse(fs.readFileSync(bLedgerPath, "utf8")); } catch (e) { /* ignore */ }
  }

  // Combine outcomes with handoff hot leads and CRM status
  const candidatesMap = new Map();

  // Populate from 1.0Y outcomes first
  for (const c of outcomeLedger.classifications || []) {
    candidatesMap.set(c.recipient_id, {
      recipient_id: c.recipient_id,
      recipient_redacted: c.recipient_redacted,
      outcome: c.outcome,
      notes: c.notes || "",
      source_milestone: "1.0Y",
      crm_synced: false,
      consent_source: c.outcome === "positive_reply" ? "explicit_demo_request" : null
    });
  }

  // Overlay / enrich from 1.0Z hot_leads
  for (const hl of salesHandoff.hot_leads || []) {
    const id = hl.recipient_id || hl.lead_id;
    if (!id) continue;
    if (candidatesMap.has(id)) {
      const existing = candidatesMap.get(id);
      candidatesMap.set(id, {
        ...existing,
        interest_classification: hl.interest_classification || "HOT",
        notes: hl.notes || existing.notes,
        source_milestone: "1.0Z"
      });
    } else {
      candidatesMap.set(id, {
        recipient_id: id,
        recipient_redacted: "[REDACTED]",
        outcome: "qualified_interest",
        interest_classification: hl.interest_classification || "HOT",
        notes: hl.notes || "",
        source_milestone: "1.0Z",
        crm_synced: false,
        consent_source: "explicit_demo_request"
      });
    }
  }

  // Overlay / enrich from 1.1B CRM Sync ledger
  for (const entry of crmSyncLedger.entries || []) {
    const id = entry.lead_id || entry.recipient_id;
    if (!id) continue;
    if (candidatesMap.has(id)) {
      const existing = candidatesMap.get(id);
      candidatesMap.set(id, {
        ...existing,
        crm_synced: entry.write_status === "WRITTEN_SANDBOX" || entry.write_status === "WRITTEN_LIVE",
        crm_status: entry.write_status,
        crm_object_id: entry.provider_object_id || null
      });
    }
  }

  return Array.from(candidatesMap.values());
}
