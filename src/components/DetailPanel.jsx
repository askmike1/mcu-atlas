import { useState } from 'react';
import { IMPORTANCE, formatDate, isUpcoming } from '../utils/mcu';

function EyeIcon({ revealed }) {
  return revealed ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-3.4 4.3M6.6 6.6C4 8.3 2 12 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function ImportanceBadge({ importance }) {
  const meta = IMPORTANCE[importance];
  return (
    <span className="badge" style={{ '--badge-color': meta.color }}>
      {meta.shortLabel}
    </span>
  );
}

export default function DetailPanel({ entry, byId, dependents, watched, onToggleWatched, onSelect, onClose, phaseNames }) {
  const [revealed, setRevealed] = useState(() => new Set());

  if (!entry) {
    return (
      <aside className="detail-panel detail-panel--empty">
        <p>Click a title in the diagram to see its release info and prerequisites.</p>
        <p className="hint">Lines show what leads into what — solid for required, dashed for optional.</p>
      </aside>
    );
  }

  const noteKey = (depId) => `${entry.id}:${depId}`;
  const toggleReveal = (depId) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      const key = noteKey(depId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sortedDeps = [...entry.dependencies].sort(
    (a, b) => IMPORTANCE[a.importance].weight - IMPORTANCE[b.importance].weight
  );
  const dependentList = dependents.get(entry.id) || [];
  const upcoming = isUpcoming(entry.releaseDate);

  return (
    <aside className="detail-panel">
      <button className="close-btn" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="detail-header">
        <span className="type-tag">{entry.type === 'show' ? 'Series' : 'Movie'}</span>
        <h2>{entry.title}</h2>
        <p className="meta-line">
          {formatDate(entry.releaseDate)}
          {upcoming && <span className="upcoming-tag">Upcoming</span>} · {phaseNames.get(entry.phase) ?? `Phase ${entry.phase}`}
        </p>
      </div>

      <label className="watched-toggle">
        <input type="checkbox" checked={watched.has(entry.id)} onChange={() => onToggleWatched(entry.id)} />
        Mark as watched
      </label>

      <section>
        <h3>Prerequisites</h3>
        {sortedDeps.length === 0 && <p className="hint">No prerequisites — a good jumping-on point.</p>}
        <ul className="dep-list">
          {sortedDeps.map((dep) => {
            const depEntry = byId.get(dep.id);
            const key = noteKey(dep.id);
            const isRevealed = revealed.has(key);
            return (
              <li key={dep.id} className="dep-row">
                <div className="dep-row-main">
                  <button className="dep-title" onClick={() => onSelect(dep.id)}>
                    {depEntry?.title ?? dep.id}
                    {watched.has(dep.id) && <span className="watched-dot" title="Watched" />}
                  </button>
                  <ImportanceBadge importance={dep.importance} />
                </div>
                {dep.note && (
                  <div className="dep-note-row">
                    <button
                      className="eye-btn"
                      onClick={() => toggleReveal(dep.id)}
                      aria-label={isRevealed ? 'Hide spoiler' : 'Reveal spoiler'}
                    >
                      <EyeIcon revealed={isRevealed} />
                    </button>
                    {isRevealed ? (
                      <p className="dep-note">{dep.note}</p>
                    ) : (
                      <p className="dep-note dep-note--masked" onClick={() => toggleReveal(dep.id)}>
                        Contains spoilers — click to reveal
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {dependentList.length > 0 && (
        <section>
          <h3>Unlocks</h3>
          <p className="hint">Titles that build on this one.</p>
          <ul className="unlocks-list">
            {dependentList.map((dep) => {
              const depEntry = byId.get(dep.id);
              return (
                <li key={dep.id}>
                  <button className="dep-title" onClick={() => onSelect(dep.id)}>
                    {depEntry?.title ?? dep.id}
                  </button>
                  <ImportanceBadge importance={dep.importance} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );
}
