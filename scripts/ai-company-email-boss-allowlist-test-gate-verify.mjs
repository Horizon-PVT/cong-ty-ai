#!/usr/bin/env node
/**
 * Milestone 1.0V: Email Boss Allowlist Test Gate — verify wrapper script
 * Simple shim for self-test gate integration.
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  execSync("node packages/db/src/_verify-1.0v.mjs", { cwd: ROOT, stdio: "inherit" });
  console.log("[1.0V Verify] Verification PASSED.");
} catch {
  console.error("[1.0V Verify] Verification FAILED.");
  process.exit(1);
}
