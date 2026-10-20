-- Sample dataset for SQL Lightning lessons: a small fictional company.
-- Supports: aggregates, GROUP BY / HAVING, subqueries, correlated subqueries.
-- Deliberate edge cases: a department with no employees (Legal),
-- an employee with no sales (several), NULL bonus values, NULL manager_id.

CREATE TABLE departments (
    id       INTEGER PRIMARY KEY,
    name     TEXT NOT NULL,
    city     TEXT NOT NULL,
    budget   INTEGER NOT NULL
);

CREATE TABLE employees (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    role          TEXT NOT NULL,
    salary        INTEGER NOT NULL,
    bonus         INTEGER,            -- NULL = no bonus this year
    hire_year     INTEGER NOT NULL,
    manager_id    INTEGER REFERENCES employees(id)
);

CREATE TABLE sales (
    id          INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    region      TEXT NOT NULL,
    sale_month  TEXT NOT NULL,        -- 'YYYY-MM'
    amount      INTEGER NOT NULL
);

INSERT INTO departments VALUES
 (1, 'Engineering', 'Budapest', 900000),
 (2, 'Sales',       'Vienna',   500000),
 (3, 'Marketing',   'Vienna',   300000),
 (4, 'Support',     'Budapest', 250000),
 (5, 'Legal',       'Prague',   150000);

INSERT INTO employees VALUES
 ( 1, 'Anna Kovacs',    1, 'Manager',   9200, 1500, 2015, NULL),
 ( 2, 'Bence Toth',     1, 'Engineer',  7400,  800, 2018,    1),
 ( 3, 'Clara Nagy',     1, 'Engineer',  6900, NULL, 2020,    1),
 ( 4, 'David Szabo',    1, 'Engineer',  8100, 1000, 2016,    1),
 ( 5, 'Eva Horvath',    1, 'Intern',    4500, NULL, 2024,    2),
 ( 6, 'Ferenc Varga',   2, 'Manager',   8800, 2000, 2014, NULL),
 ( 7, 'Greta Kiss',     2, 'Sales Rep', 5200, 1200, 2019,    6),
 ( 8, 'Hugo Molnar',    2, 'Sales Rep', 4800,  600, 2021,    6),
 ( 9, 'Ilona Farkas',   2, 'Sales Rep', 6100, 1800, 2013,    6),
 (10, 'Janos Balogh',   2, 'Sales Rep', 4500, NULL, 2023,    6),
 (11, 'Kata Papp',      3, 'Manager',   7600, 900,  2016, NULL),
 (12, 'Laszlo Takacs',  3, 'Designer',  5600, NULL, 2015,   11),
 (13, 'Maria Juhasz',   3, 'Designer',  5900, 400,  2018,   11),
 (14, 'Norbert Meszaros',4,'Manager',   5200, 500,  2017, NULL),
 (15, 'Orsolya Olah',   4, 'Agent',     3900, NULL, 2022,   14),
 (16, 'Peter Simon',    4, 'Agent',     4100, 300,  2020,   14);

INSERT INTO sales VALUES
 ( 1,  7, 'North', '2026-01', 12000),
 ( 2,  7, 'North', '2026-02',  8500),
 ( 3,  7, 'South', '2026-03', 15000),
 ( 4,  8, 'South', '2026-01',  4000),
 ( 5,  8, 'South', '2026-02',  6500),
 ( 6,  9, 'East',  '2026-01', 21000),
 ( 7,  9, 'East',  '2026-02', 18000),
 ( 8,  9, 'North', '2026-03',  9500),
 ( 9,  9, 'East',  '2026-03', 14000),
 (10, 10, 'West',  '2026-02',  3000),
 (11,  6, 'North', '2026-01', 25000),
 (12,  6, 'West',  '2026-03',  7000),
 (13, 11, 'East',  '2026-02',  5000),
 (14,  7, 'West',  '2026-03',  6000),
 (15,  8, 'West',  '2026-03',  5500),
 (16,  9, 'South', '2026-02', 11000);
