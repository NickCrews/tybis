import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'
import * as dt from '../datatype.js'

const penguins = ty.table('penguins', {
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

describe('Relation.select()', () => {
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
})

describe('Relation.derive() with multiple columns', () => {
    it('adds multiple derived columns at once', () => {
        const q = penguins.derive(r => ({
            half_bill: r.col('bill_length_mm').div(2),
            double_bill: r.col('bill_length_mm').mul(2),
        }))
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

describe('GroupAccessor.agg() validation', () => {
    it('throws when aggregation contains a columnar expression', () => {
        expect(() =>
            penguins.group(
                _r => ({ species: true }),
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
            _r => ({ species: true }),
            g => g.agg({ n: ty.count() })
        )
        expect('species' in q.schema).toBe(true)
        expect('n' in q.schema).toBe(true)
        expect('bill_length_mm' in q.schema).toBe(false)
        expect('year' in q.schema).toBe(false)
    })
})

describe('Type Safety', () => {
    it('should accept an explicit schema', () => {
        const penguins = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })

        expectTypeOf(penguins).toMatchTypeOf<ty.Relation<{
            species: dt.DTString
            year: dt.DTInt32
            bill_length_mm: dt.DTFloat64
        }>>()
    })

    it('should track schema through group and agg', () => {
        const penguins = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })

        const result = penguins.group(
            _r => ({ species: true, year: true }),
            g => g.agg({
                count: ty.count(),
                mean_bill: g.col('bill_length_mm').mean(),
            })
        )

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string' }
            year: { typecode: 'int', size: 32 }
            count: { typecode: 'int', size: 64 }
            mean_bill: { typecode: 'float', size: 64 }
        }>>()
    })

    it('should track schema through derive', () => {
        const penguins = ty.table('penguins', {
            species: 'string',
            bill_length_mm: 'float64',
        })

        const result = penguins.derive(r => ({
            ratio: r.col('bill_length_mm').div(40),
        }))

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string' }
            bill_length_mm: { typecode: 'float', size: 64 }
            ratio: { typecode: 'float', size: 64 }
        }>>()
    })

    it('should track schema through select', () => {
        const penguins = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })

        const result = penguins.select(r => ({
            species_alias: r.col('species'),
            is_recent: r.col('year').gt(2000),
        }))

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species_alias: { typecode: 'string' }
            is_recent: { typecode: 'boolean' }
        }>>()

        // Assert old columns are no longer in schema at compile time
        type ExpectedSchema = typeof result['schema']
        expectTypeOf<ExpectedSchema>().not.toHaveProperty('bill_length_mm')
    })

    it('should track schema through select shorthand', () => {
        const penguins = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })

        const result = penguins.select(r => ({
            species: true,
            is_recent: r.col('year').gt(2000),
        }))

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string' }
            is_recent: { typecode: 'boolean' }
        }>>()

        type ExpectedSchema = typeof result['schema']
        expectTypeOf<ExpectedSchema>().not.toHaveProperty('bill_length_mm')
        expectTypeOf<ExpectedSchema>().not.toHaveProperty('year')
    })

    it('should drop column when false is provided', () => {
        const penguins = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })

        const result = penguins.select(_r => ({
            species: true,
            year: false,
        }))

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string' }
        }>>()

        type ExpectedSchema = typeof result['schema']
        expectTypeOf<ExpectedSchema>().not.toHaveProperty('year')
        expectTypeOf<ExpectedSchema>().not.toHaveProperty('bill_length_mm')
    })

    it('string columns should have string methods', () => {
        const r = ty.table('t', { name: 'string' })
        const nameCol = r.col('name')
        expectTypeOf(nameCol.upper()).toMatchTypeOf<ty.IVExpr<dt.DTString, 'columnar'>>()
        expectTypeOf(nameCol.lower()).toMatchTypeOf<ty.IVExpr<dt.DTString, 'columnar'>>()
        expectTypeOf(nameCol.contains('x')).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
    })

    it('numeric columns should have comparison methods', () => {
        const numCol = ty.col('age', 'int32')
        expectTypeOf(numCol.gt(5)).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
        expectTypeOf(numCol.div(2)).toMatchTypeOf<ty.IVExpr<dt.DTFloat64, 'columnar'>>()
    })
})