#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                    AI LoopOps — Milestone Runner                    ║
 * ║                                                                      ║
 * ║  Automated verification pipeline for all AI Company milestones.      ║
 * ║  Runs runner → verifier → scorecard check for each milestone in      ║
 * ║  sequence, with regression chain validation.                         ║
 * ║                                                                      ║
 * ║  Usage:                                                              ║
 * ║    node scripts/ai-loopops.mjs                    # Run all          ║
 * ║    node scripts/ai-loopops.mjs --from 1.3a        # From specific    ║
 * ║    node scripts/ai-loopops.mjs --only 1.3b        # Single milestone ║
 * ║    node scripts/ai-loopops.mjs --verify-only      # Verifiers only   ║
 * ║    node scripts/ai-loopops.mjs --report            # Generate report ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "report");

// ── Milestone Registry ─────────────────────────────────────────────────
// Each milestone definition: { id, runner, verifier, scorecard, verdictKey }
const MILESTONES = [
  {
    id: "1.1g", name: "Follow-up Trigger",
    runner: "node scripts/ai-company-followup-trigger.mjs",
    verifier: "node packages/db/src/_verify-1.1g.mjs",
    scorecard: "artifacts/ai-company/mission-1.1g/generated",
  },
  {
    id: "1.1h", name: "Follow-up Execution",
    runner: "node scripts/ai-company-followup-execution.mjs",
    verifier: "node packages/db/src/_verify-1.1h.mjs",
    scorecard: "artifacts/ai-company/mission-1.1h/generated",
  },
  {
    id: "1.1i", name: "Revenue Outcome Intelligence",
    runner: "node scripts/ai-company-revenue-outcome-intelligence.mjs",
    verifier: "node packages/db/src/_verify-1.1i.mjs",
    scorecard: "artifacts/ai-company/mission-1.1i/generated",
  },
  {
    id: "1.1j", name: "Owner Decision Execution",
    runner: "node scripts/ai-company-owner-decision-execution.mjs",
    verifier: "node packages/db/src/_verify-1.1j.mjs",
    scorecard: "artifacts/ai-company/mission-1.1j/generated",
  },
  {
    id: "1.1k", name: "Live Revenue Commit Pilot",
    runner: "node scripts/ai-company-live-revenue-commit-pilot.mjs",
    verifier: "node packages/db/src/_verify-1.1k.mjs",
    scorecard: "artifacts/ai-company/mission-1.1k/generated",
  },
  {
    id: "1.1l", name: "Revenue Commit Outcome Recovery",
    runner: "node scripts/ai-company-live-revenue-commit-outcome-recovery.mjs",
    verifier: "node packages/db/src/_verify-1.1l.mjs",
    scorecard: "artifacts/ai-company/mission-1.1l/generated",
  },
  {
    id: "1.1m", name: "Revenue Collection Kickoff",
    runner: "node scripts/ai-company-revenue-collection-kickoff.mjs",
    verifier: "node packages/db/src/_verify-1.1m.mjs",
    scorecard: "artifacts/ai-company/mission-1.1m/generated",
  },
  {
    id: "1.1n", name: "Client Delivery Acceptance",
    runner: "node scripts/ai-company-client-delivery-acceptance.mjs",
    verifier: "node packages/db/src/_verify-1.1n.mjs",
    scorecard: "artifacts/ai-company/mission-1.1n/generated",
  },
  {
    id: "1.1o", name: "Client Success Renewal",
    runner: "node scripts/ai-company-client-success-renewal.mjs",
    verifier: "node packages/db/src/_verify-1.1o.mjs",
    scorecard: "artifacts/ai-company/mission-1.1o/generated",
  },
  {
    id: "1.2a", name: "Remote Sandbox Runtime Contract",
    runner: "node scripts/ai-company-remote-sandbox-runtime-contract.mjs",
    verifier: "node packages/db/src/_verify-1.2a.mjs",
    scorecard: "artifacts/ai-company/mission-1.2a/generated",
  },
  {
    id: "1.2b", name: "Remote Sandbox Real API Integration",
    runner: "node scripts/ai-company-remote-sandbox-real-api-integration.mjs",
    verifier: "node packages/db/src/_verify-1.2b.mjs",
    scorecard: "artifacts/ai-company/mission-1.2b/generated",
  },
  {
    id: "1.2c", name: "Secure Secret Routing",
    runner: "node scripts/ai-company-remote-sandbox-secret-routing.mjs",
    verifier: "node packages/db/src/_verify-1.2c.mjs",
    scorecard: "artifacts/ai-company/mission-1.2c/generated",
  },
  {
    id: "1.2d", name: "Resource Limit & Isolation Controls",
    runner: "node scripts/ai-company-remote-sandbox-resource-limits.mjs",
    verifier: "node packages/db/src/_verify-1.2d.mjs",
    scorecard: "artifacts/ai-company/mission-1.2d/generated",
  },
  {
    id: "1.2e", name: "Circuit Breaker",
    runner: "node scripts/ai-company-remote-sandbox-circuit-breaker.mjs",
    verifier: "node packages/db/src/_verify-1.2e.mjs",
    scorecard: "artifacts/ai-company/mission-1.2e/generated",
  },
  {
    id: "1.2f", name: "Cleanup & Deprovisioning",
    runner: "node scripts/ai-company-remote-sandbox-cleanup.mjs",
    verifier: "node packages/db/src/_verify-1.2f.mjs",
    scorecard: "artifacts/ai-company/mission-1.2f/generated",
  },
  {
    id: "1.3a", name: "Company-Scoped Data Boundaries",
    runner: "node cli/node_modules/tsx/dist/cli.mjs scripts/ai-company-boundaries-validation.mjs",
    verifier: "node packages/db/src/_verify-1.3a.mjs",
    scorecard: "artifacts/ai-company/mission-1.3a/generated",
  },
  {
    id: "1.3b", name: "Rate Limiting & API Throttle Controls",
    runner: "node scripts/ai-company-rate-limit-throttle.mjs",
    verifier: "node packages/db/src/_verify-1.3b.mjs",
    scorecard: "artifacts/ai-company/mission-1.3b/generated",
  },
  {
    id: "1.3c", name: "Audit Trail & Event Logging Validation",
    runner: "node scripts/ai-company-audit-trail-validation.mjs",
    verifier: "node packages/db/src/_verify-1.3c.mjs",
    scorecard: "artifacts/ai-company/mission-1.3c/generated",
  },
  {
    id: "1.3d", name: "Budget Enforcement & Real Cost Control",
    runner: "node scripts/ai-company-budget-enforcement.mjs",
    verifier: "node packages/db/src/_verify-1.3d.mjs",
    scorecard: "artifacts/ai-company/mission-1.3d/generated",
  },
  {
    id: "1.3e", name: "Task Conflict Safety & Agent API Permissions",
    runner: "node scripts/ai-company-task-conflict-agent-perms.mjs",
    verifier: "node packages/db/src/_verify-1.3e.mjs",
    scorecard: "artifacts/ai-company/mission-1.3e/generated",
  },
  {
    id: "1.3f", name: "Board Approval & Rejection Flows",
    runner: "node scripts/ai-company-board-approval-flows.mjs",
    verifier: "node packages/db/src/_verify-1.3f.mjs",
    scorecard: "artifacts/ai-company/mission-1.3f/generated",
  },
  {
    id: "1.4a", name: "Live Dashboard Aggregations & DB Adaptability (PostgreSQL)",
    runner: "node scripts/ai-company-dashboard-db.mjs",
    verifier: "node packages/db/src/_verify-1.4a.mjs",
    scorecard: "artifacts/ai-company/mission-1.4a/generated",
  },
  {
    id: "2.1a", name: "Guided Onboarding & Starter Org Generation",
    runner: "node scripts/ai-company-onboarding.mjs",
    verifier: "node packages/db/src/_verify-2.1a.mjs",
    scorecard: "artifacts/ai-company/mission-2.1a/generated",
  },
  {
    id: "2.1b", name: "Onboarding CLI (paperclipai run) & Doctor Repair",
    runner: "node scripts/ai-company-cli-run.mjs",
    verifier: "node packages/db/src/_verify-2.1b.mjs",
    scorecard: "artifacts/ai-company/mission-2.1b/generated",
  },
  {
    id: "3.1a", name: "Work Product Schema, API & Issue Deliverables Panel",
    runner: "node scripts/ai-company-deliverables.mjs",
    verifier: "node packages/db/src/_verify-3.1a.mjs",
    scorecard: "artifacts/ai-company/mission-3.1a/generated",
  },
  {
    id: "3.1b", name: "Enforced Outcomes & Planning Lifecycle",
    runner: "node scripts/ai-company-outcomes.mjs",
    verifier: "node packages/db/src/_verify-3.1b.mjs",
    scorecard: "artifacts/ai-company/mission-3.1b/generated",
  },
  {
    id: "4.1a", name: "Deterministic Wake Gating & Circuit Breakers",
    runner: "node scripts/ai-company-runtime-safety.mjs",
    verifier: "node packages/db/src/_verify-4.1a.mjs",
    scorecard: "artifacts/ai-company/mission-4.1a/generated",
  },
  {
    id: "4.1b", name: "Auto Mode Semantics & Cloud Sandbox Runtime",
    runner: "node scripts/ai-company-auto-runtime.mjs",
    verifier: "node packages/db/src/_verify-4.1b.mjs",
    scorecard: "artifacts/ai-company/mission-4.1b/generated",
  },
];

// ── Argument parsing ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const FROM = getArg("--from");
const ONLY = getArg("--only");
const VERIFY_ONLY = hasFlag("--verify-only");
const REPORT = hasFlag("--report");
const VERBOSE = hasFlag("--verbose");

// ── Helpers ─────────────────────────────────────────────────────────────
const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function banner(text) {
  const line = "═".repeat(text.length + 4);
  console.log(`\n${COLORS.cyan}╔${line}╗`);
  console.log(`║  ${COLORS.bold}${text}${COLORS.reset}${COLORS.cyan}  ║`);
  console.log(`╚${line}╝${COLORS.reset}\n`);
}

function sectionHeader(text) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}── ${text} ${"─".repeat(Math.max(0, 60 - text.length))}${COLORS.reset}`);
}

function ok(msg) { console.log(`  ${COLORS.green}✅${COLORS.reset} ${msg}`); }
function fail(msg) { console.log(`  ${COLORS.red}❌${COLORS.reset} ${msg}`); }
function warn(msg) { console.log(`  ${COLORS.yellow}⚠️${COLORS.reset}  ${msg}`); }
function info(msg) { console.log(`  ${COLORS.dim}ℹ️  ${msg}${COLORS.reset}`); }

// ── Determine which milestones to run ───────────────────────────────────
function getMilestonesToRun() {
  if (ONLY) {
    const m = MILESTONES.find(ms => ms.id === ONLY.toLowerCase());
    if (!m) { fail(`Milestone '${ONLY}' not found`); process.exit(1); }
    return [m];
  }
  if (FROM) {
    const idx = MILESTONES.findIndex(ms => ms.id === FROM.toLowerCase());
    if (idx === -1) { fail(`Milestone '${FROM}' not found`); process.exit(1); }
    return MILESTONES.slice(idx);
  }
  return MILESTONES;
}

// ── Execute a milestone step ────────────────────────────────────────────
function runStep(label, command) {
  try {
    execSync(command, {
      cwd: ROOT,
      stdio: VERBOSE ? "inherit" : "pipe",
      timeout: 120_000, // 2 minute timeout per step
    });
    return { success: true };
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString().slice(0, 500) : e.message;
    return { success: false, error: stderr };
  }
}

// ── Main loop ───────────────────────────────────────────────────────────
async function main() {
  banner("AI LoopOps — Milestone Verification Pipeline");

  const milestones = getMilestonesToRun();
  const startTime = Date.now();
  const results = [];

  console.log(`${COLORS.dim}Mode: ${VERIFY_ONLY ? "Verify Only" : "Full (Runner + Verifier)"}${COLORS.reset}`);
  console.log(`${COLORS.dim}Milestones: ${milestones.length} (${milestones[0].id} → ${milestones[milestones.length - 1].id})${COLORS.reset}`);
  console.log(`${COLORS.dim}Started: ${new Date().toISOString()}${COLORS.reset}`);

  for (const ms of milestones) {
    sectionHeader(`Milestone ${ms.id.toUpperCase()} — ${ms.name}`);
    const msStart = Date.now();
    let runnerResult = { success: true, skipped: false };
    let verifierResult = { success: false };

    // Step 1: Runner (skip if --verify-only)
    if (!VERIFY_ONLY) {
      info(`Running: ${ms.runner}`);
      runnerResult = runStep("runner", `${ms.runner} --mode dry_run`);
      if (runnerResult.success) {
        ok(`Runner PASS`);
      } else {
        fail(`Runner FAILED: ${runnerResult.error}`);
        runnerResult.skipped = false;
      }
    } else {
      runnerResult.skipped = true;
      info("Runner skipped (--verify-only)");
    }

    // Step 2: Verifier (always run)
    info(`Verifying: ${ms.verifier}`);
    verifierResult = runStep("verifier", ms.verifier);
    if (verifierResult.success) {
      ok(`Verifier PASS`);
    } else {
      fail(`Verifier FAILED: ${verifierResult.error}`);
    }

    // Step 3: Scorecard check
    let scorecardVerdict = "UNKNOWN";
    try {
      const scorecardDir = path.join(ROOT, ms.scorecard);
      if (fs.existsSync(scorecardDir)) {
        const scorecardFiles = fs.readdirSync(scorecardDir).filter(f => f.endsWith("-scorecard.json"));
        if (scorecardFiles.length > 0) {
          const sc = JSON.parse(fs.readFileSync(path.join(scorecardDir, scorecardFiles[0]), "utf8"));
          scorecardVerdict = sc.verdict || "UNKNOWN";
        }
      }
    } catch { /* ignore */ }

    const msTime = ((Date.now() - msStart) / 1000).toFixed(1);
    const passed = (runnerResult.success || runnerResult.skipped) && verifierResult.success;

    results.push({
      id: ms.id.toUpperCase(),
      name: ms.name,
      runner: runnerResult.skipped ? "SKIP" : (runnerResult.success ? "PASS" : "FAIL"),
      verifier: verifierResult.success ? "PASS" : "FAIL",
      verdict: scorecardVerdict,
      overall: passed ? "PASS" : "FAIL",
      time: `${msTime}s`,
    });

    if (passed) {
      ok(`${COLORS.bold}${ms.id.toUpperCase()} PASS${COLORS.reset} (${msTime}s) — ${scorecardVerdict}`);
    } else {
      fail(`${COLORS.bold}${ms.id.toUpperCase()} FAIL${COLORS.reset} (${msTime}s)`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const passedCount = results.filter(r => r.overall === "PASS").length;
  const failedCount = results.filter(r => r.overall === "FAIL").length;

  banner("AI LoopOps — Summary Report");

  console.log(`${"Milestone".padEnd(8)} ${"Name".padEnd(40)} ${"Runner".padEnd(8)} ${"Verifier".padEnd(10)} ${"Verdict".padEnd(25)} ${"Result".padEnd(8)}`);
  console.log("─".repeat(105));

  for (const r of results) {
    const color = r.overall === "PASS" ? COLORS.green : COLORS.red;
    console.log(`${r.id.padEnd(8)} ${r.name.padEnd(40)} ${r.runner.padEnd(8)} ${r.verifier.padEnd(10)} ${r.verdict.padEnd(25)} ${color}${r.overall}${COLORS.reset}`);
  }

  console.log("─".repeat(105));
  console.log(`\nTotal: ${passedCount} passed, ${failedCount} failed out of ${results.length} milestones`);
  console.log(`Time: ${totalTime}s`);
  console.log(`Finished: ${new Date().toISOString()}`);

  // ── Generate report if requested ──────────────────────────────────
  if (REPORT) {
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

    const reportData = {
      report_type: "ai_loopops_verification",
      generated_at: new Date().toISOString(),
      total_milestones: results.length,
      passed: passedCount,
      failed: failedCount,
      total_time_seconds: parseFloat(totalTime),
      milestones: results,
    };

    const reportPath = path.join(REPORT_DIR, `ai-loopops-report-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    ok(`Report saved: ${reportPath}`);

    // Markdown report
    const mdLines = [
      `# AI LoopOps Verification Report`,
      ``,
      `**Generated:** ${new Date().toISOString()}`,
      `**Total Time:** ${totalTime}s`,
      `**Result:** ${failedCount === 0 ? "✅ ALL PASS" : `❌ ${failedCount} FAILED`}`,
      ``,
      `| Milestone | Name | Runner | Verifier | Verdict | Result |`,
      `|-----------|------|--------|----------|---------|--------|`,
    ];
    for (const r of results) {
      mdLines.push(`| ${r.id} | ${r.name} | ${r.runner} | ${r.verifier} | ${r.verdict} | ${r.overall === "PASS" ? "✅" : "❌"} ${r.overall} |`);
    }
    mdLines.push(``, `---`, `*Generated by AI LoopOps v1.0*`);

    const mdPath = path.join(REPORT_DIR, `ai-loopops-report-latest.md`);
    fs.writeFileSync(mdPath, mdLines.join("\n"));
    ok(`Markdown report: ${mdPath}`);
  }

  // Exit with error if any milestone failed
  if (failedCount > 0) {
    console.log(`\n${COLORS.red}${COLORS.bold}⛔ Pipeline FAILED — ${failedCount} milestone(s) need attention.${COLORS.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${COLORS.green}${COLORS.bold}🚀 Pipeline PASS — All ${passedCount} milestones verified successfully!${COLORS.reset}`);
  }
}

main().catch(e => {
  console.error("AI LoopOps fatal error:", e);
  process.exit(1);
});
