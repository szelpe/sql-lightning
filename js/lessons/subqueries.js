// Lesson format: see aggregates.js.
export default {
  id: 'subqueries',
  title: 'Subqueries',
  tables: ['employees', 'departments', 'sales'],
  starterSql: 'SELECT * FROM employees;',
  body: `
    <p>Some questions need two steps. "Who earns more than average?" means first working out the
    average, then comparing everyone against it. You could run two queries and copy the number across,
    but SQL lets you put the first query <em>inside</em> the second. The inner query is called a
    <strong>subquery</strong>.</p>

    <p class="syntax-caption">A subquery in WHERE</p>
    <pre class="syntax">SELECT column, …
FROM mytable
WHERE column &gt; (SELECT AGG_FUNC(column) FROM othertable);</pre>

    <p>A subquery is always wrapped in parentheses. The database runs it <strong>once</strong>, first,
    and then uses its result in the outer query as if you had typed that value in yourself.</p>

    <h3>Three shapes of subquery</h3>
    <table class="ref">
      <thead><tr><th>Returns</th><th>Used with</th><th>Example</th></tr></thead>
      <tbody>
        <tr><td>one value</td><td><code>=</code>, <code>&gt;</code>, <code>&lt;</code>, … or as a column in <code>SELECT</code></td><td><code>salary &gt; (SELECT AVG(salary) FROM employees)</code></td></tr>
        <tr><td>a list of values</td><td><code>IN</code> / <code>NOT IN</code></td><td><code>id IN (SELECT employee_id FROM sales)</code></td></tr>
        <tr><td>a whole table</td><td><code>FROM</code></td><td><code>FROM (SELECT …) AS t</code></td></tr>
      </tbody>
    </table>

    <h3>Lists with IN</h3>
    <p>When the subquery returns one column with many rows, use <code>IN</code> to keep rows whose value
    appears in that list, or <code>NOT IN</code> to keep rows whose value doesn't.</p>

    <div class="note"><strong>Watch out for NULL with NOT IN.</strong> If the list contains even one
    <code>NULL</code>, <code>x NOT IN (…)</code> is never true, and the query returns nothing. When the
    subquery's column can be <code>NULL</code>, add <code>WHERE column IS NOT NULL</code> inside it.</div>

    <h3>Subqueries as tables</h3>
    <p>A subquery in <code>FROM</code> acts like a temporary table you can query further. This is how you
    aggregate an aggregate, for example averaging per-employee totals. Give it a name with <code>AS</code>
    so the outer query can refer to its columns.</p>

    <p class="syntax-caption">A derived table</p>
    <pre class="syntax">SELECT AGG_FUNC(t.column)
FROM (SELECT group_column, AGG_FUNC(column) AS column
      FROM mytable
      GROUP BY group_column) AS t;</pre>

    <h3>Exercise</h3>
    <p>The tasks use all three tables. Each employee's <code>department_id</code> matches an
    <code>id</code> in <code>departments</code>, and each sale's <code>employee_id</code> matches an
    <code>id</code> in <code>employees</code>. Every task here can be solved with subqueries alone,
    without a join.</p>
  `,
  tasks: [
    {
      prompt: 'Show the <code>name</code> and <code>salary</code> of every employee who earns more than the company average.',
      hint: 'Compare salary with (SELECT AVG(salary) FROM employees).',
      solution: 'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);',
      check: { requiresSubquery: true },
    },
    {
      prompt: 'Show every employee\'s <code>name</code>, <code>salary</code>, and how far their salary is above (or below) the company average.',
      hint: 'A subquery can be a column too: salary - (SELECT AVG(salary) FROM employees).',
      solution: 'SELECT name, salary, salary - (SELECT AVG(salary) FROM employees) FROM employees;',
      check: { requiresSubquery: true },
    },
    {
      prompt: 'Show the <code>name</code> of every employee who works in a department located in <code>Vienna</code>.',
      hint: "First find the ids of Vienna departments, then keep employees whose department_id is IN that list.",
      solution: "SELECT name FROM employees WHERE department_id IN (SELECT id FROM departments WHERE city = 'Vienna');",
      check: { requiresSubquery: true, requires: ['IN'], forbids: ['JOIN'] },
    },
    {
      prompt: 'Show the <code>name</code> of every employee who has made <strong>no</strong> sales.',
      hint: 'The sales table lists who sold something. Keep employees whose id is NOT IN that list.',
      solution: 'SELECT name FROM employees WHERE id NOT IN (SELECT employee_id FROM sales);',
      check: { requiresSubquery: true, forbids: ['JOIN'] },
    },
    {
      prompt: 'Show the <code>name</code> of the employee who made the single largest sale.',
      hint: 'Subqueries can be nested: find the largest amount, then the employee_id of that sale, then the name for that id.',
      solution: 'SELECT name FROM employees WHERE id = (SELECT employee_id FROM sales WHERE amount = (SELECT MAX(amount) FROM sales));',
      check: { requiresSubquery: true, forbids: ['JOIN'] },
    },
    {
      prompt: 'Each sales person has a total of all their sales. What is the <strong>average</strong> of those totals?',
      hint: 'In FROM, use a subquery that groups sales by employee_id and sums the amount, then take AVG of that sum.',
      solution: 'SELECT AVG(total) FROM (SELECT employee_id, SUM(amount) AS total FROM sales GROUP BY employee_id) AS t;',
      check: { requiresSubquery: true },
    },
  ],
};
