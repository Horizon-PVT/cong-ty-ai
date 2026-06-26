# AI Dev Factory Execution Status

## Capability Map

- Autonomous task decomposition (JARVIS Strategy Advisor)
- Safe branch code editing (Codex Developer)
- Automatic code/diff review (Claude Reviewer)
- Local verification & typechecking (Antigravity QA)
- Status reporting & next-step recommendations (Report Bot)
- Autonomous self-test gate (Self-Test Gate)

## Allowed Autonomous Operations

- Switch to/create a feature branch (`chore/` or `feat/`)
- Perform file changes inside the Safe File Scope
- Execute compilation (`pnpm build`), typechecks (`pnpm -r typecheck`), and unit tests dry-run (`pnpm test:run --dry-run`)
- Commit changes locally
- Push branch and prepare Draft PR (when authentication is available)
- Auto-merge approved feature branch and clean up local workspace branches (when owner token is provided)

## Blocked Critical Gates

- Do not merge to `master`/`main` without explicit owner approval token (`OWNER_APPROVED_MERGE_PR=<number>`)
- Do not deploy to production
- Do not read, write, or print secrets/API keys/.env files
- Do not perform destructive database actions (DROP, TRUNCATE, etc.)
- Do not spend money (ad campaigns, infra, paid LLM APIs above budget)
- Do not send external/customer communications

## Current Safe Branch Workflow

1. Retrieve goals from the owner.
2. Checkout a non-master feature branch starting with `chore/` or `feat/`.
3. Validate branch compliance and allowed file scopes.
4. Modify files within the approved scope.
5. Run the checklist (`typecheck` -> `build` -> `test dry-run`) with a max of 3 retry cycles.
6. Commit changes locally if checks pass.
7. Push branch and open a Draft PR (or output instructions if auth is blocked).
8. Merge the PR automatically using owner-approved merge gate (if explicit token matches).
9. Switch to master, pull, and delete the local feature branch via post-merge cleanup.

## Phase Capability Evolution

- **Phase 0.3E**: JARVIS internal auto-run orchestration
- **Phase 0.3F**: Downstream role-specific mock reports
- **Phase 0.3G**: Project-aware mock reports
- **Phase 0.3H**: Autonomy model + action-aware planning packets
- **Phase 0.3I**: Safe branch execution loop scaffold
- **Phase 0.3J**: Real safe task execution adapter proof
- **Phase 0.3K**: Autonomous self-test gate
- **Phase 0.3L**: Auto Push & Draft PR Gate
- **Phase 0.3M**: Owner-approved merge & post-merge cleanup gate
- **Phase 0.3N**: End-to-End Autonomous Dev Run
- **Phase 0.3O**: E2E merge-path dirty tree hardening
- **Phase 0.3P**: First Real Product Task Through E2E Loop
- **Phase 0.3Q**: Mission Queue & Resume/Idempotency

## Phase 0.3P Proof Status

Status: Merged and Cleaned
Proof execution records:
- Phase 0.3P implements the first real product capability document and mission control configuration.
- Validates that E2E dev runner can execute scoped product tasks successfully.
- Enforces safety boundaries (blocking deploys, secrets, spend, database alterations).

## Phase 0.3Q Proof Status

Status: Draft PR opened; pending owner review and explicit merge approval token.
Proof execution records:
- Phase 0.3Q implements the mission queue design and resume/idempotency policy specifications.
- Validates queue tracking, branch reuse, duplicate PR prevention, and lock policies.
<!-- execution_records_start -->
<!-- execution_records_end -->
