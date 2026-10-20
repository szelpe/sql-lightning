// Lesson format: see aggregates.js and not-null-default.js.
export default {
  id: 'referential-actions',
  title: 'ON DELETE and ON UPDATE',
  tables: ['customers'],
  setupSql: `
CREATE TABLE customers (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO customers (id, name) VALUES (1, 'Ada Park'), (2, 'Ben Ortiz'), (3, 'Cleo Nash');
`,
  foreignKeys: true,
  starterSql: `CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  total       INTEGER NOT NULL
);`,
  body: `
    <p>In the last lesson, deleting an author who still had books simply failed. That's a safe
    default, but not always what you want. When a customer closes their account, their shopping
    carts should disappear with them; their support tickets should stay, just without a name; and
    their invoices must stop the deletion altogether. A foreign key can say which of these should
    happen.</p>

    <p class="syntax-caption">Referential actions</p>
    <pre class="syntax">parent_id INTEGER REFERENCES parent(id)
    ON DELETE action
    ON UPDATE action</pre>

    <table class="ref">
      <thead><tr><th>Action</th><th>When the parent row is deleted (or its key changes)</th></tr></thead>
      <tbody>
        <tr><td><code>NO ACTION</code></td><td>the default: the statement fails while child rows point to it</td></tr>
        <tr><td><code>RESTRICT</code></td><td>like NO ACTION, but says so explicitly and checks immediately</td></tr>
        <tr><td><code>CASCADE</code></td><td>child rows are deleted too (or their reference is updated to the new key)</td></tr>
        <tr><td><code>SET NULL</code></td><td>child rows stay, and their reference becomes <code>NULL</code></td></tr>
        <tr><td><code>SET DEFAULT</code></td><td>child rows stay, and their reference gets the column's <code>DEFAULT</code></td></tr>
      </tbody>
    </table>

    <p><code>ON DELETE</code> and <code>ON UPDATE</code> are independent: a column can cascade
    deletes and block key changes, or the other way round.</p>

    <div class="note"><strong>CASCADE is powerful.</strong> One <code>DELETE</code> can remove rows in
    many tables, and the chain continues if those rows have children with CASCADE too. Use it for data
    that really belongs to its parent, not for anything you might need to keep.</div>

    <h3>Exercise</h3>
    <p>The <code>customers</code> table is ready, with customers 1, 2 and 3, and foreign keys are
    switched on. Build the tables that point to it.</p>
  `,
  tasks: [
    {
      prompt: "When a customer is deleted, their <code>orders</code> should be deleted <strong>with them</strong>.",
      hint: 'Add ON DELETE CASCADE after REFERENCES customers(id).',
      solution: `CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total       INTEGER NOT NULL
);`,
      check: { requires: ['ON DELETE CASCADE'] },
      tests: [
        { label: 'Ada places two orders, Ben one', sql: 'INSERT INTO orders (id, customer_id, total) VALUES (1, 1, 2500), (2, 1, 900), (3, 2, 4000);' },
        { label: 'Delete Ada', sql: 'DELETE FROM customers WHERE id = 1;' },
        { label: "Only Ben's order is left", sql: 'SELECT id FROM orders;', rows: [[3]] },
      ],
    },
    {
      prompt: 'Below <code>orders</code>, create <code>support_tickets</code> with <code>id INTEGER PRIMARY KEY</code>, <code>customer_id</code> and a required <code>subject TEXT</code>. When a customer is deleted, their tickets should <strong>stay</strong>, with no customer.',
      hint: 'customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL. It must allow NULL, so no NOT NULL here.',
      solution: `CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total       INTEGER NOT NULL
);

CREATE TABLE support_tickets (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL
);`,
      check: { requires: ['SET NULL'] },
      tests: [
        { label: 'Ben opens a ticket', sql: "INSERT INTO support_tickets (id, customer_id, subject) VALUES (1, 2, 'Late delivery');" },
        { label: 'Ben also has an order', sql: 'INSERT INTO orders (id, customer_id, total) VALUES (1, 2, 1200);' },
        { label: 'Delete Ben', sql: 'DELETE FROM customers WHERE id = 2;' },
        { label: 'The ticket is still there, with no customer', sql: 'SELECT id, customer_id FROM support_tickets;', rows: [[1, null]] },
        { label: "Ben's order is gone", sql: 'SELECT COUNT(*) FROM orders;', rows: [[0]] },
      ],
    },
    {
      prompt: 'Add an <code>invoices</code> table with <code>id INTEGER PRIMARY KEY</code>, a required <code>customer_id</code> and <code>amount INTEGER NOT NULL</code>. A customer who has invoices must <strong>not</strong> be deletable; say so explicitly with <code>RESTRICT</code>.',
      hint: 'customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT',
      solution: `CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total       INTEGER NOT NULL
);

CREATE TABLE support_tickets (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL
);

CREATE TABLE invoices (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount      INTEGER NOT NULL
);`,
      check: { requires: ['RESTRICT'] },
      tests: [
        { label: 'Invoice Cleo', sql: 'INSERT INTO invoices (id, customer_id, amount) VALUES (1, 3, 7300);' },
        { label: 'Delete Cleo', sql: 'DELETE FROM customers WHERE id = 3;', expect: 'FOREIGN KEY' },
        { label: 'Delete Ada, who has no invoices', sql: 'DELETE FROM customers WHERE id = 1;' },
        { label: 'Orders still cascade', sql: 'INSERT INTO orders (id, customer_id, total) VALUES (1, 2, 500);' },
      ],
    },
    {
      prompt: "Customer ids sometimes get renumbered. Make <code>orders</code> follow a customer's <strong>new id</strong> automatically, while still deleting them with the customer.",
      hint: 'A column can have both: REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE',
      solution: `CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id)
              ON DELETE CASCADE ON UPDATE CASCADE,
  total       INTEGER NOT NULL
);

CREATE TABLE support_tickets (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL
);

CREATE TABLE invoices (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount      INTEGER NOT NULL
);`,
      check: { requires: ['ON UPDATE CASCADE'] },
      tests: [
        { label: 'Cleo places order 10', sql: 'INSERT INTO orders (id, customer_id, total) VALUES (10, 3, 500);' },
        { label: "Change Cleo's id from 3 to 30", sql: 'UPDATE customers SET id = 30 WHERE id = 3;' },
        { label: 'Order 10 now points to 30', sql: 'SELECT customer_id FROM orders WHERE id = 10;', rows: [[30]] },
        { label: 'Delete Cleo', sql: 'DELETE FROM customers WHERE id = 30;' },
        { label: 'Her order is gone', sql: 'SELECT COUNT(*) FROM orders;', rows: [[0]] },
        { label: 'Invoices still block deletes', sql: 'INSERT INTO invoices (id, customer_id, amount) VALUES (1, 1, 100); DELETE FROM customers WHERE id = 1;', expect: 'FOREIGN KEY' },
      ],
    },
  ],
};
