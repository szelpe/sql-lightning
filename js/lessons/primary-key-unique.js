// Lesson format: see aggregates.js and not-null-default.js.
export default {
  id: 'primary-key-unique',
  title: 'PRIMARY KEY and UNIQUE',
  tables: [],
  starterSql: `CREATE TABLE users (
  id       INTEGER,
  email    TEXT NOT NULL,
  username TEXT NOT NULL
);`,
  body: `
    <p>Every table in Chapter 1 had an <code>id</code> column, and every id was different. That
    wasn't luck: the tables declared <code>id</code> as their <strong>primary key</strong>, so the
    database refused duplicates. A primary key is how you point at exactly one row, which is what the
    <code>department_id</code> and <code>employee_id</code> columns relied on.</p>

    <h3>PRIMARY KEY</h3>
    <p>A table has at most one primary key. Its values must be unique, and they identify the row.
    In SQLite, a column declared <code>INTEGER PRIMARY KEY</code> has an extra perk: leave it out of an
    <code>INSERT</code> and the database picks the next free number for you.</p>
    <pre class="syntax">CREATE TABLE mytable (
    id   INTEGER PRIMARY KEY,
    …
);</pre>

    <h3>UNIQUE</h3>
    <p>Other columns can be required to be unique too, like an email address that may belong to only
    one account. <code>UNIQUE</code> rejects any row whose value already exists in that column.</p>

    <div class="note"><strong>UNIQUE allows many NULLs.</strong> <code>NULL</code> means "unknown", and
    two unknowns are not considered equal. So an optional <code>phone TEXT UNIQUE</code> column can be
    empty for many users, while each actual number appears only once.</div>

    <h3>Keys made of several columns</h3>
    <p>Sometimes no single column is unique, but a combination is. A user can join many groups, and a
    group has many users, but each user joins each group only once. Write such a key after the columns,
    as its own line in the table definition:</p>
    <pre class="syntax">CREATE TABLE mytable (
    column1 TYPE,
    column2 TYPE,
    PRIMARY KEY (column1, column2)
);</pre>
    <p><code>UNIQUE (column1, column2)</code> works the same way for a combination that isn't the
    primary key.</p>

    <h3>Exercise</h3>
    <p>As before, each task runs test statements against your tables. Keep building on the same
    <code>CREATE TABLE</code>. In the last task you'll add a second table below the first one.</p>
  `,
  tasks: [
    {
      prompt: 'Make <code>id</code> the primary key of <code>users</code>.',
      hint: 'Change the id line to: id INTEGER PRIMARY KEY,',
      solution: `CREATE TABLE users (
  id       INTEGER PRIMARY KEY,
  email    TEXT NOT NULL,
  username TEXT NOT NULL
);`,
      check: { requires: ['PRIMARY KEY'] },
      tests: [
        { label: 'Add user 1', sql: "INSERT INTO users (id, email, username) VALUES (1, 'ann@example.com', 'ann');" },
        { label: 'Add another user with id 1', sql: "INSERT INTO users (id, email, username) VALUES (1, 'bob@example.com', 'bob');", expect: 'UNIQUE' },
        { label: 'Add a user without an id', sql: "INSERT INTO users (email, username) VALUES ('cleo@example.com', 'cleo');" },
        { label: 'The database gave them id 2', sql: "SELECT id FROM users WHERE username = 'cleo';", rows: [[2]] },
      ],
    },
    {
      prompt: 'Make sure no two users can have the same <code>email</code>.',
      hint: 'Add UNIQUE to the email column, next to NOT NULL.',
      solution: `CREATE TABLE users (
  id       INTEGER PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL
);`,
      check: { requires: ['UNIQUE'] },
      tests: [
        { label: 'Add ann', sql: "INSERT INTO users (id, email, username) VALUES (1, 'ann@example.com', 'ann');" },
        { label: "Add bob with ann's email", sql: "INSERT INTO users (id, email, username) VALUES (2, 'ann@example.com', 'bob');", expect: 'UNIQUE' },
        { label: 'Add a second user called ann, with another email', sql: "INSERT INTO users (id, email, username) VALUES (3, 'ann2@example.com', 'ann');" },
      ],
    },
    {
      prompt: 'Add an optional <code>phone TEXT</code> column. Users may leave it empty, but a phone number can only belong to <strong>one</strong> user.',
      hint: 'phone TEXT UNIQUE (without NOT NULL, so it stays optional).',
      solution: `CREATE TABLE users (
  id       INTEGER PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  phone    TEXT UNIQUE
);`,
      tests: [
        { label: 'Add a user without a phone', sql: "INSERT INTO users (id, email, username) VALUES (1, 'ann@example.com', 'ann');" },
        { label: 'Add another user without a phone', sql: "INSERT INTO users (id, email, username) VALUES (2, 'bob@example.com', 'bob');" },
        { label: 'Add a user with phone 555-0101', sql: "INSERT INTO users (id, email, username, phone) VALUES (3, 'cleo@example.com', 'cleo', '555-0101');" },
        { label: 'Add another user with phone 555-0101', sql: "INSERT INTO users (id, email, username, phone) VALUES (4, 'dan@example.com', 'dan', '555-0101');", expect: 'UNIQUE' },
        { label: 'Emails are still unique', sql: "INSERT INTO users (id, email, username) VALUES (5, 'ann@example.com', 'ann2');", expect: 'UNIQUE' },
      ],
    },
    {
      prompt: 'Below <code>users</code>, create a <code>memberships</code> table with <code>user_id INTEGER</code>, <code>group_id INTEGER</code> and <code>role TEXT</code>. A user can be in many groups, but in each group <strong>only once</strong>.',
      hint: 'After the three columns, add a line PRIMARY KEY (user_id, group_id). Separate the two CREATE TABLE statements with a semicolon.',
      solution: `CREATE TABLE users (
  id       INTEGER PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  phone    TEXT UNIQUE
);

CREATE TABLE memberships (
  user_id  INTEGER,
  group_id INTEGER,
  role     TEXT,
  PRIMARY KEY (user_id, group_id)
);`,
      tests: [
        { label: 'User 1 joins group 10', sql: "INSERT INTO memberships (user_id, group_id, role) VALUES (1, 10, 'member');" },
        { label: 'User 1 joins group 11', sql: "INSERT INTO memberships (user_id, group_id, role) VALUES (1, 11, 'admin');" },
        { label: 'User 2 joins group 10', sql: "INSERT INTO memberships (user_id, group_id, role) VALUES (2, 10, 'member');" },
        { label: 'User 1 joins group 10 again', sql: "INSERT INTO memberships (user_id, group_id, role) VALUES (1, 10, 'admin');", expect: 'UNIQUE' },
        { label: 'users still has its rules', sql: "INSERT INTO users (id, email, username) VALUES (1, 'ann@example.com', 'ann');" },
      ],
    },
  ],
};
