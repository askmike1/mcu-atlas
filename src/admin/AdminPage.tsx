import { useEffect, useMemo, useState } from 'react';
import { IMPORTANCE } from '../utils/mcu';
import type { Dependency, Entry, EntryType, Importance, McuData } from '../types';
import './admin.css';

const ENTRY_TYPES: EntryType[] = ['movie', 'show'];
const IMPORTANCE_LEVELS = Object.keys(IMPORTANCE) as Importance[];

function blankEntry(defaultPhase: number): Entry {
  return {
    id: '',
    title: '',
    type: 'movie',
    releaseDate: '',
    phase: defaultPhase,
    dependencies: [],
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type SaveStatus = { ok: boolean; message: string } | null;

export default function AdminPage() {
  const [data, setData] = useState<McuData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Entry | null>(null);
  const [status, setStatus] = useState<SaveStatus>(null);

  const load = () => {
    setLoadError(null);
    fetch('/api/mcu-data')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data (HTTP ${res.status}).`);
        return res.json();
      })
      .then((json: McuData) => setData(json))
      .catch((err: Error) =>
        setLoadError(`${err.message} — this page only works while running "npm run dev" locally.`)
      );
  };

  useEffect(load, []);

  const sortedEntries = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return [...data.entries]
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
      .sort((a, b) => a.phase - b.phase || a.releaseDate.localeCompare(b.releaseDate));
  }, [data, query]);

  const selectEntry = (entry: Entry) => {
    setDraft(structuredClone(entry));
    setEditingOriginalId(entry.id);
    setStatus(null);
  };

  const startNewEntry = () => {
    setDraft(blankEntry(data?.phases[0]?.number ?? 1));
    setEditingOriginalId(null);
    setStatus(null);
  };

  const updateDraft = (patch: Partial<Entry>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateDependency = (index: number, patch: Partial<Dependency>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const dependencies = prev.dependencies.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...prev, dependencies };
    });
  };

  const addDependency = () => {
    setDraft((prev) => {
      if (!prev || !data) return prev;
      const firstOther = data.entries.find((e) => e.id !== prev.id);
      if (!firstOther) return prev;
      return { ...prev, dependencies: [...prev.dependencies, { id: firstOther.id, importance: 'required' }] };
    });
  };

  const removeDependency = (index: number) => {
    setDraft((prev) => (prev ? { ...prev, dependencies: prev.dependencies.filter((_, i) => i !== index) } : prev));
  };

  async function persist(nextData: McuData, onSuccess?: () => void) {
    setStatus({ ok: true, message: 'Saving…' });
    try {
      const res = await fetch('/api/mcu-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextData),
      });
      if (!res.ok) throw new Error(await res.text());
      setData(nextData);
      setStatus({ ok: true, message: 'Saved to src/data/mcu-data.json.' });
      onSuccess?.();
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : String(err) });
    }
  }

  const handleSaveEntry = () => {
    if (!data || !draft) return;
    const id = draft.id.trim();
    const title = draft.title.trim();

    if (!id) return setStatus({ ok: false, message: 'Id is required.' });
    if (!/^[a-z0-9-]+$/.test(id)) {
      return setStatus({ ok: false, message: 'Id must be lowercase letters, numbers, and hyphens only.' });
    }
    if (!title) return setStatus({ ok: false, message: 'Title is required.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.releaseDate)) {
      return setStatus({ ok: false, message: 'Release date must be in YYYY-MM-DD format.' });
    }
    if (data.entries.some((e) => e.id === id && e.id !== editingOriginalId)) {
      return setStatus({ ok: false, message: `An entry with id "${id}" already exists.` });
    }
    if (draft.dependencies.some((d) => d.id === id)) {
      return setStatus({ ok: false, message: 'An entry cannot depend on itself.' });
    }
    const depIds = draft.dependencies.map((d) => d.id);
    if (new Set(depIds).size !== depIds.length) {
      return setStatus({ ok: false, message: 'Duplicate prerequisite selected — each can only appear once.' });
    }

    const cleaned: Entry = {
      ...draft,
      id,
      title,
      wikipediaUrl: draft.wikipediaUrl?.trim() || undefined,
      fandomUrl: draft.fandomUrl?.trim() || undefined,
      imdbUrl: draft.imdbUrl?.trim() || undefined,
      posterUrl: draft.posterUrl?.trim() || undefined,
      disneyPlusUrl: draft.disneyPlusUrl?.trim() || undefined,
      runtimeMinutes: draft.runtimeMinutes || undefined,
      dependencies: draft.dependencies.map((d) => ({
        ...d,
        note: d.note?.trim() || undefined,
      })),
    };

    const nextEntries = editingOriginalId
      ? data.entries.map((e) => (e.id === editingOriginalId ? cleaned : e))
      : [...data.entries, cleaned];

    persist({ ...data, entries: nextEntries }, () => {
      setEditingOriginalId(id);
      setDraft(cleaned);
    });
  };

  const handleDelete = () => {
    if (!data || !editingOriginalId) return;
    const dependents = data.entries.filter(
      (e) => e.id !== editingOriginalId && e.dependencies.some((d) => d.id === editingOriginalId)
    );
    if (dependents.length > 0) {
      setStatus({
        ok: false,
        message: `Can't delete — still a prerequisite for: ${dependents.map((e) => e.title).join(', ')}.`,
      });
      return;
    }
    if (!window.confirm(`Delete "${draft?.title}"? This cannot be undone.`)) return;
    const nextEntries = data.entries.filter((e) => e.id !== editingOriginalId);
    persist({ ...data, entries: nextEntries }, () => {
      setDraft(null);
      setEditingOriginalId(null);
    });
  };

  if (loadError) {
    return (
      <div className="admin-page admin-page--error">
        <p>{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-page">
        <p>Loading…</p>
      </div>
    );
  }

  const otherEntries = data.entries
    .filter((e) => e.id !== (editingOriginalId ?? '\0'))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="admin-page">
      <aside className="admin-list">
        <div className="admin-list-header">
          <h1>MCU Atlas admin</h1>
          <button type="button" onClick={load} title="Reload from disk">
            Reload
          </button>
        </div>
        <input
          type="text"
          placeholder="Search entries…"
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
        />
        <button type="button" className="admin-new-btn" onClick={startNewEntry}>
          + New entry
        </button>
        <ul>
          {sortedEntries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={entry.id === editingOriginalId ? 'active' : ''}
                onClick={() => selectEntry(entry)}
              >
                <span className="admin-entry-title">{entry.title}</span>
                <span className="admin-entry-meta">
                  Phase {entry.phase} · {entry.releaseDate || 'no date'}
                </span>
              </button>
            </li>
          ))}
          {sortedEntries.length === 0 && <li className="admin-list-empty">No matches.</li>}
        </ul>
      </aside>

      <main className="admin-form">
        {!draft ? (
          <p className="hint">Select an entry on the left, or create a new one.</p>
        ) : (
          <>
            <h2>{editingOriginalId ? `Edit: ${editingOriginalId}` : 'New entry'}</h2>

            <div className="admin-field-grid">
              <label>
                Id
                <input
                  type="text"
                  value={draft.id}
                  disabled={editingOriginalId !== null}
                  onChange={(evt) => updateDraft({ id: evt.target.value })}
                  placeholder="e.g. iron-man"
                />
              </label>
              <label>
                Title
                <input
                  type="text"
                  value={draft.title}
                  onChange={(evt) => {
                    const title = evt.target.value;
                    const patch: Partial<Entry> = { title };
                    if (!editingOriginalId && !draft.id) patch.id = slugify(title);
                    updateDraft(patch);
                  }}
                />
              </label>
              <label>
                Type
                <select value={draft.type} onChange={(evt) => updateDraft({ type: evt.target.value as EntryType })}>
                  {ENTRY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Release date
                <input
                  type="date"
                  value={draft.releaseDate}
                  onChange={(evt) => updateDraft({ releaseDate: evt.target.value })}
                />
              </label>
              <label>
                Phase
                <select value={draft.phase} onChange={(evt) => updateDraft({ phase: Number(evt.target.value) })}>
                  {data.phases.map((p) => (
                    <option key={p.number} value={p.number}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Runtime (minutes)
                <input
                  type="number"
                  min={0}
                  value={draft.runtimeMinutes ?? ''}
                  onChange={(evt) => updateDraft({ runtimeMinutes: evt.target.value ? Number(evt.target.value) : undefined })}
                />
              </label>
              <label>
                Wikipedia URL
                <input
                  type="text"
                  value={draft.wikipediaUrl ?? ''}
                  onChange={(evt) => updateDraft({ wikipediaUrl: evt.target.value })}
                />
              </label>
              <label>
                IMDb URL
                <input type="text" value={draft.imdbUrl ?? ''} onChange={(evt) => updateDraft({ imdbUrl: evt.target.value })} />
              </label>
              <label>
                Fandom URL
                <input
                  type="text"
                  value={draft.fandomUrl ?? ''}
                  onChange={(evt) => updateDraft({ fandomUrl: evt.target.value })}
                />
              </label>
              <label>
                Poster URL
                <input
                  type="text"
                  value={draft.posterUrl ?? ''}
                  onChange={(evt) => updateDraft({ posterUrl: evt.target.value })}
                />
              </label>
              <label>
                Disney+ URL
                <input
                  type="text"
                  value={draft.disneyPlusUrl ?? ''}
                  onChange={(evt) => updateDraft({ disneyPlusUrl: evt.target.value })}
                />
              </label>
            </div>

            <section>
              <div className="admin-deps-header">
                <h3>Prerequisites</h3>
                <button type="button" onClick={addDependency} disabled={otherEntries.length === 0}>
                  + Add prerequisite
                </button>
              </div>
              {draft.dependencies.length === 0 && <p className="hint">No prerequisites.</p>}
              {draft.dependencies.map((dep, i) => (
                <div className="admin-dep-row" key={i}>
                  <select value={dep.id} onChange={(evt) => updateDependency(i, { id: evt.target.value })}>
                    {otherEntries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={dep.importance}
                    onChange={(evt) => updateDependency(i, { importance: evt.target.value as Importance })}
                  >
                    {IMPORTANCE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {IMPORTANCE[level].label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Optional spoiler note"
                    value={dep.note ?? ''}
                    onChange={(evt) => updateDependency(i, { note: evt.target.value })}
                  />
                  <button type="button" className="danger" onClick={() => removeDependency(i)} aria-label="Remove prerequisite">
                    ×
                  </button>
                </div>
              ))}
            </section>

            <div className="admin-actions">
              <button type="button" onClick={handleSaveEntry}>
                Save
              </button>
              {editingOriginalId && (
                <button type="button" className="danger" onClick={handleDelete}>
                  Delete
                </button>
              )}
            </div>

            {status && <p className={`admin-status ${status.ok ? 'admin-status--ok' : 'admin-status--error'}`}>{status.message}</p>}
          </>
        )}
      </main>
    </div>
  );
}
