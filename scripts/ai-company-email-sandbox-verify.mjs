import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

console.log(`[1.0S Verify] Running E2E verification for Milestone 1.0S...`);

try {
  execSync(`node packages/db/src/_verify-1.0s.mjs`, { stdio: "inherit", cwd: ROOT });
  console.log(`[1.0S Verify] Verification PASSED.`);
  process.exit(0);
} catch (err) {
  console.error(`[1.0S Verify] Verification FAILED.`);
  process.exit(1);
}
