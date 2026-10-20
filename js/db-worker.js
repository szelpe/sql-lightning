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
      self.postMessage({ id: data.id, result: data.queries.map((q) => run(q.sql, q.dataset)) });
    }
  } catch (e) {
    self.postMessage({ id: data.id, error: e.message });
  }
};

function run(sql, dataset) {
  const db = new SQL.Database(images[dataset]);
  try {
    const sets = db.exec(sql);
    const last = sets[sets.length - 1];
    return last ? { columns: last.columns, values: last.values } : { columns: [], values: [] };
  } catch (e) {
    return { error: e.message };
  } finally {
    db.close();
  }
}
