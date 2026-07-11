#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
console.log("[Premerge Simulate 1.1B] Starting pre-merge simulation...");
execSync("node packages/db/src/_verify-1.1b.mjs", { cwd: ROOT, stdio: "inherit" });

// No runtime reports git-tracked
console.log("[Premerge Simulate] Checking Git tracking...");
const tracked = execSync("git ls-files artifacts/ai-company/mission-1.1b/generated/", { cwd: ROOT }).toString().trim().split("\n").filter(Boolean);
const runtime = ["crm-provider-sync-ledger.json", "crm-provider-scorecard.json"];
const leaked = tracked.filter((f) => runtime.some((r) => f.endsWith(r)));
if (leaked.length > 0) { console.error(`[HARD FAIL] Runtime reports git-tracked: ${leaked.join(", ")}`); process.exit(1); }
console.log("[Premerge Simulate] ✅ No runtime reports tracked in Git");

// No CRM secrets in any lib/crm script
console.log("[Premerge Simulate] Checking lib/crm for secrets...");
const CRM_SCRIPTS = ["provider-hubspot.mjs", "provider-salesforce.mjs", "sync-gate.mjs"];
const FORBIDDEN = [/pat-[A-Za-z0-9\-]{10,}/, /re_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /hapikey=[A-Za-z0-9]+/];
for (const s of CRM_SCRIPTS) {
  const src = fs.readFileSync(path.join(ROOT, "scripts", "lib", "crm", s), "utf8");
  const lines = src.split("\n").filter((l) => !l.includes("process.env.") && !l.trim().startsWith("//"));
  if (FORBIDDEN.some((p) => p.test(lines.join("\n")))) { console.error(`[HARD FAIL] Secret found in ${s}`); process.exit(1); }
}
console.log("[Premerge Simulate] ✅ No CRM secrets in lib scripts");

console.log("[Premerge Simulate] Final Verdict: CRM_PROVIDER_INTEGRATION_PREMERGE_PASS");
