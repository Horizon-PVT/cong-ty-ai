# Safe Branch Execution Loop Policy

## Purpose of the Safe Branch Execution Loop
The Safe Branch Execution Loop provides a secure, structured local runner environment for the AI Dev Factory. It enables routine developer tasks—such as file audits, code editing, workspace builds, typechecks, local unit tests, commits, and Draft PR preparations—to be executed automatically on non-master feature branches without requiring manual owner approval, while strictly enforcing critical gates.

## Relationship to Phase 0.3H Autonomy Model
This execution loop implements the internal execution modes outlined in the Autonomy Model, specifically enforcing that safe branch changes are allowed, local verifications are allowed, but critical gates remain strictly blocked.

## Branch Policy
- Routine development must occur only on feature branches starting with `chore/` or `feat/`.
- Merging to the main `master` branch is strictly prohibited.
- Branches must be verified before commit.

## Allowed Autonomous Actions
- Switched to/created a non-master feature branch.
- Scanning the workspace structure to identify components, configs, and test files.
- Reading and writing files within the designated Safe File Scope.
- Running compilation/build tools (`pnpm build`).
- Running typecheck verification (`pnpm -r typecheck`).
- Running test suites in dry-run/regression mode (`pnpm test:run --dry-run`).
- Making local git commits on the feature branch.
- Preparing/pushing the branch and opening a Draft PR if authentication tooling (e.g. GitHub CLI) is available.

## Blocked Critical Gates
The loop runner is strictly blocked from performing:
- Merging to `master` (e.g., `git merge master`).
- Pushing to `master` (e.g., `git push origin master`).
- Production deployment commands (e.g., `vercel --prod`, `railway up`, `docker push`, `deploy`).
- Destructive database mutations or data drops (e.g., `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, `rm -rf` database folders).
- Reading, displaying, or modifying secrets or credentials (e.g., opening `.env` files, searching for `API_KEY`, `SECRET`, `TOKEN`).
- Committing billing or paid spend.
- Sending messages or notifications to external clients/customers.

## Safe File Scope
File modifications are strictly limited to Phase 0.3I-owned files. Edits to any other repository files will trigger immediate loop termination:
- `docs/safe-branch-execution-loop.md`
- `scripts/safe-branch-execution-loop.mjs`
- `packages/db/src/_verify-0.3i.mjs`
- Narrowly scoped wording updates in mock runtimes only when required.

## Command Checklist
Before any local commit, the loop runner must execute:
1. `pnpm -r typecheck` - Compile and typecheck validation.
2. `pnpm build` - Build workspace artifacts.
3. `pnpm test:run --dry-run` - Dry-run test suite verification.

## Retry Policy
- If any command in the checklist fails, the loop runner will enter a fix cycle.
- Maximum of 3 consecutive fix cycles are allowed to resolve compilation or typecheck errors.
- If all 3 cycles fail to produce a passing state, the runner must halt, pause downstream execution, and report a blocker.

## Stop Conditions
The runner will immediately stop execution and prompt the user if:
- A command matching any blocked keyword guardrail is detected.
- Any modification is attempted on a file outside the safe file scope.
- Local verification commands fail after 3 fix cycles.
- Remote push or Draft PR creation fails due to missing credentials/tools.

## Draft PR Policy
Pushes and Draft PRs are initiated automatically only if Git credentials and/or GitHub CLI (`gh`) are pre-authenticated. If authentication is missing, the runner stops, outputs manual instructions, and exits cleanly.

## Future Real Adapter Roadmap
This scaffold defines the structure for safe automated branch execution. In future phases, real Codex/Claude/QA adapters will plug directly into this loop, running actual code changes and reviews under these exact same safety gates.


<!-- Safe Branch Execution Auto-Run Check: 2026-06-23T08:49:10.090Z -->
