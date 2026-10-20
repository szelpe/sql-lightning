// Checks a learner's statements for one task. A task is checked in one of three ways:
//   - query tasks: the learner's result must match the reference solution's result,
//     on the visible data (user/ref) and on the shadow data (userShadow/refShadow);
//   - `afterQuery` tasks: after running the learner's and the solution's statements,
//     the afterQuery's results must match (for INSERT/UPDATE/DELETE);
//   - `tests` tasks: each test statement runs after the learner's SQL and must succeed,
//     or be rejected by the named constraint (for CREATE TABLE).
// `user.after` holds the afterQuery result first (if any), then one result per test.
export function checkTask(task, userSql, { user, ref, userShadow, refShadow }) {
  const opts = { ordered: false, decimals: 2, requires: [], forbids: [], ...task.check };
  if (user.error) return { ok: false, message: user.error };

  const after = user.after || [];
  const tests = (task.tests || []).map((test, i) => evaluateTest(test, after[i + (task.afterQuery ? 1 : 0)], opts));
  const failed = tests.find((t) => !t.passed);
  if (failed) return { ok: false, message: failed.message, tests };

  if (task.afterQuery) {
    if (ref.error) return { ok: false, message: `Lesson bug: reference solution failed (${ref.error}).`, tests };
    const diff = compareResults(after[0], ref.after[0], opts, 'the table has');
    if (diff) return { ok: false, message: `After your statements, the table isn't as expected. ${diff}`, tests };
  } else if (!tests.length) {
    if (ref.error) return { ok: false, message: `Lesson bug: reference solution failed (${ref.error}).` };
    const diff = compareResults(user, ref, opts);
    if (diff) return { ok: false, message: diff };
  }

  const concept = conceptProblem(userSql, opts);
  if (concept) return { ok: false, nearly: true, message: concept, tests };

  if (userShadow && (userShadow.error || compareResults(userShadow, refShadow, opts))) {
    return {
      ok: false,
      nearly: true,
      message: 'This matches the data shown, but would give a wrong answer on different data. Avoid hard-coding values.',
    };
  }
  return { ok: true, tests };
}

// test: { label, sql, expect?: 'ok' | 'NOT NULL' | 'UNIQUE' | 'CHECK' | 'FOREIGN KEY', rows? }
// `rows` (only with expect 'ok') is the exact result the test query must return.
function evaluateTest(test, res, opts) {
  const expect = test.expect || 'ok';
  const result = (passed, message) => ({ label: test.label, expect, passed, message });
  if (!res) return result(false, `"${test.label}" didn't run.`);

  if (expect === 'ok') {
    if (res.error) return result(false, `"${test.label}" should work, but failed: ${res.error}`);
    if (test.rows) {
      const got = res.values.map((row) => rowKey(row, opts)).join();
      const want = test.rows.map((row) => rowKey(row, opts)).join();
      if (got !== want) {
        return result(false, `"${test.label}": expected ${formatRows(test.rows)}, got ${formatRows(res.values)}.`);
      }
    }
    return result(true);
  }

  if (!res.error) return result(false, `"${test.label}" should be rejected, but the database accepted it.`);
  if (!/constraint failed/i.test(res.error)) {
    return result(false, `"${test.label}" failed, but not because of a constraint: ${res.error}`);
  }
  if (!res.error.toUpperCase().startsWith(`${expect} CONSTRAINT`)) {
    return result(false, `"${test.label}" was rejected by the wrong rule (${res.error}). Expected a ${expect} constraint.`);
  }
  return result(true);
}

function formatRows(rows) {
  if (!rows.length) return 'no rows';
  return rows.map((row) => row.map((v) => (v === null ? 'NULL' : String(v))).join(', ')).join(' / ');
}

export function compareResults(user, ref, opts, actual = 'your query returns') {
  const n = ref.columns.length;
  const m = user.columns.length;
  if (m !== n) return `Expected ${plural(n, 'column')}, but ${actual} ${m}.`;
  if (user.values.length !== ref.values.length) {
    return `Expected ${plural(ref.values.length, 'row')}, but ${actual} ${user.values.length}.`;
  }

  const order = opts.columnOrder ? ref.columns.map((_c, i) => i) : matchColumns(user, ref, opts);
  const userKeys = user.values.map((row) => rowKey(order.map((i) => row[i]), opts));
  const refKeys = ref.values.map((row) => rowKey(row, opts));
  if (opts.ordered && userKeys.every((k, i) => k === refKeys[i])) return null;

  const sameRows = sameMultiset(userKeys, refKeys);
  if (opts.ordered && sameRows) return 'The right rows, but not in the requested order.';
  if (!sameRows) return 'The result has the right shape, but some values differ from the expected answer.';
  return null;
}

// Column order is free by default: for each reference column, pick the first unused user
// column holding the same values. Unmatched columns stay positional and fail the row check.
function matchColumns(user, ref, opts) {
  const signature = (result, col) => JSON.stringify(result.values.map((row) => normalize(row[col], opts)).sort());
  const userSigs = user.columns.map((_c, i) => signature(user, i));
  const used = new Set();
  const order = ref.columns.map((_c, i) => {
    const sig = signature(ref, i);
    const match = userSigs.findIndex((s, j) => s === sig && !used.has(j));
    if (match !== -1) used.add(match);
    return match;
  });
  const leftovers = user.columns.map((_c, j) => j).filter((j) => !used.has(j));
  return order.map((i) => (i === -1 ? leftovers.shift() : i));
}

function sameMultiset(a, b) {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((k, i) => k === sb[i]);
}

function rowKey(row, opts) {
  return JSON.stringify(row.map((v) => normalize(v, opts)));
}

function normalize(v, opts) {
  if (v === null) return null;
  if (typeof v === 'number') return Number(v.toFixed(opts.decimals));
  let s = String(v).trim();
  if (opts.ignoreCase) s = s.toLowerCase();
  return s;
}

// Requirements are checked on the SQL text with string literals and comments removed.
function conceptProblem(sql, opts) {
  const code = stripSql(sql);
  const missing = opts.requires.filter((kw) => !hasKeyword(code, kw));
  if (missing.length) return `Your result is right, but this task asks you to use ${list(missing)}.`;
  if (opts.requiresSubquery && (code.match(/\bSELECT\b/g) || []).length < 2) {
    return 'Your result is right, but this task asks you to use a subquery.';
  }
  const used = opts.forbids.filter((kw) => hasKeyword(code, kw));
  if (used.length) return `Your result is right, but try solving it without ${list(used)}.`;
  return null;
}

function stripSql(sql) {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function hasKeyword(code, kw) {
  const pattern = kw.toUpperCase().trim().split(/\s+/).join('\\s+');
  return new RegExp(`\\b${pattern}\\b`).test(code);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const list = (items) => items.map((s) => s.toUpperCase()).join(' and ');
