// Runs SQL off the main thread so a runaway query can be killed by terminating the worker.
// Each query gets a fresh copy of its dataset, so statements like DELETE never leak between runs.
const SQLJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
importScripts(SQLJS_BASE + 'sql-wasm.js');

let SQL;
const ready = initSqlJs({ locateFile: (file) => SQLJS_BASE + file }).then((s) => (SQL = s));
const images = {}; // dataset name -> exported SQLite bytes

self.onmessage = async ({ data }) => {
  try {
    await ready;
    if (data.type === 'load') {
      for (const [name, script] of Object.entries(data.datasets)) {
        const db = new SQL.Database();
        db.exec(script);
        images[name] = db.export();
        db.close();
      }
      self.postMessage({ id: data.id, result: true });
    } else if (data.type === 'run') {
      self.postMessage({ id: data.id, result: data.queries.map(run) });
    }
  } catch (e) {
    self.postMessage({ id: data.id, error: e.message });
  }
};

// q: { sql, dataset, foreignKeys?, setup?, after?: [sql] }
// `setup` runs before `sql`; each `after` statement runs on the same database afterwards,
// and its own result (or error) is returned in `after`.
function run({ sql, dataset, foreignKeys, setup, after }) {
  const db = new SQL.Database(images[dataset]);
  try {
    if (foreignKeys) db.exec('PRAGMA foreign_keys = ON;');
    if (setup) {
      const res = exec(db, setup);
      if (res.error) return { error: `Lesson setup failed: ${res.error}` };
    }
    const main = exec(db, sql);
    if (!main.error && after) main.after = after.map((s) => exec(db, s));
    return main;
  } finally {
    db.close();
  }
}

function exec(db, sql) {
  try {
    const sets = db.exec(sql);
    const last = sets[sets.length - 1];
    return last ? { columns: last.columns, values: last.values } : { columns: [], values: [] };
  } catch (e) {
    return { error: e.message };
  }
}
