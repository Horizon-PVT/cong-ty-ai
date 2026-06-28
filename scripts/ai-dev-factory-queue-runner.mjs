#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../");

const VALID_TRANSITIONS = {
  "PENDING": ["CLAIMED", "FAILED_RETRYABLE", "FAILED_BLOCKED"],
  "CLAIMED": ["RUNNING", "FAILED_RETRYABLE", "FAILED_BLOCKED", "CLAIMED"],
  "RUNNING": ["SELF_TESTING", "FAILED_RETRYABLE", "FAILED_BLOCKED"],
  "SELF_TESTING": ["DRAFT_PR_OPENED", "FAILED_RETRYABLE", "FAILED_BLOCKED"],
  "DRAFT_PR_OPENED": ["WAITING_OWNER_APPROVAL", "FAILED_RETRYABLE", "FAILED_BLOCKED"],
  "WAITING_OWNER_APPROVAL": ["MERGED", "FAILED_RETRYABLE", "FAILED_BLOCKED"],
  "MERGED": ["CLEANED", "FAILED_RETRYABLE", "FAILED_BLOCKED"],
  "CLEANED": [],
  "FAILED_RETRYABLE": ["PENDING", "CLAIMED"],
  "FAILED_BLOCKED": []
};

// Async exec wrapper to keep event loop free for heartbeat
function execPromise(cmd, cwd) {
  return new Promise((resolve, reject) => {
    const cp = exec(cmd, { cwd });
    cp.stdout.pipe(process.stdout);
    cp.stderr.pipe(process.stderr);
    cp.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
  });
}

function printUsage() {
  console.log(`
Usage: node scripts/ai-dev-factory-queue-runner.mjs [options]

Options:
  --queue <path>    Path to queue JSON file (default: missions/queue/phase-0.3s-queue.json)
  --run-id <id>     Run identifier (default: auto-generated string)
  --resume          Attempt to resume CLAIMED or RUNNING missions
  --help            Show help
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let queuePath = path.join(repoRoot, "missions/queue/phase-0.3s-queue.json");
  const queueIndex = args.indexOf("--queue");
  if (queueIndex !== -1 && queueIndex + 1 < args.length) {
    queuePath = path.resolve(args[queueIndex + 1]);
  }

  let runId = `run-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
  const runIdIndex = args.indexOf("--run-id");
  if (runIdIndex !== -1 && runIdIndex + 1 < args.length) {
    runId = args[runIdIndex + 1];
  }

  const isResume = args.includes("--resume");

  console.log(`[Queue Runner] Upgraded Runner Initializing...`);
  console.log(`[Queue Runner] Queue JSON: ${queuePath}`);
  console.log(`[Queue Runner] Run ID: ${runId}`);
  console.log(`[Queue Runner] Resume Mode: ${isResume ? "ENABLED" : "DISABLED"}`);

  if (!fs.existsSync(queuePath)) {
    console.error(`[Queue Runner] Error: Queue file not found at ${queuePath}`);
    process.exit(1);
  }

  let queueData;
  try {
    queueData = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  } catch (err) {
    console.error(`[Queue Runner] Error: Failed to parse queue JSON: ${err.message}`);
    process.exit(1);
  }

  if (!queueData.missions || !Array.isArray(queueData.missions)) {
    console.error(`[Queue Runner] Error: Invalid queue structure.`);
    process.exit(1);
  }

  // 1. Filter out idempotent / final states
  const SKIP_STATES = ["MERGED", "CLEANED", "WAITING_OWNER_APPROVAL", "DRAFT_PR_OPENED", "FAILED_BLOCKED"];
  let candidates = queueData.missions.filter(m => !SKIP_STATES.includes(m.status));

  // 2. Exponential backoff verification
  const now = Date.now();
  candidates = candidates.filter(m => {
    if (m.status === "FAILED_RETRYABLE" || m.last_failed_at) {
      const retryCount = m.retry_count || 0;
      const lastFailed = new Date(m.last_failed_at).getTime();
      // Add random jitter between 0 and 3 seconds
      const jitter = Math.random() * 3;
      const backoffDelay = (Math.pow(2, retryCount) + jitter) * 1000;
      const ageMs = now - lastFailed;
      if (ageMs < backoffDelay) {
        console.log(`[Queue Runner] Mission ${m.mission_id} is skipped: in retry backoff (delay remaining: ${Math.round((backoffDelay - ageMs) / 1000)}s)`);
        return false;
      }
    }
    return true;
  });

  // 3. Selection filter based on resume flag
  if (isResume) {
    candidates = candidates.filter(m => m.status === "CLAIMED" || m.status === "RUNNING");
  } else {
    // Normal mode: select PENDING, FAILED_RETRYABLE (since backoff expired), or recoverable stale RUNNING/CLAIMED states
    candidates = candidates.filter(m => m.status === "PENDING" || m.status === "FAILED_RETRYABLE" || m.status === "RUNNING" || m.status === "CLAIMED");
  }

  // 4. Fairness selection: Sort by 1 priority (asc, default 2), 2 created_at (asc), 3 retry_count (asc)
  candidates.sort((a, b) => {
    const priorityA = a.priority !== undefined ? a.priority : 2;
    const priorityB = b.priority !== undefined ? b.priority : 2;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const retryA = a.retry_count || 0;
    const retryB = b.retry_count || 0;
    return retryA - retryB;
  });

  if (candidates.length === 0) {
    console.log(`[Queue Runner] No eligible missions found (PENDING, resumable, or out of backoff). Skipping.`);
    writeLatestLog(runId, "unknown", "UNKNOWN", "UNKNOWN", { acquired: false, owner: "none", overridden: false }, "SKIPPED", "No target mission found.", 0, 0, "");
    process.exit(0);
  }

  // 5. Try lock acquisition and claim for candidate missions
  let selectedMission = null;
  let lockAcquired = false;
  let lockOverridden = false;
  let initialStatus = "UNKNOWN";
  let lockPath = "";
  let expectedLockVersion = 1;

  for (const m of candidates) {
    lockPath = path.join(path.dirname(queuePath), `${m.mission_id}.lock`);
    initialStatus = m.status;

    if (fs.existsSync(lockPath)) {
      let lockData;
      try {
        lockData = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      } catch (err) {
        lockData = { timestamp: "1970-01-01T00:00:00.000Z", run_id: "unknown", version: 0 };
      }

      const lockTime = new Date(lockData.timestamp).getTime();
      const lockAgeMs = now - lockTime;
      // Stale threshold is >= 12 seconds
      const isStale = lockAgeMs >= 12000;

      if (!isStale) {
        // Lock is fresh
        if (lockData.run_id === runId) {
          console.log(`[Queue Runner] Re-entering fresh lock for mission ${m.mission_id}.`);
          selectedMission = m;
          lockAcquired = true;
          expectedLockVersion = lockData.version || 1;
          break;
        } else {
          console.log(`[Queue Runner] Skipping mission ${m.mission_id}: locked by active run (run_id: ${lockData.run_id}).`);
          continue;
        }
      } else {
        // Stale lock: Crash Recovery
        console.log(`[Queue Runner] Crash recovery triggered for stale lock on mission ${m.mission_id} (age: ${Math.round(lockAgeMs / 1000)}s).`);
        
        // Transition stale running/claimed mission to FAILED_RETRYABLE or FAILED_BLOCKED directly
        const maxRetries = m.max_retries || 3;
        const nextRetry = (m.retry_count || 0) + 1;
        const targetStatus = nextRetry > maxRetries ? "FAILED_BLOCKED" : "FAILED_RETRYABLE";
        
        console.log(`[Queue Runner] Stale lock detected for mission ${m.mission_id}. Transitioning ${m.status} -> ${targetStatus} (retry ${nextRetry} of ${maxRetries}).`);
        updateMissionState(queuePath, m.mission_id, targetStatus, lockData.run_id || "stale-recovery", nextRetry, new Date().toISOString());
        
        // Delete the stale lock file
        try {
          fs.unlinkSync(lockPath);
          console.log(`[Queue Runner] Deleted stale lock file for mission ${m.mission_id}.`);
        } catch (e) {
          console.warn(`[Queue Runner] Could not delete stale lock file: ${e.message}`);
        }

        // Write log for recovery action
        writeLatestLog(
          runId,
          m.mission_id,
          initialStatus,
          targetStatus,
          { acquired: false, owner: lockData.run_id, overridden: true },
          targetStatus === "FAILED_BLOCKED" ? "FAILED" : "RECOVERED_TO_FAILED_RETRYABLE",
          `Crash recovery triggered. Stale lock removed. Mission transitioned to ${targetStatus}.`,
          nextRetry,
          0,
          `Stale lock detected (age: ${lockAgeMs}ms)`
        );

        // Skip execution of this mission in this run
        continue;
      }
    } else {
      // Lock doesn't exist.
      // If the mission is in CLAIMED or RUNNING status but has no lock file, it's also crashed.
      if (m.status === "CLAIMED" || m.status === "RUNNING") {
        console.log(`[Queue Runner] Crash recovery triggered: mission ${m.mission_id} is in status ${m.status} but lock file is missing.`);
        const maxRetries = m.max_retries || 3;
        const nextRetry = (m.retry_count || 0) + 1;
        const targetStatus = nextRetry > maxRetries ? "FAILED_BLOCKED" : "FAILED_RETRYABLE";
        
        console.log(`[Queue Runner] Missing lock detected for mission ${m.mission_id}. Transitioning ${m.status} -> ${targetStatus} (retry ${nextRetry} of ${maxRetries}).`);
        updateMissionState(queuePath, m.mission_id, targetStatus, "missing-lock-recovery", nextRetry, new Date().toISOString());
        
        writeLatestLog(
          runId,
          m.mission_id,
          initialStatus,
          targetStatus,
          { acquired: false, owner: "unknown", overridden: true },
          targetStatus === "FAILED_BLOCKED" ? "FAILED" : "RECOVERED_TO_FAILED_RETRYABLE",
          `Crash recovery triggered. Missing lock file in status ${m.status}. Mission transitioned to ${targetStatus}.`,
          nextRetry,
          0,
          `Missing lock file in status ${m.status}`
        );
        continue;
      }

      // Try to acquire lock
      if (tryAcquireLock(lockPath, runId, m.mission_id)) {
        console.log(`[Queue Runner] Claimed unlocked mission ${m.mission_id}...`);
        selectedMission = m;
        lockAcquired = true;
        expectedLockVersion = 1;
        break;
      } else {
        console.log(`[Queue Runner] Lost race for lock on mission ${m.mission_id}. Skipping.`);
        continue;
      }
    }
  }

  if (!selectedMission) {
    console.log(`[Queue Runner] All candidate missions are locked by other runners or in backoff. Skipping.`);
    writeLatestLog(runId, "unknown", "UNKNOWN", "UNKNOWN", { acquired: false, owner: "none", overridden: false }, "SKIPPED", "All candidates locked.", 0, 0, "");
    process.exit(0);
  }

  const missionId = selectedMission.mission_id;
  let currentStatus = initialStatus;
  let heartbeatInterval = null;

  const cleanUp = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    try {
      if (fs.existsSync(lockPath)) {
        const lockData = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        if (lockData.run_id === runId) {
          // Optimistic validation before release
          if (lockData.version !== undefined && expectedLockVersion !== undefined && lockData.version !== expectedLockVersion) {
            console.warn(`[Queue Runner] Cleanup lock version mismatch: expected ${expectedLockVersion}, got ${lockData.version}. Not deleting lock file.`);
            return;
          }
          fs.unlinkSync(lockPath);
          console.log(`[Queue Runner] Released lock file for mission ${missionId}.`);
        }
      }
    } catch {}
  };

  // Register cleanup event handlers for signals, uncaught exception, and exit
  const handleSignal = (signal) => {
    console.log(`[Queue Runner] Received signal ${signal}. Cleaning up...`);
    cleanUp();
    process.exit(128 + (signal === "SIGINT" ? 2 : 15));
  };
  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("uncaughtException", (err) => {
    console.error(`[Queue Runner] Uncaught exception: ${err.message}`, err.stack);
    cleanUp();
    process.exit(1);
  });
  process.on("exit", () => {
    cleanUp();
  });

  // Start Lock Heartbeat Update
  heartbeatInterval = setInterval(() => {
    try {
      if (fs.existsSync(lockPath)) {
        const lockData = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        if (lockData.run_id === runId) {
          // Optimistic Lock Validation
          if (lockData.version !== undefined && expectedLockVersion !== undefined && lockData.version !== expectedLockVersion) {
            console.error(`[Queue Runner] Optimistic lock version mismatch: expected ${expectedLockVersion}, got ${lockData.version}. Aborting process.`);
            cleanUp();
            process.exit(1);
          }
          lockData.timestamp = new Date().toISOString();
          lockData.version = (lockData.version || 1) + 1;
          expectedLockVersion = lockData.version;
          fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), "utf8");
        }
      }
    } catch (err) {
      console.warn(`[Queue Runner] Heartbeat failed: ${err.message}`);
    }
  }, 2000);

  // State transitions PENDING -> CLAIMED -> RUNNING
  const executionStartTime = Date.now();
  try {
    if (currentStatus === "PENDING" || currentStatus === "FAILED_RETRYABLE") {
      updateMissionState(queuePath, missionId, "CLAIMED", runId, selectedMission.retry_count || 0, null);
      currentStatus = "CLAIMED";

      updateMissionState(queuePath, missionId, "RUNNING", runId, selectedMission.retry_count || 0, null);
      currentStatus = "RUNNING";
    } else if (currentStatus === "CLAIMED") {
      updateMissionState(queuePath, missionId, "RUNNING", runId, selectedMission.retry_count || 0, null);
      currentStatus = "RUNNING";
    }

    // Execute mock task
    updateMissionState(queuePath, missionId, "SELF_TESTING", runId, selectedMission.retry_count || 0, null);
    currentStatus = "SELF_TESTING";
    console.log(`[Queue Runner] Running mock validation task for mission ${missionId}...`);

    let cmdToRun = "node packages/db/src/_verify-0.3q.mjs";
    if (selectedMission.verification_commands && selectedMission.verification_commands.length > 0) {
      // Find a command to run (prefer verify scripts, or run the first one)
      const customNodeCmd = selectedMission.verification_commands.find(c => c.includes("node"));
      if (customNodeCmd) {
        cmdToRun = customNodeCmd;
      } else {
        cmdToRun = selectedMission.verification_commands[0];
      }
    }
    console.log(`[Queue Runner] Executing task command: ${cmdToRun}`);
    await execPromise(cmdToRun, repoRoot);
    
    console.log(`[Queue Runner] Verification task passed!`);
    const duration = Date.now() - executionStartTime;

    updateMissionState(queuePath, missionId, "DRAFT_PR_OPENED", runId, selectedMission.retry_count || 0, null);
    currentStatus = "DRAFT_PR_OPENED";

    updateMissionState(queuePath, missionId, "WAITING_OWNER_APPROVAL", runId, selectedMission.retry_count || 0, null);
    currentStatus = "WAITING_OWNER_APPROVAL";

    writeLatestLog(runId, missionId, initialStatus, currentStatus, { acquired: lockAcquired, owner: runId, overridden: lockOverridden }, "SUCCESS", "Mission execution successfully simulated", selectedMission.retry_count || 0, duration, "");
    cleanUp();
  } catch (err) {
    console.error(`[Queue Runner] Mock task failed: ${err.message}`);
    const duration = Date.now() - executionStartTime;
    
    const maxRetries = selectedMission.max_retries || 3;
    const retryCount = (selectedMission.retry_count || 0) + 1;

    if (retryCount > maxRetries) {
      console.error(`[Queue Runner] Retries exhausted (${maxRetries}). State transitioning to FAILED_BLOCKED.`);
      updateMissionState(queuePath, missionId, "FAILED_BLOCKED", runId, retryCount, new Date().toISOString());
      writeLatestLog(runId, missionId, initialStatus, "FAILED_BLOCKED", { acquired: lockAcquired, owner: runId, overridden: lockOverridden }, "FAILED", `Execution failed: ${err.message}`, retryCount, duration, err.message);
    } else {
      console.log(`[Queue Runner] State transitioning to FAILED_RETRYABLE (retry ${retryCount} of ${maxRetries}).`);
      updateMissionState(queuePath, missionId, "FAILED_RETRYABLE", runId, retryCount, new Date().toISOString());
      writeLatestLog(runId, missionId, initialStatus, "FAILED_RETRYABLE", { acquired: lockAcquired, owner: runId, overridden: lockOverridden }, "FAILED", `Execution failed: ${err.message}`, retryCount, duration, err.message);
    }
    cleanUp();
    process.exit(1);
  }
}

// Helpers
function tryAcquireLock(lockPath, runId, missionId) {
  const lockData = {
    run_id: runId,
    mission_id: missionId,
    timestamp: new Date().toISOString(),
    version: 1
  };
  try {
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), { flag: "wx" });
    return true;
  } catch (err) {
    if (err.code === "EEXIST") {
      return false;
    }
    throw err;
  }
}

function updateMissionState(queuePath, missionId, nextStatus, runId, retryCount, lastFailedAt) {
  const queueLockPath = `${queuePath}.lock`;
  let acquired = false;
  
  // Try to acquire the queue file lock (with retries and random backoff)
  for (let i = 0; i < 100; i++) {
    try {
      fs.writeFileSync(queueLockPath, JSON.stringify({ run_id: runId, timestamp: new Date().toISOString() }), { flag: "wx" });
      acquired = true;
      break;
    } catch (err) {
      if (err.code === "EEXIST") {
        // Sleep for a short random time (10-50ms)
        const delay = 10 + Math.floor(Math.random() * 40);
        const start = Date.now();
        while (Date.now() - start < delay) {}
      } else {
        throw err;
      }
    }
  }

  if (!acquired) {
    throw new Error(`Failed to acquire queue write lock after 100 attempts`);
  }

  try {
    const queueData = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    const mission = queueData.missions.find(m => m.mission_id === missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found in queue`);
    }

    const beforeStatus = mission.status;
    const allowedTransitions = VALID_TRANSITIONS[beforeStatus] || [];
    if (!allowedTransitions.includes(nextStatus)) {
      throw new Error(`Illegal state transition: ${beforeStatus} -> ${nextStatus}`);
    }

    mission.status = nextStatus;
    mission.run_id = runId;
    mission.retry_count = retryCount;
    mission.updated_at = new Date().toISOString();
    if (lastFailedAt) {
      mission.last_failed_at = lastFailedAt;
    }

    fs.writeFileSync(queuePath, JSON.stringify(queueData, null, 2), "utf8");
  } finally {
    try {
      fs.unlinkSync(queueLockPath);
    } catch (err) {}
  }
}

function writeLatestLog(runId, missionId, beforeState, afterState, lockInfo, result, details, retryCount, durationMs, failureReason) {
  const reportDir = path.join(repoRoot, "reports/queue-runner");
  fs.mkdirSync(reportDir, { recursive: true });

  const logData = {
    run_id: runId,
    mission_id: missionId,
    before_state: beforeState,
    after_state: afterState,
    lock_info: lockInfo,
    result,
    details,
    retry_count: retryCount,
    execution_duration: durationMs,
    failure_reason: failureReason,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(reportDir, "latest.json"),
    JSON.stringify(logData, null, 2),
    "utf8"
  );
  console.log(`[Queue Runner] Execution log written to reports/queue-runner/latest.json`);
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
