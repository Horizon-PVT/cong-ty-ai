#!/usr/bin/env node
/**
 * Milestone 1.0X: Controlled Outreach — verify wrapper script
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  execSync("node packages/db/src/_verify-1.0x.mjs", { cwd: ROOT, stdio: "inherit" });
  console.log("[1.0X Verify] Verification PASSED.");
} catch {
  console.error("[1.0X Verify] Verification FAILED.");
  process.exit(1);
}
