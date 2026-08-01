import { useRef, useState } from 'react';
import { IMPORTANCE } from '../utils/mcu';
import SearchBox from './SearchBox';

export default function Toolbar({ entries, onSelectEntry, watchedCount, totalCount, onExport, onImport, onReset, onOpenSync }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (evt) => {
    const file = evt.target.files?.[0];
    evt.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const count = onImport(text);
      setStatus({ ok: true, message: `Imported ${count} watched title${count === 1 ? '' : 's'}.` });
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    }
    setTimeout(() => setStatus(null), 5000);
  };

  const handleReset = () => {
    if (window.confirm('Clear all watched selections? This cannot be undone.')) {
      onReset();
    }
  };

  const pct = totalCount === 0 ? 0 : Math.round((watchedCount / totalCount) * 100);

  return (
    <header className="toolbar">
      <div className="toolbar-title">
        <h1>MCU Atlas</h1>
        <span className="subtitle">Marvel Cinematic Universe dependency map</span>
      </div>

      <SearchBox entries={entries} onSelect={onSelectEntry} />

      <div className="toolbar-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>
          {watchedCount} / {totalCount} watched
        </span>
      </div>

      <div className="toolbar-legend">
        {Object.entries(IMPORTANCE).map(([key, meta]) => (
          <span key={key} className="legend-item">
            <span className={`legend-swatch legend-swatch--${key}`} style={{ '--badge-color': meta.color }} />
            {meta.shortLabel}
          </span>
        ))}
      </div>

      <div className="toolbar-actions">
        <button onClick={onOpenSync}>Google Drive sync</button>
        <button onClick={onExport}>Export</button>
        <button onClick={handleImportClick}>Import</button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileChange} />
        <button className="danger" onClick={handleReset}>
          Reset
        </button>
      </div>

      {status && <div className={`toast ${status.ok ? 'toast--ok' : 'toast--error'}`}>{status.message}</div>}
    </header>
  );
}
