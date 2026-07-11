#!/usr/bin/env node
/**
 * Milestone 1.0Z: Controlled Batch Expansion Verify Shim
 * Delegates to packages/db/src/_verify-1.0z.mjs
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
execSync("node packages/db/src/_verify-1.0z.mjs", { cwd: ROOT, stdio: "inherit" });
