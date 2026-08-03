import { useEffect, useState } from 'react';

const QUERY = '(max-width: 820px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (evt: MediaQueryListEvent) => setIsMobile(evt.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
