# How SQLBolt works, and a plan for SQL Lightning

Research date: 2026-10-20. Sources: the live site (https://sqlbolt.com), its page HTML, `/cs/js/main.min.js?version=69` (about 24 KB, unminified and read in full), `/cs/js/pixar.js`, and test runs in the browser. Lesson text is summarized here, not copied.

## TL;DR

- **The site is static and does everything in the browser.** Each lesson is a server-rendered HTML page (nginx). There's no backend API, so all SQL runs in the browser.
- **SQL engine: an old build of sql.js.** It's SQLite 3.8.7 compiled to asm.js with Emscripten (`/cs/js/sql_3.8.7.4.js`, 1.5 MB, last modified 2017).
- **How the data loads:** each dataset ships as a JS file (`pixar.js`, `misc.js`) holding `var dbData = [83,81,76,...]`. That array is the raw bytes of a SQLite database file. The page passes it to `new SQL.Database(dbData)`, so every page load starts from a fresh database.
- **How answers are checked:** the site runs a hidden reference solution query and compares its result set with the user's. By default this ignores row order and column names. There's also an ordered variant, plus a few special-purpose check types.
- **Progress isn't saved.** No localStorage (verified), no accounts. Tasks unlock one after another within a page, and a page reload loses them.
- **Stack:** jQuery 1.11, Underscore 1.8, Bootstrap 3.3, Ace editor 1.2.6 (SQL mode), highlight.js 8.5 for static code blocks, and Google Fonts "Ruda". All are 2015–2017 versions served from cdnjs.

## 1. Page anatomy

Each lesson URL looks like `/lesson/<slug>` and uses one layout:

1. **Header:** logo, plus two hover/click dropdowns. "Interactive Tutorial" lists all lessons; "More Topics" lists extras such as Subqueries and Set operations. The extras pages are text-only, with no exercises.
2. **Lesson body:** a few paragraphs of explanation, then one or more grey "definition" boxes. Each box has a small caption and a generic syntax template (`SELECT … FROM mytable WHERE condition`) highlighted by highlight.js. Some lessons add a "Did you know?" aside. The body ends with an "Exercise" heading and one short paragraph that frames the task.
3. **Exercise widget**, full width, in two columns:
   - **Left (8/12):**
     - Title "Table: movies".
     - A message bar for errors and status.
     - The **results table**, which first shows `SELECT * FROM <table>` and is replaced live by the user's query results.
     - Below the table, the **Ace editor** with a "RESET" link. It's pre-filled with the default query, and part of it is pre-selected (`inputDefaultQuerySelection`) so typing overwrites it.
     - Some lessons add extra read-only tables (for joins), which refresh after every query.
   - **Right (4/12):**
     - "Exercise N — Tasks": an ordered list of 3–5 tasks. The current task is highlighted (`li.active`), and finished tasks get a ✓ and strike-style styling.
     - "Stuck? Read this task's **Solution**": clicking it puts the solution for the current task into the editor.
     - A "Finish above Tasks" button that turns into "Continue ›" when every task is done.
4. **Footer:** Next and Previous text links, plus a donation link. The page carries ads.

**Pass/fail feedback is implicit.** There's no "Run" or "Submit" button. The query runs **automatically 300 ms after the user stops typing**, and the current task is re-checked each time. When it passes, the task gets a ✓ and the next one becomes active. When it fails, nothing happens: the table just shows the results. There is no "wrong answer" message.

## 2. How the runtime works (from `main.min.js`)

```text
initializeDocumentLoad(exerciseJson, gaKey)
  └─ db = new Db(dbData)            // SQL.Database from byte array
  └─ new Exercise($('.exercise'), db, JSON.parse(exerciseJson)).initialize()
        initializeTables()          // run each datatable.defaultQuery, render
        initializeTasks()           // Task objects, solution/reset/continue handlers
        initializeEditor()          // Ace, sql mode, no gutter, wrap, change→debounce 300ms
```

The page stores the exercise definition inline as an escaped JSON string:

```json
{
  "tasks_title": "Exercise 11",
  "database": "misc.js",
  "targetDatatableId": "employees",
  "inputDefaultQuery": "SELECT * FROM employees;",
  "inputDefaultQuerySelection": [0, 999],
  "datatable": { "employees": { "defaultQuery": "SELECT * FROM employees;" } },
  "tasks": [
    {
      "text": "Find the number of … (HTML allowed)",
      "hint_text": "…",
      "solution": "SELECT COUNT(*) … ;",          // used for checking
      "userSolution": "SELECT role, COUNT(*) … ;", // shown when "Solution" clicked (optional)
      "checks": [{ "type": "row_col_val_solution_query", "data": null }]
    }
  ]
}
```

Optional fields per task:

- `queryChecks`: substrings the SQL text must contain before it is even run.
- `postValidateAction`: `{runActionOnce, resultQuery, message}`, used by the INSERT/UPDATE/DELETE lessons.
- `manualSubmit`: turns off auto-run.

Per datatable, `preloadTableQuery` or `preloadTableAction` (randomize rows) run before the first render.

**`updateFromSql()` flow:**

1. Normalize the editor text (trim, collapse whitespace). Skip if it hasn't changed.
2. Find the **first unsatisfied task**. Only that task is checked; tasks are strictly sequential.
3. If the task has `queryChecks` and the text doesn't contain those substrings, show "Awaiting complete query…".
4. Run `db.exec(sql)[0]`. Only the **first** result set is used.
5. On error: "no such column" and "no such table" errors are shown verbatim. Every other error, including all syntax errors, becomes the generic "Incomplete SQL query". The table keeps the last good result's column headers.
6. Render the rows. Values are joined straight into HTML, **without escaping**.
7. Run every check for the task. If they all pass, mark the task ✓ and activate the next one. After the last task, enable Continue.

### Check types found

| type | what it does | uses |
|---|---|---|
| `col_equals` | Result columns are exactly the given names (any order, same count) | 4 |
| `row_col_val_solution_query` | Same row count; user has ≥ as many columns as the reference; every reference row's set of distinct values ⊆ the values of *some* user row; order ignored | 11 |
| `row_col_val_solution_query_ordered` | Same as above, but compares row i to row i | 1 |
| `row_count_query_range` | Runs `data.query` and checks min ≤ count ≤ max (for DML lessons) | 1 |
| `row_exists_contain_col_val` | `SELECT * FROM t WHERE col = "v"` returns ≥ 1 row (DML) | 1 |
| `row_col_val_greather_than_or_equal` | For every row, `colA >= colB` | 1 |
| `assert_query_succeeds` / `assert_query_fails` | For DDL lessons | — |

### Weaknesses in the checker (worth fixing)

- **Values are compared without their columns.** `_.intersection(refRow, userRow)` treats each row as a bag of values, so swapped values across columns still pass. There's also no one-to-one row matching: two reference rows can match the same user row.
- **Extra columns are always allowed**, and so is extra junk such as `SELECT *`. Missing columns fail only because of the column-count check.
- **Type and precision are strict.** `===` comparison means `6112.5` passes but `ROUND(AVG(x),2)` fails, and `'5'` ≠ `5`.
- **Hard-coding is possible.** `SELECT 16` passes "count the employees" because the checker never compares against different data.
- **Concept use isn't enforced, except through brittle substring checks.** You can solve the "use HAVING" task with WHERE, or the "use a subquery" task with a JOIN.
- **Feedback is poor.** Syntax errors become "Incomplete SQL query", and a wrong answer gets no "your result differs: expected 3 rows, got 5" message.
- **Progress is lost on reload.** The Continue button only does `preventDefault`, so anyone can go to the next URL anyway.
- **The results table doesn't escape HTML.** That's harmless with this data, but it's poor practice.
- **The engine is old.** SQLite 3.8.7 has no window functions and no `FILTER`, and the asm.js build is 1.5 MB.

## 3. UX worth copying

- The **page rhythm** works: short concept → syntax template → one dataset → 3–5 escalating tasks on the same table.
- **Live results as you type**, debounced. Users get instant gratification, and there's no Run button to hunt for.
- **One active task at a time**, ticked off visibly, with a "Solution" escape hatch scoped to the current task.
- The **default query** shows the raw table, so learners can see the data before querying it.
- **Same dataset across many lessons** (Pixar movies), so learners learn the data once.
- **Pre-selected editable region** in the starting query.
- **Static hosting, no backend:** cheap, fast, and it works offline after the first load.

## 4. Recommended stack for SQL Lightning

| Concern | SQLBolt | Recommendation |
|---|---|---|
| Engine | sql.js 2014 asm.js | **sql.js 1.x (WASM)** from cdnjs/jsdelivr, about 1 MB WASM, modern SQLite with window functions and CTEs |
| Data | SQLite file as a JS byte array | **Plain `.sql` seed script** (`CREATE` + `INSERT`) run at startup: readable and diffable. Re-seed when the user clicks "Reset data" |
| Lessons | Server-rendered HTML + inline JSON | **One JSON/JS file per lesson** (explanation as Markdown/HTML, tasks, solutions, checks), rendered by a single-page shell. Hash routing `#/lesson/aggregates` keeps it static |
| Editor | Ace 1.2.6 | **CodeMirror 6** (`@codemirror/lang-sql` with schema autocompletion), or keep Ace for zero-build simplicity |
| UI | jQuery + Bootstrap 3 | Vanilla JS/TS + Vite, or a small framework (Preact/Svelte). Plain CSS with variables, dark mode |
| Progress | none | **localStorage** `{lessonId: {taskIdx: solvedSql}}`, ✓ marks in the lesson list, "resume where you left off" |
| Hosting | nginx static | Any static host (GitHub Pages, Netlify, Cloudflare Pages) |

### A better answer checker

Run the reference `solution` and the user's SQL on the same DB, then compare:

1. **Columns:** by default the count must match exactly. Optionally set `allowExtraColumns`. Match columns positionally, or with `matchColumnsByName` when column order shouldn't matter. If the counts differ, say "Expected 2 columns, got 3".
2. **Rows:** compare as **multisets** of normalized tuples. Sort both sides by a canonical key unless the task has `ordered: true` (only for tasks that say "sorted by…").
3. **Normalization:**
   - Round numbers to `decimals` (default 2). This also lets `7466.67` match `7466.666…`.
   - Compare `5` and `5.0` as equal.
   - Optionally trim strings or ignore their case.
   - Treat NULL as a distinct token.
4. **Anti-hard-coding:** also run both queries against a **shadow dataset**, the same schema with perturbed values (for example, salaries ×1.1 and one extra row). Both datasets must match.
5. **Concept requirements** (optional per task), checked on a lightly tokenized SQL string with strings and comments stripped:
   - `requires: ["GROUP BY", "HAVING"]`
   - `requiresSubquery: true` (≥ 2 `SELECT` tokens)
   - `forbids: ["JOIN"]`

   Show the failure as a gentle hint, not as a failed result.
6. **Feedback:** "✓ Correct", or a specific diff such as "row count 5 vs expected 3", "column 2 values differ", or "results correct but not sorted". Show real SQLite error messages.
7. Use **Run (Ctrl+Enter)** plus optional live-run. Live-run on every keystroke can freeze the tab on expensive correlated queries or accidental cross joins, so run in a **Web Worker** with a timeout.

## 5. Mapping to our four topics

### Sample dataset

The full script is in [`sample-schema.sql`](sample-schema.sql). It models a small fictional company:

- `departments(id, name, city, budget)`: 5 rows. **Legal has no employees**, which feeds the NOT IN / NOT EXISTS tasks.
- `employees(id, name, department_id, role, salary, bonus, hire_year, manager_id)`: 16 rows. Some `bonus` values are NULL, which demonstrates `COUNT(*)` vs `COUNT(col)`. `manager_id` makes self-referencing correlated subqueries possible.
- `sales(id, employee_id, region, sale_month, amount)`: 16 rows across 4 regions and 3 months. Many employees have no sales.

I ran every reference solution below against this data with sql.js. The data was tuned so the tasks don't come out trivial:

- "Above company average" (6 rows) differs from "above own department average" (7 rows).
- The HAVING in G6 actually filters out a group.
- AVG produces a non-integer value, which exercises the rounding tolerance.

### Lesson 1 — Aggregate functions

**Explain:**
- COUNT/SUM/AVG/MIN/MAX collapse many rows into one.
- `COUNT(*)` vs `COUNT(col)`: NULLs are skipped.
- `COUNT(DISTINCT col)`.
- Aliases with `AS`.
- WHERE filters rows *before* aggregation.

| # | Task | Reference solution | Result |
|---|---|---|---|
| A1 | How many employees are there? | `SELECT COUNT(*) FROM employees` | 16 |
| A2 | Total and average monthly salary | `SELECT SUM(salary), AVG(salary) FROM employees` | 97800, 6112.5 |
| A3 | Earliest and latest hire year | `SELECT MIN(hire_year), MAX(hire_year) FROM employees` | 2013, 2024 |
| A4 | How many employees have a bonus, vs. the total? | `SELECT COUNT(*), COUNT(bonus) FROM employees` | 16, 11 |
| A5 | How many distinct roles exist? | `SELECT COUNT(DISTINCT role) FROM employees` | 6 |
| A6 | Biggest single sale and total sales in the East region | `SELECT MAX(amount), SUM(amount) FROM sales WHERE region='East'` | 21000, 58000 |

**Checking:** unordered multiset comparison with column count required. For A1, `requires: ["COUNT"]`, and the shadow dataset blocks `SELECT 16`.

### Lesson 2 — Subgroups: GROUP BY and HAVING

**Explain:**
- GROUP BY splits rows into groups, and the aggregate runs once per group.
- Every selected non-aggregate column must be in GROUP BY. SQLite allows otherwise; we should warn about it.
- HAVING filters groups; WHERE filters rows. Order of evaluation: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.

| # | Task | Reference solution | Result |
|---|---|---|---|
| G1 | Number of employees per department | `SELECT department_id, COUNT(*) FROM employees GROUP BY department_id` | 4 rows (5,5,3,3) |
| G2 | Average salary per role, highest first | `… GROUP BY role ORDER BY AVG(salary) DESC` | 6 rows, **ordered** check |
| G3 | Number of sales and total amount per region | `SELECT region, COUNT(*), SUM(amount) FROM sales GROUP BY region` | 4 rows |
| G4 | Departments with more than 3 employees | `… GROUP BY department_id HAVING COUNT(*) > 3` | depts 1, 2 |
| G5 | Employees whose total sales exceed 30 000 | `SELECT employee_id, SUM(amount) FROM sales GROUP BY employee_id HAVING SUM(amount) > 30000` | 3 rows |
| G6 | Per department, average salary of people hired before 2020; keep only averages above 6000 | `… WHERE hire_year < 2020 GROUP BY department_id HAVING AVG(salary) > 6000` | 3 rows (Support filtered out) |

**Checking:**
- G4–G6: `requires: ["HAVING"]`.
- G6 also needs `requires: ["WHERE"]`, so learners have to use both and see the difference.
- G2: `ordered: true`.
- AVG values are rounded to 2 decimals.

### Lesson 3 — Subqueries (non-correlated)

**Explain:**
- A query inside a query. The inner query runs **once**, independently of the outer one.
- Three shapes:
  - **scalar**, in WHERE/SELECT, which compares against one value;
  - **list**, with `IN` / `NOT IN`;
  - **table** (derived table), in `FROM`, which must have an alias.
- `NOT IN` + NULL pitfall: one NULL in the list makes the whole condition unknown. Teach this via a note.

| # | Task | Reference solution | Result |
|---|---|---|---|
| S1 | Employees earning more than the company average | `… WHERE salary > (SELECT AVG(salary) FROM employees)` | 6 rows |
| S2 | Employees who work in a Vienna department | `… WHERE department_id IN (SELECT id FROM departments WHERE city='Vienna')` | 8 rows |
| S3 | Employees who made no sales | `… WHERE id NOT IN (SELECT employee_id FROM sales)` | 10 rows |
| S4 | Who made the single largest sale, and how much? | `… WHERE s.amount = (SELECT MAX(amount) FROM sales)` | Ferenc Varga, 25000 |
| S5 | Average of per-employee sales totals | `SELECT AVG(total) FROM (SELECT employee_id, SUM(amount) AS total FROM sales GROUP BY employee_id)` | 28500 |

**Checking:** `requiresSubquery: true` on all tasks. Optionally `forbids: ["JOIN"]` on S2/S3.

### Lesson 4 — Correlated subqueries

**Explain:**
- The inner query references a column of the **outer** row, so it conceptually re-runs per outer row. Use a diagram or step-through animation of the outer row "feeding" the inner query: a good place to beat SQLBolt.
- Table aliases are required.
- `EXISTS` / `NOT EXISTS`.
- Correlated scalar subqueries in SELECT.
- The "greatest-per-group" pattern.
- Contrast with Lesson 3 using the same question ("above average"), comparing the company average with each employee's department average.

| # | Task | Reference solution | Result |
|---|---|---|---|
| C1 | Employees earning more than their **own department's** average | `SELECT name, department_id, salary FROM employees e WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.department_id = e.department_id)` | 7 rows (adds Ilona, Norbert; drops Clara vs S1) |
| C2 | For each Sales-department employee, show how many sales they made | `SELECT name, (SELECT COUNT(*) FROM sales s WHERE s.employee_id = e.id) AS sale_count FROM employees e WHERE department_id = 2` | 5 rows, incl. counts |
| C3 | Employees who made at least one sale of 15 000 or more (use EXISTS) | `… WHERE EXISTS (SELECT 1 FROM sales s WHERE s.employee_id = e.id AND s.amount >= 15000)` | 3 rows |
| C4 | Each seller's largest sale (employee_id, region, amount) | `SELECT employee_id, region, amount FROM sales s WHERE amount = (SELECT MAX(amount) FROM sales s2 WHERE s2.employee_id = s.employee_id)` | 6 rows |
| C5 | Employees hired before their manager | `SELECT e.name FROM employees e WHERE e.hire_year < (SELECT m.hire_year FROM employees m WHERE m.id = e.manager_id)` | Ilona Farkas, Laszlo Takacs |

**Checking:**
- `requiresSubquery: true` on all tasks, plus `requires: ["EXISTS"]` on C3.
- Correlation detection, e.g. an inner query that references an outer alias, is optional and heuristic. The **shadow dataset** does more good here: a non-correlated answer to C1 gives different rows on perturbed data, so it fails anyway.

**Suggested order:** Aggregates → GROUP BY/HAVING → Subqueries → Correlated subqueries. Subqueries lean on aggregates (S1, S5 use AVG/GROUP BY), and correlated subqueries are easiest to explain as "the S1 task, but per department".

## 6. Suggested lesson data format for us

```js
export default {
  id: "group-by-having",
  title: "Subgroups: GROUP BY and HAVING",
  body: `…markdown…`,               // explanation + syntax boxes
  tables: ["employees", "sales"],   // shown as read-only previews / schema sidebar
  starterSql: "SELECT * FROM employees;",
  tasks: [
    {
      prompt: "Departments with more than 3 employees",
      hint: "Group by department, then filter the groups.",
      solution: "SELECT department_id, COUNT(*) FROM employees GROUP BY department_id HAVING COUNT(*) > 3;",
      check: { ordered: false, decimals: 2, requires: ["GROUP BY", "HAVING"] }
    }
  ]
};
```

## 7. Open questions for the implementation phase

- Build tooling: zero-build static HTML with CDN scripts, or Vite + TypeScript?
- Language of the UI and lessons: English only, or also Hungarian?
- Free navigation, or require the previous lesson to be solved?
- Should we include JOIN as a prerequisite mini-lesson? C2–C4 and S4 assume basic JOIN/alias familiarity.
