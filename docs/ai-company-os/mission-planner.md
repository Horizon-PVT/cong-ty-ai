# AI Company OS: Mission Planner

## What is the Mission Planner?

The **Mission Planner** is a strategic coordination layer in the AI Company OS. It takes high-level company goals (e.g., "Launch marketing campaign", "Deliver software feature") and decomposes them into a structured sequence of executable **Missions** mapped to capabilities registered in the **Capability Registry**.

## Why it Exists

An operating system with multiple independent factories cannot function effectively if goals are dumped directly into execution queues without structure or safety checks.
1. **Goal Decomposition**: Translates human-level business objectives into fine-grained capability API inputs/outputs.
2. **Dependency Resolution**: Declares the execution order of missions (e.g., Lead Research must run before Message Drafting).
3. **Pre-Flight Safety**: Checks capability status, blocked actions, and approval gates before any code runs, blocking unsafe goals at the planning level.

## Connection to the Organization Model and Capability Registry

The Mission Planner ties the previous milestones together:
- **Organization Model (Milestone 1.0A)**: Every planned mission belongs to a specific **Factory** and is monitored by its respective **Executive Agent** (e.g., CEO, CTO).
- **Capability Registry (Milestone 1.0B)**: Every mission is validated against a capability in the registry to confirm the inputs, outputs, and safety properties match.

## Mission Planner vs. Capability Router

| Concept | Mission Planner (Milestone 1.0C) | Capability Router (Milestone 1.0D) |
| ------- | -------------------------------- | ---------------------------------- |
| **Purpose** | Decomposes goals into a structured, dependency-ordered plan. | Dispatches planned missions to target factory queues. |
| **Stage** | Planning (Dry-run generation, validation, and layout). | Execution (Active locking, queue updates, and handoff). |
| **Nature** | Evaluates *what* needs to be done. | Orchestrates *how* workers pick and execute the tasks. |

## Planning vs. Dispatching

The operating system enforces a strict separation between planning and dispatching:
- **Planning**: A pure, side-effect-free dry-run process that determines *what* needs to be done. It decomposes a goal into a static mission plan structure without touching queues or executing jobs.
- **Dispatching**: The active runtime execution of the plan. It pushes missions to active worker queues, claiming locks, and executing capability actions.

## What is Static/Dry-Run in 1.0C

In Milestone 1.0C, the Mission Planner acts as a **dry-run engine** only:
- It generates static plan artifacts (`configs/ai-company/sample-mission-plan.1.0c.json`).
- It parses command-line arguments to simulate the decomposition process without performing actual execution.
- It enforces `dispatch_allowed = false` across all generated missions.

## Why Owner Approval Remains Required

Even though the Mission Planner validates safety rules statically, it cannot predict runtime side-effects. All planned missions that target approval-required actions (e.g., master branch merging, budget increases) or require external interaction must remain blocked under owner approval.
- **Merge Blocked**: Safe local code execution does not allow merging to master without `OWNER_APPROVED_MERGE_PR=<PR_NUMBER>`.
- **Deploy/Secrets/Spend/Comms/DB/Auto-Publish Blocked**: Reading `.env` files, production deployments, ad budget spend, external communications (email, SMS, customer contacts), auto-publishing content, and destructive database actions (DROP, TRUNCATE) remain strictly blocked.
