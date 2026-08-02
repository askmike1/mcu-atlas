import { useRef, useState } from 'react';
import { IMPORTANCE } from '../utils/mcu';
import SearchBox from './SearchBox';
import UserSwitcher from './UserSwitcher';
import UpNext from './UpNext';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export default function Toolbar({
  entries,
  onSelectEntry,
  watchedCount,
  totalCount,
  onExport,
  onImport,
  onReset,
  onOpenSync,
  users,
  currentUserId,
  onSwitchUser,
  onAddUser,
  onRenameUser,
  onRemoveUser,
  upNext,
  viewMode,
  onSetViewMode,
  filters,
  onSetFilters,
  theme,
  onToggleTheme,
}) {
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
    const current = users.find((u) => u.id === currentUserId);
    if (window.confirm(`Clear all watched/watching selections for ${current?.name ?? 'this user'}? This cannot be undone.`)) {
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

      <UserSwitcher
        users={users}
        currentUserId={currentUserId}
        onSwitch={onSwitchUser}
        onAdd={onAddUser}
        onRename={onRenameUser}
        onRemove={onRemoveUser}
      />

      <SearchBox entries={entries} onSelect={onSelectEntry} />

      <UpNext items={upNext} onSelect={onSelectEntry} />

      <div className="view-toggle" role="group" aria-label="View mode">
        <button
          type="button"
          className={viewMode === 'tree' ? 'active' : ''}
          onClick={() => onSetViewMode('tree')}
        >
          Tree
        </button>
        <button
          type="button"
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => onSetViewMode('list')}
        >
          List
        </button>
      </div>

      <div className="toolbar-filters">
        <label>
          <input
            type="checkbox"
            checked={filters.hideWatched}
            onChange={(evt) => onSetFilters({ ...filters, hideWatched: evt.target.checked })}
          />
          Hide watched
        </label>
        <select value={filters.type} onChange={(evt) => onSetFilters({ ...filters, type: evt.target.value })}>
          <option value="all">All types</option>
          <option value="movie">Movies</option>
          <option value="show">Shows</option>
        </select>
      </div>

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
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
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
