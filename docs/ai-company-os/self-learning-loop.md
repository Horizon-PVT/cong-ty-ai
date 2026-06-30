# Self-Learning Loop

## Overview

The Self-Learning Loop implements a Hermes-style continuous improvement cycle for the AI Company OS. After every mission execution, the system records what happened, evaluates the outcome, extracts lessons, updates memory, and improves future decisions.

## The Loop

```
Do work
→ Record result
→ Evaluate output
→ Extract lesson
→ Update memory
→ Improve next run
```

This loop runs locally. No external APIs are called. Memory updates are written to local JSON/JSONL files.

## What Gets Learned

### Mission Lessons

After each mission, a lesson captures:

- What mission type was executed
- Which provider/model/runtime was used
- What the outcome was (success, failure, low confidence, etc.)
- Quality score (0.0 to 1.0)
- What went well
- What went wrong
- Recommended improvements

Lessons are appended to `memory/ai-company/mission-lessons.jsonl`.

### Provider Performance

Aggregate statistics per provider:

- Total missions handled
- Success/failure counts
- Average quality, latency, and cost scores
- Per-role and per-mission-type breakdowns

Stored in `memory/ai-company/provider-performance.json`.

### Capability Scores

Per-capability performance tracking:

- Total runs and success rate
- Average quality score
- Common failure reasons
- Recommended providers for each capability

Stored in `memory/ai-company/capability-scores.json`.

### Decision Log

Significant architectural and routing decisions:

- What was decided
- Why it was decided
- What evidence supported it
- What alternatives were considered

Stored in `memory/ai-company/decision-log.jsonl`.

## When to Create a Lesson

- After every simulated mission execution
- After a provider fallback is triggered
- After a panel mode decision
- After a verification failure
- After a cost threshold is exceeded

## When to Update Provider Score

- After every mission with a quality score
- After consecutive failures from the same provider
- After a challenger outperforms the primary
- After cost or latency anomalies

## When to Recommend Provider Change

- Primary provider quality drops below threshold (< 0.4)
- Challenger consistently outperforms primary (> 3 consecutive wins)
- Repeated fallback triggers for the same provider
- Cost efficiency drops significantly

## When to Escalate to Owner

- Recommending a policy change
- Enabling live API access
- Production deployment decision
- Budget/spending changes
- Publishing or customer communication
- Master branch merge

## How Bad Outcomes Affect Routing

1. Quality score below threshold → reduce provider's role_fit score
2. Repeated failures → increase recent_failure_penalty
3. Rate limits → temporarily reduce reliability_score
4. High cost for simple tasks → reduce cost_score
5. Low confidence outputs → trigger fallback or challenger mode

## How Good Outcomes Raise Preference

1. Consistent high quality → increase quality_score and role_fit
2. Fast responses → increase latency_score
3. Cost-effective results → increase cost_score
4. High success rate → increase reliability_score
5. Challenger wins → recommend primary provider swap

## Staffing Recommendations (1.0E Preview)

The learning loop includes a lightweight staffing recommendation hook. After analyzing mission outcomes and provider performance patterns, the system can recommend whether new AI workers are needed.

**Important**: Milestone 1.0E only **recommends** new AI staff. It does not automatically create permanent workers or mutate the capability registry. Full Dynamic AI Staffing is planned for Milestone 1.0F.

### When Staffing Recommendations Are Triggered

- Repeated low quality scores for the same mission type
- Repeated fallback usage indicating primary provider inadequacy
- Repeated failed verifications
- Repeated high cost for simple tasks
- Missing specialist role for a mission type
- Panel mode repeatedly needed for the same work
- Human/operator repeatedly needs to intervene

### Recommendation Levels

| Level | Meaning |
|-------|--------|
| **temporary_worker** | Short-term worker to handle a spike or gap |
| **candidate_worker** | Trial worker that needs monitoring before confirmation |
| **permanent_worker** | Confirmed new role (requires owner review in 1.0F) |

### What Happens with Recommendations

- Recommendations are included in provider router and learning loop reports.
- If `--write-memory` is passed, recommendations are appended to local memory.
- No automatic creation of workers occurs.
- Permanent worker recommendations require owner review.

## Safety Controls

- All learning happens locally using JSON/JSONL files.
- No external APIs are called.
- No secrets are read or logged.
- No .env files are touched.
- No automatic policy changes without owner approval.
- No automatic permanent worker creation.
- No production side effects.
