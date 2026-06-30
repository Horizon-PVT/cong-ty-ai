# Operator Console

## Overview

The Operator Console is the command-line interface (CLI) tool for local operator inspection and dry-run simulation of the AI Company OS. It provides commands to query the system's status and test human-in-the-loop actions.

## Console Commands

The console supports the following commands:

- **STATUS**: High-level snapshot of the OS, version, and verifier check results.
- **SHOW_ORG**: Details the company's organization model (departments, executives).
- **SHOW_FACTORIES**: Displays the active and planned factories.
- **SHOW_WORKERS**: Lists capability workers mapped to roles and capabilities.
- **SHOW_PROVIDERS**: Displays model providers, runtimes, and active pools.
- **SHOW_LEARNING**: Lists recent lessons and provider performance memories.
- **SHOW_STAFFING**: Summarizes staffing gaps, scorecards, and hiring sweeps.
- **SHOW_CANDIDATES**: Displays active worker candidates waiting for trials.
- **SHOW_SCORECARDS**: Lists trial performance scorecards of all workers.
- **SHOW_OWNER_QUEUE**: Displays actions waiting in the owner approval queue.
- **SHOW_NEXT_ACTIONS**: Outlines recommended phase progression and verifications.
- **EXPORT_SNAPSHOT**: Generates a complete Paperclip-compatible JSON company snapshot.

## Local Dry-Run Simulation

All actions performed by the Operator Console are safe simulations.
- No real APIs are called.
- No secrets are read.
- No real deployments, spending, or customer communications occur.
- No core capability registry mutations are made.

## Command Examples

Inspect company status:
```bash
node scripts/ai-company-operator-console-dry-run.mjs --command STATUS --format text
```

Check staffing recommendations:
```bash
node scripts/ai-company-operator-console-dry-run.mjs --command SHOW_STAFFING --format md
```

Create a snapshot report for Paperclip:
```bash
node scripts/ai-company-status-snapshot.mjs --format json --write-report
```
