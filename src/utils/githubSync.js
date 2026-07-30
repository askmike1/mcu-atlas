const API_BASE = 'https://api.github.com';

// Best-effort guess at { owner, repo } from a github.io Pages URL, e.g.
// https://askmike1.github.io/mcu-atlas/ -> { owner: 'askmike1', repo: 'mcu-atlas' }.
export function detectRepoFromLocation() {
  const host = window.location.hostname;
  if (!host.endsWith('.github.io')) return null;
  const owner = host.slice(0, -'.github.io'.length);
  const repo = window.location.pathname.split('/').filter(Boolean)[0];
  if (!owner || !repo) return null;
  return { owner, repo };
}

function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

async function ghRequest(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    let message = `GitHub API error (${res.status})`;
    try {
      const body = await res.json();
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

// Returns { watched: string[], sha: string|null }. sha is null if the file doesn't exist yet.
export async function loadProgressFromRepo({ owner, repo, path, branch, token }) {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${branch ? `?ref=${encodeURIComponent(branch)}` : ''}`;
  const data = await ghRequest(url, token);
  if (!data) return { watched: [], sha: null };
  const json = JSON.parse(decodeBase64(data.content));
  return { watched: Array.isArray(json.watched) ? json.watched : [], sha: data.sha };
}

// Returns the new file sha, so subsequent saves can update rather than conflict.
export async function saveProgressToRepo({ owner, repo, path, branch, token, watched, sha }) {
  const payload = {
    app: 'mcu-atlas',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    watched: [...watched].sort(),
  };
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const body = {
    message: `Update MCU Atlas watched progress (${payload.watched.length} titles)`,
    content: encodeBase64(JSON.stringify(payload, null, 2)),
    branch: branch || undefined,
  };
  if (sha) body.sha = sha;
  const data = await ghRequest(url, token, { method: 'PUT', body: JSON.stringify(body) });
  return data.content.sha;
}
