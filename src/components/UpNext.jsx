import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../utils/mcu';

export default function UpNext({ items, onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(evt) {
      if (containerRef.current && !containerRef.current.contains(evt.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pick = (id) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div className="up-next" ref={containerRef}>
      <button type="button" className="up-next-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Up next
        {items.length > 0 && <span className="up-next-count">{items.length}</span>}
      </button>
      {open && (
        <ul className="up-next-results" role="listbox">
          {items.length === 0 ? (
            <li className="up-next-empty">Nothing unlocked yet — watch something to open up what's next.</li>
          ) : (
            items.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => pick(entry.id)}>
                  <span className="up-next-title">{entry.title}</span>
                  <span className="up-next-date">{formatDate(entry.releaseDate)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
