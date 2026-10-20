// Lesson format: see aggregates.js.
export default {
  id: 'correlated-subqueries',
  title: 'Correlated subqueries',
  tables: ['employees', 'departments', 'sales'],
  starterSql: 'SELECT * FROM employees;',
  body: `
    <p>In the last lesson, "who earns more than average?" compared everyone with <em>one</em> number:
    the company average. But what about "who earns more than the average <em>of their own
    department</em>?" Now the number to compare with is different for every employee. The subquery
    has to know which employee it is being asked about.</p>

    <p>A <strong>correlated subquery</strong> does exactly that: it refers to a column of the
    <em>outer</em> query's current row.</p>

    <p class="syntax-caption">A correlated subquery</p>
    <pre class="syntax">SELECT name, salary
FROM employees AS e
WHERE salary &gt; (SELECT AVG(salary)
                FROM employees AS e2
                WHERE e2.department_id = e.department_id);</pre>

    <p>Both queries read from <code>employees</code>, so each copy gets its own alias. Inside the
    subquery, <code>e2</code> means "the rows being averaged", and <code>e</code> means "the employee
    the outer query is currently looking at".</p>

    <h3>One subquery per row</h3>
    <p>A plain subquery runs once. A correlated one conceptually runs again <strong>for every row</strong>
    of the outer query, each time with that row's values plugged in:</p>
    <table class="ref">
      <thead><tr><th>Outer row (<code>e</code>)</th><th>Inner query becomes</th><th>Result</th><th>Kept?</th></tr></thead>
      <tbody>
        <tr><td>Anna, dept 1, 9200</td><td><code>… WHERE e2.department_id = 1</code></td><td>7220</td><td>yes</td></tr>
        <tr><td>Clara, dept 1, 6900</td><td><code>… WHERE e2.department_id = 1</code></td><td>7220</td><td>no</td></tr>
        <tr><td>Ilona, dept 2, 6100</td><td><code>… WHERE e2.department_id = 2</code></td><td>5880</td><td>yes</td></tr>
        <tr><td>…</td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
    <p>Notice Clara: she earns more than the company average, so lesson 3's query kept her, but less
    than her own department's average, so this one drops her.</p>

    <h3>EXISTS and NOT EXISTS</h3>
    <p><code>EXISTS (subquery)</code> is true when the subquery returns at least one row, and
    <code>NOT EXISTS</code> when it returns none. The columns it returns don't matter, which is why
    people usually write <code>SELECT 1</code>. EXISTS is almost always correlated: "does this employee
    have <em>any</em> sale over 15000?"</p>

    <p class="syntax-caption">Checking whether related rows exist</p>
    <pre class="syntax">SELECT column, …
FROM mytable AS t
WHERE EXISTS (SELECT 1 FROM othertable AS o
              WHERE o.t_id = t.id AND condition);</pre>

    <div class="note"><strong>NOT EXISTS is the safe NOT IN.</strong> NULLs in the inner table can't
    make it return nothing, so it is the usual way to find rows with no match.</div>

    <h3>Correlated subqueries as columns</h3>
    <p>A correlated subquery in <code>SELECT</code> computes a value per row, such as
    <code>(SELECT COUNT(*) FROM sales s WHERE s.employee_id = e.id)</code> for each employee's number
    of sales. Unlike a <code>GROUP BY</code>, this keeps employees who have no sales at all: their count
    is simply 0.</p>

    <h3>Exercise</h3>
    <p>Same three tables as before. Give every table an alias and qualify the columns
    (<code>e.department_id</code>, <code>s.employee_id</code>, …) so it's clear which row each one
    comes from. As in lesson 3, no joins are needed.</p>
  `,
  tasks: [
    {
      prompt: 'Show the <code>name</code>, <code>department_id</code> and <code>salary</code> of every employee who earns more than the average salary of <strong>their own department</strong>.',
      hint: 'Use the query from the explanation: compare salary with the AVG of employees e2 where e2.department_id = e.department_id.',
      solution: 'SELECT name, department_id, salary FROM employees e WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.department_id = e.department_id);',
      check: { requiresSubquery: true },
    },
    {
      prompt: 'For every employee in department <code>2</code> (Sales), show their <code>name</code> and how many sales they made.',
      hint: 'Add a column (SELECT COUNT(*) FROM sales s WHERE s.employee_id = e.id) and filter the outer query on department_id = 2.',
      solution: 'SELECT name, (SELECT COUNT(*) FROM sales s WHERE s.employee_id = e.id) FROM employees e WHERE department_id = 2;',
      check: { requiresSubquery: true, forbids: ['JOIN'] },
    },
    {
      prompt: 'Using <code>EXISTS</code>, show the <code>name</code> of every employee who made at least one sale of <strong>15000 or more</strong>.',
      hint: 'WHERE EXISTS (SELECT 1 FROM sales s WHERE s.employee_id = e.id AND s.amount >= 15000).',
      solution: 'SELECT name FROM employees e WHERE EXISTS (SELECT 1 FROM sales s WHERE s.employee_id = e.id AND s.amount >= 15000);',
      check: { requiresSubquery: true, requires: ['EXISTS'] },
    },
    {
      prompt: 'Show the <code>name</code> of every department that has <strong>no</strong> employees.',
      hint: 'Query departments d, and keep those where NOT EXISTS an employee with e.department_id = d.id.',
      solution: 'SELECT name FROM departments d WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.department_id = d.id);',
      check: { requiresSubquery: true, requires: ['NOT EXISTS'] },
    },
    {
      prompt: 'For every sales person, show their largest sale: <code>employee_id</code>, <code>region</code> and <code>amount</code>.',
      hint: 'Keep a sale s when its amount equals the MAX(amount) of sales s2 by the same employee.',
      solution: 'SELECT employee_id, region, amount FROM sales s WHERE amount = (SELECT MAX(amount) FROM sales s2 WHERE s2.employee_id = s.employee_id);',
      check: { requiresSubquery: true },
    },
    {
      prompt: 'Show the <code>name</code> of every employee who was hired <strong>before their own manager</strong>.',
      hint: 'manager_id points to another row of employees. Compare e.hire_year with the hire_year of the employee m where m.id = e.manager_id.',
      solution: 'SELECT name FROM employees e WHERE hire_year < (SELECT m.hire_year FROM employees m WHERE m.id = e.manager_id);',
      check: { requiresSubquery: true, forbids: ['JOIN'] },
    },
  ],
};
