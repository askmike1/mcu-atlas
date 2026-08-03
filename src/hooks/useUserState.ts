import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UsersState, WatchStatus } from '../types';

const STORAGE_KEY = 'mcu-atlas:users';
const LEGACY_WATCHED_KEY = 'mcu-atlas:watched';
const SCHEMA_VERSION = 2;

function makeId(): string {
  return `user-${crypto.randomUUID()}`;
}

// Pre-multi-user installs kept a flat array of watched ids under a
// different key — fold that into the default "Me" user on first load.
function migrateLegacyWatched(): Record<string, WatchStatus> {
  try {
    const raw = localStorage.getItem(LEGACY_WATCHED_KEY);
    if (!raw) return {};
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return {};
    const status: Record<string, WatchStatus> = {};
    for (const id of arr) {
      if (typeof id === 'string') status[id] = 'watched';
    }
    return status;
  } catch {
    return {};
  }
}

function loadState(): UsersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        const users = data.users.map((u: { id: string; name?: string; status?: Record<string, WatchStatus> }) => ({
          id: u.id,
          name: typeof u.name === 'string' && u.name ? u.name : 'Me',
          status: u.status && typeof u.status === 'object' ? u.status : {},
        }));
        const currentUserId = users.some((u: { id: string }) => u.id === data.currentUserId) ? data.currentUserId : users[0].id;
        return { currentUserId, users };
      }
    }
  } catch {
    // fall through to a fresh default state below
  }
  return { currentUserId: 'me', users: [{ id: 'me', name: 'Me', status: migrateLegacyWatched() }] };
}

export function useUserState(validIds: Set<string>) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...state }));
  }, [state]);

  const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? state.users[0];

  const switchUser = useCallback((id: string) => {
    setState((prev) => (prev.users.some((u) => u.id === id) ? { ...prev, currentUserId: id } : prev));
  }, []);

  const addUser = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = makeId();
    setState((prev) => ({
      currentUserId: id,
      users: [...prev.users, { id, name: trimmed, status: {} }],
    }));
  }, []);

  const renameUser = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, name: trimmed } : u)),
    }));
  }, []);

  const removeUser = useCallback((id: string) => {
    setState((prev) => {
      if (prev.users.length <= 1) return prev;
      const users = prev.users.filter((u) => u.id !== id);
      const currentUserId = prev.currentUserId === id ? users[0].id : prev.currentUserId;
      return { currentUserId, users };
    });
  }, []);

  const setStatus = useCallback((entryId: string, status: WatchStatus | null) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== prev.currentUserId) return u;
        const nextStatus = { ...u.status };
        if (!status) delete nextStatus[entryId];
        else nextStatus[entryId] = status;
        return { ...u, status: nextStatus };
      }),
    }));
  }, []);

  const replaceCurrentUserStatus = useCallback(
    (statusMap: Record<string, WatchStatus>) => {
      setState((prev) => ({
        ...prev,
        users: prev.users.map((u) => {
          if (u.id !== prev.currentUserId) return u;
          const nextStatus: Record<string, WatchStatus> = {};
          for (const [id, status] of Object.entries(statusMap)) {
            if (validIds.has(id) && (status === 'watched' || status === 'watching')) nextStatus[id] = status;
          }
          return { ...u, status: nextStatus };
        }),
      }));
    },
    [validIds]
  );

  const importUsers = useCallback((newUsers: UsersState['users'], newCurrentUserId: string) => {
    setState(() => {
      const users = newUsers.map((u) => ({
        id: u.id,
        name: u.name,
        status: Object.fromEntries(
          Object.entries(u.status || {}).filter(([id, status]) => validIds.has(id) && (status === 'watched' || status === 'watching'))
        ),
      }));
      const currentUserId = users.some((u) => u.id === newCurrentUserId) ? newCurrentUserId : users[0].id;
      return { currentUserId, users };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIds]);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === prev.currentUserId ? { ...u, status: {} } : u)),
    }));
  }, []);

  const watched = useMemo(
    () => new Set(Object.keys(currentUser.status).filter((id) => currentUser.status[id] === 'watched')),
    [currentUser]
  );
  const watching = useMemo(
    () => new Set(Object.keys(currentUser.status).filter((id) => currentUser.status[id] === 'watching')),
    [currentUser]
  );
  const statusOf = useCallback((id: string) => currentUser.status[id] ?? null, [currentUser]);

  return {
    users: state.users,
    currentUserId: state.currentUserId,
    watched,
    watching,
    statusOf,
    setStatus,
    switchUser,
    addUser,
    renameUser,
    removeUser,
    replaceCurrentUserStatus,
    importUsers,
    exportState: () => state,
    reset,
  };
}
