import { useCallback, useMemo, useState } from 'react';
import mcuData from './data/mcu-data.json';
import GraphView from './components/GraphView';
import DetailPanel from './components/DetailPanel';
import Toolbar from './components/Toolbar';
import GitHubSyncDialog from './components/GitHubSyncDialog';
import { useWatchedState } from './hooks/useWatchedState';
import { useGitHubSync } from './hooks/useGitHubSync';
import { indexEntries } from './utils/mcu';
import { downloadWatchedFile, parseWatchedFile } from './utils/watchedFile';
import './App.css';

export default function App() {
  const { entries, phases } = mcuData;
  const { byId, dependentsOf } = useMemo(() => indexEntries(entries), [entries]);
  const validIds = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);
  const phaseNames = useMemo(() => new Map(phases.map((p) => [p.number, p.name])), [phases]);

  const { watched, toggle, replaceAll, reset } = useWatchedState(validIds);
  const [selectedId, setSelectedId] = useState(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const sync = useGitHubSync();

  const handleSelect = useCallback((id) => setSelectedId(id), []);
  const handleClose = useCallback(() => setSelectedId(null), []);

  const handleExport = useCallback(() => downloadWatchedFile(watched), [watched]);

  const handleImport = useCallback(
    (text) => {
      const ids = parseWatchedFile(text, validIds);
      replaceAll(ids);
      return ids.length;
    },
    [replaceAll, validIds]
  );

  const handleSyncSave = useCallback(() => {
    sync.save(watched).catch(() => {});
  }, [sync, watched]);

  const handleSyncLoad = useCallback(() => {
    sync
      .load()
      .then((ids) => replaceAll(ids))
      .catch(() => {});
  }, [sync, replaceAll]);

  const selectedEntry = selectedId ? byId.get(selectedId) : null;

  return (
    <div className="app">
      <Toolbar
        watchedCount={watched.size}
        totalCount={entries.length}
        onExport={handleExport}
        onImport={handleImport}
        onReset={reset}
        onOpenSync={() => setSyncOpen(true)}
      />
      <div className="layout">
        <GraphView entries={entries} phases={phases} watched={watched} selectedId={selectedId} onSelect={handleSelect} />
        <DetailPanel
          entry={selectedEntry}
          byId={byId}
          dependents={dependentsOf}
          watched={watched}
          onToggleWatched={toggle}
          onSelect={handleSelect}
          onClose={handleClose}
          phaseNames={phaseNames}
        />
      </div>
      {syncOpen && (
        <GitHubSyncDialog
          onClose={() => setSyncOpen(false)}
          config={sync.config}
          updateConfig={sync.updateConfig}
          token={sync.token}
          setToken={sync.setToken}
          rememberToken={sync.rememberToken}
          setRememberToken={sync.setRememberToken}
          status={sync.status}
          onLoad={handleSyncLoad}
          onSave={handleSyncSave}
          watchedCount={watched.size}
        />
      )}
    </div>
  );
}
