// Compares a learner's result with the reference solution's result.
// results = [userMain, refMain, userShadow, refShadow]
export function checkTask(task, userSql, [userMain, refMain, userShadow, refShadow]) {
  const opts = { ordered: false, decimals: 2, requires: [], forbids: [], ...task.check };

  if (userMain.error) return { ok: false, message: userMain.error };
  if (refMain.error) return { ok: false, message: `Lesson bug: reference solution failed (${refMain.error}).` };

  const diff = compareResults(userMain, refMain, opts);
  if (diff) return { ok: false, message: diff };

  const concept = conceptProblem(userSql, opts);
  if (concept) return { ok: false, nearly: true, message: concept };

  if (userShadow.error || compareResults(userShadow, refShadow, opts)) {
    return {
      ok: false,
      nearly: true,
      message: 'This matches the data shown, but would give a wrong answer on different data. Avoid hard-coding values.',
    };
  }
  return { ok: true };
}

export function compareResults(user, ref, opts) {
  const n = ref.columns.length;
  const m = user.columns.length;
  if (m !== n) return `Expected ${plural(n, 'column')}, but your query returns ${m}.`;
  if (user.values.length !== ref.values.length) {
    return `Expected ${plural(ref.values.length, 'row')}, but your query returns ${user.values.length}.`;
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
