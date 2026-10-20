// Chapter and lesson order for the sidebar. Lessons without `tasks` show as "coming soon";
// a chapter with no playable lessons shows as "coming soon" too.
import aggregates from './aggregates.js';
import groupByHaving from './group-by-having.js';
import subqueries from './subqueries.js';
import correlatedSubqueries from './correlated-subqueries.js';
import ctes from './ctes.js';

export const chapters = [
  {
    id: 'querying',
    title: 'Aggregates, subqueries and CTEs',
    lessons: [aggregates, groupByHaving, subqueries, correlatedSubqueries, ctes],
  },
  { id: 'constraints', title: 'Database constraints', lessons: [] },
];

// Flat list in reading order, for code that doesn't care about chapters.
export const lessons = chapters.flatMap((c) => c.lessons);
