const FILE_SCHEMA_VERSION = 1;

export function buildExportPayload(watchedSet) {
  return {
    app: 'mcu-atlas',
    schemaVersion: FILE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    watched: [...watchedSet].sort(),
  };
}

export function downloadWatchedFile(watchedSet) {
  const payload = buildExportPayload(watchedSet);
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

// Throws with a user-facing message on invalid input.
export function parseWatchedFile(text, validIds) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!data || !Array.isArray(data.watched)) {
    throw new Error('That file does not look like an MCU Atlas progress export (missing "watched" array).');
  }
  const ids = data.watched.filter((id) => typeof id === 'string' && validIds.has(id));
  return ids;
}
