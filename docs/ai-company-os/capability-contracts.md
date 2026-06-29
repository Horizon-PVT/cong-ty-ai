# AI Company OS: Capability Contracts

This document defines the standard contract structure for all capabilities within the AI Company Operating System.

## Standard Capability Contract Schema

Every registered capability must adhere to the following template schema:

| Key | Description |
| --- | ----------- |
| `capability_id` | Unique string identifying the capability (e.g. `dev_task_implementation`). |
| `name` | Human-readable name of the service. |
| `factory_id` | Owner factory from the Organization Model (e.g. `ai_dev_factory`). |
| `owner_agent` | Executive agent who audits and authorizes this capability (e.g. `cto_agent`). |
| `purpose` | Description of what the capability accomplishes. |
| `accepted_mission_types` | Array of mission type strings matched by the Capability Router. |
| `required_inputs` | Array of parameters required to execute the task. |
| `output_artifacts` | Array of artifacts produced by successful execution. |
| `allowed_actions` | Scoped terminal commands, file reads/writes, or helper tools. |
| `blocked_actions` | Strictly forbidden operations (e.g. `deploy_production`, `read_secrets`). |
| `approval_required_actions` | Gates requiring explicit owner approval token (e.g. `code_merge_master`). |
| `safety_boundary` | Plain-text description of the safety sandbox. |
| `verifier_requirements` | Automated scripts verifying outputs before closeout. |
| `maturity_level` | Lifecycle state: `operational`, `draft`, or `planned`. |
| `handoff_target` | Default downstream capability or agent (e.g. `dev_pr_review` or `coo_agent`). |
| `failure_modes` | Handled exceptions, retries, and lock recovery behaviors. |

---

## Operational Capability Contracts (Engineering)

The following capability contracts are currently **operational** inside the `ai_dev_factory` and verified:

### 1. `dev_repo_audit`
- **Purpose**: Performing read-only scans of directories and files to assess codebase status.
- **Accepted Mission Types**: `REPO_AUDIT`, `STATIC_ANALYSIS`
- **Required Inputs**: `repo_path`
- **Output Artifacts**: `audit_report`
- **Allowed Actions**: `read_files`, `git_status`, `list_dir`
- **Blocked Actions**: `write_files`, `git_push`
- **Approval Required**: None
- **Maturity**: `operational`
- **Handoff Target**: `ceo_agent`

### 2. `dev_task_implementation`
- **Purpose**: Safe modification of source code files on a feature branch.
- **Accepted Mission Types**: `CODE_MODIFICATION`, `BUG_FIX`
- **Required Inputs**: `task_specification`, `allowed_files`
- **Output Artifacts**: `source_code_diff`
- **Allowed Actions**: `write_files`, `replace_file_content`, `git_commit`
- **Blocked Actions**: `deploy_production`, `read_secrets`, `modify_database`
- **Approval Required**: None (sandbox local run)
- **Maturity**: `operational`
- **Handoff Target**: `dev_pr_review`

### 3. `dev_pr_review`
- **Purpose**: Auditing PR diffs for compliance, typecheck correctness, and safety violations.
- **Accepted Mission Types**: `PR_REVIEW`, `STATIC_REVIEW`
- **Required Inputs**: `pr_number`
- **Output Artifacts**: `review_comments`
- **Allowed Actions**: `read_files`, `run_linter`
- **Blocked Actions**: `git_merge`
- **Approval Required**: None
- **Maturity**: `operational`
- **Handoff Target**: `dev_self_test_verification`

### 4. `dev_self_test_verification`
- **Purpose**: Executing automated test suites and baseline verifications.
- **Accepted Mission Types**: `RUN_TESTS`, `VERIFY_PHASE`
- **Required Inputs**: `phase_name`
- **Output Artifacts**: `self_test_report`
- **Allowed Actions**: `pnpm_test`, `node_verify_scripts`
- **Blocked Actions**: `spend_budget`, `external_api_calls`
- **Approval Required**: None
- **Maturity**: `operational`
- **Handoff Target**: `dev_e2e_merge_gate`

### 5. `dev_e2e_merge_gate`
- **Purpose**: Executing owner-approved merge and post-merge branch cleanups.
- **Accepted Mission Types**: `MERGE_PR`, `POST_MERGE_CLEANUP`
- **Required Inputs**: `pr_number`, `approval_token`
- **Output Artifacts**: `merge_report`
- **Allowed Actions**: `git_merge`, `git_branch_delete`
- **Blocked Actions**: `bypass_approval_token`, `delete_master`
- **Approval Required**: `code_merge_master` (requires matching `OWNER_APPROVED_MERGE_PR=<PR_NUMBER>`)
- **Maturity**: `operational`
- **Handoff Target**: `ceo_agent`
