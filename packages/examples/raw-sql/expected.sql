WITH _cte_0 AS (SELECT *, EXTRACT(YEAR FROM occurred_at) AS "year" FROM "events") SELECT "event_name", "year", COUNT(*) AS "n" FROM _cte_0 GROUP BY "event_name", "year" ORDER BY "n" DESC
