// Chapter and lesson order for the sidebar. Lessons without `tasks` show as "coming soon";
// a chapter with no playable lessons shows as "coming soon" too.
import aggregates from './aggregates.js';
import groupByHaving from './group-by-having.js';
import subqueries from './subqueries.js';
import correlatedSubqueries from './correlated-subqueries.js';
import ctes from './ctes.js';
import notNullDefault from './not-null-default.js';
import primaryKeyUnique from './primary-key-unique.js';
import checkConstraints from './check-constraints.js';
import foreignKeys from './foreign-keys.js';
import referentialActions from './referential-actions.js';
import conflictHandling from './conflict-handling.js';

const soon = (id, title) => ({ id, title });

export const chapters = [
  {
    id: 'querying',
    title: 'Aggregates, subqueries and CTEs',
    lessons: [aggregates, groupByHaving, subqueries, correlatedSubqueries, ctes],
  },
  {
    id: 'constraints',
    title: 'Database constraints',
    lessons: [notNullDefault, primaryKeyUnique, checkConstraints, foreignKeys, referentialActions, conflictHandling],
  },
  {
    id: 'sets-and-joins',
    title: 'Set operators and joins',
    lessons: [
      soon('set-operators', 'Set operators'),
      soon('union', 'UNION and UNION ALL'),
      soon('join-concepts', 'Join concepts'),
      soon('inner-joins', 'Inner joins'),
      soon('outer-joins', 'Outer joins'),
      soon('cross-joins', 'Cross joins'),
      soon('self-joins', 'Self joins'),
    ],
  },
  {
    id: 'window-functions',
    title: 'Window functions',
    lessons: [
      soon('window-aggregates', 'Window aggregate functions'),
      soon('ranking-functions', 'Ranking functions'),
      soon('statistical-functions', 'Statistical functions'),
      soon('offset-functions', 'Offset functions'),
      soon('top-n-and-paging', 'Top N per group and paging'),
      soon('running-totals', 'Running totals'),
      soon('gaps-and-islands', 'Gaps and islands'),
    ],
  },
];

// Flat list in reading order, for code that doesn't care about chapters.
export const lessons = chapters.flatMap((c) => c.lessons);
