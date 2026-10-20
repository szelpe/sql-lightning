-- Applied on top of seed.sql to build the "shadow" dataset.
-- Answers are checked against both datasets, so a query that hard-codes
-- values from the visible data (e.g. SELECT 16) fails here.

UPDATE employees SET salary = salary + 37 * id;
UPDATE employees SET bonus = NULL WHERE id = 2;
UPDATE sales SET amount = amount + 250 * id;
-- Gives Eva Horvath a different management chain (Clara -> Anna instead of Bence -> Anna).
UPDATE employees SET manager_id = 3 WHERE id = 5;

INSERT INTO employees VALUES
 (17, 'Quinn Reed', 3, 'Analyst', 6300, 700, 2012, 11);

INSERT INTO sales VALUES
 (17, 13, 'East', '2026-03', 22500),
 (18, 17, 'South', '2026-01', 4200);
