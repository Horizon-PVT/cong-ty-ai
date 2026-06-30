# Worker Trial Loop

## Overview

The Worker Trial Loop is the evaluation mechanism of the Dynamic AI Staffing system. Before any temporary or candidate worker can be proposed for permanent status, they must undergo local dry-run trials. These trials generate scorecards that measure their suitability for the role.

## Lifecycle of a Worker Trial

```
Hired as Temporary
→ Run dry-run trial
→ Update worker scorecard
→ Calculate promotion readiness
→ Propose candidate/permanent or archive worker
```

## Trial Inputs

A worker trial is initialized with:
- **Worker ID**: Unique identifier for the trial worker.
- **Archetype ID**: The target profile template from archetypes registry.
- **Mission Type**: The task type they are being evaluated against.
- **Performance metrics**: Simulated quality, cost, and latency scores.

## Scoring Dimensions

Trial results are scored on a scale of `0.0` to `1.0`:

- **Quality Score**: How well the worker completed the task (matches verifications).
- **Cost Score**: Cost efficiency relative to expected resource usage.
- **Latency Score**: Speed and responsiveness during execution.

These are combined with historical success rates to calculate a **Promotion Readiness Score**:

\[\text{Readiness} = (\text{Avg Quality} \times 0.4) + (\text{Success Rate} \times 0.4) + (\text{Cost Score} \times 0.1) + (\text{Latency Score} \times 0.1)\]

## Recommendation Outcomes

Based on the scorecard and promotion readiness score, the trial loop recommends:

| Recommendation | Condition | Action |
|----------------|-----------|--------|
| **keep_temporary** | Readiness < 0.6 | Keep worker temporary; needs more trials or optimization |
| **promote_to_candidate** | Readiness >= 0.6 | Elevate temporary worker to candidate status |
| **propose_permanent_worker** | Readiness >= 0.8 & trials >= 3 | Recommend to owner for permanent registry integration |
| **retry_trial** | Failure due to rate limits/transient | Schedule another trial run |
| **archive_candidate** | Repeated failures / readiness < 0.4 | Retire candidate profile and document failure |

## Permanent Worker Registration

When a worker qualifies for `propose_permanent_worker`:
1. The system outputs a promotion recommendation report.
2. A Draft PR is prepared with the new worker mapping added to `configs/ai-company/agent-provider-pools.json`.
3. The owner reviews the PR diff and scorecard evidence.
4. If approved, the owner merges the PR using the owner merge token, officially registering the worker.
