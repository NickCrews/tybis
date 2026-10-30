SELECT *, ("price_cents" / 100) AS "price_dollars", ("price_cents" * "quantity") AS "revenue_cents" FROM "products" ORDER BY "revenue_cents" DESC
