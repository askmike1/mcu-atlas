import { useCallback, useEffect, useState } from 'react';
import { detectRepoFromLocation, loadProgressFromRepo, saveProgressToRepo } from '../utils/githubSync';

const CONFIG_KEY = 'mcu-atlas:github-sync-config';
const TOKEN_KEY = 'mcu-atlas:github-sync-token';

function loadConfig() {
  const detected = detectRepoFromLocation();
  const defaults = {
    owner: detected?.owner ?? '',
    repo: detected?.repo ?? '',
    path: 'data/watched-progress.json',
    branch: 'main',
  };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function useGitHubSync() {
  const [config, setConfig] = useState(loadConfig);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [rememberToken, setRememberToken] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [status, setStatus] = useState(null);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (rememberToken && token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [rememberToken, token]);

  const updateConfig = useCallback((patch) => setConfig((c) => ({ ...c, ...patch })), []);

  const load = useCallback(async () => {
    setStatus({ type: 'loading', message: 'Loading from GitHub…' });
    try {
      const { watched } = await loadProgressFromRepo({ ...config, token });
      setStatus({
        type: 'ok',
        message: `Loaded ${watched.length} watched title${watched.length === 1 ? '' : 's'} from the repo.`,
      });
      return watched;
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
      throw err;
    }
  }, [config, token]);

  const save = useCallback(
    async (watchedSet) => {
      setStatus({ type: 'loading', message: 'Saving to GitHub…' });
      try {
        const existing = await loadProgressFromRepo({ ...config, token });
        await saveProgressToRepo({ ...config, token, watched: watchedSet, sha: existing.sha });
        setStatus({
          type: 'ok',
          message: `Saved ${watchedSet.size} watched title${watchedSet.size === 1 ? '' : 's'} to the repo.`,
        });
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
        throw err;
      }
    },
    [config, token]
  );

  return { config, updateConfig, token, setToken, rememberToken, setRememberToken, status, load, save };
}
