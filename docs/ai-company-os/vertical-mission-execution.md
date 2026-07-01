# Vertical Mission Execution

This document details the E2E vertical execution pipeline of AI Company OS.

## Execution Lifecycle

```
[Owner Input] -> [CEO Briefing] -> [Decomposition] -> [Routing & Selection] 
                      |
                      v
              [Worker Execution] -> [Artifact Gen] -> [Verification] 
                      |
                      v
              [Hermes Learning] -> [Paperclip Update] -> [Owner Action Queue]
```

### 1. Owner Mission Input
Every vertical mission starts with a structured JSON input from the owner containing the high-level goals, target artifacts, required capabilities, and safety requirements.

### 2. CEO Briefing
The CEO agent translates the raw owner input into an operational mission brief, establishing context, goals, and constraints.

### 3. Capability Decomposition
The mission is decomposed into specific capability steps mapped to standard catalog definitions.

### 4. Routing & Provider Selection
The capability router matches each step with optimal candidate workers and runtime providers using performance metrics.

### 5. Worker Execution & Artifact Generation
Selected workers execute tasks locally and output concrete, deterministic business deliverables (e.g., reports, backlog files).

### 6. Review, Test & Verification
Outputs are ran through verification scripts to check for compliance, formatting errors, and safety constraints.

### 7. Learning (Hermes CLO)
Outcome evaluations are processed by Hermes to update local lessons, provider scores, and routing tables.

### 8. Paperclip Update & Owner Action Queue
Payloads are emitted to update Paperclip widget dashboards. If actions require human-in-the-loop decisions, they are routed to the Owner Action Queue.

### 9. Self-Test / Auto-Verification Loop
Verification steps and pre-merge simulations run repeatedly in a local loop until stable convergence is reached, preventing manual review of buggy code.
