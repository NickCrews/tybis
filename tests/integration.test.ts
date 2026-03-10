import { describe, it, expect } from 'vitest'
import * as ty from '../src/index.js'

describe('Tybis Integration Tests', () => {
    const penguins = ty.relation('penguins', {
        species: ty.DT.string,
        year: ty.DT.int32,
        bill_length_mm: ty.DT.float64,
    })

    describe('toPrql()', () => {
        it('simple relation', () => {
            expect(penguins.toPrql()).toMatchInlineSnapshot(`"from penguins"`)
        })

        it('filter', () => {
            const q = penguins.filter(r => r.col('bill_length_mm').gt(40))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from penguins
              filter bill_length_mm > 40"
            `)
        })

        it('group + agg', () => {
            const q = penguins.group(
                r => [r.col('species'), r.col('year')],
                g => g.agg({
                    count: ty.count(),
                    mean_bill: g.col('bill_length_mm').mean(),
                })
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
                "from penguins
                group {species, year} (
                  aggregate {
                    count = count this,
                    mean_bill = average bill_length_mm
                  }
                )"
            `)
        })

        it('sort descending', () => {
            const q = penguins.sort(r => r.col('bill_length_mm').desc())
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from penguins
              sort {-bill_length_mm}"
            `)
        })

        it('take', () => {
            const q = penguins.take(10)
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from penguins
              take 10"
            `)
        })

        it('chained operations', () => {
            const q = penguins
                .filter(r => r.col('bill_length_mm').gt(40))
                .group(
                    r => [r.col('species'), r.col('year')],
                    g => g.agg({
                        count: ty.count(),
                        mean_bill: g.col('bill_length_mm').mean(),
                    })
                )
                .sort(r => r.col('count').desc())
                .take(10)
            expect(q.toPrql()).toMatchInlineSnapshot(`
                "from penguins
                filter bill_length_mm > 40
                group {species, year} (
                  aggregate {
                    count = count this,
                    mean_bill = average bill_length_mm
                  }
                )
                sort {-count}
                take 10"
            `)
        })
    })

    describe('toSql()', () => {
        it('simple relation', () => {
            const sql = penguins.toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins"`)
        })

        it('filter', () => {
            const sql = penguins.filter(r => r.col('bill_length_mm').gt(40)).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins WHERE bill_length_mm > 40"`)
        })

        it('group + agg compiles to valid SQL', () => {
            const sql = penguins.group(
                r => [r.col('species'), r.col('year')],
                g => g.agg({
                    count: ty.count(),
                    mean_bill: g.col('bill_length_mm').mean(),
                })
            ).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT species, year, COUNT(*) AS count, AVG(bill_length_mm) AS mean_bill FROM penguins GROUP BY species, year"`)
        })

        it('sort descending', () => {
            const sql = penguins.sort(r => r.col('bill_length_mm').desc()).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins ORDER BY bill_length_mm DESC"`)
        })

        it('take', () => {
            const sql = penguins.take(10).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins LIMIT 10"`)
        })
    })

    describe('derive()', () => {
        it('adds a computed column to prql', () => {
            const q = penguins.derive(r => ({
                ratio: r.col('bill_length_mm').div(40),
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from penguins
              derive {
                ratio = bill_length_mm / 40
              }"
            `)
        })
    })

    describe('compile() with explicit compiler', () => {
        it('accepts a PrqlCompiler', () => {
            const compiler = new ty.PrqlCompiler()
            const q = penguins.filter(r => r.col('bill_length_mm').gt(40))
            expect(q.compile(compiler)).toMatchInlineSnapshot(`
              "from penguins
              filter bill_length_mm > 40"
            `)
        })

        it('accepts a SqlCompiler', () => {
            const compiler = new ty.SqlCompiler()
            const sql = penguins.filter(r => r.col('bill_length_mm').gt(40)).compile(compiler)
            expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins WHERE bill_length_mm > 40"`)
        })
    })

    describe('expression tree', () => {
        it('expressions are abstract nodes, not strings', () => {
            const q = penguins.filter(r => r.col('bill_length_mm').gt(40))
            // The IR stores expression objects, not strings
            const ir = q._ir
            expect(ir.kind).toBe('filter')
            if (ir.kind === 'filter') {
                expect(ir.condition.kind).toBe('gt')
            }
        })
    })
})
