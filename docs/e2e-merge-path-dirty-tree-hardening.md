# Phase 0.3O: E2E Merge-Path Dirty Tree Hardening

## Incident Summary

During the PR #13 owner-approved merge (Phase 0.3N), the E2E runner successfully merged the PR and deleted the remote branch. However, the runner wrote E2E report files (`reports/e2e/latest.json`, `reports/e2e/latest.md`) to the working tree **before** calling post-merge cleanup. This made the working tree dirty, which caused the post-merge cleanup script to reject the operation with:

> Post-merge cleanup requires a clean working tree.

The merge itself succeeded, but the automation chain broke and required manual recovery.

## Root Cause

The E2E runner's merge-mode report section (Section G) wrote `reports/e2e/latest.json` and `reports/e2e/latest.md` **immediately after** the merge gate returned success — but **before** the post-merge cleanup script ran. The cleanup script validates `git status --porcelain` and refuses to operate on a dirty tree.

## Fix: Execution Order

The corrected merge-mode lifecycle is:

1. **Validate approval token** — exact format `OWNER_APPROVED_MERGE_PR=<number>`
2. **Check clean working tree** — `git status --porcelain` must be empty
3. **Run owner merge gate** — `node scripts/ai-dev-factory-owner-merge-gate.mjs --pr <N> --approval ... --apply`
4. **Run post-merge cleanup** — `node scripts/ai-dev-factory-post-merge-cleanup.mjs --pr <N> --apply`
5. **Confirm master branch** — verify `git branch --show-current` returns `master`
6. **Confirm clean tree** — `git status --porcelain` must be empty
7. **Write E2E final reports** — only now write `reports/e2e/latest.json` and `reports/e2e/latest.md`

## Report Writing Policy

Runtime reports generated after merge (`reports/e2e/latest.*`, `reports/post-merge/latest.*`) are **local-only**. They are added to `.gitignore` so they do not dirty the tracked state on master.

## Clean-Tree Requirements

- Before merge: working tree must be clean
- After post-merge cleanup: working tree must be clean
- After E2E report writes: reports are gitignored, so tree stays clean

## Owner Approval Requirement

Merge is only allowed with explicit token: `OWNER_APPROVED_MERGE_PR=<number>`

## What Remains Blocked

- Deploy to production
- Read/write secrets or .env
- Destructive database actions
- Spending money
- External/customer communications
- Auto-merge without owner token

## Verification Commands

```bash
node packages/db/src/_verify-0.3o.mjs
node scripts/ai-dev-factory-self-test-gate.mjs --phase 0.3o --dry-run --write-report
node scripts/ai-dev-factory-e2e-dev-run.mjs --pr 13 --approval OWNER_APPROVED_MERGE_PR=13 --dry-run
```
