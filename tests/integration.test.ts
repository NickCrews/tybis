import { describe, it, expect } from 'vitest'
import * as ty from '../src/index.js'

describe('Tybis Integration Tests', () => {
    const penguins = ty.table('penguins', {
        species: 'string' as const,
        year: 'int32' as const,
        bill_length_mm: 'float64' as const,
    })

    describe('to_prql()', () => {
        it('simple table', () => {
            expect(penguins.to_prql()).toBe('from penguins')
        })

        it('filter', () => {
            const q = penguins.filter(r => r.col('bill_length_mm').gt(40))
            expect(q.to_prql()).toBe('from penguins\nfilter bill_length_mm > 40')
        })

        it('group + agg', () => {
            const q = penguins.group(
                r => [r.col('species'), r.col('year')],
                g => g.agg({
                    count: ty.count(),
                    mean_bill: g.col('bill_length_mm').mean(),
                })
            )
            expect(q.to_prql()).toMatchInlineSnapshot(`
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
            expect(q.to_prql()).toBe('from penguins\nsort {-bill_length_mm}')
        })

        it('take', () => {
            const q = penguins.take(10)
            expect(q.to_prql()).toBe('from penguins\ntake 10')
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
            expect(q.to_prql()).toMatchInlineSnapshot(`
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

    describe('to_sql()', () => {
        it('simple table', () => {
            const sql = penguins.to_sql()
            expect(sql).toContain('penguins')
            expect(sql).toContain('SELECT')
        })

        it('filter', () => {
            const sql = penguins.filter(r => r.col('bill_length_mm').gt(40)).to_sql()
            expect(sql).toContain('WHERE')
            expect(sql).toContain('40')
        })

        it('group + agg compiles to valid SQL', () => {
            const sql = penguins.group(
                r => [r.col('species'), r.col('year')],
                g => g.agg({
                    count: ty.count(),
                    mean_bill: g.col('bill_length_mm').mean(),
                })
            ).to_sql()
            expect(sql).toContain('GROUP BY')
            expect(sql).toContain('COUNT')
            expect(sql).toContain('AVG')
        })

        it('sort descending', () => {
            const sql = penguins.sort(r => r.col('bill_length_mm').desc()).to_sql()
            expect(sql).toContain('ORDER BY')
            expect(sql).toContain('DESC')
        })

        it('take', () => {
            const sql = penguins.take(10).to_sql()
            expect(sql).toContain('10')
            // PRQL uses LIMIT or TOP depending on dialect
            expect(sql.toUpperCase()).toMatch(/LIMIT|TOP|FETCH/)
        })
    })

    describe('derive()', () => {
        it('adds a computed column to prql', () => {
            const q = penguins.derive(r => ({
                ratio: r.col('bill_length_mm').div(40),
            }))
            expect(q.to_prql()).toContain('derive')
            expect(q.to_prql()).toContain('ratio')
        })
    })
})
