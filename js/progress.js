// Per-browser progress: { [lessonId]: { [taskIndex]: solvedSql } }.
// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
const KEY = 'sql-lightning:progress:v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Progress just won't survive a reload.
  }
}

export function solvedTasks(lessonId) {
  return readAll()[lessonId] || {};
}

export function markSolved(lessonId, taskIndex, sql) {
  const all = readAll();
  all[lessonId] = { ...all[lessonId], [taskIndex]: sql };
  writeAll(all);
}

export function resetLesson(lessonId) {
  const all = readAll();
  delete all[lessonId];
  writeAll(all);
}
