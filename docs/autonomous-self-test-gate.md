# Autonomous Self-Test Gate

The Autonomous Self-Test Gate provides a reusable, standardized quality check that every developer loop can execute to self-verify its feature branch work. It compiles code, validates type-safety, executes tests, and verifies database state automatically to ensure code readiness before a PR is presented to the owner.

## Purpose

To remove the need for the owner to manually run compilation, typecheck, build, and test verification commands on every branch. By delegating these verification steps to an autonomous runner, the owner is presented with a guaranteed-passing branch accompanied by a clear verdict and structured gate report.

---

## How Future Loops Use It

In future phases, the branch execution loops for Codex, Claude, and Antigravity QA will call this self-test gate at the end of their execution cycle:
1. Codex completes changes on the feature branch.
2. The loop runner executes the self-test gate:
   ```bash
   node scripts/ai-dev-factory-self-test-gate.mjs --phase 0.3k --write-report
   ```
3. If the self-test gate returns a `PASS` verdict, the runner automatically pushes the branch and prepares a Draft PR.
4. If the self-test gate returns a `FAIL` verdict, the runner halts and reports the failure to the owner.

---

## Command Checklist

The self-test gate runs the following verification commands for the Phase 0.3K baseline:
1. `pnpm -r typecheck` — Validates TypeScript type safety across all workspace packages.
2. `pnpm build` — Compiles server, ui, and cli assets to verify build integrity.
3. `pnpm test:run --dry-run` — Runs the test suites in dry-run mode to ensure test configurations are correct.
4. `node packages/db/src/_verify-0.3i.mjs` — Verifies database health and Phase 0.3I safe branch loop rules.
5. `node packages/db/src/_verify-0.3j.mjs` — Verifies Phase 0.3J task adapter results (if the verification file is present on the branch).
6. `node packages/db/src/_verify-0.3k.mjs` — Verifies Phase 0.3K self-test gate runner and reports.

---

## Report File Locations

The self-test gate writes results to the following paths (when the `--write-report` flag is used):
* **JSON Report**: `reports/self-test/latest.json`
* **Markdown Report**: `reports/self-test/latest.md`

---

## PASS/FAIL Verdict Meanings

* **`PASS_READY_FOR_DRAFT_PR`**
  All verification checks were run for real and passed successfully. No PR is open yet; the branch is ready to be pushed and opened as a Draft PR.
* **`PASS_READY_FOR_OWNER_REVIEW`**
  All verification checks were run for real and passed successfully. The Draft PR can now be marked ready for review or reviewed by the owner.
* **`FAIL_BLOCKED`**
  One or more verification checks failed. The loop runner must halt and cannot proceed to PR creation or review request.
* **`FAIL_CRITICAL_GATE_VIOLATION`**
  A command matching a blocked pattern (e.g. DROP DATABASE, merge master, deploy) was attempted, causing immediate abortion.

---

## Owner Responsibility & Blocked Gates

The self-test gate enforces the autonomy policy by preventing automated execution of critical actions.

### What Remains Blocked
* **No Auto-Merge**: Merging to `master`/`main` is strictly blocked.
* **No Auto-Deploy**: Production deployments are blocked.
* **No Destructive DB Actions**: Table or database drops/truncates are blocked.
* **No Paid API Spend / Key Reads**: Secret token access and billing changes remain blocked.

### Owner Responsibility After Self-Test
Once the self-test gate returns a `PASS` verdict, the owner's role is to:
1. Review the generated Markdown report `reports/self-test/latest.md`.
2. Inspect the Draft PR diff on GitHub.
3. Manually merge the branch to `master` if satisfied.
