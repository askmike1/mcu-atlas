// Visual language shared across the graph, legend, and detail panel.
import type { Dependent, Entry, Importance } from '../types';

export const PHASE_COLORS: Record<string, string> = {
  '-1': '#9a8478',
  0: '#64748b',
  1: '#7c9cff',
  2: '#5ad1c9',
  3: '#f2c14e',
  4: '#f28f6e',
  5: '#e26d9c',
  6: '#a37cf2',
};

export const IMPORTANCE: Record<Importance, { label: string; shortLabel: string; color: string; weight: number }> = {
  required: { label: 'Required', shortLabel: 'Required', color: '#e5484d', weight: 0 },
  recommended: { label: 'Strongly Recommended', shortLabel: 'Recommended', color: '#f2a93b', weight: 1 },
  optional: { label: 'Optional', shortLabel: 'Optional', color: '#8b93a7', weight: 2 },
};

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function isUpcoming(isoDate: string): boolean {
  return isoDate > new Date().toISOString().slice(0, 10);
}

// Builds fast lookup structures from the flat entries list: an id -> entry
// map, and the reverse of the dependency graph (who depends on this entry).
export function indexEntries(entries: Entry[]): { byId: Map<string, Entry>; dependentsOf: Map<string, Dependent[]> } {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const dependentsOf = new Map<string, Dependent[]>(entries.map((e) => [e.id, []]));
  for (const entry of entries) {
    for (const dep of entry.dependencies) {
      if (!dependentsOf.has(dep.id)) dependentsOf.set(dep.id, []);
      dependentsOf.get(dep.id)!.push({ id: entry.id, importance: dep.importance });
    }
  }
  return { byId, dependentsOf };
}

// 'optional' prerequisites (e.g. side-continuity films) never gate ordering
// or "up next" suggestions — only required/recommended deps do.
const ORDER_BLOCKING_IMPORTANCE = new Set<Importance>(['required', 'recommended']);
const byReleaseDate = (a: Entry, b: Entry) => a.releaseDate.localeCompare(b.releaseDate);

// Legacy continuity (Marvel Television, Fox's X-Men, Sony's Spider-Man) uses
// phase <= 0; only phase >= 1 is the actual MCU. Up Next should surface real
// MCU entries first and only fall back to legacy continuity beneath them.
const byPhaseThenReleaseDate = (a: Entry, b: Entry) => {
  const aLegacy = a.phase <= 0;
  const bLegacy = b.phase <= 0;
  if (aLegacy !== bLegacy) return aLegacy ? 1 : -1;
  return byReleaseDate(a, b);
};

// Titles the user hasn't started yet, whose blocking prerequisites are all
// already watched — i.e. what's unlocked and ready to watch right now.
export function getUpNext(
  entries: Entry[],
  watched: Set<string>,
  watching: Set<string>,
  { limit = 6 }: { limit?: number } = {}
): Entry[] {
  return entries
    .filter((e) => !watched.has(e.id) && !watching.has(e.id))
    .filter((e) => e.dependencies.every((dep) => !ORDER_BLOCKING_IMPORTANCE.has(dep.importance) || watched.has(dep.id)))
    .sort(byPhaseThenReleaseDate)
    .slice(0, limit);
}

// A single recommended viewing order across all entries: a topological sort
// over required/recommended dependency edges, tie-broken by release date so
// unrelated titles still fall in chronological order.
export function computeWatchOrder(entries: Entry[]): Entry[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const indegree = new Map(entries.map((e) => [e.id, 0]));
  const children = new Map<string, string[]>(entries.map((e) => [e.id, []]));

  for (const entry of entries) {
    for (const dep of entry.dependencies) {
      if (!ORDER_BLOCKING_IMPORTANCE.has(dep.importance) || !byId.has(dep.id)) continue;
      indegree.set(entry.id, indegree.get(entry.id)! + 1);
      children.get(dep.id)!.push(entry.id);
    }
  }

  const heap = entries.filter((e) => indegree.get(e.id) === 0).sort(byReleaseDate);
  const order: Entry[] = [];
  const remaining = new Set(entries.map((e) => e.id));

  while (heap.length > 0) {
    const next = heap.shift()!;
    order.push(next);
    remaining.delete(next.id);
    for (const childId of children.get(next.id)!) {
      const left = indegree.get(childId)! - 1;
      indegree.set(childId, left);
      if (left === 0) {
        heap.push(byId.get(childId)!);
        heap.sort(byReleaseDate);
      }
    }
  }

  // Only reachable with a cyclic dependency graph, which the data shouldn't
  // ever have — append anything left over rather than dropping it silently.
  if (remaining.size > 0) {
    order.push(...entries.filter((e) => remaining.has(e.id)).sort(byReleaseDate));
  }

  return order;
}
