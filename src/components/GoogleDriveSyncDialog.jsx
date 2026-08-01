export default function GoogleDriveSyncDialog({
  onClose,
  connected,
  status,
  onConnect,
  onLoad,
  onSave,
  watchedCount,
  fileName,
}) {
  const busy = status?.type === 'loading';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Google Drive sync">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Sync progress with Google Drive</h2>
        <p className="hint">
          Save your watched list as a file in your own Google Drive instead of (or in addition to) your browser's
          local storage, so it follows you across devices.
        </p>

        <p className="hint">
          Signing in only ever requests the restricted <code>drive.file</code> scope, which lets this app read/write
          only the one file it creates — never anything else in your Drive.
        </p>

        <div className="modal-actions">
          <button disabled={busy} onClick={onConnect}>
            {connected ? 'Reconnect' : 'Connect Google Drive'}
          </button>
        </div>

        <div className="modal-actions">
          <button disabled={!connected || busy} onClick={() => onSave()}>
            Save {watchedCount} watched to Drive
          </button>
          <button disabled={!connected || busy} onClick={() => onLoad()}>
            Load from Drive (overwrites current)
          </button>
        </div>

        <p className="hint">
          Always saved as <code>{fileName}</code> in your Drive.
        </p>

        {status && <p className={`sync-status sync-status--${status.type}`}>{status.message}</p>}
      </div>
    </div>
  );
}
