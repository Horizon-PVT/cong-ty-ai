# Dynamic AI Staffing

## Overview

Dynamic AI Staffing is the capability of the AI Company OS to dynamically expand, adapt, and optimize its own workforce. By monitoring performance metrics, quality issues, cost anomalies, and operational failures, the OS can autonomously identify staffing gaps and configure new specialized AI worker roles.

This creates a self-hiring pipeline where the system detects a missing skill, hires a temporary worker for a single task, evaluates their trial, and recommends whether to promote them to candidate status or propose them as a permanent worker for owner review.

## Three Staffing Levels

The AI Company OS defines three levels of AI staff membership:

### 1. Temporary Worker
- **Purpose**: A local, mission-specific worker created dynamically for a single task or campaign.
- **Rules**: Can be created automatically in local dry-runs to run a specific mission. Does not mutate the core Capability Registry or persist across main branches.
- **Example**: `temporary_worker_tiktok_hook_001`

### 2. Candidate Worker
- **Purpose**: A proposed worker role undergoing trial execution to determine business viability.
- **Rules**: Generated locally and recorded in `memory/ai-company/worker-candidates.jsonl`. Includes clear trial KPIs, provider pools, and expected outputs.
- **Example**: `candidate_worker_playwright_e2e_specialist`

### 3. Permanent Worker
- **Purpose**: An official, verified AI staff member registered in the core registry.
- **Rules**: Strictly requires manual owner review and pull request approval. Auto-creation of permanent workers is forbidden in local dry-runs to prevent unauthorized structural or capability changes.
- **Example**: `permanent_worker_sales_objection_handler`

## Staffing Gap Detection

The system monitors the learning loop for triggers that indicate a staffing gap:

- **Quality drop**: Repeated quality scores below the threshold for a mission type.
- **Failed verifications**: Repeated self-test or test verifications failing.
- **Cost inefficiency**: Repeated high costs or expensive provider selection for simple tasks.
- **Provider weakness**: Primary provider for a role consistently underperforming or triggering fallbacks.
- **Operational delays**: Slow routing due to missing specialists.
- **Operator intervention**: Human operators repeatedly stepping in to guide tasks.
- **Panel mode overuse**: Repeatedly requiring multiple models to solve a single mission type.

## Hiring Pipeline Flow

1. **Gap Detection**: Learning sweep identifies a problem (e.g., failed tests) and creates a `staffing_gap` record.
2. **Archetype Matching**: The system scans `configs/ai-company/worker-archetypes.json` for a matching role.
3. **Local Hiring**: The system creates a `temporary_worker` profile and assigns a provider pool.
4. **Trial Execution**: The temporary worker executes a trial mission.
5. **Scorecard Evaluation**: The outcome is scored across quality, cost, and latency.
6. **Promotion Recommendation**: If the score exceeds thresholds, the system recommends promoting the worker.

## Safety Controls & Hard Locks

- **No Auto-Permanent Creation**: Under no circumstances will a permanent worker be added to the Capability Registry without explicit owner approval.
- **No API keys or secrets read**: All provider simulations remain local and dry-run only.
- **No destructive actions**: DB mutations, production deploys, real spending, and customer messaging remain blocked.
