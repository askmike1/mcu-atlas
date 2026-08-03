import type { StatusMap, User, UsersState } from '../types';

const FILE_SCHEMA_VERSION = 2;

interface SerializedUser {
  id: string;
  name: string;
  watched: string[];
  watching: string[];
}

interface ExportPayload {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  currentUserId: string;
  users: SerializedUser[];
}

export interface ParsedMultiUserResult {
  users: User[];
  currentUserId: string;
}

export interface ParsedSingleUserResult {
  status: StatusMap;
}

export type ParsedWatchedFile = ParsedMultiUserResult | ParsedSingleUserResult;

function serializeUser(user: User): SerializedUser {
  return {
    id: user.id,
    name: user.name,
    watched: Object.keys(user.status)
      .filter((id) => user.status[id] === 'watched')
      .sort(),
    watching: Object.keys(user.status)
      .filter((id) => user.status[id] === 'watching')
      .sort(),
  };
}

export function buildExportPayload(usersState: UsersState): ExportPayload {
  return {
    app: 'mcu-atlas',
    schemaVersion: FILE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    currentUserId: usersState.currentUserId,
    users: usersState.users.map(serializeUser),
  };
}

export function downloadWatchedFile(usersState: UsersState): void {
  const payload = buildExportPayload(usersState);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mcu-atlas-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function statusMapFromLists(watchedList: unknown, watchingList: unknown, validIds: Set<string>): StatusMap {
  const status: StatusMap = {};
  for (const id of (watchingList as unknown[]) || []) {
    if (typeof id === 'string' && validIds.has(id)) status[id] = 'watching';
  }
  for (const id of (watchedList as unknown[]) || []) {
    if (typeof id === 'string' && validIds.has(id)) status[id] = 'watched';
  }
  return status;
}

// Throws with a user-facing message on invalid input. Accepts both the
// current multi-user format and pre-multi-user single-list exports.
export function parseExportPayloadObject(data: unknown, validIds: Set<string>): ParsedWatchedFile {
  if (!data || typeof data !== 'object') {
    throw new Error('That file does not look like an MCU Atlas progress export.');
  }

  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.users)) {
    const users: User[] = obj.users
      .filter((u): u is Record<string, unknown> => Boolean(u) && typeof u === 'object' && typeof (u as Record<string, unknown>).id === 'string' && typeof (u as Record<string, unknown>).name === 'string')
      .map((u) => ({
        id: u.id as string,
        name: u.name as string,
        status: statusMapFromLists(u.watched, u.watching, validIds),
      }));
    if (users.length === 0) {
      throw new Error('That file does not look like an MCU Atlas progress export (no users found).');
    }
    const currentUserId = users.some((u) => u.id === obj.currentUserId) ? (obj.currentUserId as string) : users[0].id;
    return { users, currentUserId };
  }

  if (Array.isArray(obj.watched)) {
    return { status: statusMapFromLists(obj.watched, obj.watching, validIds) };
  }

  throw new Error('That file does not look like an MCU Atlas progress export.');
}

export function parseWatchedFile(text: string, validIds: Set<string>): ParsedWatchedFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return parseExportPayloadObject(data, validIds);
}
