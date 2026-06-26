# AI Dev Factory: Resume & Idempotency Policy

This document defines the rules and behaviors of the AI Dev Factory when resuming interrupted runs or handling duplicate executions.

---

## 1. Local Workspace Integrity

### Rule: Block on Dirty Working Tree
If a runner starts execution and detects any unstaged or untracked changes in the local working tree (i.e. `git status --porcelain` is not empty), it must **block** and abort execution immediately. Resuming or starting a mission requires a clean workspace state to prevent polluting file tracking.

---

## 2. Lock File & Concurrency Control

### Rule: Block on Fresh Lock File
When a runner claims a mission, it writes a `mission.lock` containing the `run_id` and timestamps.
- If a runner attempts to execute a task and detects a `mission.lock` file:
  - If the lock file timestamp is fresh (e.g., less than 30 minutes old), the runner must **block** and refuse execution to prevent concurrent conflicts.
  - If the lock file is stale (e.g., older than 30 minutes), the runner must not auto-overwrite it without logging a warning. The owner can initiate an explicit recovery path to clear the stale lock.

### Rule: Run ID Mismatch Protection
- If a runner is resuming an execution and the `run_id` stored in the mission state file does not match the active runner's `run_id`, the runner must **block** and raise an alert requiring owner review. This prevents concurrent runners from taking over each other's workspaces.

---

## 3. Branch & Pull Request Management

### Rule: Reuse Existing Branch
- If a branch for the mission (e.g. `chore/first-real-product-task-e2e` or `chore/mission-queue-resume-idempotency`) already exists locally or remotely, the runner must **reuse** it:
  1. Switch to the existing branch.
  2. Pull the latest commits if remote exists.
  3. Avoid executing duplicate branch initialization commands.

### Rule: Prevent Duplicate Pull Requests
- If the runner completes the self-test checks and is ready to push:
  - It checks if a Pull Request already exists on GitHub for the current feature branch.
  - If a PR already exists, the runner must **edit the existing PR** (using `gh pr edit` or updating description) instead of creating a new one (which would fail or spam duplicate PR entries).
  - A new PR is created (via `gh pr create --draft`) only if no active PR for the branch is found.

---

## 4. Skip & Trust Policies

### Rule: No Rerun for Completed Tasks
- If a mission's state in the queue is `MERGED` or `CLEANED`, it is considered done.
- The runner must immediately **skip** execution and terminate with a success code. Rerunning completed missions is strictly prohibited to prevent regressions.

### Rule: Validate Self-Test Report before Trusting
- If a local self-test report (`reports/self-test/latest.json`) exists:
  - The runner must verify that the report's commit `head_sha` matches the active branch's current commit `head_sha`.
  - The runner must verify that the report's `phase` matches the current mission phase.
  - If they match, the runner can **trust** the report and skip re-executing long-running compilations/typechecks.
  - If they do not match, the report is considered invalid/stale, and the runner must execute the full verification checklist.

---

## 5. Owner Approval and Safety Enforcements

- Under all resume scenarios, the E2E merge path cannot bypass the merge gate.
- Auto-merge requires the explicit owner token (`OWNER_APPROVED_MERGE_PR=<number>`) matched to the PR.
- No deploy scripts, secret access, or destructive database commands are ever executed during resume/idempotency checks.
