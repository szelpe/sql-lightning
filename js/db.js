// Main-thread client for db-worker.js. Restarts the worker when a query times out.
export class SqlRunner {
  constructor({ timeoutMs = 2000 } = {}) {
    this.timeoutMs = timeoutMs;
    this.datasets = null;
    this.loaded = null;
    this.nextId = 1;
    this.spawn();
  }

  spawn() {
    this.pending = new Map();
    this.worker = new Worker('js/db-worker.js');
    this.worker.onmessage = ({ data }) => {
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      clearTimeout(p.timer);
      data.error ? p.reject(new Error(data.error)) : p.resolve(data.result);
    };
    if (this.datasets) this.loaded = this.call({ type: 'load', datasets: this.datasets });
  }

  call(message, timeoutMs) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const p = { resolve, reject, timer: null };
      if (timeoutMs) {
        p.timer = setTimeout(() => {
          for (const other of this.pending.values()) {
            clearTimeout(other.timer);
            other.reject(new Error('Query took too long and was stopped.'));
          }
          this.worker.terminate();
          this.spawn();
        }, timeoutMs);
      }
      this.pending.set(id, p);
      this.worker.postMessage({ ...message, id });
    });
  }

  load(datasets) {
    this.datasets = datasets;
    this.loaded = this.call({ type: 'load', datasets });
    return this.loaded;
  }

  // queries: [{ sql, dataset }] -> [{ columns, values } | { error }]
  async run(queries) {
    await this.loaded;
    return this.call({ type: 'run', queries }, this.timeoutMs);
  }
}
