import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry } from '../types';

interface SearchBoxProps {
  entries: Entry[];
  onSelect: (id: string) => void;
}

export default function SearchBox({ entries, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries
      .filter((e) => e.title.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 8);
  }, [entries, query]);

  useEffect(() => {
    function handleClickOutside(evt: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evt.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pick = (entry: Entry) => {
    onSelect(entry.id);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (evt.key === 'Enter') {
      evt.preventDefault();
      const entry = results[activeIndex] ?? results[0];
      if (entry) pick(entry);
    }
  };

  return (
    <div className="search-box" ref={containerRef}>
      <input
        type="text"
        placeholder="Search movies & shows…"
        value={query}
        onChange={(evt) => {
          setQuery(evt.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Search movies and shows"
        autoComplete="off"
      />
      {open && query.trim() && (
        <ul className="search-results" role="listbox">
          {results.length > 0 ? (
            results.map((entry, i) => (
              <li
                key={entry.id}
                role="option"
                aria-selected={i === activeIndex}
                className={i === activeIndex ? 'active' : ''}
                onMouseDown={(evt) => {
                  evt.preventDefault();
                  pick(entry);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="search-result-title">{entry.title}</span>
                <span className="search-result-type">{entry.type}</span>
              </li>
            ))
          ) : (
            <li className="search-no-results">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}
