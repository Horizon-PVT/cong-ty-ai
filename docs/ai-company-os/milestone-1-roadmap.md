# AI Company OS: Milestone 1 Roadmap

This document outlines the roadmap for transitioning from the single capability developer factory into the broader AI Company Operating System.

## Phase 1.0A: Organization Model
- **Goal**: Establish the foundational organization model, executive agent roles, factory catalog, and static validation schemas.
- **Deliverables**:
  - Organizational overview: `docs/ai-company-os/overview.md`
  - Organization model definition: `docs/ai-company-os/organization-model.md`
  - Milestone roadmap: `docs/ai-company-os/milestone-1-roadmap.md`
  - Closeout summary of Milestone 0.3: `docs/ai-company-os/milestone-0.3-closeout.md`
  - Static organization JSON schema: `configs/ai-company/organization-model.json`
  - Static verifier: `packages/db/src/_verify-1.0a.mjs`
- **Definition of Done**: All static verifications pass (`verify-1.0a` and self-test gate), and a Draft PR is successfully opened on GitHub.
- **What NOT to build yet**: Do not implement active runtime agent decision loops or capability routers.

## Phase 1.0B: Capability Registry
- **Goal**: Create a structured register of all technical and operational capabilities offered by the registered factories.
- **Deliverables**:
  - Capability Registry JSON file mapping capability IDs to factories.
  - Verifier check ensuring all capabilities map to active inputs.
- **Definition of Done**: Registry successfully parsed and loaded by verifiers.
- **What NOT to build yet**: Mission planning algorithm.

## Phase 1.0C: Mission Planner
- **Goal**: Implement the Mission Planner agent logic that decomposes high-level Goals into structured Mission JSONs.
- **Deliverables**:
  - Local task planner script parsing intake text goals.
  - Verification test suite executing simulated plan decompositions.
- **Definition of Done**: Planner outputs compliant sub-mission JSON schemas matching target schemas.
- **What NOT to build yet**: Automated routing.

## Phase 1.0D: Capability Router
- **Goal**: Build the routing engine that matches plan sub-missions to registered factories based on capability signatures.
- **Deliverables**:
  - Router script that distributes sub-missions into target factory queues.
  - Lock synchronization verifications across multiple factory queues.
- **Definition of Done**: Multi-queue routing test cases pass cleanly in real execution mode.
- **What NOT to build yet**: Shared cross-factory RAG memory.

## Phase 1.0E: Cross-Factory Memory
- **Goal**: Establish a shared knowledge base and RAG index allowing factories to collaborate and reuse context.
- **Deliverables**:
  - Local memory database index (e.g. SQLite or vector store stub).
  - Context retrieval verifiers.
- **Definition of Done**: Dev factory retrieves requirements written by Product factory.
- **What NOT to build yet**: Full UI Dashboard.

## Phase 1.0F: Company Dashboard
- **Goal**: Provide a local visual interface mapping the state of all factory queues, active logs, and token costs.
- **Deliverables**:
  - Web dashboard UI showing state transitions and cost metrics.
- **Definition of Done**: Dashboard renders active queue state in real time.
- **What NOT to build yet**: Owner command inputs.

## Phase 1.0G: Owner Command Center
- **Goal**: Provide the human owner with an interactive control console to trigger goal intake, review PRs, approve budgets, and input merge tokens.
- **Deliverables**:
  - Console CLI and UI portal.
  - Final end-to-end integration test suite.
- **Definition of Done**: Complete Goal-to-Merge pipeline runs autonomously with human gates verified.
