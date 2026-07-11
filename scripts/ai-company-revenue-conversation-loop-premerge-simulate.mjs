#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
console.log("[Premerge Simulate] Starting 1.1A pre-merge simulation...");
execSync("node packages/db/src/_verify-1.1a.mjs", { cwd: ROOT, stdio: "inherit" });

// No runtime reports tracked in git
console.log("[Premerge Simulate] Checking Git tracking status...");
const tracked = execSync("git ls-files artifacts/ai-company/mission-1.1a/generated/", { cwd: ROOT }).toString().trim().split("\n").filter(Boolean);
const runtimeReports = ["crm-sync-gate-ledger.json", "revenue-loop-scorecard.json"];
const leaked = tracked.filter((f) => runtimeReports.some((r) => f.endsWith(r)));
if (leaked.length > 0) { console.error(`[HARD FAIL] Runtime reports tracked in Git: ${leaked.join(", ")}`); process.exit(1); }
console.log("[Premerge Simulate] ✅ No runtime reports are tracked in Git");

// No CRM provider secrets in runner
console.log("[Premerge Simulate] Checking runner for CRM secrets...");
const src = fs.readFileSync(path.join(ROOT, "scripts", "ai-company-run-revenue-conversation-loop-mission.mjs"), "utf8");
const FORBIDDEN = [/re_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /HUBSPOT_API_KEY\s*=\s*\S+/, /SALESFORCE_TOKEN\s*=\s*\S+/, /PIPEDRIVE_API_KEY\s*=\s*\S+/];
if (FORBIDDEN.some((p) => p.test(src))) { console.error("[HARD FAIL] Runner contains CRM provider secret"); process.exit(1); }
console.log("[Premerge Simulate] ✅ Runner does not contain CRM provider secrets");

console.log("[Premerge Simulate] Final Verdict: REVENUE_CONVERSATION_LOOP_PREMERGE_PASS");
