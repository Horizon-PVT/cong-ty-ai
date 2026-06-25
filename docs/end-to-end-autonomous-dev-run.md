# Phase 0.3N: End-to-End Autonomous Dev Run

This document describes the design, execution flow, and safety boundaries of the End-to-End Autonomous Dev Runner introduced in Phase 0.3N.

---

## Purpose
The End-to-End Autonomous Dev Runner (`scripts/ai-dev-factory-e2e-dev-run.mjs`) orchestrates the previously decoupled gates into a single execution workflow. It enables the AI Dev Factory to take an owner goal, validate it, check out/run on a feature branch, execute a controlled proof task, run the self-test gate, and automatically submit a draft PR. Crucially, **merging remains blocked** unless the owner explicitly approves via the verification token.

---

## Orchestrated Workflow

```
[Owner Goal] 
    │
    ▼
[Goal Intake & Intent Verification] (Rejects Deploy/Secrets/Destructive/Spend/Comm)
    │
    ▼
[Branch Verification] (Blocks master/main)
    │
    ▼
[Controlled Task Execution] (Writes proof metadata to docs/ai-dev-factory-e2e-proof.md)
    │
    ▼
[Self-Test Gate Run] (Executes full verification scripts suite)
    │
    ▼
[PR Automation] (Pushes and creates Draft PR)
    │
    ▼
[Owner-Approved Merge Gate] (Requires OWNER_APPROVED_MERGE_PR token)
    │
    ▼
[Post-Merge Local Workspace Cleanup]
```

---

## Orchestrator Runner CLI Interface

The runner supports the following CLI options:
- `--goal "<goal>"`: Owner goal to process. Must be non-empty and free of blocked intents.
- `--task-id <id>`: Uniquely identifies the developer task.
- `--phase <phase>`: Specified verification phase (defaults to `0.3n`).
- `--dry-run`: Performs simulated validations without writing files, pushing, or merging.
- `--apply`: Runs the E2E execution loop (updates proof, runs self-test, pushes, and creates Draft PR).
- `--auto-pr`: Automatically creates a Draft PR on GitHub if the self-test returns PASS.
- `--pr <number>`: Target PR number for merge operations.
- `--approval OWNER_APPROVED_MERGE_PR=<number>`: Explicit approval token required to trigger merge.

---

## Safety Guarantees & Gate Intercepts

1. **Goal Intent Filtering**: Intercepts and blocks goals containing intent related to:
   - Deployments (`deploy`, `vercel`, `railway`, `docker`)
   - Secrets (`secret`, `.env`, `api_key`, `password`)
   - Destructive DB actions (`drop`, `truncate`)
   - Infrastructure spend (`spend`, `campaign`, `billing`)
   - External communications (`communication`, `customer`, `email`, `sms`)
2. **Branch Guardrails**: Refuses execution on `master` or `main`. Requires `chore/*` or `feat/*` branch prefix.
3. **No Automatic Merging**: If the approval token is missing or mismatched, the runner halts and returns `WAITING_FOR_OWNER_APPROVAL`.

---

## Report File Locations

E2E run metrics and execution outcomes are recorded at:
- JSON Report: `reports/e2e/latest.json`
- Markdown Report: `reports/e2e/latest.md`
- Final Verdict: `E2E_DRAFT_PR_CREATED` / `E2E_WAITING_FOR_OWNER_APPROVAL` / `E2E_MERGED_AND_CLEANED` / `E2E_CRITICAL_GATE_BLOCKED`
