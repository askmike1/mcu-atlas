import { useEffect, useRef } from 'react';
import { PHASE_COLORS, formatDate } from '../utils/mcu';

export default function WatchOrderList({ entries, watched, watching, selectedId, onSelect }) {
  const rowRefs = useRef(new Map());

  useEffect(() => {
    if (!selectedId) return;
    rowRefs.current.get(selectedId)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [selectedId]);

  return (
    <div className="watch-order">
      <ol className="watch-order-list">
        {entries.map((entry, i) => {
          const status = watched.has(entry.id) ? 'watched' : watching.has(entry.id) ? 'watching' : null;
          const classes = ['watch-order-row'];
          if (entry.id === selectedId) classes.push('watch-order-row--selected');
          if (status) classes.push(`watch-order-row--${status}`);
          return (
            <li key={entry.id} ref={(el) => rowRefs.current.set(entry.id, el)} className={classes.join(' ')}>
              <button type="button" onClick={() => onSelect(entry.id)}>
                <span className="watch-order-index">{i + 1}</span>
                <span
                  className="watch-order-phase"
                  style={{ '--phase-color': PHASE_COLORS[entry.phase] ?? '#8b93a7' }}
                />
                <span className="watch-order-title">{entry.title}</span>
                <span className="watch-order-type">{entry.type === 'show' ? 'Series' : 'Movie'}</span>
                <span className="watch-order-date">{formatDate(entry.releaseDate)}</span>
                {status && (
                  <span className={`watch-order-status watch-order-status--${status}`}>
                    {status === 'watched' ? 'Watched' : 'Watching'}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {entries.length === 0 && <li className="watch-order-empty">No titles match the current filters.</li>}
      </ol>
    </div>
  );
}
