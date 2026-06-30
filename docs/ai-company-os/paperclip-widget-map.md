# Paperclip Widget Map

This document outlines the widget mapping config for Paperclip dashboards, detailing data paths and refresh modes for each panel.

## Widget Panels

### 1. Company Status
- **widget_id**: `company_status`
- **display_name**: Company Status Summary
- **purpose**: High-level snapshot of milestone progression and active departments.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.milestone_status`
- **refresh_mode**: `on_demand`
- **read_only**: `true`
- **owner_action_required**: `false`

### 2. Mission Board
- **widget_id**: `mission_board`
- **display_name**: Mission Board
- **purpose**: Mapped execution history and planned goals.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.org_summary`
- **refresh_mode**: `on_demand`
- **read_only**: `true`
- **owner_action_required**: `false`

### 3. Factories
- **widget_id**: `factories`
- **display_name**: Factory Registry
- **purpose**: Active factories and planned pipelines.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.org_summary.factories`
- **refresh_mode**: `on_demand`
- **read_only**: `true`

### 4. AI Staff
- **widget_id**: `ai_staff`
- **display_name**: Active AI Staff Mappings
- **purpose**: Maps roles and provider pools for executive agents and workers.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.executive_agents`
- **refresh_mode**: `on_demand`
- **read_only**: `true`

### 5. Provider Performance
- **widget_id**: `provider_performance`
- **display_name**: Provider Performance Log
- **purpose**: Quality, cost, latency metrics for cloud and local models.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.provider_summary`
- **refresh_mode**: `periodic`
- **read_only**: `true`

### 6. Learning Feed
- **widget_id**: `learning_feed`
- **display_name**: Learning Feed
- **purpose**: Recent lessons learned and provider switch suggestions.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.learning_summary`
- **refresh_mode**: `periodic`
- **read_only**: `true`

### 7. Staffing Gaps
- **widget_id**: `staffing_gaps`
- **display_name**: Detected Staffing Gaps
- **purpose**: Critical and minor skills gaps detected by the sweep.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.staffing_summary`
- **refresh_mode**: `periodic`
- **read_only**: `true`

### 8. Candidate Workers
- **widget_id**: `candidate_workers`
- **display_name**: Candidate Workers Queue
- **purpose**: Worker candidate profiles awaiting trial score reviews.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.staffing_summary`
- **refresh_mode**: `periodic`
- **read_only**: `true`

### 9. Worker Scorecards
- **widget_id**: `worker_scorecards`
- **display_name**: Worker Scorecards
- **purpose**: Trial outcomes and readiness scores for AI workers.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.workers`
- **refresh_mode**: `periodic`
- **read_only**: `true`

### 10. Owner Action Queue
- **widget_id**: `owner_action_queue`
- **display_name**: Owner Action Queue
- **purpose**: High risk approvals requiring owner decisions.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.owner_approval_queue`
- **refresh_mode**: `realtime`
- **read_only**: `false`
- **owner_action_required**: `true`

### 11. Safety Locks
- **widget_id**: `safety_locks`
- **display_name**: Safety Gate Locks Status
- **purpose**: Active execution barriers (deploy blocks, secret blocks).
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.risk_safety_locks`
- **refresh_mode**: `realtime`
- **read_only**: `true`

### 12. Next Actions
- **widget_id**: `next_actions`
- **display_name**: Recommended Next Actions
- **purpose**: Next recommended verification scripts and merge actions.
- **source_file**: `reports/company-status/latest.json`
- **source_json_path**: `$.next_recommended_actions`
- **refresh_mode**: `on_demand`
- **read_only**: `true`
