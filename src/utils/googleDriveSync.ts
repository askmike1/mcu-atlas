// Client-side Google Drive integration: Google Identity Services (GIS) for
// OAuth, then the Drive REST API directly via fetch. No server and no
// third-party client library — just this app talking straight to Google's
// own APIs over HTTPS.
//
// Security notes:
// - We request only the `drive.file` scope, the most restrictive Drive
//   scope Google offers: it grants access to files this app itself creates
//   (or files the user explicitly opens via a picker, which this app never
//   shows) — never the rest of the user's Drive.
// - The GIS script tag lives statically in index.html (a fixed, hardcoded
//   Google URL that's part of the page's own markup, never built from user
//   input or injected at runtime), and is the only third-party script
//   allowed by the page's Content-Security-Policy.
// - The access token this returns is short-lived and is never written to
//   storage by this module — see useGoogleDriveSync for how it's held.

interface GoogleTokenResponse {
  error?: string;
  error_description?: string;
  access_token: string;
}

interface GoogleTokenClient {
  requestAccessToken(): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback: (err: { message?: string }) => void;
          }): GoogleTokenClient;
        };
      };
    };
  }
}

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const FILE_NAME = 'mcu-atlas-progress.json';

// The GIS <script> tag in index.html loads with async/defer, so it may
// still be in flight the first time a user opens the sync dialog — poll
// briefly for window.google.accounts.oauth2 rather than assuming it's ready.
export function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timeoutMs = 10000;
    const check = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        reject(new Error('Google Identity Services failed to load. Check your connection and try again.'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// Opens Google's OAuth consent popup and resolves with a short-lived access
// token scoped to drive.file only.
export function requestAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error) reject(new Error(response.error_description || response.error));
          else resolve(response.access_token);
        },
        error_callback: (err) => reject(new Error(err?.message || 'Google sign-in was cancelled or failed.')),
      });
      client.requestAccessToken();
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to start Google sign-in.'));
    }
  });
}

async function driveRequest(url: string, token: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Google Drive API error (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res;
}

// Looks up this app's progress file by name. Because the token only has the
// drive.file scope, this can only ever see files the app itself created.
export async function findFile(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const url = `${DRIVE_FILES_URL}?q=${q}&spaces=drive&fields=files(id,name)&pageSize=1`;
  const res = await driveRequest(url, token);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function downloadFile(token: string, fileId: string): Promise<string> {
  const res = await driveRequest(`${DRIVE_FILES_URL}/${fileId}?alt=media`, token);
  return res.text();
}

// Creates the file if fileId is null, otherwise updates its contents in
// place. Returns the file's id.
export async function uploadFile(token: string, fileId: string | null, contents: string): Promise<string> {
  const boundary = `mcu-atlas-${crypto.randomUUID()}`;
  const metadata = fileId ? {} : { name: FILE_NAME, mimeType: 'application/json' };
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    contents +
    `\r\n--${boundary}--`;

  const url = fileId
    ? `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart`;

  const res = await driveRequest(url, token, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  const data = await res.json();
  return data.id;
}
