# AI Dev Factory Product Capability: Safe E2E Task Execution

This document details how the AI Dev Factory handles, routing, self-testing, and executing small product-facing tasks through the automated safe branch workflow.

## What Phase 0.3P Proves
Phase 0.3P demonstrates that the AI Dev Factory safety and automation infrastructure can be applied to real product tasks. Rather than working solely on its own codebase security, the developer loop is now ready to safely execute small product-facing requirements (such as documentation, config changes, or UI updates) from an owner goal all the way to a draft pull request under strict safety policies.

## Anatomy of a Valid Product Task
A valid product task routed through the E2E Dev Run pipeline must satisfy:
1. **Limited File Scope**: It must only touch files registered in the mission configuration's `allowed_files` checklist.
2. **Read-Only or Low-Risk Scope**: It cannot modify business logic, API route handlers, or system security layers.
3. **Traceability**: Task goals are captured explicitly under a specific `--goal` intake and logged to proof files.

## Safety Controls: Allowed vs. Blocked Operations

### Allowed Operations
- Switching to a feature branch starting with `chore/` or `feat/`.
- Scoped file writes/modifications within allowed project directories.
- Automated code reviews and typechecking.
- Submitting Draft PRs to the origin fork repository.

### Blocked Operations
- **Deploying to production**: Deploy scripts, Vercel, Railway, and Docker pushes are blocked.
- **Secrets access**: Reading, printing, or writing `.env` files or API keys is blocked.
- **Destructive Database Actions**: `DROP`, `TRUNCATE`, and schema removals are blocked.
- **Infra/Ad Budget Spend**: Triggering paid APIs or spending money is blocked.
- **External communications**: Sending SMS, emails, or customer messages is blocked.

## Mission-File Level Controls
Every product task is declared inside a mission JSON file located under `missions/`. The mission file defines:
- The phase identifier (`phase`).
- The explicit target branch name (`branch`).
- Lists of `allowed_files` and `blocked_files` to enforce file-scope guardrails.
- `safety_rules` describing constraints.
- `verification_commands` required to pass before PR submission.

## Role of the Self-Test Gate
The Self-Test Gate acts as an automated sanity check. It runs:
- Baseline linter, typecheck, and build compilations.
- Scoped verification scripts for each phase.
- Optional connection check overrides for offline database environments.

All baseline commands must pass successfully (or warnings logged for optional tests) before the E2E runner is permitted to push the branch or open a PR.

## Draft PR & Owner Approval Workflow
Once the task passes the Self-Test Gate:
1. The branch is pushed to origin and a **Draft PR** is opened on GitHub.
2. The merge remains strictly blocked by the Merge Gate.
3. To merge the PR, the owner must supply the exact owner approval token of the format `OWNER_APPROVED_MERGE_PR=<PR_NUMBER>`.
4. Merging runs the E2E merge-path which squash-merges the PR, switches the local workspace to `master`, pulls the latest commits, deletes the local feature branch, and prunes tracking branches.

## Example Goal & E2E Report

### Example Owner Goal
> "Create a read-only product capability document describing how AI Dev Factory can accept a small product task and route it through safe E2E execution."

### Example Expected Final E2E Report (`reports/e2e/latest.json`)
```json
{
  "phase": "0.3P",
  "title": "Phase 0.3P: First Real Product Task Through E2E Loop",
  "branch": "chore/first-real-product-task-e2e",
  "selfTestVerdict": "PASS_READY_FOR_DRAFT_PR",
  "mergeApproved": false,
  "finalVerdict": "E2E_WAITING_FOR_OWNER_APPROVAL"
}
```
