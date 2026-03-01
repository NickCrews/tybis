import { describe, it, expect } from 'vitest'
import * as ty from '../src/index.js'

describe('Tybis Integration Tests', () => {
    const penguins = ty.table('penguins', {
        species: 'string',
        year: 'int32',
        bill_length_mm: 'float64',
    } as const)

    describe('toPrql()', () => {
        it('simple table', () => {
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
        it('simple table', () => {
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
})
