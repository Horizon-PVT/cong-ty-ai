# Paperclip Read Adapter

## Overview

The Paperclip Read Adapter (Milestone 1.0I) is the local implementation layer that turns the Paperclip Integration Contract (1.0H) into working code.

It reads all available AI Company OS data sources — configs, memory streams, schemas, and optional runtime reports — and emits stable, Paperclip-compatible widget payloads.

## How It Differs From 1.0H

- **1.0H** defined the contract: schemas, widget maps, sample fixtures, and validation rules.
- **1.0I** implements the contract: a working read adapter that aggregates real local data and produces live payloads.

## Data Sources

The adapter reads from:

### Required Sources
- `configs/ai-company/paperclip-integration-policy.json`
- `configs/ai-company/paperclip-widget-map.json`
- `schemas/ai-company/paperclip-company-status.schema.json`
- `schemas/ai-company/paperclip-owner-action.schema.json`

### Optional Sources (warnings if missing)
- `memory/ai-company/provider-performance.json`
- `memory/ai-company/capability-scores.json`
- `memory/ai-company/mission-lessons.jsonl`
- `memory/ai-company/staffing-gaps.jsonl`
- `memory/ai-company/worker-candidates.jsonl`
- `memory/ai-company/worker-trials.jsonl`
- `memory/ai-company/worker-scorecards.json`
- `memory/ai-company/owner-action-queue.jsonl`
- `memory/ai-company/operator-notes.jsonl`
- `reports/company-status/latest.json`
- `reports/operator-console/latest.json`

## Widget Payloads

The adapter builds payloads for 12 widget panels:
1. Company Status
2. Mission Board
3. Factories
4. AI Staff
5. Provider Performance
6. Learning Feed
7. Staffing Gaps
8. Candidate Workers
9. Worker Scorecards
10. Owner Action Queue
11. Safety Locks
12. Next Actions

## Read-Only Guarantee

The adapter is strictly read-only. It does not:
- Write to memory files
- Mutate configuration or registry files
- Call external APIs
- Build any UI or dashboard
- Deploy, publish, or spend

## Warnings

When optional data sources are missing, the adapter emits warnings (not errors) and populates the corresponding widget with an empty state and a descriptive fallback message.

## Future Work

Once Paperclip integrates the read adapter output, it will render the widget payloads in its dashboard UI. The adapter output shape is designed to be directly consumable by Paperclip components.
