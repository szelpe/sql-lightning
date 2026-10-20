// Lesson format: see aggregates.js. These tasks are checked with `afterQuery`: the table's
// contents after the learner's statements must match those after the reference solution.
const AFTER = 'SELECT sku, name, qty FROM inventory ORDER BY sku;';

export default {
  id: 'conflict-handling',
  title: 'Handling conflicts',
  tables: ['inventory'],
  setupSql: `
CREATE TABLE inventory (
  sku  TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  qty  INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0)
);
INSERT INTO inventory (sku, name, qty) VALUES ('MUG', 'Mug', 12), ('TEE', 'T-shirt', 5), ('CAP', 'Cap', 0);
`,
  starterSql: "INSERT INTO inventory (sku, name, qty) VALUES ('MUG', 'Mug', 3);",
  body: `
    <p>Constraints reject bad rows, and so far a rejection has always meant an error that stops the
    statement. Often you know a conflict may happen and want to say in advance how to handle it:
    "add these products, skipping the ones we already have", or "add this product, or update it if it
    already exists". SQLite lets you put that decision into the <code>INSERT</code> itself.</p>

    <h3>Skip or replace: INSERT OR …</h3>
    <table class="ref">
      <thead><tr><th>Statement</th><th>When a row breaks a UNIQUE or PRIMARY KEY rule</th></tr></thead>
      <tbody>
        <tr><td><code>INSERT OR IGNORE</code></td><td>that row is skipped silently; the other rows are still inserted</td></tr>
        <tr><td><code>INSERT OR REPLACE</code></td><td>the existing row is deleted and the new one inserted in its place</td></tr>
      </tbody>
    </table>

    <div class="note"><strong>REPLACE really replaces.</strong> The old row is removed completely, so
    any column you don't mention gets its default, not its old value. Replacing <code>('CAP', 'Cap')</code>
    without a <code>qty</code> resets the stock to 0.</div>

    <h3>Insert or update: ON CONFLICT … DO UPDATE</h3>
    <p>Often called an <strong>upsert</strong>. If the new row clashes with an existing one on the named
    column, the database runs the <code>UPDATE</code> instead. Inside it, <code>excluded</code> means
    the row you tried to insert:</p>

    <p class="syntax-caption">An upsert</p>
    <pre class="syntax">INSERT INTO mytable (key_column, column2) VALUES (…, …)
ON CONFLICT (key_column) DO UPDATE
SET column2 = column2 + excluded.column2;</pre>

    <p><code>ON CONFLICT (key_column) DO NOTHING</code> also exists, and does the same as
    <code>INSERT OR IGNORE</code> for that one rule.</p>

    <h3>Exercise</h3>
    <p>The <code>inventory</code> table holds a shop's stock, with <code>sku</code> as its primary key.
    The starting query fails: <code>MUG</code> already exists. Each task starts from the original stock
    again, and is checked by comparing the table afterwards with the expected contents.</p>
  `,
  tasks: [
    {
      prompt: "In one statement, insert <code>('MUG', 'Mug', 3)</code> and <code>('BAG', 'Tote bag', 7)</code>, <strong>skipping</strong> any product that already exists.",
      hint: "INSERT OR IGNORE INTO inventory (sku, name, qty) VALUES ('MUG', 'Mug', 3), ('BAG', 'Tote bag', 7);",
      solution: "INSERT OR IGNORE INTO inventory (sku, name, qty) VALUES ('MUG', 'Mug', 3), ('BAG', 'Tote bag', 7);",
      afterQuery: AFTER,
      check: { requires: ['OR IGNORE'] },
    },
    {
      prompt: "Replace the <code>TEE</code> product with <code>('TEE', 'Band T-shirt', 20)</code> using <code>INSERT OR REPLACE</code>.",
      hint: 'Same as a normal INSERT, with OR REPLACE after INSERT.',
      solution: "INSERT OR REPLACE INTO inventory (sku, name, qty) VALUES ('TEE', 'Band T-shirt', 20);",
      afterQuery: AFTER,
      check: { requires: ['OR REPLACE'] },
    },
    {
      prompt: "4 more mugs have arrived. Write an upsert for <code>('MUG', 'Mug', 4)</code> that <strong>adds</strong> 4 to the existing stock.",
      hint: "INSERT … VALUES ('MUG', 'Mug', 4) ON CONFLICT (sku) DO UPDATE SET qty = qty + excluded.qty;",
      solution: "INSERT INTO inventory (sku, name, qty) VALUES ('MUG', 'Mug', 4) ON CONFLICT (sku) DO UPDATE SET qty = qty + excluded.qty;",
      afterQuery: AFTER,
      check: { requires: ['ON CONFLICT', 'DO UPDATE'] },
    },
    {
      prompt: "A delivery arrives: <code>('CAP', 'Cap', 3)</code>, <code>('HAT', 'Sun hat', 2)</code> and <code>('MUG', 'Mug', 1)</code>. In <strong>one</strong> upsert, add new products and increase the stock of existing ones.",
      hint: 'List all three rows in VALUES. With excluded.qty, the same SET works for every conflicting row.',
      solution: "INSERT INTO inventory (sku, name, qty) VALUES ('CAP', 'Cap', 3), ('HAT', 'Sun hat', 2), ('MUG', 'Mug', 1) ON CONFLICT (sku) DO UPDATE SET qty = qty + excluded.qty;",
      afterQuery: AFTER,
      check: { requires: ['ON CONFLICT', 'EXCLUDED'] },
    },
  ],
};
