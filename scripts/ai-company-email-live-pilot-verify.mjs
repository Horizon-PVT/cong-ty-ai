#!/usr/bin/env node
/**
 * Milestone 1.0U: Email Live Pilot — verify wrapper script
 * Simple shim for self-test gate integration.
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  execSync("node packages/db/src/_verify-1.0u.mjs", { cwd: ROOT, stdio: "inherit" });
  console.log("[1.0U Verify] Verification PASSED.");
} catch {
  console.error("[1.0U Verify] Verification FAILED.");
  process.exit(1);
}
