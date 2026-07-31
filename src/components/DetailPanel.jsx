import { useEffect, useState } from 'react';
import { IMPORTANCE, PHASE_COLORS, formatDate, isUpcoming } from '../utils/mcu';
import { buildExternalLinks, formatRuntime, posterSrcFor } from '../utils/externalLinks';

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M2.5 9h4.5M2.5 15h4.5M17 9h4.5M17 15h4.5" />
    </svg>
  );
}

function TvIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="5" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 18v3" />
    </svg>
  );
}

function Cover({ entry }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [entry.id]);

  if (failed) {
    const color = PHASE_COLORS[entry.phase] ?? '#8b93a7';
    return (
      <div className="cover cover--placeholder" style={{ '--cover-color': color }}>
        {entry.type === 'show' ? <TvIcon /> : <FilmIcon />}
      </div>
    );
  }

  return (
    <img
      className="cover"
      src={posterSrcFor(entry)}
      alt={`${entry.title} cover art`}
      onError={() => setFailed(true)}
    />
  );
}

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
  const links = buildExternalLinks(entry);
  const runtime = formatRuntime(entry.runtimeMinutes);

  return (
    <aside className="detail-panel">
      <button className="close-btn" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="cover-row">
        <Cover entry={entry} />
        <div className="detail-header">
          <span className="type-tag">{entry.type === 'show' ? 'Series' : 'Movie'}</span>
          <h2>{entry.title}</h2>
          <p className="meta-line">
            {formatDate(entry.releaseDate)}
            {upcoming && <span className="upcoming-tag">Upcoming</span>} ·{' '}
            {phaseNames.get(entry.phase) ?? `Phase ${entry.phase}`}
            {runtime && <> · {runtime}</>}
          </p>
        </div>
      </div>

      <div className="external-links">
        <a href={links.wikipedia} target="_blank" rel="noreferrer">
          Wikipedia
        </a>
        <a href={links.imdb} target="_blank" rel="noreferrer">
          IMDb
        </a>
        <a href={links.disneyPlus} target="_blank" rel="noreferrer">
          Disney+
        </a>
        <a href={links.fandom} target="_blank" rel="noreferrer">
          MCU Wiki
        </a>
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
