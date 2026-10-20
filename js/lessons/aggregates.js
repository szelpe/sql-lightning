// Lesson format:
//   body        HTML explanation shown above the exercise
//   tables      tables listed in the schema panel
//   starterSql  query loaded into the editor at start and on Reset
//   tasks[]     prompt (HTML), hint, solution (used for checking and "Show solution"),
//               check: { ordered, columnOrder, decimals, requires, forbids, requiresSubquery, ignoreCase }
export default {
  id: 'aggregates',
  title: 'Aggregate functions',
  tables: ['employees', 'sales'],
  starterSql: 'SELECT * FROM employees;',
  body: `
    <p>So far every query has returned one output row per matching input row. <strong>Aggregate
    functions</strong> work differently: they look at <em>all</em> the matching rows and squeeze them
    into a single value, such as a count, a total or an average.</p>

    <p class="syntax-caption">Aggregate functions in a query</p>
    <pre class="syntax">SELECT AGG_FUNC(column) AS alias, …
FROM mytable
WHERE condition;</pre>

    <h3>The five core functions</h3>
    <table class="ref">
      <thead><tr><th>Function</th><th>Returns</th></tr></thead>
      <tbody>
        <tr><td><code>COUNT(*)</code></td><td>the number of rows</td></tr>
        <tr><td><code>COUNT(column)</code></td><td>the number of rows where <code>column</code> is not <code>NULL</code></td></tr>
        <tr><td><code>SUM(column)</code></td><td>the total of all values</td></tr>
        <tr><td><code>AVG(column)</code></td><td>the average (mean) value</td></tr>
        <tr><td><code>MIN(column)</code> / <code>MAX(column)</code></td><td>the smallest / largest value</td></tr>
      </tbody>
    </table>

    <p>You can put several aggregates in one <code>SELECT</code>, and give each one a readable
    column name with <code>AS</code>: <code>SELECT MIN(salary) AS lowest, MAX(salary) AS highest FROM employees</code>.</p>

    <h3>NULLs are skipped</h3>
    <p>Every aggregate except <code>COUNT(*)</code> ignores <code>NULL</code> values. That makes
    <code>COUNT(*)</code> and <code>COUNT(bonus)</code> answer different questions: "how many
    employees?" versus "how many employees have a bonus?"</p>

    <h3>Counting distinct values</h3>
    <p><code>COUNT(DISTINCT column)</code> counts each different value once, so
    <code>COUNT(DISTINCT city)</code> tells you how many cities appear, not how many rows mention one.</p>

    <div class="note"><strong>WHERE runs first.</strong> Rows are filtered by <code>WHERE</code>
    <em>before</em> they are aggregated, so <code>SELECT SUM(amount) FROM sales WHERE region = 'North'</code>
    adds up only the northern sales.</div>

    <h3>Exercise</h3>
    <p>The <code>employees</code> table lists everyone at a small company, with their monthly
    <code>salary</code> and yearly <code>bonus</code>. The <code>sales</code> table records each deal a
    sales person closed. Solve the tasks on the right; your query runs as you type, and
    <kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs it with detailed feedback.</p>
  `,
  tasks: [
    {
      prompt: 'How many employees are there?',
      hint: 'COUNT(*) counts rows.',
      solution: 'SELECT COUNT(*) FROM employees;',
      check: { requires: ['COUNT'] },
    },
    {
      prompt: 'Find the <strong>total</strong> and the <strong>average</strong> monthly salary of all employees.',
      hint: 'Use SUM and AVG in the same SELECT, separated by a comma.',
      solution: 'SELECT SUM(salary), AVG(salary) FROM employees;',
      check: { requires: ['SUM', 'AVG'] },
    },
    {
      prompt: 'Find the earliest and the latest <code>hire_year</code>.',
      hint: 'MIN and MAX work on any column that can be ordered.',
      solution: 'SELECT MIN(hire_year), MAX(hire_year) FROM employees;',
      check: { requires: ['MIN', 'MAX'] },
    },
    {
      prompt: 'Show the number of employees, and next to it the number of employees who have a bonus.',
      hint: 'COUNT(*) counts every row; COUNT(bonus) skips rows where bonus is NULL.',
      solution: 'SELECT COUNT(*), COUNT(bonus) FROM employees;',
      check: { requires: ['COUNT'] },
    },
    {
      prompt: 'How many different <code>role</code>s exist in the company?',
      hint: 'Put DISTINCT inside COUNT( ).',
      solution: 'SELECT COUNT(DISTINCT role) FROM employees;',
      check: { requires: ['COUNT', 'DISTINCT'] },
    },
    {
      prompt: 'In the <code>sales</code> table, find the biggest single sale and the total amount sold in the <code>East</code> region.',
      hint: "Filter with WHERE region = 'East' first, then aggregate.",
      solution: "SELECT MAX(amount), SUM(amount) FROM sales WHERE region = 'East';",
      check: { requires: ['WHERE'] },
    },
  ],
};
