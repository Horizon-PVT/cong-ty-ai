# Paperclip Integration Contract

## Overview

The Paperclip Integration Contract establishes the boundary and data transfer layer between the AI Company OS and the Paperclip Operator Dashboard.

This contract ensures that Paperclip remains the primary user interface and human-in-the-loop dashboard for the AI Company OS, while the OS remains the operating brain, managing mission planning, capability routing, provider routing, performance logs, hiring pipelines, and safety gates.

## Architectural Division

- **Paperclip**: UI / Dashboard / Human Interaction surface. Exclusively read-only for most components, only sending action approval mutations.
- **AI Company OS**: Brain / Execution Engine / Local Memory / Learning Loop / Staffing Engine / Owner Action Queue.

```
+------------------------------------------+
|            Paperclip Dashboard           |
|  (Consumes JSON status/action snapshot)  |
+--------------------+---------------------+
                     |
  (Exposes snapshot) | (Writes owner decisions)
                     v
+--------------------+---------------------+
|        AI Company OS Contract Layer      |
|  (Schemas, Fixtures, Adapter Outputs)   |
+------------------------------------------+
```

## Reading Snapshot Data

Paperclip reads the company status snapshot from local report/memory paths:
- Top-level company statistics (milestones, departments, active factories).
- Mapped capability workers, trial histories, scorecards.
- Provider performance scores, historical lessons.
- Detected staffing gaps, candidate details.

## Writing Decisions (Owner Action Queue)

When Paperclip approves an action, it writes the approval response to `owner-action-queue.jsonl`.
- **Approved actions**: merge, deploy, publish, spend, customer_comms, permanent_worker registration, live_api.
- Direct mutations to `configs/ai-company/capability-registry.json` by Paperclip are strictly forbidden; changes are applied by OS scripts after approval check.
