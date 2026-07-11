#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("[Premerge Simulate 1.1E] Starting pre-merge simulation...");
execSync("node packages/db/src/_verify-1.1e.mjs", { cwd: ROOT, stdio: "inherit" });

// No runtime reports git-tracked
console.log("[Premerge Simulate] Checking Git tracking...");
const tracked = execSync("git ls-files artifacts/ai-company/mission-1.1e/generated/", { cwd: ROOT }).toString().trim().split("\n").filter(Boolean);
const runtime = ["timezone-normalization-ledger.json", "calendar-timezone-oauth-scorecard.json"];
const leaked = tracked.filter((f) => runtime.some((r) => f.endsWith(r)));
if (leaked.length > 0) {
  console.error(`[HARD FAIL] Runtime reports git-tracked: ${leaked.join(", ")}`);
  process.exit(1);
}
console.log("[Premerge Simulate] ✅ No runtime reports tracked in Git");

// No secret tokens in code files
console.log("[Premerge Simulate] Checking lib/calendar/ for secrets...");
const SCRIPTS = [
  "scripts/lib/calendar/timezone-formatting.mjs",
  "scripts/lib/calendar/timezone-validation.mjs",
  "scripts/lib/calendar/oauth-pkce.mjs",
  "scripts/lib/calendar/oauth-state-gate.mjs",
  "scripts/lib/calendar/oauth-local-callback-server.mjs",
  "scripts/lib/calendar/oauth-token-redaction.mjs",
  "scripts/lib/calendar/provider-google-calendar-oauth.mjs"
];
const FORBIDDEN = [/pat-[A-Za-z0-9\-]{10,}/, /re_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /GOOGLE_OAUTH_CLIENT_SECRET\s*=\s*\S+/];

for (const s of SCRIPTS) {
  const src = fs.readFileSync(path.join(ROOT, s), "utf8");
  const lines = src.split("\n").filter((l) => !l.includes("process.env.") && !l.trim().startsWith("//"));
  if (FORBIDDEN.some((p) => p.test(lines.join("\n")))) {
    console.error(`[HARD FAIL] Secret found in ${s}`);
    process.exit(1);
  }
}
console.log("[Premerge Simulate] ✅ No provider secrets in lib scripts");

console.log("[Premerge Simulate] Final Verdict: CALENDAR_TIMEZONE_OAUTH_PREMERGE_PASS");
