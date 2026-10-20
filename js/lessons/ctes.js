// Lesson format: see aggregates.js.
export default {
  id: 'ctes',
  title: 'Common table expressions (WITH)',
  tables: ['employees', 'sales'],
  starterSql: 'SELECT * FROM employees;',
  body: `
    <p>Subqueries are powerful, but they nest inside out: to read
    <code>SELECT AVG(total) FROM (SELECT … GROUP BY …) AS t</code> you start in the middle. A
    <strong>common table expression</strong> (CTE) lets you pull that inner query out to the top,
    give it a name, and then use it like a table.</p>

    <p class="syntax-caption">A common table expression</p>
    <pre class="syntax">WITH name AS (
    SELECT …
)
SELECT …
FROM name;</pre>

    <p>The query inside <code>WITH</code> isn't stored anywhere; the name exists only for this one
    statement. Anything you could write as a subquery in <code>FROM</code>, you can write as a CTE, and
    the result is the same. The difference is readability: the steps now read top to bottom.</p>

    <h3>Several steps in a row</h3>
    <p>Separate multiple CTEs with commas. Each one can use the ones defined before it, so a complex
    question becomes a short pipeline of simple steps:</p>
    <pre class="syntax">WITH step1 AS (SELECT …),
     step2 AS (SELECT … FROM step1)
SELECT … FROM step2;</pre>
    <p>A CTE can also be used more than once, in <code>FROM</code>, in a subquery, or both, without
    repeating its query.</p>

    <h3>Recursive CTEs</h3>
    <p>A <code>WITH RECURSIVE</code> CTE can refer to <em>itself</em>. That lets SQL follow a chain of
    unknown length, like "my manager, my manager's manager, …". It always has two parts joined by
    <code>UNION ALL</code>:</p>
    <pre class="syntax">WITH RECURSIVE name(columns) AS (
    SELECT …                  -- anchor: the starting row(s)
    UNION ALL
    SELECT … FROM name …      -- step: new rows built from the previous ones
    WHERE stop_condition
)
SELECT … FROM name;</pre>
    <p>The database runs the anchor once, then keeps running the step on the rows it produced last
    time, until the step returns no rows. A simple counter shows the idea:
    <code>WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x &lt; 3) SELECT x FROM n</code>
    returns 1, 2, 3.</p>

    <div class="note"><strong>Always give it a way to stop.</strong> If the step never runs out of
    rows, the query runs forever. Here it would be stopped after 2 seconds.</div>

    <h3>Following the manager chain</h3>
    <p>Each employee's <code>manager_id</code> holds the <code>id</code> of another employee. To climb
    the chain, the step needs two tables at once: the rows found so far, and <code>employees</code> to
    look up the next manager. List both in <code>FROM</code> with a comma, and match them in
    <code>WHERE</code>:</p>
    <pre class="syntax">SELECT e.id, e.name, e.manager_id, c.level + 1
FROM chain c, employees e
WHERE e.id = c.manager_id</pre>
    <table class="ref">
      <thead><tr><th>Round</th><th>Row produced</th><th>Its manager_id</th></tr></thead>
      <tbody>
        <tr><td>anchor</td><td>the starting employee's manager, level 1</td><td>points one level up</td></tr>
        <tr><td>step 1</td><td>that person's manager, level 2</td><td>points one level up</td></tr>
        <tr><td>…</td><td>…</td><td><code>NULL</code> at the top: the next step finds no row, so it stops</td></tr>
      </tbody>
    </table>

    <h3>Exercise</h3>
    <p>The first four tasks can all be solved with subqueries you already know. Here, write them with
    <code>WITH</code> instead and notice how they read. The last two need <code>WITH RECURSIVE</code>.</p>
  `,
  tasks: [
    {
      prompt: 'Using a CTE named <code>totals</code> that holds each employee\'s total sales, find the <strong>average</strong> of those totals.',
      hint: 'Move the derived table from the last task of lesson 3 into WITH totals AS ( … ), then SELECT AVG(total) FROM totals.',
      solution: 'WITH totals AS (SELECT employee_id, SUM(amount) AS total FROM sales GROUP BY employee_id) SELECT AVG(total) FROM totals;',
      check: { requires: ['WITH'] },
    },
    {
      prompt: 'With a CTE of each department\'s average salary, show the <code>department_id</code> and average of every department whose average is above the <strong>company</strong> average.',
      hint: 'Group employees by department_id in the CTE, then filter it with WHERE avg_salary > (SELECT AVG(salary) FROM employees).',
      solution: 'WITH dept_avg AS (SELECT department_id, AVG(salary) AS avg_salary FROM employees GROUP BY department_id) SELECT department_id, avg_salary FROM dept_avg WHERE avg_salary > (SELECT AVG(salary) FROM employees);',
      check: { requires: ['WITH'] },
    },
    {
      prompt: 'Using CTEs, show the <code>employee_id</code> and total sales of the employee with the <strong>highest</strong> total.',
      hint: 'Build totals first, then a second CTE (or a subquery) with MAX(total), and keep the totals row that matches it.',
      solution: 'WITH totals AS (SELECT employee_id, SUM(amount) AS total FROM sales GROUP BY employee_id), best AS (SELECT MAX(total) AS top FROM totals) SELECT employee_id, total FROM totals WHERE total = (SELECT top FROM best);',
      check: { requires: ['WITH'] },
    },
    {
      prompt: 'With a CTE listing the <code>employee_id</code>s whose sales add up to more than <strong>30000</strong>, show those employees\' <code>name</code>s.',
      hint: 'The CTE is a GROUP BY … HAVING query on sales. The outer query reads employees WHERE id IN (SELECT employee_id FROM your_cte).',
      solution: 'WITH big_sellers AS (SELECT employee_id FROM sales GROUP BY employee_id HAVING SUM(amount) > 30000) SELECT name FROM employees WHERE id IN (SELECT employee_id FROM big_sellers);',
      check: { requires: ['WITH'] },
    },
    {
      prompt: 'Warm-up: with a recursive CTE, list the numbers from <strong>1 to 10</strong>.',
      hint: 'Start with SELECT 1, step with SELECT x + 1 FROM n WHERE x < 10.',
      solution: 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 10) SELECT x FROM n;',
      check: { requires: ['WITH RECURSIVE'] },
    },
    {
      prompt: 'Show everyone in <strong>Eva Horvath</strong>\'s management chain: her manager, her manager\'s manager, and so on up to the top. Show each person\'s <code>name</code> and <code>level</code> (1 = her direct manager).',
      hint: 'Anchor: the employee whose id is Eva\'s manager_id, with level 1. Step: FROM chain c, employees e WHERE e.id = c.manager_id, with c.level + 1.',
      solution: `WITH RECURSIVE chain(id, name, manager_id, level) AS (
  SELECT id, name, manager_id, 1 FROM employees
  WHERE id = (SELECT manager_id FROM employees WHERE name = 'Eva Horvath')
  UNION ALL
  SELECT e.id, e.name, e.manager_id, c.level + 1
  FROM chain c, employees e
  WHERE e.id = c.manager_id
)
SELECT name, level FROM chain;`,
      check: { requires: ['WITH RECURSIVE'] },
    },
  ],
};
