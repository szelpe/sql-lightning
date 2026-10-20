// Lesson format: see aggregates.js and not-null-default.js.
export default {
  id: 'check-constraints',
  title: 'CHECK',
  tables: [],
  starterSql: `CREATE TABLE bookings (
  id        INTEGER PRIMARY KEY,
  guest     TEXT NOT NULL,
  nights    INTEGER NOT NULL,
  check_in  TEXT NOT NULL,
  check_out TEXT NOT NULL,
  rating    INTEGER
);`,
  body: `
    <p><code>NOT NULL</code> and <code>UNIQUE</code> cover common rules, but most rules are specific
    to your data: a stay lasts at least one night, a rating is between 1 and 5, you can't check out
    before you checked in. <code>CHECK</code> lets you write such a rule as a condition, the same kind
    of condition you'd put in a <code>WHERE</code> clause.</p>

    <p class="syntax-caption">A CHECK constraint</p>
    <pre class="syntax">CREATE TABLE mytable (
    column1 TYPE CHECK (condition on column1),
    column2 TYPE,
    CHECK (condition on several columns)
);</pre>

    <p>The database evaluates the condition for every row that is inserted or updated. If it comes out
    false, the statement fails and nothing is stored. A condition that uses only one column can sit next
    to that column; one that compares columns goes on its own line, like a multi-column key.</p>

    <div class="note"><strong>NULL passes a CHECK.</strong> A CHECK fails only when its condition is
    <em>false</em>. With a <code>NULL</code> value, <code>rating BETWEEN 1 AND 5</code> is neither true
    nor false, so the row is accepted. That's handy for optional columns; add <code>NOT NULL</code> when
    the value is required.</div>

    <h3>What CHECK can't do</h3>
    <p>A CHECK only sees the row being written. It can't look at other rows or other tables, so
    "no more than 10 bookings per day" or "the guest must exist" need other tools, such as the foreign
    keys in the next lessons.</p>

    <h3>Exercise</h3>
    <p>Dates are stored as text in <code>'YYYY-MM-DD'</code> form. Written that way, comparing them as
    text gives the same answer as comparing the dates, so <code>check_out &gt; check_in</code>
    works.</p>
  `,
  tasks: [
    {
      prompt: 'A booking must be for at least <strong>1 night</strong>.',
      hint: 'Add CHECK (nights >= 1) to the nights column.',
      solution: `CREATE TABLE bookings (
  id        INTEGER PRIMARY KEY,
  guest     TEXT NOT NULL,
  nights    INTEGER NOT NULL CHECK (nights >= 1),
  check_in  TEXT NOT NULL,
  check_out TEXT NOT NULL,
  rating    INTEGER
);`,
      check: { requires: ['CHECK'] },
      tests: [
        { label: 'Book 2 nights', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (1, 'Ada', 2, '2026-07-01', '2026-07-03');" },
        { label: 'Book 1 night', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (2, 'Ben', 1, '2026-07-01', '2026-07-02');" },
        { label: 'Book 0 nights', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (3, 'Cleo', 0, '2026-07-01', '2026-07-02');", expect: 'CHECK' },
        { label: 'Book -2 nights', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (4, 'Dan', -2, '2026-07-01', '2026-07-02');", expect: 'CHECK' },
      ],
    },
    {
      prompt: 'The <code>rating</code> stays optional, but when it is given it must be between <strong>1 and 5</strong>.',
      hint: 'CHECK (rating BETWEEN 1 AND 5). NULL ratings pass on their own.',
      solution: `CREATE TABLE bookings (
  id        INTEGER PRIMARY KEY,
  guest     TEXT NOT NULL,
  nights    INTEGER NOT NULL CHECK (nights >= 1),
  check_in  TEXT NOT NULL,
  check_out TEXT NOT NULL,
  rating    INTEGER CHECK (rating BETWEEN 1 AND 5)
);`,
      tests: [
        { label: 'Booking without a rating', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (1, 'Ada', 2, '2026-07-01', '2026-07-03');" },
        { label: 'Rating 5', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out, rating) VALUES (2, 'Ben', 1, '2026-07-01', '2026-07-02', 5);" },
        { label: 'Rating 1', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out, rating) VALUES (3, 'Cleo', 1, '2026-07-01', '2026-07-02', 1);" },
        { label: 'Rating 6', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out, rating) VALUES (4, 'Dan', 1, '2026-07-01', '2026-07-02', 6);", expect: 'CHECK' },
        { label: 'Rating 0', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out, rating) VALUES (5, 'Eve', 1, '2026-07-01', '2026-07-02', 0);", expect: 'CHECK' },
        { label: '0 nights is still rejected', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (6, 'Finn', 0, '2026-07-01', '2026-07-02');", expect: 'CHECK' },
      ],
    },
    {
      prompt: 'The <code>check_out</code> date must be <strong>after</strong> the <code>check_in</code> date.',
      hint: 'This rule compares two columns, so add it as its own line at the end: CHECK (check_out > check_in).',
      solution: `CREATE TABLE bookings (
  id        INTEGER PRIMARY KEY,
  guest     TEXT NOT NULL,
  nights    INTEGER NOT NULL CHECK (nights >= 1),
  check_in  TEXT NOT NULL,
  check_out TEXT NOT NULL,
  rating    INTEGER CHECK (rating BETWEEN 1 AND 5),
  CHECK (check_out > check_in)
);`,
      tests: [
        { label: 'Check out 3 days later', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (1, 'Ada', 3, '2026-07-01', '2026-07-04');" },
        { label: 'Check out on the check-in day', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (2, 'Ben', 1, '2026-07-01', '2026-07-01');", expect: 'CHECK' },
        { label: 'Check out before checking in', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (3, 'Cleo', 1, '2026-07-05', '2026-07-02');", expect: 'CHECK' },
        { label: 'Ratings are still limited to 1–5', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out, rating) VALUES (4, 'Dan', 1, '2026-07-01', '2026-07-02', 9);", expect: 'CHECK' },
      ],
    },
    {
      prompt: "Add a <code>status TEXT</code> column that must be one of <code>'pending'</code>, <code>'confirmed'</code> or <code>'cancelled'</code>, and is <code>'pending'</code> when not given.",
      hint: "status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled'))",
      solution: `CREATE TABLE bookings (
  id        INTEGER PRIMARY KEY,
  guest     TEXT NOT NULL,
  nights    INTEGER NOT NULL CHECK (nights >= 1),
  check_in  TEXT NOT NULL,
  check_out TEXT NOT NULL,
  rating    INTEGER CHECK (rating BETWEEN 1 AND 5),
  status    TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  CHECK (check_out > check_in)
);`,
      check: { requires: ['IN', 'DEFAULT'] },
      tests: [
        { label: 'Booking without a status', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (1, 'Ada', 2, '2026-07-01', '2026-07-03');" },
        { label: "Its status is 'pending'", sql: 'SELECT status FROM bookings WHERE id = 1;', rows: [['pending']] },
        { label: "Status 'confirmed'", sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out, status) VALUES (2, 'Ben', 1, '2026-07-01', '2026-07-02', 'confirmed');" },
        { label: "Status 'done'", sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out, status) VALUES (3, 'Cleo', 1, '2026-07-01', '2026-07-02', 'done');", expect: 'CHECK' },
        { label: 'Dates are still checked', sql: "INSERT INTO bookings (id, guest, nights, check_in, check_out) VALUES (4, 'Dan', 1, '2026-07-03', '2026-07-01');", expect: 'CHECK' },
      ],
    },
  ],
};
