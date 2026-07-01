# Capability-First Operating Model

This document explains the capability-first operational patterns and mappings used by the AI Company OS.

## Core Concepts

### 1. Role ≠ Model
A worker's **role** represents a set of business responsibilities (e.g. TikTok Hook Worker, Lead QA Engineer). An AI **model** (e.g. GPT-4o, Claude 3.5 Sonnet) is merely a raw execution utility. A role is never tied permanently to a specific model.

### 2. Worker ≠ Provider
- A **Worker** is an agent persona with specialized system prompts, capabilities, and local tools.
- A **Provider** is a runtime host or LLM provider pool (e.g., Gemini-local, Codex-local, Grok-local) that powers the worker's execution.

### 3. Task Decomposition
When a business mission is received, the CEO/agent engine decomposes it into discrete sub-tasks, each requiring specific **capabilities** (e.g., `repo_audit`, `kpi_scoring`).

### 4. Dynamic Capability Routing
The **Capability Router** evaluates the decomposed capabilities and selects the optimal Provider/Runtime combination based on historical performance.

### 5. Learning Loop Feedback
After every execution, the outcome is scored and fed back into the **Provider Performance Memory**. This learning loop updates the router's routing coefficients, ensuring self-improving routing decisions over time.

### 6. KPI-Driven Worker/Provider Selection
Key Performance Indicators (KPIs) direct the routing decisions. Providers that consistently achieve high quality scores are promoted and selected for critical/high-priority tasks, while failing runtimes are penalized or demoted.
