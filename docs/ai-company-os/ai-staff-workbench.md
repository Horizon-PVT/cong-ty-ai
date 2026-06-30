# AI Staff Workbench

## Overview

The AI Staff Workbench is a backend data and reporting layer that provides a unified inspection interface for the AI Company OS. It acts as the "control panel" brain, reading from local registries, memory files, and history logs to present a complete snapshot of the company's status, agents, factories, workers, providers, and outstanding owner actions.

## Paperclip Compatibility

**Important Principle**: The AI Staff Workbench is NOT a standalone production user interface or dashboard. It does not replace or compete with Paperclip.

- **Paperclip UI Layer**: Paperclip remains the main runtime UI and human-in-the-loop dashboard.
- **AI Company OS Brain Layer**: AI Company OS acts as the underlying execution engine.
- **Milestone 1.0G Adapter Layer**: Milestone 1.0G creates the reporting/adapter layer between them, exporting structured, stable JSON snapshots and reports that can be directly ingested and displayed by the Paperclip UI.

```
+------------------------------------+
|         Paperclip UI Layer         |
| (Displays Org, Gaps, Actions, etc) |
+------------------+-----------------+
                   | (Reads snapshots)
                   v
+------------------+-----------------+
|      AI Staff Workbench Adapter    |
|   (Generates JSON/MD Snapshots)    |
+------------------+-----------------+
                   | (Inspects files)
                   v
+------------------+-----------------+
|          AI Company OS             |
|   (Registries, Memory, Pipelines)  |
+------------------------------------+
```

## Data Sources

The workbench aggregates data from:
- **Registry configurations**: `capability-registry.json`, `provider-registry.json`, `model-registry.json`, `runtime-registry.json`, `agent-provider-pools.json`.
- **Learning loop memory**: `provider-performance.json`, `capability-scores.json`, `mission-lessons.jsonl`, `decision-log.jsonl`.
- **Hiring pipeline memory**: `staffing-gaps.jsonl`, `worker-candidates.jsonl`, `worker-trials.jsonl`, `worker-scorecards.json`.
- **Owner interface memory**: `owner-action-queue.jsonl`.

## Read-Only Inspection vs. Action Approvals

- **Read-Only Inspection**: All status aggregations, metrics computations, and history logs are read-only.
- **Action Approvals**: Operations that have real-world side effects (deploying, spending budget, publishing creative content, registering permanent workers) are appended to the `owner-action-queue.jsonl` where they wait for manual owner confirmation.
