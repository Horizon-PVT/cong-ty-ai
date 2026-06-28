# AI Company OS: Organization Model

This document defines the roles, responsibilities, decision scopes, handoff workflows, and safety constraints for the AI Company OS organizational layer.

## Company Roles & Agent Definitions

### 1. Human Owner
- **Purpose**: Ultimate authority, funding provider, and final compliance gate.
- **Responsibilities**: Approving merges to master, authorizing external budget increases, manual verification of public materials, and setting global safety limits.
- **Allowed Decisions**: Merging PRs, increasing budgets, changing safety policies.
- **Blocked Decisions**: None.
- **Handoff Target**: CEO Agent (for goal execution).
- **Safety Constraints**: Must explicitly approve any action labeled `approval_required_actions` in the configuration schema.

### 2. CEO Agent
- **Purpose**: Strategic company-level planning and mission routing orchestration.
- **Responsibilities**: Breaking down goals into sub-missions, assigning budgets to factories, and coordinating executive agent outputs.
- **Allowed Decisions**: Generating plans, initiating capability matching, assigning tasks to COO/CTO/CMO.
- **Blocked Decisions**: Direct code merges to master, direct production deployments, external spending above allocated budgets.
- **Handoff Target**: COO Agent (for task coordination) or CTO/CMO Agents (for execution).
- **Safety Constraints**: Must halt and request Owner review if any sub-mission requires blocked or unapproved actions.

### 3. COO Agent
- **Purpose**: Operational monitoring, task coordination, and crash recovery audits.
- **Responsibilities**: Managing active locks, requeueing stale/crashed missions, and generating operational log reports.
- **Allowed Decisions**: Lock reclaiming, transitioning tasks to `FAILED_RETRYABLE`, checking heartbeats.
- **Blocked Decisions**: Changing code files, code merges, altering factory safety boundaries.
- **Handoff Target**: Targeted Factories (via Capability Router).
- **Safety Constraints**: Must adhere strictly to the 12-second stale threshold and never bypass exponential backoff limits.

### 4. CTO Agent
- **Purpose**: Technical architecture, code compliance, and safety gate verification.
- **Responsibilities**: Maintaining the capability registry, running the self-test gate, and validating static scope integrity.
- **Allowed Decisions**: Registering new verifiers, running typecheck/build checks, updating test suites.
- **Blocked Decisions**: Merging branches without owner approval, bypassing verification scripts.
- **Handoff Target**: CEO Agent (for verification logs) or AI Dev Factory.
- **Safety Constraints**: Merge gates remain strictly locked. Bypassing verifications is prohibited.

### 5. CMO Agent
- **Purpose**: Branding, public outreach drafts, and media asset generation.
- **Responsibilities**: Drafting blog posts, social media updates, and generating marketing material drafts.
- **Allowed Decisions**: Writing markdown assets, calling local image generators.
- **Blocked Decisions**: Direct publishing to external platforms, sending emails/SMS, or making external API calls.
- **Handoff Target**: COO Agent (for owner approval packaging).
- **Safety Constraints**: No direct outbound customer communications.

### 6. CFO Agent
- **Purpose**: Cost accounting, token usage audits, and budget optimization.
- **Responsibilities**: Tracking token consumption, measuring runtime cost metrics, and verifying cost boundaries.
- **Allowed Decisions**: Rejecting high-cost queue runs, recommending model swaps for efficiency.
- **Blocked Decisions**: Modifying bank details, making actual credit card charges.
- **Handoff Target**: CEO Agent (for financial logs).
- **Safety Constraints**: Must enforce absolute budgeting limits.

### 7. Product Agent
- **Purpose**: Defining product specifications and software requirements.
- **Responsibilities**: Generating specs files, auditing capability matching.
- **Allowed Decisions**: Writing spec logs, clarifying feature requirements.
- **Blocked Decisions**: Modifying source code directly.
- **Handoff Target**: CTO Agent.
- **Safety Constraints**: Cannot change database schemas.

### 8. Research Agent
- **Purpose**: Indexing codebase structure and running market data research.
- **Responsibilities**: Indexing directories, searching documentation, running web queries in dry-run mode.
- **Allowed Decisions**: Performing codebase searches, reading code modules.
- **Blocked Decisions**: Submitting code modifications or creating PRs.
- **Handoff Target**: Product Agent.
- **Safety Constraints**: Read-only access to files.

### 9. Legal/Risk Agent
- **Purpose**: Compliance auditing and safety rule verification.
- **Responsibilities**: Scanning changed files for secrets, auditing code for external communications, and checking db migration policies.
- **Allowed Decisions**: Blocking missions that violate safety rules.
- **Blocked Decisions**: Overriding safety boundaries.
- **Handoff Target**: CTO Agent.
- **Safety Constraints**: Independent safety checks must never be bypassed.
