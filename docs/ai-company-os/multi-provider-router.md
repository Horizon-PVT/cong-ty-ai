# Multi-Provider Router

## Overview

The Multi-Provider Router is the decision engine that selects the optimal AI provider, model, and runtime for each mission. Rather than hardcoding provider assignments, it dynamically chooses the best option based on role, task type, historical performance, cost constraints, and learning memory.

## Architecture

The router consults multiple registries and memory sources:

1. **Provider Registry** — Available AI service providers and their capabilities.
2. **Model Registry** — Abstract model profiles with capability scores.
3. **Runtime Registry** — Execution environments and their permissions.
4. **Agent Provider Pools** — Per-agent/worker provider preferences and constraints.
5. **Provider Routing Policy** — Selection rules, scoring weights, and trigger conditions.
6. **Provider Performance Memory** — Historical quality, latency, cost, and success data.

## Model Pool Per Role

Each AI staff role has a configured pool of providers:

| Role | Primary | Fallback | Challenger | Cheap |
|------|---------|----------|------------|-------|
| Strategist (CEO) | OpenAI | Anthropic, Google | Anthropic | Local |
| Developer | OpenAI/Codex | Anthropic | Anthropic | Local |
| Reviewer | Anthropic | OpenAI | OpenAI | Local |
| Tester | Google/Antigravity | OpenAI, Anthropic | — | Local |
| Media Operator | Hermes | OpenAI, Google | Anthropic | Local |

## Routing Modes

### Primary Mode
Uses the designated primary provider for the role. Default for most missions. Best quality-to-cost ratio for the role's typical work.

### Fallback Mode
Activated when the primary provider is unavailable, rate-limited, or produces low-confidence results. The router walks the fallback chain in order.

### Challenger Mode
Periodically routes work to an alternative provider to benchmark quality against the primary. Results are compared and stored in learning memory. This prevents provider lock-in and discovers better options.

### Panel Mode
Consults multiple providers and synthesizes or compares their outputs. Reserved for high-stakes decisions: strategy pivots, architecture reviews, legal/contract reviews, high-risk merges.

### Cheap Mode
Routes to the lowest-cost provider (typically local models). Used for simple tasks: log summaries, classification, metadata extraction, low-risk batch operations.

## Scoring Dimensions

The router scores each candidate provider across these dimensions:

| Dimension | Description |
|-----------|------------|
| **role_fit** | How well the provider matches the worker's role requirements |
| **task_fit** | How well the provider handles this specific mission type |
| **quality_score** | Historical output quality from learning memory |
| **latency_score** | Historical response speed |
| **cost_score** | Cost efficiency relative to task complexity |
| **reliability_score** | Uptime and consistency from memory |
| **recent_success_rate** | Success ratio in recent missions |
| **confidence_score** | Router's confidence in this selection |

Scores are weighted according to the routing policy and combined into a final selection score.

## Avoiding Provider Lock-In

The router prevents lock-in through:

1. **Challenger mode** — Periodically tests alternatives.
2. **Learning memory** — Tracks provider performance per mission type.
3. **Fallback chains** — Always has alternatives ready.
4. **Dynamic scoring** — Provider rankings change based on real outcomes.
5. **No hardcoded assignments** — All mappings are configurable.

## How Learning Memory Updates Selection

After each mission:

1. The outcome (success/failure, quality score, latency, cost) is recorded.
2. Provider performance memory is updated with new averages.
3. If a provider consistently underperforms, its scores decrease.
4. If a challenger outperforms the primary, the learning loop recommends a provider change.
5. The next routing decision uses the updated memory.

## Safety Controls

- All routing decisions are local simulations in this phase.
- No real API calls are made to any provider.
- No API keys are read, stored, or logged.
- No .env files are touched.
- No real spend occurs.
- Provider selection is deterministic for the same inputs.
