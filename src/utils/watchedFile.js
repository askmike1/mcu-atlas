const FILE_SCHEMA_VERSION = 2;

function serializeUser(user) {
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

export function buildExportPayload(usersState) {
  return {
    app: 'mcu-atlas',
    schemaVersion: FILE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    currentUserId: usersState.currentUserId,
    users: usersState.users.map(serializeUser),
  };
}

export function downloadWatchedFile(usersState) {
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

function statusMapFromLists(watchedList, watchingList, validIds) {
  const status = {};
  for (const id of watchingList || []) {
    if (typeof id === 'string' && validIds.has(id)) status[id] = 'watching';
  }
  for (const id of watchedList || []) {
    if (typeof id === 'string' && validIds.has(id)) status[id] = 'watched';
  }
  return status;
}

// Throws with a user-facing message on invalid input. Accepts both the
// current multi-user format and pre-multi-user single-list exports.
export function parseExportPayloadObject(data, validIds) {
  if (!data || typeof data !== 'object') {
    throw new Error('That file does not look like an MCU Atlas progress export.');
  }

  if (Array.isArray(data.users)) {
    const users = data.users
      .filter((u) => u && typeof u.id === 'string' && typeof u.name === 'string')
      .map((u) => ({
        id: u.id,
        name: u.name,
        status: statusMapFromLists(u.watched, u.watching, validIds),
      }));
    if (users.length === 0) {
      throw new Error('That file does not look like an MCU Atlas progress export (no users found).');
    }
    const currentUserId = users.some((u) => u.id === data.currentUserId) ? data.currentUserId : users[0].id;
    return { users, currentUserId };
  }

  if (Array.isArray(data.watched)) {
    return { status: statusMapFromLists(data.watched, data.watching, validIds) };
  }

  throw new Error('That file does not look like an MCU Atlas progress export.');
}

export function parseWatchedFile(text, validIds) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return parseExportPayloadObject(data, validIds);
}
