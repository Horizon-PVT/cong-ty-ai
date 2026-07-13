# Paperclip / AI Company OS Roadmap To Done

Date: 2026-07-13
Audience: Owner, product leadership, engineering leads
Status: planning synthesis from current repository docs

## Executive Summary

Paperclip is the control plane for autonomous AI companies. The repo has already shipped or advanced many foundational pieces: plugin system, OpenClaw-style agents, company import/export, AGENTS.md configuration, skills manager, scheduled routines, better budgeting, reviews/approvals, and multiple human users. The remaining work is not one feature; it is the path from a powerful developer-facing control plane to a complete AI Company OS that an owner can install, trust, operate, scale, and eventually reuse through an ecosystem.

From now to "Done", the project should be treated as **7 remaining phases**:

1. **V1 Release Hardening** - prove the existing control-plane loop is reliable, auditable, and release-ready.
2. **First Five Minutes** - make onboarding produce a live company and first successful agent action quickly.
3. **Output-First Work Management** - make artifacts, work products, previews, and enforced outcomes first-class.
4. **Runtime Safety And Scaled Execution** - harden heartbeats, cost controls, cloud/sandbox agents, auto mode, planning, and queues.
5. **Company Memory And Organizational Learning** - give companies durable memory, reusable playbooks, and learning loops.
6. **Shared / Cloud / Desktop Operations** - make Paperclip usable by teams in persistent shared environments.
7. **Ecosystem And ClipHub** - turn company templates, agents, skills, and plugins into a reusable marketplace-style ecosystem.

The practical definition of Done is:

- a non-expert owner can create or install a company,
- configure agents safely,
- assign goals,
- see work happen,
- inspect outputs,
- control spend,
- intervene when needed,
- run the system locally or in a shared deployment,
- and reuse or publish company patterns through a template ecosystem.

## Current Baseline

The current Paperclip direction is clear:

- Paperclip is a **control plane**, not an agent runtime.
- A **company** is the first-order unit.
- Work flows through **issues, comments, goals, approvals, heartbeats, budgets, and activity logs**.
- Agents run through adapters: local CLI/session adapters, HTTP/process-style adapters, OpenClaw-style gateway, and external adapter plugins.
- The core should stay thin; rich edge capabilities such as knowledge, chat, custom tracing, queues, and special workflows should live in plugins where possible.

The repo docs also show that the original V1 sequence is partly outdated because several systems once planned as future work have already shipped or advanced materially. This roadmap therefore starts from the current product shape rather than repeating the original V1 backlog as if nothing exists.

## Phase Overview

| Phase | Name | Goal | Owner-Level Outcome |
|---|---|---|---|
| 1 | V1 Release Hardening | Make the current control-plane loop dependable enough to call V1 complete. | Owner can run a small AI-native company end to end with clear control. |
| 2 | First Five Minutes | Replace configuration-first setup with guided onboarding and a real first job. | Owner reaches first successful agent action without hand-editing config. |
| 3 | Output-First Work Management | Make deliverables visible and enforce real completion. | Owner sees files, previews, reports, PR links, and decisions instead of vague status. |
| 4 | Runtime Safety And Scaled Execution | Make autonomy safe, interruptible, cost-aware, and scalable across runtimes. | Owner can let agents work longer without hidden token burn or unclear state. |
| 5 | Company Memory And Organizational Learning | Capture prior decisions and work patterns into durable company memory. | Company improves over time instead of forgetting every run. |
| 6 | Shared / Cloud / Desktop Operations | Make the same product usable locally, privately, publicly, and persistently. | Teams can operate Paperclip as a real shared system. |
| 7 | Ecosystem And ClipHub | Enable reusable companies, agents, skills, plugins, and templates. | Users can install a proven company instead of building every org from scratch. |

## Phase 1: V1 Release Hardening

### Objective

Finish the current V1 contract and remove blockers that would make the product feel unreliable, unsafe, or unclear in real use.

### Why This Matters

Paperclip already has many of the required primitives. The risk is not that the product lacks ambition; the risk is that the loop is not yet proven tightly enough for owners to trust it with autonomous work and real spend.

### Scope

- Verify company-scoped data boundaries across API, server services, UI, and agent API keys.
- Confirm task checkout is conflict-safe and returns correct `409` behavior on concurrent claims.
- Confirm agents can read/update tasks, add comments, and report costs using API keys only.
- Confirm board approval and rejection flows work for hires, strategy proposals, and review gates.
- Confirm budget hard limits pause agents and block new invocations.
- Confirm dashboard counts, spend, active work, and approval state are computed from live DB data.
- Confirm all mutating actions write activity log entries.
- Confirm embedded PostgreSQL and external PostgreSQL paths both work.
- Keep release verification explicit: typecheck, tests, build, and focused e2e checks for changed flows.

### Deliverables

- Release gate checklist mapped to `doc/SPEC-implementation.md`.
- Regression suite covering auth boundaries, checkout races, budget hard stop, pause/resume, and dashboard consistency.
- Seed/demo company templates for local testing.
- Updated release docs and owner-facing quickstart.

### Done Criteria

- A board user can create multiple companies and switch between them.
- A company can run at least one heartbeat-enabled agent.
- Agent actions are auditable and company-scoped.
- Budget enforcement is visible and reliable.
- V1 release candidate can pass the required test/build gate.

### Main Risks

- Hidden cross-company access bugs.
- Budget enforcement that works in UI but not in runtime.
- Raw transcript-heavy UX that makes the product look less mature than the underlying system.

## Phase 2: First Five Minutes

### Objective

Make a fresh owner go from install to a live, useful first agent action in under five minutes.

### Why This Matters

The current product is powerful, but a blank dashboard or config-first setup makes users do too much conceptual work before seeing value. An AI Company OS should feel like starting a company, not wiring a framework.

### Scope

- Replace configuration-first onboarding with interview-first onboarding.
- Ask a small number of questions:
  - What are you building?
  - Is this a startup, agency, or internal team?
  - Are you solo, shared/private, or public/cloud?
  - Do you want hands-on, hybrid, or full-auto autonomy?
  - Which runtime do you want to start with: Claude, Codex, OpenClaw, or other?
- Detect installed CLIs, available provider credentials, and runtime health.
- Recommend local, private, or public deployment mode.
- Generate a starter company:
  - company
  - company goal
  - CEO or operator agent
  - first report or founding engineer
  - first task
- Generate an LLM handoff prompt or onboarding text for setup help.
- End onboarding with a real first task being executed or queued.

### Deliverables

- Guided onboarding UI.
- `paperclipai run` path that performs onboarding, doctor checks, repair, and server start.
- Prescriptive runtime/provider errors.
- Starter templates for startup, agency, and internal team modes.
- First-job success screen that shows the created task, running agent, spend estimate, and next action.

### Done Criteria

- Fresh install does not require manual JSON editing for the default path.
- Owner sees a real company object, real agent, and real first task.
- Missing dependencies are detected and explained with concrete fixes.
- Blank dashboard is no longer the default first experience.

### Main Risks

- Over-asking questions and recreating setup complexity.
- Forcing provider/API-key decisions before the user sees value.
- Treating all users as developers when owners may only care about the company outcome.

## Phase 3: Output-First Work Management

### Objective

Make work completion concrete: files, reports, previews, PR links, screenshots, documents, decisions, and approval outcomes should be first-class product objects.

### Why This Matters

An AI company is only useful if the owner can inspect what it produced. "Agent ran" is not a business outcome. Paperclip needs to make outputs visible and enforce what counts as done.

### Scope

- Introduce or consolidate an artifact/work product model for:
  - uploaded files
  - generated files
  - reports
  - screenshots
  - preview URLs
  - PR links
  - generated documents
- Add a Deliverables section to issue and run pages.
- Support non-image attachments such as Markdown, text, JSON, CSV, PDF, HTML, and archives where safe.
- Register generated static sites or app previews as work products.
- Connect project execution workspaces to issue outputs.
- Add "enforced outcome" semantics:
  - done means a concrete artifact, decision, merged PR, published doc, or explicit no-op disposition exists.
  - vague status updates should not silently mark real work complete.
- Add deep planning surfaces:
  - revisionable plans
  - plan approval
  - decomposition into child issues
  - plan-to-execution traceability.

### Deliverables

- Artifact/work product schema and API.
- Issue Deliverables panel.
- Project Files or Outputs tab.
- Preview URL registration flow.
- Outcome requirement metadata on issues or issue types.
- Planning document lifecycle for strategy-heavy work.

### Done Criteria

- Agents can attach and surface useful deliverables without pasting everything into comments.
- Owner can open/download produced outputs from the issue page.
- A generated static site or app preview can be opened directly from the task.
- Done work has an inspectable result or explicit reason.

### Main Risks

- Building a full IDE or GitHub replacement instead of a focused handoff layer.
- Letting artifacts become ungoverned storage without company scoping, provenance, and retention rules.
- Treating raw logs as the primary evidence of value.

## Phase 4: Runtime Safety And Scaled Execution

### Objective

Make agents safer and more scalable: fewer wasted model calls, clearer runtime state, stronger budget enforcement, remote/sandbox execution, interrupt/resume, deep planning, and queue-style work streams.

### Why This Matters

Autonomy without strong runtime safety becomes expensive and hard to trust. This phase turns Paperclip from "can launch agents" into "can operate agents continuously."

### Scope

- Harden deterministic wake gating:
  - do not call a model when no actionable input exists.
  - cheap checks before expensive reasoning.
  - explicit wake reasons such as new assignment, new comment, mention, approval resolved, schedule, or manual wake.
- Add circuit breakers:
  - max consecutive no-progress runs.
  - max consecutive failures.
  - token velocity spikes.
  - visible pause reason and activity log.
- Improve budget contract:
  - 80% warning.
  - 100% hard stop.
  - board override with audit trail.
- Add auto mode semantics:
  - continue while budget, approvals, and liveness allow.
  - stop cleanly when blocked.
  - show waiting input, waiting approval, paused, running, failed, and cancelled states clearly.
- Add interrupt/resume:
  - board can correct an active run.
  - continue current session when adapter supports it.
  - restart from scratch when needed.
- Add cloud/sandbox runtime support:
  - remote sandbox driver.
  - runtime health page.
  - adapter capability matrix.
  - cloud agent support without changing Paperclip's company/task model.
- Add work queues:
  - intake queues for support, triage, review, backlog, or recurring inputs.
  - routing rules to teams or agents.
  - queue work still resolves to issues/comments/approvals.
- Continue evaluating optional runtime substrates such as `agentos_local`, capability-based permissions, snapshot-backed execution roots, and typed host tools.

### Deliverables

- Wake detector module.
- Checkout/lock manager hardening.
- Adapter runner/session manager separation.
- Cost recorder and breaker evaluator.
- Runtime health UI.
- Remote sandbox reference adapter.
- Interrupt/resume UI and API.
- Queue model and first queue surfaces.

### Done Criteria

- Idle companies do not generate unnecessary model calls.
- Budget hard-stop behavior is deterministic and visible.
- Board can interrupt an active run without losing context when the adapter supports resume.
- Remote/sandbox agents can run at least one real workflow.
- Queue-style work can be routed without bypassing company governance.

### Main Risks

- Runtime complexity blurring the boundary between control plane and execution plane.
- Hidden autonomy that surprises owners with spend or state changes.
- Supporting too many runtimes before the runtime contract is stable.

## Phase 5: Company Memory And Organizational Learning

### Objective

Give each company durable, inspectable memory and a path to learn from completed work.

### Why This Matters

An AI company should improve with use. Without memory and learning, agents repeat mistakes, forget decisions, and require the owner to restate context.

### Scope

- Add company-scoped memory bindings.
- Support company default memory plus optional per-agent overrides.
- Keep providers pluggable:
  - local markdown-first provider.
  - hosted provider plugin examples.
  - future vector or graph-backed providers.
- Add memory hooks:
  - pre-run hydrate.
  - post-run capture.
  - issue comment capture.
  - issue document capture.
  - manual capture.
- Log memory operations with provenance:
  - company.
  - agent.
  - project.
  - issue.
  - run.
  - source object.
  - cost/usage where applicable.
- Add memory browse/inspect UI:
  - bindings.
  - recent operations.
  - records.
  - query results.
  - source backlinks.
  - extraction job status.
- Add organizational learning:
  - capture successful playbooks.
  - suggest recurring routines.
  - summarize repeated blockers.
  - propose updates to skills, agent configs, and templates.

### Deliverables

- Memory adapter contract.
- Memory binding tables and APIs.
- Hook delivery and operation audit.
- Local built-in provider.
- One external provider example.
- Memory settings and explorer UI.
- Learning report or review routine.

### Done Criteria

- Agents can retrieve relevant prior company context before a run.
- Owner can inspect what memory was written and why.
- Memory is company-scoped by default and does not leak across companies.
- Completed work can become reusable playbooks, notes, or routine suggestions.

### Main Risks

- Silent capture that stores too much or surprises the user.
- Vendor-specific memory semantics leaking into Paperclip core.
- Duplicate cost accounting between memory calls and normal run usage.

## Phase 6: Shared / Cloud / Desktop Operations

### Objective

Make Paperclip operationally real for teams: shared private deployments, public/cloud deployments, persistent desktop access, storage/secrets/backup posture, and observable runtime health.

### Why This Matters

Local-first is valuable, but an AI Company OS needs to be usable beyond one terminal on one machine. Teams need shared access, safe auth, backups, health checks, and a deployment story that does not require rethinking the product.

### Scope

- Make deployment modes product-complete:
  - local trusted.
  - authenticated private.
  - authenticated public.
- Improve multi-human collaboration:
  - coarse company roles.
  - user attribution.
  - invite flow.
  - company membership boundaries.
  - avoid enterprise-grade RBAC until needed.
- Improve cloud deployment:
  - managed Postgres recipe.
  - object storage recipe.
  - public URL config.
  - auth/exposure validation.
  - runtime reachability checks.
- Improve secrets:
  - provider vault health.
  - strict mode guidance.
  - no inline secret leakage.
  - backup/restore docs for keys and DB.
- Improve backup/disaster recovery:
  - DB backups.
  - local storage backups.
  - secret key backup.
  - restore smoke test.
- Desktop app:
  - persistent local UI.
  - easier service lifecycle.
  - notifications for approvals, blocked work, budget warnings, and completed deliverables.

### Deliverables

- Deployment settings page.
- Health/doctor dashboard.
- Team invite and membership management.
- Production-ready deployment recipes.
- Backup and restore verification path.
- Desktop packaging plan and initial app.

### Done Criteria

- A team of multiple humans can operate one instance safely.
- Public/private deployment misconfiguration is caught before exposure.
- Backups can be restored in a documented smoke path.
- Owner can keep Paperclip running persistently without babysitting terminal sessions.

### Main Risks

- Overbuilding enterprise RBAC too early.
- Cloud deployment complexity outrunning the product's support capacity.
- Desktop app becoming a separate product instead of an ergonomic shell around the same OS.

## Phase 7: Ecosystem And ClipHub

### Objective

Turn reusable companies, agents, skills, plugins, and templates into an ecosystem that compounds.

### Why This Matters

The fastest path to useful AI companies is not making every owner design an org from scratch. The long-term leverage comes from installing proven company patterns, adapting them, and publishing improvements back to the ecosystem.

### Scope

- ClipHub / template registry:
  - browse templates.
  - inspect org chart and agents.
  - install company templates.
  - install individual agent/team packages.
  - stars, download counts, versioning, and moderation.
- Publishing:
  - export company as a portable package.
  - scrub secrets.
  - validate package.
  - publish through CLI or web UI.
- Forking and lineage:
  - fork existing company templates.
  - publish variants.
  - preserve lineage.
- Plugin marketplace direction:
  - public distribution after local/self-hosted plugin runtime is stable.
  - permission declarations.
  - auditability.
  - compatible UI slots.
- Curated starter companies:
  - SaaS dev shop.
  - internal automation team.
  - content/marketing team.
  - research analyst team.
  - QA/release team.
- Template quality signals:
  - version history.
  - verification badge.
  - sample outputs.
  - expected runtime/provider requirements.
  - budget estimate.

### Deliverables

- ClipHub V1 registry.
- `paperclipai install cliphub:<publisher>/<slug>` command.
- `paperclipai publish` flow.
- Template detail page.
- Semantic search.
- Basic moderation and reporting.
- Verified starter templates.
- Public plugin distribution plan.

### Done Criteria

- Owner can install a working company template in minutes.
- Experienced users can publish templates safely without leaking secrets.
- Templates are versioned, searchable, and inspectable before install.
- Ecosystem contributions improve the next user's starting point.

### Main Risks

- Publishing unsafe templates that hide malicious adapter config or secret handling.
- Building a marketplace before local import/export and package validation are reliable.
- Confusing ClipHub as a runtime instead of a registry.

## Cross-Phase Product Principles

These principles should constrain every phase:

1. **Company is the unit of organization.**
   Every core entity must stay company-scoped.

2. **Board governance stays central.**
   Humans can pause, approve, override, inspect, and audit.

3. **Work stays attached to work objects.**
   Even conversational UX should resolve to issues, comments, documents, approvals, decisions, or artifacts.

4. **Outputs beat transcripts.**
   Raw logs are useful for debugging, but the product surface should lead with goals, plans, steps, deliverables, cost, blockers, and decisions.

5. **Control plane, not execution plane.**
   Paperclip coordinates agents. Adapters and runtimes execute work.

6. **Safe autonomy.**
   More autonomy is good only when budgets, approvals, liveness, and audit trails remain clear.

7. **Thin core, rich edges.**
   Plugins should absorb specialized knowledge bases, rich chat, tracing, custom queues, document editors, and domain-specific tools when they are not fundamental control-plane concepts.

## Suggested Sequencing

### Immediate

1. Finish Phase 1 release hardening.
2. Start Phase 2 onboarding in parallel only where it does not destabilize V1.
3. Close obvious artifact/work-product gaps from Phase 3 because they directly affect owner trust.

### Next

1. Runtime safety from Phase 4.
2. Output-first enforcement from Phase 3.
3. Shared/private deployment hardening from Phase 6.

### Later

1. Memory and organizational learning from Phase 5.
2. Desktop and public cloud maturity from Phase 6.
3. ClipHub ecosystem from Phase 7.

## Definition Of Done For The Whole AI Company OS

The project should be considered Done when Paperclip can satisfy all of these owner-level scenarios:

1. **Start**
   Owner installs Paperclip, answers a few questions, and gets a company with a goal, CEO/operator agent, first worker, budget, and first task.

2. **Operate**
   Owner can see who is working, why the work matters, what it costs, what is blocked, and what needs approval.

3. **Trust**
   Agents cannot silently spend beyond budget, cross company boundaries, or keep running when paused.

4. **Inspect**
   Every meaningful action has activity history, owner attribution or agent attribution, and source object provenance.

5. **Receive Outputs**
   Work produces visible artifacts, previews, reports, decisions, PR links, or explicit dispositions.

6. **Scale**
   The same company model works for one local owner, a private team, or a public/cloud deployment.

7. **Learn**
   The company remembers prior decisions and turns completed work into reusable knowledge, routines, and skills.

8. **Reuse**
   Owner can install, export, publish, fork, and improve reusable company templates, agents, skills, and plugins.

## Key Source Documents

- `doc/GOAL.md`
- `doc/PRODUCT.md`
- `doc/SPEC-implementation.md`
- `doc/SPEC.md`
- `ROADMAP.md`
- `README.md`
- `doc/CLIPHUB.md`
- `doc/DEVELOPING.md`
- `doc/DATABASE.md`
- `doc/plans/2026-03-13-features.md`
- `doc/plans/2026-03-17-memory-service-surface-api.md`
- `doc/plans/2026-04-08-agent-os-follow-up-plan.md`
- `doc/plans/2026-04-08-agent-os-technical-report.md`
