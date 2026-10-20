// Lesson format: see aggregates.js. Constraint lessons check tasks with `tests`:
// statements run after the learner's SQL that must work, or be rejected by a named
// constraint (see checker.js).
export default {
  id: 'not-null-default',
  title: 'NOT NULL and DEFAULT',
  tables: [],
  starterSql: `CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT,
  price INTEGER
);`,
  body: `
    <p>So far the data has always been clean, because someone else made sure of it. In a real
    application, rows arrive from forms, imports and other programs, and some of them will be wrong.
    <strong>Constraints</strong> are rules you attach to a table so the database itself refuses bad
    data, no matter where it comes from.</p>

    <p>Constraints are part of the table definition. You write them in <code>CREATE TABLE</code>,
    after a column's type:</p>

    <p class="syntax-caption">Creating a table with constraints</p>
    <pre class="syntax">CREATE TABLE mytable (
    column1 TYPE CONSTRAINT …,
    column2 TYPE CONSTRAINT …,
    …
);</pre>

    <p>Rows are added with <code>INSERT</code>. Listing the columns is optional, but it makes the
    statement clear about which value goes where:</p>
    <pre class="syntax">INSERT INTO mytable (column1, column2) VALUES (value1, value2);</pre>

    <h3>NOT NULL</h3>
    <p>By default, any column can be left empty, i.e. set to <code>NULL</code>. Adding
    <code>NOT NULL</code> makes a value required. An <code>INSERT</code> that leaves the column out, or
    sets it to <code>NULL</code> explicitly, fails with an error and the row is not stored.</p>

    <h3>DEFAULT</h3>
    <p><code>DEFAULT value</code> fills in a column when an <code>INSERT</code> doesn't mention it at
    all: <code>in_stock INTEGER DEFAULT 1</code> means "in stock unless told otherwise".</p>

    <div class="note"><strong>DEFAULT only applies when the column is left out.</strong> If an
    <code>INSERT</code> explicitly says <code>NULL</code>, the column gets <code>NULL</code>, not the
    default. To rule that out too, combine both: <code>status TEXT NOT NULL DEFAULT 'draft'</code>.</div>

    <h3>Exercise</h3>
    <p>Each task is checked by running a few test statements against your table. You'll see them
    under the result, with a ✓ or ✗ for each. Every run starts with an empty database, so your
    <code>CREATE TABLE</code> is run fresh each time: edit it and run it again.</p>
  `,
  tasks: [
    {
      prompt: 'Change the <code>products</code> table so that every product <strong>must have a name</strong>.',
      hint: 'Add NOT NULL after the type of the name column.',
      solution: `CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  price INTEGER
);`,
      check: { requires: ['NOT NULL'] },
      tests: [
        { label: 'Add a product with a name', sql: "INSERT INTO products (id, name, price) VALUES (1, 'Mug', 800);" },
        { label: 'Add a product with name NULL', sql: 'INSERT INTO products (id, name, price) VALUES (2, NULL, 500);', expect: 'NOT NULL' },
        { label: 'Add a product without a name', sql: 'INSERT INTO products (id, price) VALUES (3, 500);', expect: 'NOT NULL' },
      ],
    },
    {
      prompt: 'Make the <code>price</code> required as well.',
      hint: 'NOT NULL works on any column, and each column gets its own.',
      solution: `CREATE TABLE products (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  price INTEGER NOT NULL
);`,
      tests: [
        { label: 'Add a complete product', sql: "INSERT INTO products (id, name, price) VALUES (1, 'Mug', 800);" },
        { label: 'Add a product without a price', sql: "INSERT INTO products (id, name) VALUES (2, 'Cap');", expect: 'NOT NULL' },
        { label: 'Add a product without a name', sql: 'INSERT INTO products (id, price) VALUES (3, 500);', expect: 'NOT NULL' },
      ],
    },
    {
      prompt: 'Add an <code>in_stock INTEGER</code> column that is <code>1</code> unless an <code>INSERT</code> says otherwise.',
      hint: 'in_stock INTEGER DEFAULT 1. Remember the comma after the previous column.',
      solution: `CREATE TABLE products (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  price    INTEGER NOT NULL,
  in_stock INTEGER DEFAULT 1
);`,
      check: { requires: ['DEFAULT'] },
      tests: [
        { label: 'Add a product without in_stock', sql: "INSERT INTO products (id, name, price) VALUES (1, 'Mug', 800);" },
        { label: 'Its in_stock is 1', sql: 'SELECT in_stock FROM products WHERE id = 1;', rows: [[1]] },
        { label: 'Add a product with in_stock = 0', sql: "INSERT INTO products (id, name, price, in_stock) VALUES (2, 'Cap', 500, 0);" },
        { label: 'Its in_stock stays 0', sql: 'SELECT in_stock FROM products WHERE id = 2;', rows: [[0]] },
        { label: 'Names are still required', sql: 'INSERT INTO products (id, price) VALUES (3, 500);', expect: 'NOT NULL' },
      ],
    },
    {
      prompt: "Add a <code>status TEXT</code> column that defaults to <code>'draft'</code> and can <strong>never</strong> be NULL, not even when an INSERT says NULL explicitly.",
      hint: "Combine both constraints on one column: status TEXT NOT NULL DEFAULT 'draft'.",
      solution: `CREATE TABLE products (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  price    INTEGER NOT NULL,
  in_stock INTEGER DEFAULT 1,
  status   TEXT NOT NULL DEFAULT 'draft'
);`,
      check: { requires: ['DEFAULT'] },
      tests: [
        { label: 'Add a product without a status', sql: "INSERT INTO products (id, name, price) VALUES (1, 'Mug', 800);" },
        { label: "Its status is 'draft'", sql: 'SELECT status FROM products WHERE id = 1;', rows: [['draft']] },
        { label: "Add a product with status 'live'", sql: "INSERT INTO products (id, name, price, status) VALUES (2, 'Cap', 500, 'live');" },
        { label: 'Add a product with status NULL', sql: "INSERT INTO products (id, name, price, status) VALUES (3, 'Tee', 1500, NULL);", expect: 'NOT NULL' },
        { label: 'in_stock still defaults to 1', sql: 'SELECT in_stock FROM products WHERE id = 2;', rows: [[1]] },
      ],
    },
  ],
};
