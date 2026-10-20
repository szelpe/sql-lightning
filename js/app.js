import { chapters, lessons } from './lessons/index.js';
import { SqlRunner } from './db.js';
import { checkTask } from './checker.js';
import * as progress from './progress.js';

const $ = (id) => document.getElementById(id);
const LIVE_RUN_DELAY_MS = 500;

const runner = new SqlRunner();
const dataReady = Promise.all([fetchText('data/seed.sql'), fetchText('data/shadow.sql')])
  .then(([seed, shadow]) => runner.load({ main: seed, shadow: `${seed}\n${shadow}` }));

const schemaCache = {}; // 'main' or a lesson id (for lessons with setupSql) -> table info
let lesson = null; // currently shown lesson
let runSeq = 0; // ignores results from runs that a newer run superseded
// The query that just solved a task. Until the learner edits it, re-running it shows that
// success instead of checking the same query against the next task.
let justSolved = null; // { sql, taskIndex, tests }
let liveTimer = null;

const editor = CodeMirror($('editor'), {
  mode: 'text/x-sqlite',
  lineWrapping: true,
  viewportMargin: Infinity,
  extraKeys: {
    'Ctrl-Enter': () => runQuery({ live: false }),
    'Cmd-Enter': () => runQuery({ live: false }),
  },
});
editor.on('change', (_cm, change) => {
  if (change.origin === 'setValue') return;
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => runQuery({ live: true }), LIVE_RUN_DELAY_MS);
});

$('run-query').addEventListener('click', () => runQuery({ live: false }));
$('reset-query').addEventListener('click', () => loadQuery(starterSql()));
$('show-hint').addEventListener('click', () => {
  const task = currentTask();
  if (!task) return;
  $('hint').textContent = task.hint;
  $('hint').hidden = false;
});
$('show-solution').addEventListener('click', () => {
  const task = currentTask();
  if (task) loadQuery(task.userSolution || task.solution);
});
$('reset-progress').addEventListener('click', () => {
  if (!confirm(`Clear your progress for "${lesson.title}"?`)) return;
  progress.resetLesson(lesson.id);
  justSolved = null;
  renderNav();
  renderTasks();
  renderTests(currentTask(), null);
  loadQuery(starterSql());
});
$('nav-toggle').addEventListener('click', () => {
  const open = $('sidebar').classList.toggle('open');
  $('nav-toggle').setAttribute('aria-expanded', String(open));
});

window.addEventListener('hashchange', route);
route();

// ---------- Routing and rendering ----------

function route() {
  const chapterId = location.hash.match(/^#\/chapter\/([\w-]+)/)?.[1];
  const chapterStart = chapters.find((c) => c.id === chapterId)?.lessons.find(isPlayable);
  if (chapterStart) {
    location.replace(`#/lesson/${chapterStart.id}`);
    return;
  }
  const id = location.hash.match(/^#\/lesson\/([\w-]+)/)?.[1];
  const target = lessons.find((l) => l.id === id && isPlayable(l));
  if (!target) {
    location.replace(`#/lesson/${lessons.find(isPlayable).id}`);
    return;
  }
  $('sidebar').classList.remove('open');
  showLesson(target);
}

function showLesson(next) {
  lesson = next;
  justSolved = null;
  const chapter = chapterOf(lesson);
  document.title = `${lesson.title} · SQL Lightning`;
  $('lesson-kicker').textContent =
    `Chapter ${chapterNumber(chapter)} · Lesson ${chapter.lessons.indexOf(lesson) + 1}`;
  $('lesson-title').textContent = lesson.title;
  $('lesson-body').innerHTML = lesson.body; // authored lesson content, not user input
  $('exercise').hidden = false;
  renderNav();
  renderTasks();
  renderSchema();
  renderTests(currentTask(), null);
  loadQuery(starterSql());
  window.scrollTo(0, 0);
}

function renderNav() {
  $('lesson-nav').replaceChildren(...chapters.map((chapter) => {
    const li = el('li', 'chapter');
    const head = el('div', 'chapter-head');
    head.append(el('span', 'chapter-title', `Chapter ${chapterNumber(chapter)} · ${chapter.title}`));
    const playable = chapter.lessons.filter(isPlayable);
    if (!playable.length) {
      li.classList.add('upcoming');
      head.append(el('span', 'badge', 'soon'));
    } else {
      const done = playable.filter(isComplete).length;
      const complete = done === playable.length;
      head.append(el('span', complete ? 'badge complete' : 'badge',
        complete ? '✓' : `${done}/${playable.length} lessons`));
    }
    const list = el('ol', 'chapter-lessons');
    list.append(...chapter.lessons.map((l, i) => renderNavLesson(l, `${i + 1}. ${l.title}`)));
    li.append(head, list);
    return li;
  }));
}

function renderNavLesson(l, label) {
  const li = document.createElement('li');
  if (!isPlayable(l)) {
    const span = el('span', 'soon', label);
    span.append(el('span', 'badge', 'soon'));
    li.append(span);
    return li;
  }
  const a = el('a', l === lesson ? 'current' : '', label);
  a.href = `#/lesson/${l.id}`;
  if (l === lesson) a.setAttribute('aria-current', 'page');
  const solved = Object.keys(progress.solvedTasks(l.id)).length;
  const complete = solved === l.tasks.length;
  a.append(el('span', complete ? 'badge complete' : 'badge', complete ? '✓' : `${solved}/${l.tasks.length}`));
  li.append(a);
  return li;
}

function renderTasks() {
  const solved = progress.solvedTasks(lesson.id);
  const active = activeTaskIndex();
  $('tasks').replaceChildren(...lesson.tasks.map((task, i) => {
    const li = document.createElement('li');
    li.innerHTML = task.prompt; // authored, may contain <code>
    if (solved[i] !== undefined) {
      li.className = 'solved';
      li.title = 'Click to load your solution';
      li.addEventListener('click', () => loadQuery(solved[i], { run: true }));
    } else if (i === active) {
      li.className = 'active';
    }
    return li;
  }));
  const done = active === -1;
  $('task-help').hidden = done;
  $('hint').hidden = true;
  $('lesson-done').hidden = !done;
  if (done) renderLessonDone();
}

function renderLessonDone() {
  const next = lessons.slice(lessons.indexOf(lesson) + 1).find(isPlayable);
  $('next-lesson').hidden = !next;
  if (next) $('next-lesson').href = `#/lesson/${next.id}`;

  const chapter = chapterOf(lesson);
  const rest = chapter.lessons.slice(chapter.lessons.indexOf(lesson) + 1);
  const msg = $('lesson-done').querySelector('p');
  if (rest.some(isPlayable)) {
    msg.replaceChildren(el('strong', '', 'Lesson complete!'));
    return;
  }
  msg.replaceChildren(el('strong', '', `Chapter ${chapterNumber(chapter)} complete!`));
  const nextChapter = chapters[chapters.indexOf(chapter) + 1];
  if (nextChapter) {
    const soon = nextChapter.lessons.some(isPlayable) ? '' : ' (coming soon)';
    msg.append(` Next up: Chapter ${chapterNumber(nextChapter)} · ${nextChapter.title}${soon}.`);
  } else {
    msg.append(rest.length ? ' More lessons are coming soon.' : " That's the last lesson.");
  }
}

async function renderSchema() {
  const box = $('schema');
  const shown = lesson;
  box.closest('.schema').hidden = !lesson.tables.length;
  const key = lesson.setupSql ? lesson.id : 'main';
  schemaCache[key] ||= await loadSchema(lesson.setupSql);
  if (lesson !== shown) return;
  box.replaceChildren(...lesson.tables.map((name) => {
    const info = schemaCache[key][name] || { columns: [], rows: 0 };
    const card = el('div', 'schema-table');

    const head = el('div', 'schema-head');
    const btn = el('button', 'schema-name', name);
    btn.type = 'button';
    btn.title = `Load SELECT * FROM ${name}`;
    btn.addEventListener('click', () => loadQuery(`SELECT * FROM ${name};`));
    head.append(btn, el('span', 'muted', `${info.rows} rows`));

    const table = document.createElement('table');
    const body = table.createTBody();
    for (const col of info.columns) {
      const tr = body.insertRow();
      const nameCell = el('td', 'col-name', col.name);
      if (col.pk) nameCell.append(el('span', 'key pk', 'PK'));
      if (col.ref) {
        const fk = el('span', 'key fk', `→ ${col.ref}`);
        fk.title = `References ${col.ref}`;
        nameCell.append(fk);
      }
      tr.append(nameCell, el('td', 'col-type', col.type.toLowerCase()));
    }
    card.append(head, table);
    return card;
  }));
}

// Columns, keys and row counts of every table, after an optional lesson setup script.
async function loadSchema(setup) {
  await dataReady;
  const [cols] = await runner.run([{
    dataset: 'main',
    setup,
    sql: `SELECT m.name, p.name, p.type, p.pk, f."table"
          FROM sqlite_master m
          JOIN pragma_table_info(m.name) p
          LEFT JOIN pragma_foreign_key_list(m.name) f ON f."from" = p.name
          WHERE m.type = 'table' ORDER BY m.name, p.cid`,
  }]);
  const schema = {};
  for (const [table, name, type, pk, ref] of cols.values || []) {
    (schema[table] ||= { columns: [], rows: 0 }).columns.push({ name, type, pk: !!pk, ref });
  }
  const tables = Object.keys(schema);
  if (tables.length) {
    const [counts] = await runner.run([{
      dataset: 'main',
      setup,
      sql: tables.map((t) => `SELECT '${t}', COUNT(*) FROM "${t}"`).join(' UNION ALL '),
    }]);
    for (const [table, n] of counts.values || []) schema[table].rows = n;
  }
  return schema;
}

// ---------- Running and checking ----------

function activeTaskIndex() {
  const solved = progress.solvedTasks(lesson.id);
  return lesson.tasks.findIndex((_t, i) => solved[i] === undefined);
}

function currentTask() {
  const i = activeTaskIndex();
  return i === -1 ? null : lesson.tasks[i];
}

// A task may bring its own starting point (e.g. a fresh table), otherwise the lesson's.
function starterSql() {
  return currentTask()?.starterSql ?? lesson.starterSql;
}

function loadQuery(sql, { run = true } = {}) {
  editor.setValue(sql);
  editor.focus();
  editor.setCursor(editor.lineCount(), 0);
  if (run) runQuery({ live: true });
}

async function runQuery({ live }) {
  clearTimeout(liveTimer);
  const sql = editor.getValue().trim();
  const seq = ++runSeq;
  if (!sql) {
    showResult(null);
    setFeedback('', '');
    return;
  }

  const showingSolved = justSolved?.sql === sql;
  if (!showingSolved) justSolved = null;
  const taskIndex = showingSolved ? -1 : activeTaskIndex();
  const task = taskIndex === -1 ? null : lesson.tasks[taskIndex];
  // Tasks can bring their own setup; without a task to check, use the one just finished.
  const context = task ?? lesson.tasks[justSolved?.taskIndex ?? lesson.tasks.length - 1];
  const runs = buildRuns(sql, task, context);

  let results;
  try {
    await dataReady;
    const keys = Object.keys(runs);
    const out = await runner.run(keys.map((k) => runs[k]));
    results = Object.fromEntries(keys.map((k, i) => [k, out[i]]));
  } catch (e) {
    if (seq === runSeq) setFeedback(e.message, 'err');
    return;
  }
  if (seq !== runSeq) return;

  const { user } = results;
  if (user.error) {
    // While typing, half-finished queries are expected; keep the last table and stay quiet.
    setFeedback(user.error, live ? 'soft' : 'err');
    renderTests(task, null);
    return;
  }
  if (!user.columns.length && task?.afterQuery) showResult(user.after[0], 'after your statements');
  else showResult(user);

  if (showingSolved) {
    showSolved();
    return;
  }
  if (!task) {
    setFeedback('', '');
    return;
  }
  const verdict = checkTask(task, sql, results);
  renderTests(task, verdict.tests);
  if (verdict.ok) {
    progress.markSolved(lesson.id, taskIndex, sql);
    justSolved = { sql, taskIndex, tests: verdict.tests };
    renderTasks();
    renderNav();
    const next = currentTask();
    if (next?.starterSql) {
      // The next task starts from new SQL, so there is nothing to keep showing.
      loadQuery(next.starterSql, { run: false });
      justSolved = null;
      renderTests(next, null);
      setFeedback(`✓ Task ${taskIndex + 1} solved. Task ${taskIndex + 2} starts from a fresh query.`, 'ok');
      return;
    }
    showSolved();
  } else if (live) {
    setFeedback('', '');
  } else {
    setFeedback(verdict.message, verdict.nearly ? 'warn' : 'err');
  }
}

// Which statements to run for one check: the learner's SQL, plus whatever the task's
// kind of check needs (see checker.js). Every run starts from a fresh copy of the data.
function buildRuns(sql, task, context) {
  const base = { dataset: 'main', foreignKeys: lesson.foreignKeys, setup: context?.setupSql ?? lesson.setupSql };
  const runs = { user: { ...base, sql } };
  if (!task) return runs;

  const afterQuery = task.afterQuery ? [task.afterQuery] : [];
  runs.user.after = [...afterQuery, ...(task.tests || []).map((t) => t.sql)];
  if (task.afterQuery) {
    runs.ref = { ...base, sql: task.solution, after: afterQuery };
  } else if (!task.tests) {
    runs.ref = { ...base, sql: task.solution };
    runs.userShadow = { ...base, sql, dataset: 'shadow' };
    runs.refShadow = { ...base, sql: task.solution, dataset: 'shadow' };
  }
  return runs;
}

function showSolved() {
  const { taskIndex, tests } = justSolved;
  renderTests(lesson.tasks[taskIndex], tests);
  const hasNext = activeTaskIndex() !== -1;
  setFeedback(hasNext
    ? `✓ Task ${taskIndex + 1} solved. Change your query to start task ${taskIndex + 2}.`
    : '✓ All tasks solved.', 'ok');
}

// Lists a task's test statements with their outcome; `outcomes` is null when they didn't run.
function renderTests(task, outcomes) {
  const box = $('tests');
  box.hidden = !task?.tests;
  if (!task?.tests) return;
  $('tests-title').textContent = `Checks for task ${lesson.tasks.indexOf(task) + 1}`;
  $('test-list').replaceChildren(...task.tests.map((test, i) => {
    const outcome = outcomes?.[i];
    const state = outcome ? (outcome.passed ? 'pass' : 'fail') : 'pending';
    const li = el('li', state);
    li.append(
      el('span', 'test-mark', { pass: '✓', fail: '✗', pending: '·' }[state]),
      el('span', 'test-label', test.label),
      el('span', 'test-expect', test.expect && test.expect !== 'ok' ? `rejected (${test.expect})` : 'works'),
    );
    return li;
  }));
}

function showResult(result, note = '') {
  const wrap = $('results');
  if (!result) {
    wrap.replaceChildren();
    $('result-meta').textContent = '';
    return;
  }
  if (!result.columns.length) {
    wrap.replaceChildren(el('p', 'muted', 'The statements ran successfully. They returned no rows to show.'));
    $('result-meta').textContent = '';
    return;
  }
  const table = document.createElement('table');
  const head = table.createTHead().insertRow();
  for (const c of result.columns) head.append(el('th', '', c));
  const body = table.createTBody();
  for (const row of result.values) {
    const tr = body.insertRow();
    for (const v of row) {
      if (v === null) tr.append(el('td', 'null', 'NULL'));
      else tr.append(el('td', typeof v === 'number' ? 'num' : '', formatValue(v)));
    }
  }
  wrap.replaceChildren(table);
  const n = result.values.length;
  $('result-meta').textContent = `${note ? `${note} · ` : ''}${n} row${n === 1 ? '' : 's'}`;
}

function formatValue(v) {
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Number(v.toFixed(4)));
  return String(v);
}

function setFeedback(text, kind) {
  const box = $('feedback');
  box.textContent = text;
  box.className = `feedback ${kind}`;
}

// ---------- Helpers ----------

function isPlayable(l) {
  return Boolean(l.tasks);
}

function isComplete(l) {
  return Object.keys(progress.solvedTasks(l.id)).length === l.tasks.length;
}

function chapterOf(l) {
  return chapters.find((c) => c.lessons.includes(l));
}

function chapterNumber(chapter) {
  return chapters.indexOf(chapter) + 1;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  return res.text();
}
