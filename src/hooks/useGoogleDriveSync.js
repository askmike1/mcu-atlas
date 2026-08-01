import { useCallback, useEffect, useState } from 'react';
import {
  FILE_NAME,
  downloadFile,
  findFile,
  loadGoogleIdentityServices,
  requestAccessToken,
  uploadFile,
} from '../utils/googleDriveSync';

const FILE_ID_KEY = 'mcu-atlas:google-file-id';

// Registered OAuth client for this app's deployed origin. Client IDs are
// not secrets — they only identify which app is requesting access, and
// Google still requires the user to consent via its own popup — so it's
// fine to ship this hardcoded rather than asking each user to create one.
const CLIENT_ID = '794102509102-pm7q1ksi0rc1td12onpjnc9nni2ehr5p.apps.googleusercontent.com';

export function useGoogleDriveSync() {
  const [fileId, setFileId] = useState(() => localStorage.getItem(FILE_ID_KEY) || '');
  // The OAuth access token is deliberately kept only in this component's
  // state, never persisted to localStorage — it's a short-lived credential
  // (~1hr), and not writing it to storage means it can't be read back by a
  // future bug or a browser extension inspecting storage. Reconnecting is a
  // one-click popup, so there's little cost to not remembering it.
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (fileId) localStorage.setItem(FILE_ID_KEY, fileId);
    else localStorage.removeItem(FILE_ID_KEY);
  }, [fileId]);

  const connect = useCallback(async () => {
    setStatus({ type: 'loading', message: 'Connecting to Google…' });
    try {
      await loadGoogleIdentityServices();
      const accessToken = await requestAccessToken(CLIENT_ID);
      setToken(accessToken);
      setStatus({ type: 'ok', message: 'Connected to Google Drive.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }, []);

  const load = useCallback(async () => {
    setStatus({ type: 'loading', message: 'Loading from Google Drive…' });
    try {
      let id = fileId || (await findFile(token));
      if (!id) {
        setStatus({ type: 'error', message: 'No saved file found in Google Drive yet — try Save first.' });
        return [];
      }
      setFileId(id);
      const text = await downloadFile(token, id);
      const data = JSON.parse(text);
      const watched = Array.isArray(data.watched) ? data.watched.filter((w) => typeof w === 'string') : [];
      setStatus({
        type: 'ok',
        message: `Loaded ${watched.length} watched title${watched.length === 1 ? '' : 's'} from Google Drive.`,
      });
      return watched;
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
      throw err;
    }
  }, [fileId, token]);

  const save = useCallback(
    async (watchedSet) => {
      setStatus({ type: 'loading', message: 'Saving to Google Drive…' });
      try {
        const id = fileId || (await findFile(token));
        const payload = {
          app: 'mcu-atlas',
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          watched: [...watchedSet].sort(),
        };
        const newId = await uploadFile(token, id, JSON.stringify(payload, null, 2));
        setFileId(newId);
        setStatus({
          type: 'ok',
          message: `Saved ${watchedSet.size} watched title${watchedSet.size === 1 ? '' : 's'} to Google Drive.`,
        });
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
        throw err;
      }
    },
    [fileId, token]
  );

  return {
    connected: Boolean(token),
    status,
    connect,
    load,
    save,
    fileName: FILE_NAME,
  };
}
