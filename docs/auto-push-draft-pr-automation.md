# Auto Push & Draft PR Automation

The Auto Push & Draft PR Automation workflow automatically pushes feature branches and prepares Draft PRs on GitHub after a feature branch successfully passes the Autonomous Self-Test Gate.

## Purpose
To eliminate the manual steps of pushing git branches and running the GitHub CLI (`gh`) to open a Draft PR. This completes the autonomous local loop from goal decomposition to Draft PR submission.

---

## Workflow

1. **Verify Self-Test Results**:
   Loads `reports/self-test/latest.json` and ensures:
   - `finalVerdict` is a passing state (`PASS_READY_FOR_DRAFT_PR` or `PASS_READY_FOR_OWNER_REVIEW`).
   - All checklist commands were executed for real (`executionMode: "real"`) and passed (`status: "PASS"`).
   - `canMerge` is strictly `false`.
   - `criticalGatesBlocked` is strictly `true`.

2. **Generate PR Body**:
   Generates a Markdown file `reports/self-test/pr-body.md` summarizing:
   - The verified branch name.
   - The test checklist execution results.
   - Confirmation of safety guardrails (owner gates remain secure).

3. **Push to Remote**:
   Pushes the current branch to `origin` using `git push -u origin <branch>`.

4. **Open Draft PR**:
   Creates a Draft PR using the `gh` CLI:
   ```bash
   gh pr create --draft --title "feat: <branch_summary>" --body-file reports/self-test/pr-body.md
   ```

5. **Log URL**:
   Retrieves the URL of the created Draft PR from standard output and prints it.

---

## Policy Controls & Gate Blockers
- **No Merging**: Merging to `master`/`main` remains strictly manual and owner-only.
- **No Simulation Pass**: Checks run in simulation/plan-only mode never permit auto-push or Draft PR creation.
- **Critical Gates**: Deployment, destructive actions, secret reads, and financial spend remain strictly blocked.
