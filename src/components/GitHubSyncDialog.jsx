export default function GitHubSyncDialog({
  onClose,
  config,
  updateConfig,
  token,
  setToken,
  rememberToken,
  setRememberToken,
  status,
  onLoad,
  onSave,
  watchedCount,
  progressPath,
}) {
  const busy = status?.type === 'loading';
  const canSync = Boolean(config.owner && config.repo && token);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="GitHub sync">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Sync progress with GitHub</h2>
        <p className="hint">
          Save your watched list as a file in this repo instead of (or in addition to) your browser's local storage,
          so it follows you across devices.
        </p>

        <label className="field">
          Personal access token
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            autoComplete="off"
          />
        </label>
        <p className="hint">
          Needs read/write access to <strong>Contents</strong> for this repo only. Create a fine-grained token at{' '}
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
            github.com/settings/personal-access-tokens
          </a>
          .
        </p>
        <label className="checkbox-field">
          <input type="checkbox" checked={rememberToken} onChange={(e) => setRememberToken(e.target.checked)} />
          Remember this token on this device (stored in this browser's local storage)
        </label>

        <div className="field-grid">
          <label className="field">
            Owner
            <input value={config.owner} onChange={(e) => updateConfig({ owner: e.target.value })} />
          </label>
          <label className="field">
            Repo
            <input value={config.repo} onChange={(e) => updateConfig({ repo: e.target.value })} />
          </label>
          <label className="field">
            Branch
            <input value={config.branch} onChange={(e) => updateConfig({ branch: e.target.value })} />
          </label>
        </div>
        <p className="hint">
          Always saved to <code>{progressPath}</code> in that repo — this folder is excluded from the deploy
          workflow, so saving progress never triggers a rebuild.
        </p>

        <div className="modal-actions">
          <button disabled={!canSync || busy} onClick={() => onSave()}>
            Save {watchedCount} watched to repo
          </button>
          <button disabled={!canSync || busy} onClick={() => onLoad()}>
            Load from repo (overwrites current)
          </button>
        </div>

        {status && <p className={`sync-status sync-status--${status.type}`}>{status.message}</p>}
      </div>
    </div>
  );
}
