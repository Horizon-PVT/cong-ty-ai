# AI Company OS: Capability Registry

## What is the Capability Registry?

The **Capability Registry** is a static directory defining the operational and technical capabilities available across all factories in the AI Company OS. Each capability serves as a standardized API contract, declaring what inputs it requires, what outputs it produces, and what tools or actions it is allowed to perform under corporate safety limits.

## Why it Exists

An operating system with multiple autonomous factories requires a structured directory of services. Instead of hardcoding which agent calls which script, the AI Company OS uses a registry to decouple mission planning from factory execution.
1. **Decoupling**: The CEO Agent can plan goals using high-level capability signatures without knowing the underlying implementation details.
2. **Safety Auditing**: Blocked and approval-required actions are declared statically on a per-capability basis, allowing security/compliance agents to audit and block unsafe missions before execution.
3. **Maturity Lifecycle**: Statically maps capabilities from planned to draft to operational, controlling runtime availability.

## Connection to the Organization Model

The Capability Registry builds directly on top of the **Organization Model** established in Milestone 1.0A:
- Every capability is owned by exactly one **Factory** defined in the organization model.
- Every capability belongs to the jurisdiction of a specific **Executive Agent** (e.g., engineering capabilities are owned by the CTO Agent, media capabilities by the CMO Agent).
- Routing rules map directly back to the corporate safety boundaries.

## Registry vs. Router

| Concept | Capability Registry (Milestone 1.0B) | Capability Router (Milestone 1.0D) |
| ------- | ----------------------------------- | --------------------------------- |
| **Purpose** | Defines *what* capabilities exist and their API contracts. | Decides *how* to dispatch active missions to registries. |
| **Nature** | Static catalog (declared JSON schemas and documentation). | Dynamic runtime engine (executing queue dispatches). |
| **Logic** | Validates structure, signatures, and safety boundaries. | Resolves live worker locks, heartbeats, and queue state. |

## What is Static in 1.0B

This milestone (1.0B) focuses entirely on establishing:
- The capability contract specifications (`docs/ai-company-os/capability-contracts.md`).
- The JSON configuration schemas (`configs/ai-company/capability-registry.json` and its validating schema).
- Verifier checks confirming integrity and completeness.

## Safety Safeguards & Boundaries

To protect repository and system integrity, several actions are strictly blocked across all capabilities:
- **No deployment**: Operations like Vercel, Railway, or Docker push are blocked.
- **No secrets**: Reading or printing `.env` files or API secrets is strictly blocked.
- **No destructive DB actions**: No DROP or TRUNCATE database allowed.
- **No spend**: Infrastructure or ad budget spending is blocked.
- **No external communications**: No sending emails, SMS, or client messages.
- **No auto-publish**: No automatic publishing of generated marketing assets.

## What is Intentionally Not Built Yet

- **Dynamic Router**: No active dispatch logic is created.
- **Mission Planner**: No agent loops exist to break goals down into these capability units.
- **Handoff Executors**: No runtime engine handles active mission handoffs between factories yet.
