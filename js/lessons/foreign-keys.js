// Lesson format: see aggregates.js and not-null-default.js.
const AUTHORS = `
CREATE TABLE authors (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
INSERT INTO authors (id, name) VALUES (1, 'Mara Quinn'), (2, 'Tomas Reyes'), (3, 'Ines Duval');
`;

export default {
  id: 'foreign-keys',
  title: 'FOREIGN KEY',
  tables: ['authors'],
  setupSql: AUTHORS,
  foreignKeys: true,
  starterSql: `CREATE TABLE books (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  author_id INTEGER
);`,
  body: `
    <p>In Chapter 1, every <code>employees.department_id</code> matched a real department. Nothing
    guaranteed that, though: you could have stored <code>department_id = 42</code> and the database
    wouldn't have minded. A <strong>foreign key</strong> makes that link a rule: a value in this
    column must exist as a key in another table.</p>

    <p class="syntax-caption">A foreign key</p>
    <pre class="syntax">CREATE TABLE child (
    id        INTEGER PRIMARY KEY,
    parent_id INTEGER REFERENCES parent(id),
    …
);</pre>

    <p>The table holding the reference is the <em>child</em> (here, <code>books</code>); the one it
    points to is the <em>parent</em> (<code>authors</code>). The parent column must be its primary
    key or <code>UNIQUE</code>, so that each value points at exactly one row.</p>

    <h3>What the database now enforces</h3>
    <ul>
      <li>An <code>INSERT</code> or <code>UPDATE</code> on the child fails if its value doesn't exist in the parent.</li>
      <li>Deleting a parent row fails while child rows still point to it. The next lesson shows how to change that.</li>
      <li><code>NULL</code> is allowed: it means "no parent". Add <code>NOT NULL</code> if every child needs one.</li>
    </ul>

    <p>Like other rules that involve several columns, a foreign key can also go on its own line:
    <code>FOREIGN KEY (author_id) REFERENCES authors(id)</code>.</p>

    <div class="note"><strong>SQLite checks foreign keys only when asked.</strong> For backwards
    compatibility, a fresh SQLite connection ignores them until you run
    <code>PRAGMA foreign_keys = ON;</code>. Here this is switched on for you; in your own projects,
    run it every time you connect.</div>

    <h3>Exercise</h3>
    <p>The <code>authors</code> table already exists, with authors 1, 2 and 3. You'll create the tables
    that point to it.</p>
  `,
  tasks: [
    {
      prompt: 'Make <code>books.author_id</code> refer to <code>authors(id)</code>, so a book can only name an author that exists.',
      hint: 'author_id INTEGER REFERENCES authors(id)',
      solution: `CREATE TABLE books (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  author_id INTEGER REFERENCES authors(id)
);`,
      check: { requires: ['REFERENCES'] },
      tests: [
        { label: 'Add a book by author 1', sql: "INSERT INTO books (id, title, author_id) VALUES (1, 'Ocean Light', 1);" },
        { label: 'Add a book by author 99', sql: "INSERT INTO books (id, title, author_id) VALUES (2, 'Ghost Pages', 99);", expect: 'FOREIGN KEY' },
        { label: 'Move book 1 to author 99', sql: 'UPDATE books SET author_id = 99 WHERE id = 1;', expect: 'FOREIGN KEY' },
        { label: 'Delete author 1, who has a book', sql: 'DELETE FROM authors WHERE id = 1;', expect: 'FOREIGN KEY' },
        { label: 'Delete author 3, who has none', sql: 'DELETE FROM authors WHERE id = 3;' },
      ],
    },
    {
      prompt: 'Every book must have an author: rule out books with no <code>author_id</code>.',
      hint: 'A foreign key alone allows NULL. Add NOT NULL to the same column.',
      solution: `CREATE TABLE books (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id)
);`,
      tests: [
        { label: 'Add a book by author 2', sql: "INSERT INTO books (id, title, author_id) VALUES (1, 'Stone Road', 2);" },
        { label: 'Add a book without an author', sql: "INSERT INTO books (id, title) VALUES (2, 'Anonymous');", expect: 'NOT NULL' },
        { label: 'Add a book by author 99', sql: "INSERT INTO books (id, title, author_id) VALUES (3, 'Ghost Pages', 99);", expect: 'FOREIGN KEY' },
      ],
    },
    {
      prompt: 'Below <code>books</code>, create <code>reviews</code> with <code>id INTEGER PRIMARY KEY</code>, a required <code>book_id</code> that refers to <code>books(id)</code>, and <code>stars INTEGER</code> between 1 and 5.',
      hint: 'book_id INTEGER NOT NULL REFERENCES books(id), stars INTEGER CHECK (stars BETWEEN 1 AND 5). Separate the statements with a semicolon.',
      solution: `CREATE TABLE books (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id)
);

CREATE TABLE reviews (
  id      INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id),
  stars   INTEGER CHECK (stars BETWEEN 1 AND 5)
);`,
      tests: [
        { label: 'Add a book', sql: "INSERT INTO books (id, title, author_id) VALUES (1, 'Paper Moon', 1);" },
        { label: 'Review that book', sql: 'INSERT INTO reviews (id, book_id, stars) VALUES (1, 1, 4);' },
        { label: 'Review book 42, which does not exist', sql: 'INSERT INTO reviews (id, book_id, stars) VALUES (2, 42, 5);', expect: 'FOREIGN KEY' },
        { label: 'Give 7 stars', sql: 'INSERT INTO reviews (id, book_id, stars) VALUES (3, 1, 7);', expect: 'CHECK' },
        { label: 'Delete the reviewed book', sql: 'DELETE FROM books WHERE id = 1;', expect: 'FOREIGN KEY' },
      ],
    },
    {
      prompt: 'Now <code>books</code> exists with foreign keys switched on. Add a new author <code>Nadia Okafor</code> with id <code>4</code>, and her book <code>Tides</code> with id <code>10</code>.',
      hint: 'Two INSERT statements, and the order matters: the book can only point to an author that already exists.',
      setupSql: `${AUTHORS}
CREATE TABLE books (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id)
);
INSERT INTO books (id, title, author_id) VALUES (1, 'Ocean Light', 1), (2, 'Stone Road', 2), (3, 'Paper Moon', 1);
`,
      starterSql: `-- authors and books are ready. Add Nadia Okafor and her book Tides.
SELECT * FROM books;`,
      solution: `INSERT INTO authors (id, name) VALUES (4, 'Nadia Okafor');
INSERT INTO books (id, title, author_id) VALUES (10, 'Tides', 4);`,
      afterQuery: 'SELECT id, title, author_id, (SELECT name FROM authors WHERE authors.id = books.author_id) AS author FROM books ORDER BY id;',
      check: { requires: ['INSERT'] },
    },
  ],
};
