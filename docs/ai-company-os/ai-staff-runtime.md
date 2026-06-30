# AI Staff Runtime

## What is AI Staff Runtime?

The AI Staff Runtime is the execution layer that manages how AI workers operate within the AI Company OS. It defines how each AI staff member (agent or worker) connects to AI model providers, selects the best runtime for each mission, and manages fallback and optimization strategies.

Unlike traditional systems where each AI worker is permanently bound to one API provider, the AI Staff Runtime allows each worker to use multiple providers depending on mission requirements, cost constraints, and historical performance.

## Key Concepts

### Agent

An executive-level AI persona responsible for overseeing a factory or domain. Examples: CEO Agent, CTO Agent, CMO Agent. Agents make strategic decisions and delegate operational work to workers.

### Worker

An operational AI unit that executes specific mission types. Examples: implementation_worker, review_worker, test_worker. Workers are assigned to factories and perform the actual work.

### Provider

An AI service vendor that offers model access. Examples: OpenAI, Anthropic, Google, Local, Hermes Internal. Each provider has different strengths, cost profiles, and availability characteristics.

### Model

A specific AI model or model family offered by a provider. Examples: GPT family, Claude family, Gemini family. Models have different capabilities in reasoning, coding, review, and multimodal tasks.

### Runtime

The execution environment where AI work happens. Examples: ChatGPT, Codex, Claude API, Claude Code, Antigravity, Hermes, Local Runner. A runtime combines a provider's model with a specific interface and capability set.

## Why Multi-Provider?

Binding each AI staff member to a single provider creates:

- **Vendor lock-in**: If one provider has an outage, the entire company stalls.
- **Cost inefficiency**: Expensive models used for simple classification tasks.
- **Quality gaps**: No single provider excels at every task type.
- **No learning**: No way to discover that a different provider performs better for specific work.

The AI Staff Runtime solves this by giving each role a **provider pool** with primary, fallback, challenger, and cheap options.

## Provider Selection Modes

| Mode | Purpose |
|------|--------|
| **Primary** | Default best-fit provider for the role |
| **Fallback** | Used when primary is unavailable or fails |
| **Challenger** | Alternative provider tested periodically to compare quality |
| **Panel** | Multiple providers consulted for high-stakes decisions |
| **Cheap** | Low-cost provider for simple, low-risk tasks |

## How Runtime Selects a Provider

1. Load the agent/worker's provider pool configuration.
2. Check the mission type and priority.
3. Consult provider performance memory for historical scores.
4. Apply routing policy rules (fallback triggers, panel triggers, cheap triggers).
5. Score available providers on role_fit, task_fit, quality, latency, cost, reliability.
6. Select the highest-scoring provider for the current mode.
7. Record the selection decision for the learning loop.

## Connection to 1.0D Local Queue

The AI Staff Runtime sits between the Capability Router (1.0D) and actual mission execution:

1. **Capability Router** routes a mission to a factory and capability.
2. **AI Staff Runtime** selects which provider/model/runtime will execute the work.
3. **Local Queue** manages the execution lifecycle (claim, run, complete/fail).
4. **Learning Loop** records the outcome and updates provider preferences.

## Preparing for Real Integration

In this phase (1.0E), all provider interactions are simulated locally. No real API calls are made. The runtime layer establishes:

- Provider registry with capabilities and constraints
- Model registry with abstract capability profiles
- Runtime registry with execution environment definitions
- Agent-to-provider pool mappings
- Provider routing policy with scoring weights

When real API keys are configured in future milestones, the same routing logic will select real providers. The learning loop will then optimize based on actual API performance data.

## Safety Controls

- No API keys are stored, read, or logged.
- No .env files are created or modified.
- No real external API calls are made.
- No real spend occurs.
- No customer communications are sent.
- No production deployments happen.
- Master merge requires explicit owner approval token.
