// Lesson format: see aggregates.js.
export default {
  id: 'group-by-having',
  title: 'Subgroups: GROUP BY and HAVING',
  tables: ['employees', 'sales', 'departments'],
  starterSql: 'SELECT * FROM employees;',
  body: `
    <p>In the last lesson every aggregate collapsed the <em>whole</em> table into one row. Often you
    want one answer <strong>per group</strong> instead: the head count of each department, the total
    sales of each region. <code>GROUP BY</code> does exactly that.</p>

    <p class="syntax-caption">Aggregating per group</p>
    <pre class="syntax">SELECT group_column, AGG_FUNC(column) AS alias, …
FROM mytable
WHERE condition
GROUP BY group_column;</pre>

    <p><code>GROUP BY</code> splits the rows into groups that share the same value in the grouping
    column, then runs each aggregate once per group. The result has one row per group.
    <code>SELECT role, COUNT(*) FROM employees GROUP BY role</code> returns one row for every role,
    with the number of people in it.</p>

    <div class="note"><strong>Select only what you group by.</strong> Every column in the
    <code>SELECT</code> list should either appear in <code>GROUP BY</code> or sit inside an aggregate.
    If you select <code>name</code> while grouping by <code>role</code>, which of the many names
    should the row show? Most databases reject such a query. SQLite quietly picks one, which is
    almost never what you want.</div>

    <h3>Filtering groups with HAVING</h3>
    <p><code>WHERE</code> filters individual rows <em>before</em> they are grouped, so it can't see
    aggregate values like <code>COUNT(*)</code>. To keep or drop whole groups based on their aggregate,
    use <code>HAVING</code>, which runs <em>after</em> grouping.</p>

    <p class="syntax-caption">Filtering groups</p>
    <pre class="syntax">SELECT group_column, AGG_FUNC(column)
FROM mytable
WHERE row_condition
GROUP BY group_column
HAVING group_condition;</pre>

    <h3>The order SQL thinks in</h3>
    <p>You write the clauses in one order, but the database evaluates them in another. Keeping this
    order in mind explains most GROUP BY puzzles:</p>
    <table class="ref">
      <thead><tr><th>Step</th><th>Clause</th><th>What happens</th></tr></thead>
      <tbody>
        <tr><td>1</td><td><code>FROM</code></td><td>pick the table</td></tr>
        <tr><td>2</td><td><code>WHERE</code></td><td>drop rows you don't need</td></tr>
        <tr><td>3</td><td><code>GROUP BY</code></td><td>form groups from the remaining rows</td></tr>
        <tr><td>4</td><td><code>HAVING</code></td><td>drop groups you don't need</td></tr>
        <tr><td>5</td><td><code>SELECT</code></td><td>compute the output columns</td></tr>
        <tr><td>6</td><td><code>ORDER BY</code></td><td>sort the output rows</td></tr>
      </tbody>
    </table>

    <h3>Exercise</h3>
    <p>We're back with the <code>employees</code> and <code>sales</code> tables. Each employee's
    <code>department_id</code> points to a row in <code>departments</code>. Grouping by the id is
    enough for these tasks, so you won't need a join.</p>
  `,
  tasks: [
    {
      prompt: 'Show each <code>department_id</code> with the number of employees in it.',
      hint: 'GROUP BY department_id, and COUNT(*) per group.',
      solution: 'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id;',
      check: { requires: ['GROUP BY'] },
    },
    {
      prompt: 'Show each <code>role</code> with its average salary, highest average first.',
      hint: 'Group by role, then ORDER BY the same AVG(...) expression (or its alias) with DESC.',
      solution: 'SELECT role, AVG(salary) FROM employees GROUP BY role ORDER BY AVG(salary) DESC;',
      check: { requires: ['GROUP BY'], ordered: true },
    },
    {
      prompt: 'For each <code>region</code> in <code>sales</code>, show the number of sales and the total amount sold.',
      hint: 'Two aggregates in one SELECT, grouped by region.',
      solution: 'SELECT region, COUNT(*), SUM(amount) FROM sales GROUP BY region;',
      check: { requires: ['GROUP BY'] },
    },
    {
      prompt: 'Show the <code>department_id</code> and head count of departments with <strong>more than 3</strong> employees.',
      hint: 'Same as task 1, plus HAVING COUNT(*) > 3.',
      solution: 'SELECT department_id, COUNT(*) FROM employees GROUP BY department_id HAVING COUNT(*) > 3;',
      check: { requires: ['GROUP BY', 'HAVING'] },
    },
    {
      prompt: 'Show the <code>employee_id</code> and total sales of every employee whose sales add up to <strong>more than 30000</strong>.',
      hint: 'Group sales by employee_id, then filter the groups on SUM(amount).',
      solution: 'SELECT employee_id, SUM(amount) FROM sales GROUP BY employee_id HAVING SUM(amount) > 30000;',
      check: { requires: ['GROUP BY', 'HAVING'] },
    },
    {
      prompt: 'Considering only employees hired <strong>before 2020</strong>, show each <code>department_id</code> with its average salary, keeping only departments where that average is <strong>above 6000</strong>.',
      hint: 'The hire-year condition is about rows (WHERE); the average condition is about groups (HAVING).',
      solution: 'SELECT department_id, AVG(salary) FROM employees WHERE hire_year < 2020 GROUP BY department_id HAVING AVG(salary) > 6000;',
      check: { requires: ['WHERE', 'GROUP BY', 'HAVING'] },
    },
  ],
};
