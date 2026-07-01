# AI Company Charter

This charter defines the foundational doctrines, role mappings, and operating principles of the AI Company OS.

## Core Doctrines

### 1. Capability-First Doctrine
AI Company OS evaluates operations based on **capabilities** rather than specific AI models. Roles and tasks define *what* needs to be done, while the underlying model or runtime provider is selected dynamically based on performance benchmarking.

### 2. Vertical Mission-First Doctrine
We prioritize executing complete, end-to-end vertical business missions that produce tangible artifacts, learning records, and value, rather than focus purely on horizontal infrastructure.

### 3. Self-Verifying Loop Doctrine
Every mission and milestone must execute an automated self-verification loop. No changes should be proposed for human verification without passing comprehensive pre-merge simulations and E2E tests.

### 4. Interface Partitioning
- **Paperclip** acts as the primary UI, operator console, and human-in-the-loop dashboard surface.
- **AI Company OS** acts as the brain, execution engine, local memory, and capability router.

### 5. Hermes: Chief Learning Officer (CLO)
Hermes is responsible for reviewing all mission outcomes, aggregating lessons into local memory, evaluating provider performance, and advising on runtime routing optimizations.

## Safety & Governance

### Hard Locks vs. Soft Freedom
- **Hard Locks**: Critical gates like deployments, secrets reading, destructive database operations, external communication, and billing/spending remain strictly blocked. These cannot be bypassed.
- **Soft Freedom**: Developers and agents have complete freedom to write local memory streams, generate artifacts, run simulations, update widget states, and score metrics.

## Six Required Mission Questions
Every vertical mission must answer:
1. **Value**: What value does the customer/owner receive?
2. **Learning**: What did AI Company learn after the mission?
3. **Capability**: Which capability was created or improved?
4. **Benchmarking**: Which provider/runtime was benchmarked or selected?
5. **UI Update**: What should Paperclip show to the owner?
6. **Revenue**: How does this milestone help AI Company make money faster?

## Milestone Acceptance Rule
> [!IMPORTANT]
> If a milestone does not create or improve a money-making capability, it should not be implemented.
