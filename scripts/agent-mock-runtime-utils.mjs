import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[Mock Runtime] Error: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "Connection": "close"
    }
  });
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url} with status ${res.status}`);
  }
  return res.json();
}

export async function postJson(url, payload, extraHeaders = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connection": "close",
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST failed for ${url} with status ${res.status}: ${text}`);
  }
  return res.json();
}

export function formatMaybe(value) {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }
  return value;
}

export async function fetchAssignedIssue(apiUrl, taskId) {
  console.log(`[Mock Runtime] Fetching assigned task details for: ${taskId}`);
  return fetchJson(`${apiUrl}/api/issues/${taskId}`);
}

export async function fetchParentIssue(apiUrl, issue) {
  if (!issue.parentId) {
    console.log(`[Mock Runtime] Parent task ID is not available on child task ${issue.id}.`);
    return null;
  }
  console.log(`[Mock Runtime] Fetching parent task details for parentId: ${issue.parentId}`);
  try {
    return await fetchJson(`${apiUrl}/api/issues/${issue.parentId}`);
  } catch (err) {
    console.warn(`[Mock Runtime] Warning: Failed to fetch parent issue ${issue.parentId}: ${err.message}`);
    return null;
  }
}

export async function patchJson(url, payload, extraHeaders = {}) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Connection": "close",
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH failed for ${url} with status ${res.status}: ${text}`);
  }
  return res.json();
}

export async function patchIssueStatus(apiUrl, issueId, status) {
  console.log(`[Mock Runtime] Updating issue ${issueId} status to: ${status}...`);
  return patchJson(`${apiUrl}/api/issues/${issueId}`, { status });
}

export async function postIssueComment(apiUrl, issueId, runId, markdown, title) {
  console.log(`[Mock Runtime] Posting report comment to issue ${issueId}...`);
  const commentPayload = {
    body: markdown,
    presentation: {
      kind: "message",
      tone: "neutral",
      title: title || "Agent Report",
      detailsDefaultOpen: true
    }
  };
  const headers = runId ? { "X-Paperclip-Run-Id": runId } : {};
  return postJson(`${apiUrl}/api/issues/${issueId}/comments`, commentPayload, headers);
}

export function buildSafetyFooter() {
  return `---
*🛡️ Safety & Policy Compliance Summary*
- **Mock Mode**: Active (Mock mode only)
- **External LLM/API Calls**: Blocked (No external LLM/API provider calls, no Claude/OpenAI/Anthropic/Gemini external API calls)
- **API Keys & Secrets**: Blocked (No API keys used, no secrets read)
- **Billing / Spend**: Blocked (No billing/spend)
- **Deployment**: Blocked (No production deploy)
- **Merge Status**: Blocked (No merge to master)
- **Database Mutation**: Blocked (No destructive database/schema changes)
- **Local API Calls**: Allowed (Local Paperclip API calls allowed only for task/comment/status reporting as part of internal mock reporting)`;
}

export function safeReadTextFile(filePath, maxBytes = 200000) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    if (stats.size > maxBytes) {
      return `[File size ${stats.size} bytes exceeds safe limit of ${maxBytes} bytes]`;
    }
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return `[Error reading file: ${err.message}]`;
  }
}

export function safeListFiles(dirPath, options = {}) {
  const { recursive = false, maxDepth = 3, depth = 0 } = options;
  const results = [];
  try {
    if (!fs.existsSync(dirPath)) return results;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      if (
        [
          "node_modules",
          "dist",
          ".next",
          "coverage",
          ".git",
          ".gemini",
          "build",
          "out"
        ].includes(name)
      ) {
        continue;
      }
      const fullPath = path.join(dirPath, name);
      if (entry.isDirectory()) {
        results.push({ name, path: fullPath, isDirectory: true });
        if (recursive && depth < maxDepth) {
          const subFiles = safeListFiles(fullPath, { recursive, maxDepth, depth: depth + 1 });
          results.push(...subFiles);
        }
      } else {
        results.push({ name, path: fullPath, isDirectory: false });
      }
    }
  } catch (err) {
    // Ignore
  }
  return results;
}

export function findRepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);

  while (dir) {
    // 1. Check pnpm-workspace.yaml
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    
    // 2. Check root package.json
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkgRaw = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(pkgRaw);
        if (
          pkg.name === "paperclip" ||
          pkg.workspaces ||
          (pkg.private === true && fs.existsSync(path.join(dir, "packages")))
        ) {
          return dir;
        }
      } catch (err) {
        // Ignore JSON parse errors
      }
    }
    
    // 3. Fallback: check for .git directory or pnpm-lock.yaml
    if (fs.existsSync(path.join(dir, ".git")) || fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Safe fallback to the location of this script/module
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    let mDir = path.resolve(moduleDir);
    while (mDir) {
      if (fs.existsSync(path.join(mDir, "pnpm-workspace.yaml"))) {
        return mDir;
      }
      const pkgPath = path.join(mDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          if (pkg.name === "paperclip" || pkg.workspaces) {
            return mDir;
          }
        } catch {}
      }
      if (fs.existsSync(path.join(mDir, ".git")) || fs.existsSync(path.join(mDir, "pnpm-lock.yaml"))) {
        return mDir;
      }
      const parent = path.dirname(mDir);
      if (parent === mDir) break;
      mDir = parent;
    }
  } catch {}

  return startDir;
}

export function getWorkspaceSummary() {
  const root = findRepoRoot();
  const packageJsonPath = path.join(root, "package.json");
  const workspaceYamlPath = path.join(root, "pnpm-workspace.yaml");
  
  let name = "unknown";
  let isMonorepo = false;
  let workspaces = [];

  const pkgJsonRaw = safeReadTextFile(packageJsonPath);
  if (pkgJsonRaw) {
    try {
      const pkg = JSON.parse(pkgJsonRaw);
      name = pkg.name || name;
      if (pkg.workspaces) {
        isMonorepo = true;
        workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces.packages || []);
      }
    } catch {}
  }

  if (fs.existsSync(workspaceYamlPath)) {
    isMonorepo = true;
    const yamlContent = safeReadTextFile(workspaceYamlPath);
    if (yamlContent) {
      const lines = yamlContent.split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*-\s*['"]?([^'"]+)['"]?/);
        if (match) {
          workspaces.push(match[1].replace(/\r$/, ""));
        }
      }
    }
  }

  const packagesDir = path.join(root, "packages");
  const detectedPackages = [];
  if (fs.existsSync(packagesDir)) {
    try {
      const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && e.name !== "node_modules") {
          detectedPackages.push(e.name);
        }
      }
    } catch {}
  }

  return {
    name,
    isMonorepo,
    workspaces: [...new Set(workspaces)],
    detectedPackages,
    packagesCount: detectedPackages.length
  };
}

export function getGitSummary() {
  const root = findRepoRoot();
  const summary = {
    branch: "unknown",
    isClean: true,
    statusShort: "",
    diffStat: "",
    modifiedFiles: []
  };
  try {
    summary.branch = execSync("git branch --show-current", { cwd: root, encoding: "utf8" }).trim();
    
    const statusRaw = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim();
    if (statusRaw) {
      summary.isClean = false;
      summary.statusShort = statusRaw;
      summary.modifiedFiles = statusRaw
        .split("\n")
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1];
        })
        .filter(Boolean);
    }
    
    const diffRaw = execSync("git diff --stat", { cwd: root, encoding: "utf8" }).trim();
    if (diffRaw) {
      summary.diffStat = diffRaw;
    }
  } catch (err) {
    summary.branch = `Error: ${err.message}`;
  }
  return summary;
}

export function detectRoutesAndPages() {
  const root = findRepoRoot();
  const pages = [];
  
  const candidateDirs = [
    path.join(root, "ui", "src", "pages"),
    path.join(root, "ui", "pages"),
    path.join(root, "src", "pages")
  ];

  const packagesDir = path.join(root, "packages");
  if (fs.existsSync(packagesDir)) {
    try {
      const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && e.name !== "node_modules") {
          candidateDirs.push(path.join(packagesDir, e.name, "src", "pages"));
        }
      }
    } catch {}
  }

  for (const dir of candidateDirs) {
    try {
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isDirectory() && e.name.endsWith(".tsx") && !e.name.includes(".test.")) {
            pages.push(e.name.replace(/\.tsx$/, ""));
          }
        }
      }
    } catch {}
  }

  return pages.slice(0, 15);
}

export function detectTestFiles() {
  const root = findRepoRoot();
  const testFiles = [];
  
  const testDirs = [
    path.join(root, "server", "src", "__tests__"),
    path.join(root, "server", "src", "tests"),
    path.join(root, "tests"),
    path.join(root, "e2e")
  ];
  
  const packagesDir = path.join(root, "packages");
  if (fs.existsSync(packagesDir)) {
    try {
      const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && e.name !== "node_modules") {
          const pkgPath = path.join(packagesDir, e.name);
          testDirs.push(
            path.join(pkgPath, "src", "tests"),
            path.join(pkgPath, "src", "test"),
            path.join(pkgPath, "tests"),
            path.join(pkgPath, "test")
          );
        }
      }
    } catch {}
  }

  for (const dir of testDirs) {
    try {
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isDirectory() && (e.name.endsWith(".test.ts") || e.name.endsWith(".spec.ts") || e.name.endsWith(".test.tsx") || e.name.endsWith(".test.js"))) {
            const relPath = path.relative(root, path.join(dir, e.name)).replace(/\\/g, "/");
            testFiles.push(relPath);
          }
        }
      }
    } catch {}
  }

  return testFiles.slice(0, 10);
}

export function detectConfigFiles() {
  const root = findRepoRoot();
  const configFiles = [];
  const candidateNames = [
    "package.json",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "tsconfig.base.json",
    "vitest.config.ts",
    "vite.config.ts",
    "docker-compose.yml",
    "Dockerfile",
    ".gitignore",
    ".npmrc"
  ];
  for (const name of candidateNames) {
    if (fs.existsSync(path.join(root, name))) {
      configFiles.push(name);
    }
  }
  return configFiles;
}

export function getLikelyRelevantFiles(taskTitle = "", taskDescription = "") {
  const root = findRepoRoot();
  const candidates = [];
  
  const searchDirs = [
    path.join(root, "scripts"),
    path.join(root, "packages", "db", "src"),
    path.join(root, "server", "src"),
    path.join(root, "ui", "src")
  ];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = safeListFiles(dir, { recursive: true, maxDepth: 2 });
      for (const f of files) {
        if (!f.isDirectory && !f.name.includes(".test.") && !f.name.includes(".spec.")) {
          const relPath = path.relative(root, f.path).replace(/\\/g, "/");
          candidates.push(relPath);
        }
      }
    }
  }

  const terms = `${taskTitle} ${taskDescription}`
    .toLowerCase()
    .split(/[\s_\-\/\.\(\)\[\]]+/)
    .filter(t => t.length > 2);

  const commonKeywords = [
    "mock", "runtime", "report", "jarvis", "codex", "claude", "qa", 
    "antigravity", "report-bot", "report bot", "agent", "scripts", 
    "verify", "verification", "factory", "setup", "paperclip", "0.3g"
  ];
  for (const kw of commonKeywords) {
    if (`${taskTitle} ${taskDescription}`.toLowerCase().includes(kw) && !terms.includes(kw)) {
      terms.push(kw);
    }
  }

  const importantFiles = [
    "scripts/agent-mock-runtime-utils.mjs",
    "scripts/codex-mock-runtime.mjs",
    "scripts/claude-reviewer-mock-runtime.mjs",
    "scripts/antigravity-qa-mock-runtime.mjs",
    "scripts/report-bot-mock-runtime.mjs",
    "packages/db/src/seed-ai-factory.ts"
  ];

  const taskText = `${taskTitle} ${taskDescription}`.toLowerCase();
  const isMockVerificationTask = 
    taskText.includes("mock") || 
    taskText.includes("report") || 
    taskText.includes("verification") || 
    taskText.includes("verify") || 
    taskText.includes("0.3g") || 
    taskText.includes("jarvis") ||
    taskText.includes("factory") ||
    taskText.includes("setup");

  const matched = [];
  for (const file of candidates) {
    const fileLower = file.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (fileLower.includes(term)) {
        score++;
      }
    }
    if (isMockVerificationTask && importantFiles.includes(file)) {
      score += 5;
    }
    if (score > 0) {
      matched.push({ file, score });
    }
  }

  matched.sort((a, b) => b.score - a.score || a.file.length - b.file.length);

  if (matched.length === 0) {
    return candidates.slice(0, 5);
  }

  return matched.map(m => m.file).slice(0, 5);
}

export function buildProjectContextBlock() {
  const ws = getWorkspaceSummary();
  const git = getGitSummary();
  const configs = detectConfigFiles();
  const routes = detectRoutesAndPages();

  const routesText = routes.length > 0 ? routes.map(r => `\`${r}\``).join(", ") : "No frontend route files detected from safe scan.";

  return `#### 📁 Safe Project Context (Workspace & Git Status)
- **Workspace Name**: \`${ws.name}\` (Monorepo: \`${ws.isMonorepo ? "Yes" : "No"}\`)
- **Detected Packages**: ${ws.detectedPackages.map(p => `\`${p}\``).join(", ") || "None"}
- **Active Git Branch**: \`${git.branch}\`
- **Working Tree Clean**: \`${git.isClean ? "Yes" : "No"}\`
${git.diffStat ? `- **Git Diff Stat**:\n\`\`\`\n${git.diffStat}\n\`\`\`` : ""}
- **Detected Configs**: ${configs.map(c => `\`${c}\``).join(", ")}
- **Top Frontend Pages/Routes**: ${routesText}`;
}
