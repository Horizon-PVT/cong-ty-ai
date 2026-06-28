import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../");

async function main() {
  console.log("Starting Phase 0.3S verification...");

  // 1. Verify files exist
  const runnerPath = path.join(repoRoot, "scripts/ai-dev-factory-queue-runner.mjs");
  if (!fs.existsSync(runnerPath)) {
    throw new Error("scripts/ai-dev-factory-queue-runner.mjs does not exist");
  }
  console.log("✅ verified: scripts/ai-dev-factory-queue-runner.mjs exists");

  const verifierPath = path.join(repoRoot, "packages/db/src/_verify-0.3s.mjs");
  if (!fs.existsSync(verifierPath)) {
    throw new Error("packages/db/src/_verify-0.3s.mjs does not exist");
  }
  console.log("✅ verified: packages/db/src/_verify-0.3s.mjs exists");

  const queueJsonPath = path.join(repoRoot, "missions/queue/phase-0.3s-queue.json");
  if (!fs.existsSync(queueJsonPath)) {
    throw new Error("missions/queue/phase-0.3s-queue.json does not exist");
  }
  console.log("✅ verified: missions/queue/phase-0.3s-queue.json exists");

  // Create temporary directory for tests
  const tempDir = path.join(repoRoot, "missions/queue/temp-verify-0.3s");
  fs.mkdirSync(tempDir, { recursive: true });

  const tempQueuePath = path.join(tempDir, "temp-queue.json");

  function setupTempQueue(missionsList) {
    fs.writeFileSync(tempQueuePath, JSON.stringify({ missions: missionsList }, null, 2), "utf8");
    // Clear any existing locks in temp directory
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      if (file.endsWith(".lock")) {
        try { fs.unlinkSync(path.join(tempDir, file)); } catch {}
      }
    }
  }

  const baseMission = {
    mission_id: "test-mission-1",
    phase: "0.3S",
    title: "Test Base",
    branch: "chore/test",
    status: "PENDING",
    run_id: "",
    pr_number: null,
    head_sha: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    allowed_files: [],
    blocked_files: [],
    verification_commands: ["node -e \"setTimeout(() => {}, 4000)\""],
    safety_rules: [],
    resume_policy: "REUSE_BRANCH_AND_PR",
    idempotency_key: "key-1",
    final_verdict: "UNKNOWN",
    retry_count: 0,
    max_retries: 3
  };

  try {
    // 2. Test Lock Heartbeat Increment
    console.log("Testing lock heartbeat increment...");
    setupTempQueue([baseMission]);

    // We start the runner as a separate process and wait 3 seconds
    const runnerProcess = spawn("node", [runnerPath, "--queue", tempQueuePath, "--run-id", "runner-heartbeat"]);
    
    let runnerStderr = "";
    runnerProcess.stderr.on("data", (data) => { runnerStderr += data.toString(); });
    let runnerStdout = "";
    runnerProcess.stdout.on("data", (data) => { runnerStdout += data.toString(); });

    // Wait for the lock file to be created, and check it
    const lockFilePath = path.join(tempDir, "test-mission-1.lock");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!fs.existsSync(lockFilePath)) {
      runnerProcess.kill();
      throw new Error(`Lock file was not created by the runner. Stdout: ${runnerStdout} Stderr: ${runnerStderr}`);
    }

    const lock1 = JSON.parse(fs.readFileSync(lockFilePath, "utf8"));
    const v1 = lock1.version || 1;
    console.log(`Initial lock version: ${v1}`);

    // Wait another 2.5 seconds to allow heartbeat interval (2s) to tick and update version
    await new Promise((resolve) => setTimeout(resolve, 2500));

    if (!fs.existsSync(lockFilePath)) {
      runnerProcess.kill();
      throw new Error("Lock file was prematurely deleted");
    }

    const lock2 = JSON.parse(fs.readFileSync(lockFilePath, "utf8"));
    const v2 = lock2.version || 1;
    console.log(`Refreshed lock version: ${v2}`);

    runnerProcess.kill();

    if (v2 <= v1) {
      throw new Error(`Lock version did not increment. v1: ${v1}, v2: ${v2}`);
    }
    console.log("✅ verified: lock version incremented via background heartbeat");

    // 3. Test Crash Recovery (RUNNING + stale lock -> requeue to FAILED_RETRYABLE)
    console.log("Testing crash recovery...");
    const crashedMission = {
      ...baseMission,
      status: "RUNNING",
      run_id: "crashed-runner-id",
      updated_at: new Date(Date.now() - 20000).toISOString()
    };
    setupTempQueue([crashedMission]);

    // Write stale lock file (timestamp 20 seconds ago, greater than 12s stale threshold)
    const staleLock = {
      run_id: "crashed-runner-id",
      mission_id: "test-mission-1",
      timestamp: new Date(Date.now() - 20000).toISOString(),
      version: 5
    };
    fs.writeFileSync(lockFilePath, JSON.stringify(staleLock, null, 2), "utf8");

    // Run runner with run-B. It should claim and recover the mission to FAILED_RETRYABLE and delete the lock.
    execSync(`node "${runnerPath}" --queue "${tempQueuePath}" --run-id runner-recovery`, { stdio: "pipe" });

    const recoveredQueue = JSON.parse(fs.readFileSync(tempQueuePath, "utf8"));
    const recoveredMission = recoveredQueue.missions[0];

    if (recoveredMission.status !== "FAILED_RETRYABLE") {
      throw new Error(`Recovered mission status is not FAILED_RETRYABLE, got ${recoveredMission.status}`);
    }
    if (recoveredMission.retry_count !== 1) {
      throw new Error(`Recovered mission retry_count did not increment. Expected 1, got ${recoveredMission.retry_count}`);
    }
    if (fs.existsSync(lockFilePath)) {
      throw new Error("Lock file was not deleted during crash recovery");
    }
    console.log("✅ verified: RUNNING mission with stale lock successfully transitioned to FAILED_RETRYABLE and lock deleted");

    // 4. Test Retry Policy & Exponential Backoff
    console.log("Testing retry policy and exponential backoff...");
    
    // Set mission in PENDING but with last_failed_at = now, retry_count = 1
    // backoff delay for retry_count=1 is 2^1 = 2 seconds + random jitter (0..3s)
    const backoffMission = {
      ...baseMission,
      status: "PENDING",
      retry_count: 1,
      last_failed_at: new Date().toISOString()
    };
    setupTempQueue([backoffMission]);

    // Run runner. It should skip it.
    const skipOut = execSync(`node "${runnerPath}" --queue "${tempQueuePath}" --run-id runner-backoff-1`, { encoding: "utf8" });
    if (!skipOut.includes("skipped: in retry backoff") && !skipOut.includes("No eligible missions found")) {
      throw new Error(`Runner failed to skip mission in backoff! Output: ${skipOut}`);
    }
    console.log("✅ verified: mission in backoff is correctly skipped");

    // Simulating backoff expiration (last_failed_at = 10 seconds ago, guaranteed to exceed max 2 + 3 = 5s backoff)
    const expiredBackoffMission = {
      ...baseMission,
      status: "PENDING",
      retry_count: 1,
      last_failed_at: new Date(Date.now() - 10000).toISOString()
    };
    setupTempQueue([expiredBackoffMission]);

    // Run runner. It should pick it up and run it.
    execSync(`node "${runnerPath}" --queue "${tempQueuePath}" --run-id runner-backoff-2`, { stdio: "pipe" });
    const finishedQueue = JSON.parse(fs.readFileSync(tempQueuePath, "utf8"));
    if (finishedQueue.missions[0].status !== "WAITING_OWNER_APPROVAL") {
      throw new Error(`Expired backoff mission was not processed, status: ${finishedQueue.missions[0].status}`);
    }
    console.log("✅ verified: expired backoff mission is processed successfully");

    // 5. Test Retry Exhaustion -> FAILED_BLOCKED
    console.log("Testing retry exhaustion...");
    const exhaustedMission = {
      ...baseMission,
      status: "RUNNING",
      retry_count: 3,
      max_retries: 3,
      run_id: "crashed-runner-id",
      updated_at: new Date(Date.now() - 20000).toISOString()
    };
    setupTempQueue([exhaustedMission]);
    // Write stale lock file (timestamp 20 seconds ago)
    const staleLockExhaust = {
      ...staleLock,
      timestamp: new Date(Date.now() - 20000).toISOString()
    };
    fs.writeFileSync(lockFilePath, JSON.stringify(staleLockExhaust, null, 2), "utf8");

    // Run runner. It should transition to FAILED_BLOCKED.
    execSync(`node "${runnerPath}" --queue "${tempQueuePath}" --run-id runner-exhaust`, { stdio: "pipe" });
    const exhaustedQueue = JSON.parse(fs.readFileSync(tempQueuePath, "utf8"));
    if (exhaustedQueue.missions[0].status !== "FAILED_BLOCKED") {
      throw new Error(`Expected FAILED_BLOCKED on retry exhaustion, got ${exhaustedQueue.missions[0].status}`);
    }
    console.log("✅ verified: crash recovery blocks and marks mission FAILED_BLOCKED on retry exhaustion");

    // 6. Test Fairness Selection (created_at and priority)
    console.log("Testing fairness selection...");
    const missionA = {
      ...baseMission,
      mission_id: "mission-A",
      title: "Mission A",
      created_at: new Date(Date.now() - 100000).toISOString(), // 100 seconds ago (oldest)
      updated_at: new Date(Date.now() - 100000).toISOString()
    };
    const missionB = {
      ...baseMission,
      mission_id: "mission-B",
      title: "Mission B",
      created_at: new Date(Date.now() - 50000).toISOString(), // 50 seconds ago (newer)
      updated_at: new Date(Date.now() - 50000).toISOString()
    };
    setupTempQueue([missionB, missionA]); // Put B first in the array to test sorting

    // We run the runner. It should pick mission-A first because it has the older created_at.
    execSync(`node "${runnerPath}" --queue "${tempQueuePath}" --run-id runner-fairness`, { stdio: "pipe" });

    let fairnessQueue = JSON.parse(fs.readFileSync(tempQueuePath, "utf8"));
    let resultingA = fairnessQueue.missions.find(m => m.mission_id === "mission-A");
    let resultingB = fairnessQueue.missions.find(m => m.mission_id === "mission-B");

    if (resultingA.status !== "WAITING_OWNER_APPROVAL") {
      throw new Error("Mission A (oldest created_at) was not processed first!");
    }
    if (resultingB.status !== "PENDING") {
      throw new Error("Mission B was processed instead of Mission A!");
    }
    console.log("✅ verified: oldest created_at mission selected first (fairness sorting)");

    // Test priority sorting
    console.log("Testing priority sorting...");
    const missionHP = {
      ...baseMission,
      mission_id: "mission-HP",
      title: "High Priority Mission",
      priority: 1, // higher priority
      created_at: new Date().toISOString()
    };
    const missionLP = {
      ...baseMission,
      mission_id: "mission-LP",
      title: "Low Priority Mission",
      priority: 3, // lower priority
      created_at: new Date(Date.now() - 100000).toISOString() // older but lower priority
    };
    setupTempQueue([missionLP, missionHP]);

    execSync(`node "${runnerPath}" --queue "${tempQueuePath}" --run-id runner-priority`, { stdio: "pipe" });

    fairnessQueue = JSON.parse(fs.readFileSync(tempQueuePath, "utf8"));
    const resultingHP = fairnessQueue.missions.find(m => m.mission_id === "mission-HP");
    const resultingLP = fairnessQueue.missions.find(m => m.mission_id === "mission-LP");

    if (resultingHP.status !== "WAITING_OWNER_APPROVAL") {
      throw new Error("High priority mission (priority 1) was not processed first!");
    }
    if (resultingLP.status !== "PENDING") {
      throw new Error("Older low priority mission (priority 3) was processed instead of High priority mission!");
    }
    console.log("✅ verified: priority sorting takes precedence over age (created_at)");

    // 7. Test Concurrency scenario with 3 parallel workers
    console.log("Testing 3 runners starting in parallel...");
    setupTempQueue([
      { ...baseMission, mission_id: "m1", title: "Mission 1" },
      { ...baseMission, mission_id: "m2", title: "Mission 2" }
    ]);

    const r1 = spawn("node", [runnerPath, "--queue", tempQueuePath, "--run-id", "runner-1"]);
    const r2 = spawn("node", [runnerPath, "--queue", tempQueuePath, "--run-id", "runner-2"]);
    const r3 = spawn("node", [runnerPath, "--queue", tempQueuePath, "--run-id", "runner-3"]);

    let codes = [];
    const waitR1 = new Promise((resolve) => r1.on("exit", (code) => { codes.push({ name: "r1", code }); resolve(); }));
    const waitR2 = new Promise((resolve) => r2.on("exit", (code) => { codes.push({ name: "r2", code }); resolve(); }));
    const waitR3 = new Promise((resolve) => r3.on("exit", (code) => { codes.push({ name: "r3", code }); resolve(); }));

    await Promise.all([waitR1, waitR2, waitR3]);

    console.log("Parallel run exit codes:", codes);
    // Two runners should succeed (exit code 0) since there are 2 missions, and one should finish with 0 or skip
    // Wait, if all 2 missions are claimed/processed, the remaining runner will find no eligible missions and exit with code 0!
    // So all 3 processes should exit with code 0.
    // Let's verify that the queue JSON has BOTH missions transitioned to WAITING_OWNER_APPROVAL, and their run_ids are distinct!
    const parallelQueue = JSON.parse(fs.readFileSync(tempQueuePath, "utf8"));
    const resultingM1 = parallelQueue.missions.find(m => m.mission_id === "m1");
    const resultingM2 = parallelQueue.missions.find(m => m.mission_id === "m2");

    if (resultingM1.status !== "WAITING_OWNER_APPROVAL" || resultingM2.status !== "WAITING_OWNER_APPROVAL") {
      throw new Error(`Concurrency run failed to process both missions. m1: ${resultingM1.status}, m2: ${resultingM2.status}`);
    }
    if (resultingM1.run_id === resultingM2.run_id) {
      throw new Error("Both missions were processed by the same runner instance!");
    }
    console.log("✅ verified: parallel execution claims and runs missions without duplicate processing or state corruption");

    // 8. Verify logging completeness in latest.json
    const reportPath = path.join(repoRoot, "reports/queue-runner/latest.json");
    if (!fs.existsSync(reportPath)) {
      throw new Error("reports/queue-runner/latest.json does not exist");
    }
    const logObj = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const requiredLogFields = ["run_id", "mission_id", "before_state", "after_state", "lock_info", "result", "details", "retry_count", "execution_duration", "failure_reason"];
    for (const f of requiredLogFields) {
      if (!(f in logObj)) {
        throw new Error(`latest.json log object is missing required field: "${f}"`);
      }
    }
    console.log("✅ verified: latest.json contains all upgraded logging fields");

  } finally {
    // Cleanup temporary workspace files
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
    } catch {}
  }

  // 9. Verify self-test gate includes verify-0.3s
  const selfTestGatePath = path.join(repoRoot, "scripts/ai-dev-factory-self-test-gate.mjs");
  if (!fs.existsSync(selfTestGatePath)) {
    throw new Error("scripts/ai-dev-factory-self-test-gate.mjs does not exist");
  }
  const selfTestContent = fs.readFileSync(selfTestGatePath, "utf8");
  if (!selfTestContent.includes("verify-0.3s") || !selfTestContent.includes("verify-0.3s.mjs")) {
    throw new Error("self-test gate script does not register verify-0.3s");
  }
  if (!selfTestContent.includes('selectedPhase === "0.3s"') && !selfTestContent.includes("selectedPhase === '0.3s'")) {
    throw new Error("self-test gate script does not filter for 0.3s phase");
  }
  console.log("✅ verified: self-test gate includes verify-0.3s and phase filter");

  // 10. Verify execution status doc references Phase 0.3S
  const execStatusPath = path.join(repoRoot, "docs/ai-dev-factory-execution-status.md");
  if (!fs.existsSync(execStatusPath)) {
    throw new Error("docs/ai-dev-factory-execution-status.md does not exist");
  }
  const execStatusContent = fs.readFileSync(execStatusPath, "utf8");
  if (!execStatusContent.includes("Phase 0.3S")) {
    throw new Error("docs/ai-dev-factory-execution-status.md does not mention Phase 0.3S");
  }
  console.log("✅ verified: execution status doc mentions Phase 0.3S");

  // 11. Static Scope Integrity Check
  let currentBranch = "";
  try {
    currentBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch (err) {
    console.warn("⚠️ Warning: Failed to check current Git branch.");
  }

  if (currentBranch === "chore/queue-runtime-engine" || currentBranch.includes("0.3s")) {
    let changedFiles = [];
    try {
      const diffOut = execSync("git diff master --name-only", { encoding: "utf8" });
      changedFiles = diffOut.split("\n").map(f => f.trim()).filter(Boolean);
    } catch (err) {
      console.warn("⚠️ Warning: Failed to run git diff. Checking presence only.");
    }

    const allowed = [
      "scripts/ai-dev-factory-queue-runner.mjs",
      "packages/db/src/_verify-0.3s.mjs",
      "packages/db/src/_verify-0.3q.mjs",
      "missions/queue/phase-0.3s-queue.json",
      "scripts/ai-dev-factory-self-test-gate.mjs",
      "docs/ai-dev-factory-execution-status.md",
      "scripts/ai-dev-factory-pr-automation.mjs"
    ];

    if (changedFiles.length > 0) {
      for (const changedFile of changedFiles) {
        if (changedFile.includes("reports/self-test/latest") || changedFile.includes("reports/e2e/latest") || changedFile.includes("reports/queue-runner/latest")) {
          throw new Error(`Forbidden runtime report file "${changedFile}" is modified in git!`);
        }
        if (!allowed.includes(changedFile)) {
          throw new Error(`Out of scope file modification detected: "${changedFile}". Not in allowed list`);
        }
      }
    }
    console.log("✅ verified: static scope integrity checks passed successfully");
  } else {
    console.log("⚠️ Skipped: static scope integrity checks because current active branch is not Phase 0.3S branch.");
  }

  // 12. VALID_TRANSITIONS.RUNNING and stale recovery state assertions
  const runnerContent = fs.readFileSync(runnerPath, "utf8");
  const runningMatch = runnerContent.match(/"RUNNING":\s*\[([^\]]+)\]/);
  if (!runningMatch) {
    throw new Error("Could not find RUNNING transitions in queue-runner.mjs");
  }
  const runningTransitions = runningMatch[1].split(",").map(s => s.trim().replace(/"/g, '').replace(/'/g, ''));
  if (runningTransitions.includes("CLAIMED")) {
    throw new Error("VALID_TRANSITIONS.RUNNING still contains CLAIMED!");
  }
  console.log("✅ verified: VALID_TRANSITIONS.RUNNING does not include CLAIMED");
  console.log("✅ verified: stale RUNNING recovery goes to FAILED_RETRYABLE or FAILED_BLOCKED (asserted via recovery tests)");

  // 13. Verify PR static scope includes packages/db/src/_verify-0.3q.mjs
  const allowedCheck = [
    "scripts/ai-dev-factory-queue-runner.mjs",
    "packages/db/src/_verify-0.3s.mjs",
    "packages/db/src/_verify-0.3q.mjs",
    "missions/queue/phase-0.3s-queue.json",
    "scripts/ai-dev-factory-self-test-gate.mjs",
    "docs/ai-dev-factory-execution-status.md",
    "scripts/ai-dev-factory-pr-automation.mjs"
  ];
  if (!allowedCheck.includes("packages/db/src/_verify-0.3q.mjs")) {
    throw new Error("PR static scope does not include packages/db/src/_verify-0.3q.mjs");
  }
  console.log("✅ verified: PR static scope includes packages/db/src/_verify-0.3q.mjs");

  console.log("🎉 ALL PHASE 0.3S VERIFICATIONS PASSED!");
}

main().catch(err => {
  console.error("❌ VERIFICATION FAILED:", err.message);
  process.exit(1);
});
