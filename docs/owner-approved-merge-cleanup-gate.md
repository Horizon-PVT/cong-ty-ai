# Owner-Approved Merge & Post-Merge Cleanup Gate

This document describes the safety controls, execution policy, and cleanup automation introduced in Phase 0.3M.

---

## Purpose
The Owner-Approved Merge & Post-Merge Cleanup Gate streamlines developer operations after a feature branch is ready and verified. It automates PR readiness updates, merging, remote branch deletion, local workspace branch deletion, master synchronization, and pruning—while strictly ensuring that **no merge occurs without the owner's explicit checkable approval**.

---

## Owner Approval Token Format
To permit a merge, the owner must provide an explicit, machine-checkable token:

`OWNER_APPROVED_MERGE_PR=<number>`

For example:
`OWNER_APPROVED_MERGE_PR=12`

The merge gate runner enforces that:
1. The token format matches exactly.
2. The PR number specified in the token matches the target PR.
3. If the token is missing or mismatched, the merge is strictly rejected.

---

## Safety Safeguards & Policies

### 1. Mergeability Check (Handling UNKNOWN)
- In `--apply` mode, the PR mergeability status must be exactly `"MERGEABLE"`.
- If the mergeability is returned as `"UNKNOWN"`, the script will automatically retry status fetching up to 3 times with a 2-second delay. If it remains `"UNKNOWN"`, the script terminates with an error.
- In `--dry-run` mode, `"UNKNOWN"` is allowed and displayed as a warning, but the final execution is blocked.
- `"CONFLICTING"` mergeable status always fails immediately.

### 2. Explicit Status Checks Enforcement
- A status checks summary is printed showing the total number of checks found, passing, and pending/failed checks.
- At least one passing status check (conclusion `"SUCCESS"` or `"NEUTRAL"`) is required to merge in `--apply` mode. Empty check rollups will fail with: `“Merge Gate requires explicit passing status checks before merge.”`.

### 3. Branch Fallback Restriction
- In `--apply` mode, the PR head branch name must be retrieved dynamically via the GitHub CLI. If the branch name cannot be fetched, execution stops with a clear error; no branch fallback is allowed.
- In `--dry-run` mode, a fallback is only permitted if explicitly provided via the `--branch <name>` CLI option.

### 4. Working Tree Cleanliness
- Before checking out `master`, pulling, or deleting the local branch, the cleanup script runs `git status --porcelain`.
- If the working tree is dirty, cleanup terminates with: `“Post-merge cleanup requires a clean working tree.”`.

### 5. Verified Remote Branch Deletion
- After merging, the runner verifies that the remote branch has been deleted on GitHub by running `git ls-remote --heads origin <branch>`.
- If deletion is confirmed, `deletedRemoteBranchStatus` is logged as `"DELETED"`.
- If verification fails or cannot be completed, it is recorded as `"UNKNOWN"`.

### 6. Safe Local Branch Deletion
- Deleting the local branch defaults to the safe `git branch -d` command.
- The force delete flag `git branch -D` is only used when the explicit `--force-delete` flag is passed.

---

## Automation Scope

### 1. Owner-Approved Merge Gate (`scripts/ai-dev-factory-owner-merge-gate.mjs`)
- Validates the owner approval token.
- Connects to GitHub via the authenticated GitHub CLI (`gh`).
- Ensures the PR is open, has no merge conflicts, and all status checks are passing.
- Marks Draft PRs as Ready for review if they are currently drafts.
- Performs the merge using the safe standard merge method (`--merge`) and requests remote branch deletion.

### 2. Post-Merge Cleanup Runner (`scripts/ai-dev-factory-post-merge-cleanup.mjs`)
- Switches the local workspace to `master` branch.
- Pulls the latest commits from the remote repository.
- Deletes the local feature branch safely.
- Prunes obsolete remote tracking branches (`git fetch --prune`).
- Records the status in JSON and Markdown reports.

---

## Blocked Critical Gates
The runners remain strictly blocked from:
- Running deployment commands (Vercel, Railway, Docker, etc.).
- Reading, displaying, or modifying secrets/credentials (no `.env` file reads).
- Performing destructive database migrations (no DROP, TRUNCATE, or data deletes).
- Financial spending or client/customer communications.

---

## Why Merge Requires Explicit Approval
Autonomous merge capabilities pose a risk if checks fail to detect a subtle bug or policy bypass. Restricting merge actions to explicit owner approval retains humans-in-the-loop for final master branch integrity.

---

## Runner Behaviors

### Dry-Run Mode (`--dry-run`)
- Performs all validation checks (PR state, conflicts, status checks, token matching).
- Prints the planned merge and cleanup actions.
- Outputs:
  - `“Simulation only for merge side effects”`
  - `“No merge performed (Dry-run mode active)”`
  - `“Simulation only for git cleanup side effects”`
- Does not modify any local or remote branches.

### Apply Mode (`--apply`)
- Conducts the same validations.
- Performs the remote ready/merge operations.
- Performs local workspace git actions (checkout master, pull, branch delete, prune).
- Generates execution reports.

---

## Report File Locations
Cleanup execution logs and final verdicts are recorded at:
- JSON Report: `reports/post-merge/latest.json`
- Markdown Report: `reports/post-merge/latest.md`
- Final Verdict: `POST_MERGE_CLEAN`
