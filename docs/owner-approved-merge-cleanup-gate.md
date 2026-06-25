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
`OWNER_APPROVED_MERGE_PR=11`

The merge gate runner enforces that:
1. The token format matches exactly.
2. The PR number specified in the token matches the target PR.
3. If the token is missing or mismatched, the merge is strictly rejected.

---

## Automation Scope

### 1. Owner-Approved Merge Gate (`scripts/ai-dev-factory-owner-merge-gate.mjs`)
- Validates the owner approval token.
- Connects to GitHub via the authenticated GitHub CLI (`gh`).
- Ensures the PR is open, has no merge conflicts (`mergeable: "MERGEABLE"`), and all required status checks are completed and passing.
- Marks Draft PRs as Ready for review if they are currently drafts.
- Performs the merge using the safe standard merge method (`--merge`) and requests remote branch deletion.

### 2. Post-Merge Cleanup Runner (`scripts/ai-dev-factory-post-merge-cleanup.mjs`)
- Switches the local workspace to `master` branch.
- Pulls the latest commits from the remote repository.
- Deletes the local feature branch if it exists.
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
