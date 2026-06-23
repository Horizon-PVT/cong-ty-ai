# AI Company Autonomy Model & Execution Policy

## Purpose of the AI Company OS
The Cong Ty AI Operating System (AI Company OS) is designed to operate an autonomous agentic organization. The system delegates routine tasks, planning, implementation, review, and verification to a coordinated team of AI agents, freeing human owners to focus on high-level goals, strategy, and critical decision-making.

## High-Level Goal Model
1. **High-Level Goals**: The human owner sets the overall direction of the company by creating high-level parent issues/goals.
2. **Autonomous Decomposition**: Once a high-level goal is assigned to the orchestrator, the agents autonomously decompose the work into specific role-appropriate child tasks, execute them, review the changes, perform local QA verification, and report the outcomes.

## Agent Roles
- **JARVIS Strategy Advisor (CEO/Orchestrator)**: Coordinates overall workflow, performs issue decomposition, assigns tasks to downstream agents, resumes/wakes/pauses them, and prevents duplicate executions.
- **Codex Developer (Engineer/Executor)**: Develops code, scripts, and documentation on a feature branch.
- **Claude Reviewer (Engineer/Reviewer)**: Audits architecture, code quality, and security risks.
- **Antigravity QA (Engineer/Verifier)**: Performs route-aware browser verification, regression testing, and local unit test validation.
- **Report Bot (Operator/Reporter)**: Summarizes downstream agent outputs, tracks task statuses, and reports overall progress to the owner.

## Autonomous Action Policy (No Owner Approval Required)
The following actions are authorized to run autonomously without prompting the human owner:
- Internal task decomposition by JARVIS.
- Child task assignment to downstream agents.
- Creating and modifying code, scripts, or assets on a non-master feature branch (by a future real Codex adapter).
- Local build, compilation, typechecking, and test suite execution.
- Making local commits to non-master feature branches.
- Pushing feature branches to remote repositories.
- Opening or updating Draft Pull Requests (PRs).
- Automatic code/diff review by Claude Reviewer.
- Automatic local QA and browser-flow verification by Antigravity QA.
- Operator status reporting and progress summaries by Report Bot.

## Critical Gates (Strictly Requiring Owner Approval)
The agents are forbidden from executing the following actions without explicit, manual approval from the human owner:
- **Merge to Master**: Merging feature branches into the main `master`/production branch.
- **Production Deploy**: Deploying changes to production or staging environments.
- **Destructive DB Changes**: Dropping tables, deleting databases, truncating schemas, or destroying production data.
- **Secrets/API Keys**: Reading, writing, or updating `.env` files, KMS configs, API keys, or security credentials.
- **Financial/Spend Commitments**: Initiating advertising, server/infrastructure upgrades, paid API provider plans, or other billing items exceeding the pre-configured budget.
- **External Communication**: Sending emails, messages, or notifications to actual external clients, customers, or third-party stakeholders.
- **Autonomy & Budget Policies**: Modifying agent budgets, changing the execution mode (e.g. from local_trusted to production), or updating this autonomy model.

## Safe Branch Execution Policy
Under this internal execution policy, the real Codex execution adapter is permitted to perform code changes autonomously, provided those changes are restricted to isolated, non-master feature branches. Edits, commits, and branch updates on these safe feature branches are allowed without owner approval.

## Draft PR Policy
Agents are authorized to push safe feature branches to the remote repository and automatically create or update Draft Pull Requests (PRs). This facilitates review by peer agents and the human owner before any code reaches the master branch.

## Loop-Based Execution Model
The AI OS operates in an execution loop where tasks are proposed, implemented on feature branches, compiled, typechecked, and verified via local QA and regression checks. If checks fail, agents attempt up to 3 fix cycles before reporting a blocker to the operator.

## Future Real Adapter Roadmap
While the initial phases utilize mock runtimes for Codex, Claude, and Antigravity QA, the system architecture is structured to seamlessly plug in real AI execution adapters (e.g. Codex API, Claude API, local Playwright test executors) under the same action-aware permission gates.
