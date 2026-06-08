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
- No Claude/OpenAI/Anthropic/Gemini external API calls
- No API keys
- No billing/spend
- No deploy
- No merge to master
- No destructive database/schema changes
- Local Paperclip task/comment/status writes are allowed as part of internal mock reporting
- No external API / LLM provider calls.
- Local Paperclip API calls are allowed for internal task/comment reporting.`;
}
