# AI Company OS: Capability Router

## What is the Capability Router?

The **Capability Router** is the runtime dispatch and scheduling engine of the AI Company OS. It bridges the gap between static plans and active queue execution by reading a structured mission plan, mapping each mission to its registered capability, and routing it to the appropriate factory execution queue.

## Connection to Mission Planner and Capability Registry

The Capability Router ties the static and dynamic parts of the system together:
- **Mission Planner (Milestone 1.0C)**: Generates a static mission plan with goals, mission lists, and dependency declarations. The router consumes this plan.
- **Capability Registry (Milestone 1.0B)**: Defines allowed actions, maturity boundaries, and parameters for each capability. The router validates that every planned mission has a matching, registered capability before starting execution.

## Routing and Local Queue Simulation

1. **Resolution**: The router maps each mission type (e.g. `REPO_AUDIT`) to its target capability in the registry (e.g. `dev_repo_audit`).
2. **Post-mapping validation**: It checks that `target_factory` and `owner_agent` match the registry exactly.
3. **Queue Ingestion**: It transforms the missions into local queue entries, preparing them for scheduling.
4. **Worker Simulation**: If requested (`--simulate-workers`), the router simulates worker threads that claim missions from the queue, executes local mock logic, and outputs result artifacts.

## Allowed Locally vs. Blocked Real-World Actions

Following our project-wide principle: **Fast by default, autonomous locally, strict at real-world side effects.**

### Allowed Locally
- Local in-memory queue claiming, transitions, and status updates.
- Execution simulation of local-safe capabilities (e.g., repository audits, technical research).
- Generation of local simulated result files (`reports/capability-router/latest.json`).
- Mock retries and backoff simulation.

### Blocked Real-World Actions
All actions implying external side-effects remain strictly blocked:
- **Production deployments** (Vercel, Railway, Docker push).
- **Secrets reading** (`.env` and `.env.*` reads/logs).
- **Destructive database actions** (DROP, TRUNCATE).
- **Ad/infrastructure spending**.
- **external communications** (email, SMS, customer contacts).
- **Auto-publishing** content.

## Why Milestone 1.0D is More Operational

Unlike previous phases which focused strictly on design and static checks, Milestone 1.0D introduces a working dry-run router. It simulates the active runtime pipeline of an operating system, making the OS feel alive and functional before plugging in real production queues or external integrations.
- It is still sandboxed (dry-run mode).
- No production state is modified, and no real worker queues are launched.
- It validates the operational schema in a local playground.
