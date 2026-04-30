import { describe, it, expect } from 'vitest'
import * as ty from '../src/index.js'

describe('Tybis Integration Tests', () => {
    const penguins = ty.table('penguins', {
        species: 'string',
        year: 'int32',
        bill_length_mm: 'float64',
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
                _r => ({ species: true, year: true }),
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

        it('select', () => {
            const q = penguins.select(r => ({
                species: r.col('species'),
                half_bill: r.col('bill_length_mm').div(2),
                one: ty.lit(1),
            }))
            // Expected PRQL format
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from penguins
              select {
                species = species,
                half_bill = bill_length_mm / 2,
                one = 1
              }"
            `)
        })

        it('select shorthand', () => {
            const q = penguins.select(_r => ({
                species: true,
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from penguins
              select {
                species = species
              }"
            `)
        })

        it('chained operations', () => {
            const q = penguins
                .filter(_r => _r.col('bill_length_mm').gt(40))
                .group(
                    _r => ({ species: true, year: true }),
                    g => g.agg({
                        count: ty.count(),
                        mean_bill: g.col('bill_length_mm').mean(),
                    })
                )
                .sort(_r => _r.col('count').desc())
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
                _r => ({ species: true, year: true }),
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

        it('select', () => {
            const sql = penguins.select(r => ({
                species: r.col('species'),
                half_bill: r.col('bill_length_mm').div(2),
                one: ty.lit(1),
            })).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT species, (bill_length_mm / 2) AS half_bill, 1 AS one FROM penguins"`)
        })

        it('select shorthand', () => {
            const sql = penguins.select(_r => ({
                species: true,
            })).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT species FROM penguins"`)
        })

        it('select explicitly dropping column with false', () => {
            const sql = penguins.select(_r => ({
                species: true,
                year: false,
            })).toSql()
            expect(sql).toMatchInlineSnapshot(`"SELECT species FROM penguins"`)
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

    describe('select()', () => {
        it('throws an error if no arguments are provided', () => {
            // @ts-expect-error
            expect(() => penguins.select()).toThrowError(
                "select() requires a callback returning an object map of columns"
            )
        })

        it('throws an error if the selection is empty', () => {
            expect(() => penguins.select(() => ({}))).toThrowError(
                "select() requires at least one expression"
            )
        })

        it('throws an error if shorthand is used for a missing column', () => {
            expect(() => penguins.select(_r => ({
                // @ts-expect-error
                missing: true
            }))).toThrowError("Cannot select 'missing': column does not exist.")
        })

        it('allows false to explicitly drop a column', () => {
            const q = penguins.select(_r => ({
                species: true,
                year: false,
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from penguins
              select {
                species = species
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
            const op = q._op
            expect(op.kind).toBe('filter')
            // It infers the type of op as a FilterOp just based on how we called .filter()
            expect(op.condition.kind).toBe('gt')
        })
    })
})
