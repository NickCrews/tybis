import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

const penguins = ty.relation('penguins', {
    species: 'string',
    year: 'int32',
    bill_length_mm: 'float64',
    active: 'boolean',
})

describe('Relation.col() error handling', () => {
    it('throws when accessing a non-existent column with no close match', () => {
        // @ts-expect-error — 'totally_unknown_column' is not in the schema
        expect(() => penguins.col('totally_unknown_column')).toThrow("Column 'totally_unknown_column' does not exist")
    })

    it('throws with a typo suggestion when a close column exists', () => {
        // @ts-expect-error — 'spcies' is not in the schema
        expect(() => penguins.col('spcies')).toThrow("Did you mean 'species'?")
    })

    it('throws with a typo suggestion in filter callback', () => {
        expect(() =>
            // @ts-expect-error — 'yeer' is not in the schema
            penguins.filter(r => r.col('yeer').gt(2000))
        ).toThrow("Did you mean 'year'?")
    })

    it('throws without suggestion for completely unrelated column', () => {
        const err = (() => {
            // @ts-expect-error — 'xyz' is not in the schema
            try { penguins.col('xyz') } catch (e) { return e as Error }
        })()
        expect(err?.message).toContain("Column 'xyz' does not exist")
        expect(err?.message).not.toContain('Did you mean')
    })
})

describe('Relation.derive() with multiple columns', () => {
    it('adds multiple derived columns at once', () => {
        const q = penguins.derive(r => ({
            half_bill: r.col('bill_length_mm').div(2),
            double_bill: r.col('bill_length_mm').mul(2),
        }))
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from penguins
          derive {
            half_bill = bill_length_mm / 2,
            double_bill = bill_length_mm * 2
          }"
        `)
        expect(q.col('half_bill').dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(q.col('double_bill').dtype()).toEqual({ typecode: 'float', size: 64 })
    })

    it('overrides an existing column when derive uses same name', () => {
        const q = penguins.derive(r => ({
            year: r.col('bill_length_mm').sum(),
        }))
        // The schema should now have year as float64 (sum returns float64)
        expect(q.col('year').dtype().typecode).toBe('float')
    })
})

describe('Relation.sort() with asc()', () => {
    it('sorts ascending using asc() method', () => {
        const q = penguins.sort(r => r.col('bill_length_mm').asc())
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from penguins
          sort {bill_length_mm}"
        `)
    })

    it('sorts ascending by default (bare column)', () => {
        const q = penguins.sort(r => r.col('year'))
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from penguins
          sort {year}"
        `)
    })

    it('sorts with multiple keys using mixed asc/desc', () => {
        const q = penguins.sort(r => [r.col('species'), r.col('bill_length_mm').desc()])
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from penguins
          sort {species, -bill_length_mm}"
        `)
    })

    it('sorts with multiple ascending keys', () => {
        const q = penguins.sort(r => [r.col('species').asc(), r.col('year').asc()])
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from penguins
          sort {species, year}"
        `)
    })

    it('sorts with multiple descending keys', () => {
        const q = penguins.sort(r => [r.col('species').desc(), r.col('year').desc()])
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from penguins
          sort {-species, -year}"
        `)
    })
})

describe('GroupAccessor.agg() validation', () => {
    it('throws when aggregation contains a columnar expression', () => {
        expect(() =>
            penguins.group(
                r => [r.col('species')],
                g => g.agg({
                    // @ts-expect-error — columnar expr is not assignable to scalar aggregation
                    bad: g.col('bill_length_mm'),
                })
            )
        ).toThrow("Aggregation 'bad' must be a scalar expression")
    })
})

describe('Relation schema is preserved through operations', () => {
    it('schema is preserved through filter', () => {
        const q = penguins.filter(r => r.col('bill_length_mm').gt(40))
        expect(q.schema).toEqual(penguins.schema)
    })

    it('schema is preserved through sort', () => {
        const q = penguins.sort(r => r.col('year'))
        expect(q.schema).toEqual(penguins.schema)
    })

    it('schema is preserved through take', () => {
        const q = penguins.take(5)
        expect(q.schema).toEqual(penguins.schema)
    })

    it('schema is updated through derive to add new column', () => {
        const q = penguins.derive(r => ({
            ratio: r.col('bill_length_mm').div(r.col('year')),
        }))
        expect('ratio' in q.schema).toBe(true)
        expect(q.schema.ratio.typecode).toBe('float')
        // Original columns preserved
        expect('species' in q.schema).toBe(true)
        expect('bill_length_mm' in q.schema).toBe(true)
    })

    it('group reduces schema to key columns and aggregations', () => {
        const q = penguins.group(
            r => [r.col('species')],
            g => g.agg({ n: ty.count() })
        )
        expect('species' in q.schema).toBe(true)
        expect('n' in q.schema).toBe(true)
        expect('bill_length_mm' in q.schema).toBe(false)
        expect('year' in q.schema).toBe(false)
    })
})
