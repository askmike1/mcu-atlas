import { useCallback, useMemo, useState } from 'react';
import mcuData from './data/mcu-data.json';
import GraphView from './components/GraphView';
import DetailPanel from './components/DetailPanel';
import Toolbar from './components/Toolbar';
import { useWatchedState } from './hooks/useWatchedState';
import { indexEntries } from './utils/mcu';
import { downloadWatchedFile, parseWatchedFile } from './utils/watchedFile';
import './App.css';

export default function App() {
  const { entries, phases } = mcuData;
  const { byId, dependentsOf } = useMemo(() => indexEntries(entries), [entries]);
  const validIds = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);

  const { watched, toggle, replaceAll, reset } = useWatchedState(validIds);
  const [selectedId, setSelectedId] = useState(null);

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

  const selectedEntry = selectedId ? byId.get(selectedId) : null;

  return (
    <div className="app">
      <Toolbar
        watchedCount={watched.size}
        totalCount={entries.length}
        onExport={handleExport}
        onImport={handleImport}
        onReset={reset}
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
        />
      </div>
    </div>
  );
}
