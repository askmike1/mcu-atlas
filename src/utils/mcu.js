// Visual language shared across the graph, legend, and detail panel.

export const PHASE_COLORS = {
  1: '#7c9cff',
  2: '#5ad1c9',
  3: '#f2c14e',
  4: '#f28f6e',
  5: '#e26d9c',
  6: '#a37cf2',
};

export const IMPORTANCE = {
  required: { label: 'Required', shortLabel: 'Required', color: '#e5484d', weight: 0 },
  recommended: { label: 'Strongly Recommended', shortLabel: 'Recommended', color: '#f2a93b', weight: 1 },
  optional: { label: 'Optional', shortLabel: 'Optional', color: '#8b93a7', weight: 2 },
};

export function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function isUpcoming(isoDate) {
  return isoDate > new Date().toISOString().slice(0, 10);
}

// Builds fast lookup structures from the flat entries list: an id -> entry
// map, and the reverse of the dependency graph (who depends on this entry).
export function indexEntries(entries) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const dependentsOf = new Map(entries.map((e) => [e.id, []]));
  for (const entry of entries) {
    for (const dep of entry.dependencies) {
      if (!dependentsOf.has(dep.id)) dependentsOf.set(dep.id, []);
      dependentsOf.get(dep.id).push({ id: entry.id, importance: dep.importance });
    }
  }
  return { byId, dependentsOf };
}
