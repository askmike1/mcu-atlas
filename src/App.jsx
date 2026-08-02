import { useCallback, useEffect, useMemo, useState } from 'react';
import mcuData from './data/mcu-data.json';
import GraphView from './components/GraphView';
import WatchOrderList from './components/WatchOrderList';
import DetailPanel from './components/DetailPanel';
import Toolbar from './components/Toolbar';
import GoogleDriveSyncDialog from './components/GoogleDriveSyncDialog';
import { useUserState } from './hooks/useUserState';
import { useGoogleDriveSync } from './hooks/useGoogleDriveSync';
import { useIsMobile } from './hooks/useIsMobile';
import { indexEntries, getUpNext, computeWatchOrder } from './utils/mcu';
import { downloadWatchedFile, parseWatchedFile } from './utils/watchedFile';
import './App.css';

const THEME_KEY = 'mcu-atlas:theme';

function initialSelectedIdFromUrl(validIds) {
  const param = new URLSearchParams(window.location.search).get('title');
  return param && validIds.has(param) ? param : null;
}

export default function App() {
  const { entries, phases } = mcuData;
  const { byId, dependentsOf } = useMemo(() => indexEntries(entries), [entries]);
  const validIds = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);
  const phaseNames = useMemo(() => new Map(phases.map((p) => [p.number, p.name])), [phases]);

  const {
    users,
    currentUserId,
    watched,
    watching,
    statusOf,
    setStatus,
    switchUser,
    addUser,
    renameUser,
    removeUser,
    replaceCurrentUserStatus,
    importUsers,
    exportState,
    reset,
  } = useUserState(validIds);

  const [selectedId, setSelectedId] = useState(() => initialSelectedIdFromUrl(validIds));
  const [modalMinimized, setModalMinimized] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [viewMode, setViewMode] = useState('tree');
  const [filters, setFilters] = useState({ hideWatched: false, type: 'all' });
  const [theme, setTheme] = useState(() => (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'));
  const sync = useGoogleDriveSync(validIds);
  const isMobile = useIsMobile();

  // Keeps a title shareable/bookmarkable without pushing a history entry
  // per click — deep links only need the final URL to be correct.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set('title', selectedId);
    else url.searchParams.delete('title');
    window.history.replaceState(null, '', url);
  }, [selectedId]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filters.hideWatched && watched.has(e.id)) return false;
      if (filters.type !== 'all' && e.type !== filters.type) return false;
      return true;
    });
  }, [entries, filters, watched]);

  const upNext = useMemo(() => getUpNext(entries, watched, watching, { limit: 6 }), [entries, watched, watching]);
  const watchOrder = useMemo(() => computeWatchOrder(filteredEntries), [filteredEntries]);

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    setModalMinimized(false);
  }, []);
  const handleClose = useCallback(() => {
    setSelectedId(null);
    setModalMinimized(false);
  }, []);
  const handleMinimize = useCallback(() => setModalMinimized(true), []);
  const handleExpand = useCallback(() => setModalMinimized(false), []);

  const handleExport = useCallback(() => downloadWatchedFile(exportState()), [exportState]);

  const handleImport = useCallback(
    (text) => {
      const result = parseWatchedFile(text, validIds);
      if (result.users) {
        importUsers(result.users, result.currentUserId);
        return result.users.reduce((sum, u) => sum + Object.keys(u.status).length, 0);
      }
      replaceCurrentUserStatus(result.status);
      return Object.keys(result.status).length;
    },
    [validIds, importUsers, replaceCurrentUserStatus]
  );

  const handleSyncSave = useCallback(() => {
    sync.save(exportState()).catch(() => {});
  }, [sync, exportState]);

  const handleSyncLoad = useCallback(() => {
    sync
      .load()
      .then((result) => {
        if (!result) return;
        if (result.users) importUsers(result.users, result.currentUserId);
        else replaceCurrentUserStatus(result.status);
      })
      .catch(() => {});
  }, [sync, importUsers, replaceCurrentUserStatus]);

  const selectedEntry = selectedId ? byId.get(selectedId) : null;

  return (
    <div className="app">
      <Toolbar
        entries={entries}
        onSelectEntry={handleSelect}
        watchedCount={watched.size}
        totalCount={entries.length}
        onExport={handleExport}
        onImport={handleImport}
        onReset={reset}
        onOpenSync={() => setSyncOpen(true)}
        users={users}
        currentUserId={currentUserId}
        onSwitchUser={switchUser}
        onAddUser={addUser}
        onRenameUser={renameUser}
        onRemoveUser={removeUser}
        upNext={upNext}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        filters={filters}
        onSetFilters={setFilters}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="layout">
        {viewMode === 'tree' ? (
          <GraphView
            entries={filteredEntries}
            phases={phases}
            watched={watched}
            watching={watching}
            selectedId={selectedId}
            onSelect={handleSelect}
            themeName={theme}
          />
        ) : (
          <WatchOrderList
            entries={watchOrder}
            watched={watched}
            watching={watching}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        )}
        {!isMobile && (
          <DetailPanel
            entry={selectedEntry}
            byId={byId}
            dependents={dependentsOf}
            watched={watched}
            watching={watching}
            statusOf={statusOf}
            onSetStatus={setStatus}
            onSelect={handleSelect}
            onClose={handleClose}
            phaseNames={phaseNames}
          />
        )}
      </div>
      {isMobile && selectedEntry && !modalMinimized && (
        <div className="detail-modal-backdrop" onClick={handleClose}>
          <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <DetailPanel
              entry={selectedEntry}
              byId={byId}
              dependents={dependentsOf}
              watched={watched}
              watching={watching}
              statusOf={statusOf}
              onSetStatus={setStatus}
              onSelect={handleSelect}
              onClose={handleClose}
              onMinimize={handleMinimize}
              phaseNames={phaseNames}
            />
          </div>
        </div>
      )}
      {isMobile && selectedEntry && modalMinimized && (
        <button className="detail-minimized-bar" onClick={handleExpand}>
          <span className="detail-minimized-title">{selectedEntry.title}</span>
          <span className="detail-minimized-hint">Tap to expand</span>
          <span
            className="detail-minimized-close"
            role="button"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            ×
          </span>
        </button>
      )}
      {syncOpen && (
        <GoogleDriveSyncDialog
          onClose={() => setSyncOpen(false)}
          connected={sync.connected}
          status={sync.status}
          onConnect={sync.connect}
          onLoad={handleSyncLoad}
          onSave={handleSyncSave}
          watchedCount={watched.size}
          fileName={sync.fileName}
        />
      )}
      <footer className="app-footer">
        <span>
          MCU Atlas is a fan-made project and is not affiliated with, endorsed by, or sponsored by Marvel, Marvel
          Studios, or The Walt Disney Company.
        </span>
        <span className="app-footer-links">
          <a href="./privacy.html" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
          <a href="./terms.html" target="_blank" rel="noreferrer">
            Terms of Service
          </a>
        </span>
      </footer>
    </div>
  );
}
