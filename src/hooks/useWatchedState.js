import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mcu-atlas:watched';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((id) => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function useWatchedState(validIds) {
  const [watched, setWatched] = useState(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...watched]));
  }, [watched]);

  const toggle = useCallback((id) => {
    setWatched((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const replaceAll = useCallback(
    (ids) => {
      setWatched(new Set(ids.filter((id) => validIds.has(id))));
    },
    [validIds]
  );

  const reset = useCallback(() => setWatched(new Set()), []);

  return { watched, toggle, replaceAll, reset };
}
