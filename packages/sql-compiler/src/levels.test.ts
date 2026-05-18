import { describe, it, expect } from 'vitest'
import * as ty from 'tybis'
import { DuckDbSqlCompiler } from './dialects/duckdb.js'

const compiler = new DuckDbSqlCompiler()
const compileR = (rel: ty.Relation<any>) => rel.compile(compiler)

const penguins = ty.table('penguins', {
    species: 'string',
    year: 'int32',
    bill_length_mm: 'float64',
})

describe('Level-boundary planner rules', () => {
    it('FROM + FILTER -> single SELECT', () => {
        const q = penguins.filter(r => r.bill_length_mm.gt(40))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT * FROM "penguins" WHERE "bill_length_mm" > 40",
          }
        `)
    })

    it('FROM + FILTER + GROUP -> single SELECT (filter before group is allowed)', () => {
        const q = penguins
            .filter(r => r.bill_length_mm.gt(40))
            .groupBy(_r => ({ species: true })).agg({ cnt: ty.count() })
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT "species", COUNT(*) AS "cnt" FROM "penguins" WHERE "bill_length_mm" > 40 GROUP BY "species"",
          }
        `)
    })

    it('FROM + GROUP + FILTER -> CTE chain (filter after group needs new level)', () => {
        const q = penguins
            .groupBy(_r => ({ species: true })).agg({ cnt: ty.count() })
            .filter(r => r.cnt.gt(10))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT "species", COUNT(*) AS "cnt" FROM "penguins" GROUP BY "species") SELECT * FROM _cte_0 WHERE "cnt" > 10",
          }
        `)
    })

    it('FROM + DERIVE + GROUP -> CTE chain (group after derive)', () => {
        const q = penguins
            .derive(r => ({ bl_cm: r.bill_length_mm.div(10) }))
            .groupBy(_r => ({ species: true })).agg(g => ({ avg_cm: g.bl_cm.mean() }))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT *, ("bill_length_mm" / 10) AS "bl_cm" FROM "penguins") SELECT "species", AVG("bl_cm") AS "avg_cm" FROM _cte_0 GROUP BY "species"",
          }
        `)
    })

    it('FROM + DERIVE -> single SELECT with star + derived col', () => {
        const q = penguins.derive(r => ({
            bl_cm: r.bill_length_mm.div(10),
        }))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT *, ("bill_length_mm" / 10) AS "bl_cm" FROM "penguins"",
          }
        `)
    })

    it('FROM + DERIVE shadowing existing column -> explicit listing', () => {
        const q = penguins.derive(r => ({
            // Replace the existing `bill_length_mm` column.
            bill_length_mm: r.bill_length_mm.div(10),
        }))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT "species", "year", ("bill_length_mm" / 10) AS "bill_length_mm" FROM "penguins"",
          }
        `)
    })

    it('FROM + GROUP + SORT + TAKE -> single SELECT', () => {
        const q = penguins
            .groupBy(_r => ({ species: true })).agg({ cnt: ty.count() })
            .sort(r => r.cnt.desc())
            .take(5)
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT "species", COUNT(*) AS "cnt" FROM "penguins" GROUP BY "species" ORDER BY "cnt" DESC LIMIT 5",
          }
        `)
    })

    it('FROM + SORT + TAKE + SORT -> CTE chain (second sort is new level)', () => {
        const q = penguins
            .sort(r => r.bill_length_mm)
            .take(100)
            .sort(r => r.species)
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT * FROM "penguins" ORDER BY "bill_length_mm" LIMIT 100) SELECT * FROM _cte_0 ORDER BY "species"",
          }
        `)
    })

    it('FROM + TAKE + TAKE -> CTE chain (second take needs new level)', () => {
        const q = penguins.take(100).take(10)
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT * FROM "penguins" LIMIT 100) SELECT * FROM _cte_0 LIMIT 10",
          }
        `)
    })

    it('FROM + SELECT + DERIVE -> CTE chain (derive after select needs new level)', () => {
        const q = penguins
            .select(_r => ({ species: true, bill_length_mm: true }))
            .derive(r => ({ bl_cm: r.bill_length_mm.div(10) }))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT "species", "bill_length_mm" FROM "penguins") SELECT *, ("bill_length_mm" / 10) AS "bl_cm" FROM _cte_0",
          }
        `)
    })

    it('FROM + SELECT + FILTER -> CTE chain (filter after select needs new level)', () => {
        const q = penguins
            .select(_r => ({ species: true, bill_length_mm: true }))
            .filter(r => r.bill_length_mm.gt(40))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT "species", "bill_length_mm" FROM "penguins") SELECT * FROM _cte_0 WHERE "bill_length_mm" > 40",
          }
        `)
    })

    it('three-level CTE chain', () => {
        const q = penguins
            .groupBy(_r => ({ species: true })).agg({ cnt: ty.count() })
            .filter(r => r.cnt.gt(10))
            .groupBy(_r => ({ species: true })).agg(g => ({ tot: (g.cnt as any).sum() }))
        expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "WITH _cte_0 AS (SELECT "species", COUNT(*) AS "cnt" FROM "penguins" GROUP BY "species") SELECT "species", SUM("cnt") AS "tot" FROM _cte_0 WHERE "cnt" > 10 GROUP BY "species"",
          }
        `)
    })
})
