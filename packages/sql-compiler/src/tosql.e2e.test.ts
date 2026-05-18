import { describe, it, expect } from 'vitest'
import * as ty from 'tybis'
import { toSql } from '.'
const penguins = ty.table('penguins', {
    species: 'string',
    year: 'int32',
    bill_length_mm: 'float64',
})

describe('End-to-end SQL compilation', () => {
    it('compiles a complex query with multiple levels and dialect-specific functions', () => {
        const expr = penguins
            .filter(r => r.year.eq(2018).or(r.year.gt(2024)))
            .groupBy({ species: true, year: true })
            .agg(g => ({
                count: ty.count(),
                mean_bill: g.bill_length_mm.mean(),
            }))
            .filter(r => r.mean_bill.le(47))
            .sort({ count: 'desc' })
            .take(10)
        const compiled = toSql(expr)
        expect(compiled).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT "species", "year", COUNT(*) AS "count", AVG("bill_length_mm") AS "mean_bill" FROM "penguins" WHERE ("year" = 2018) OR ("year" > 2024) GROUP BY "species", "year") SELECT * FROM _cte_0 WHERE "mean_bill" <= 47 ORDER BY "count" DESC LIMIT 10",
          }
        `);
    })
})