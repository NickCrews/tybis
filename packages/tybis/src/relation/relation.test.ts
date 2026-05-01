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

describe('ty.table()', () => {
    it('builds a Relation with the declared schema', () => {
        const t = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })
        expect(t.schema.species).toEqual({ typecode: 'string' })
        expect(t.schema.year).toEqual({ typecode: 'int', size: 32 })
        expect(t.schema.bill_length_mm).toEqual({ typecode: 'float', size: 64 })
        expectTypeOf(t).toMatchTypeOf<ty.Relation<{
            species: dt.DTString
            year: dt.DTInt32
            bill_length_mm: dt.DTFloat64
        }>>()
    })
})

describe('Relation.col()', () => {
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

    it('returns an expression typed by the column dtype', () => {
        const speciesCol = penguins.col('species')
        expect(speciesCol.dtype()).toEqual({ typecode: 'string' })
        expectTypeOf(speciesCol).toMatchTypeOf<ty.IVExpr<dt.DTString, 'columnar'>>()

        const yearCol = penguins.col('year')
        expect(yearCol.dtype()).toEqual({ typecode: 'int', size: 32 })
        expectTypeOf(yearCol).toMatchTypeOf<ty.IVExpr<dt.DTInt32, 'columnar'>>()
    })
})

describe('Relation.select()', () => {
    it('throws an error if no arguments are provided', () => {
        // @ts-expect-error
        expect(() => penguins.select()).toThrowError(
            "select() requires a mapping object or callback"
        )
    })

    it('throws an error if the selection is empty', () => {
        expect(() => penguins.select(() => ({}))).toThrowError(
            "select() requires at least one expression"
        )
    })

    it('throws an error if shorthand is used for a missing column', () => {
        // @ts-expect-error throws with plain object
        expect(() => penguins.select({ missing: true })).toThrowError("Cannot select 'missing': column does not exist.")
        // @ts-expect-error throws with callback
        expect(() => penguins.select(_r => ({ missing: true }))).toThrowError("Cannot select 'missing': column does not exist.")
    })

    it('can select from the existing relation with no callback', () => {
        const result = penguins.select({ species2: penguins.col('species') })
        const expectedSchema = {
            species2: { typecode: 'string' },
        }
        expect(result.schema).toEqual(expectedSchema)
        expectTypeOf(result.schema).toMatchTypeOf(expectedSchema)
    })

    it('does not error early if selecting a column from a different relation (TODO)', () => {
        const other = ty.table('other', { species: 'string' })
        // This currently throws an error because the column validator doesn't know to allow columns from other relations, but ideally it should work since the column name is valid and the dtype matches
        const outcome = penguins.select({ species_from_other: other.col('species') })
        const expectedSchema = {
            species_from_other: { typecode: 'string' },
        }
        expect(outcome.schema).toEqual(expectedSchema)
        expectTypeOf(outcome.schema).toMatchTypeOf(expectedSchema)
    })

    it('replaces the schema with the selected expressions', () => {
        const t = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })
        const result = t.select(r => ({
            species_alias: r.col('species'),
            is_recent: r.col('year').gt(2000),
        }))

        expect(result.schema.species_alias).toEqual({ typecode: 'string' })
        expect(result.schema.is_recent).toEqual({ typecode: 'boolean' })
        expect('bill_length_mm' in result.schema).toBe(false)

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species_alias: { typecode: 'string' }
            is_recent: { typecode: 'boolean' }
        }>>()
        expectTypeOf<typeof result['schema']>().not.toHaveProperty('bill_length_mm')
    })

    it('shorthand `true` keeps an existing column', () => {
        const t = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })
        const result = t.select(r => ({
            species: true,
            is_recent: r.col('year').gt(2000),
        }))

        expect(result.schema.species).toEqual({ typecode: 'string' })
        expect(result.schema.is_recent).toEqual({ typecode: 'boolean' })
        expect('bill_length_mm' in result.schema).toBe(false)
        expect('year' in result.schema).toBe(false)

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string' }
            is_recent: { typecode: 'boolean' }
        }>>()
        expectTypeOf<typeof result['schema']>().not.toHaveProperty('bill_length_mm')
        expectTypeOf<typeof result['schema']>().not.toHaveProperty('year')
    })

    it('shorthand `false` drops a column', () => {
        const t = ty.table('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })
        const result = t.select(_r => ({
            species: true,
            year: false,
        }))

        expect(result.schema.species).toEqual({ typecode: 'string' })
        expect('year' in result.schema).toBe(false)
        expect('bill_length_mm' in result.schema).toBe(false)

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string' }
        }>>()
        expectTypeOf<typeof result['schema']>().not.toHaveProperty('year')
        expectTypeOf<typeof result['schema']>().not.toHaveProperty('bill_length_mm')
    })

    it('accepts a direct mapping object without callback', () => {
        const result = penguins.select({
            species: true,
            active: true,
            year: false, // should be ignored since false means drop
        })
        const expectedSchema = {
            species: { typecode: 'string' },
            active: { typecode: 'boolean' },
        }
        expect(result.schema).toEqual(expectedSchema)
        expectTypeOf(result.schema).toMatchTypeOf(expectedSchema)
    })

    it('accepts a direct mapping object with expressions', () => {
        const result = penguins.select({
            species: true,
            my_favorite_number: ty.lit(42),
            year: false, // should be ignored since false means drop
        })
        const expectedSchema = {
            species: { typecode: 'string' },
            my_favorite_number: { typecode: 'float', size: 64 },
        }
        expect(result.schema).toEqual(expectedSchema)
        expectTypeOf(result.schema).toMatchTypeOf(expectedSchema)
    })
})

describe('Relation.take()', () => {
    it('throws for negative n', () => {
        expect(() => penguins.take(-1)).toThrow('TakeOp requires a non-negative integer for n, got -1')
    })

    it('preserves schema through take', () => {
        const q = penguins.take(5)
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf<typeof penguins['schema']>()
    })
})

describe('Relation.derive()', () => {
    it('adds multiple derived columns at once', () => {
        const q = penguins.derive(r => ({
            half_bill: r.col('bill_length_mm').div(2),
            double_bill: r.col('bill_length_mm').mul(2),
        }))
        expect(q.col('half_bill').dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(q.col('double_bill').dtype()).toEqual({ typecode: 'float', size: 64 })
        expectTypeOf(q).toMatchTypeOf<ty.Relation<{
            species: dt.DTString
            year: dt.DTInt32
            bill_length_mm: dt.DTFloat64
            active: dt.DTBoolean
            half_bill: dt.DTFloat64
            double_bill: dt.DTFloat64
        }>>()
    })

    it('overrides an existing column when derive uses same name', () => {
        const q = penguins.derive(r => ({
            year: r.col('bill_length_mm').sum(),
        }))
        // The schema should now have year as float64 (sum returns float64)
        expect(q.col('year').dtype().typecode).toBe('float')
        expectTypeOf(q.col('year')).toMatchTypeOf<ty.IVExpr<dt.DTFloat64, 'columnar'>>()
    })

    it('extends the schema with a new computed column', () => {
        const t = ty.table('penguins', {
            species: 'string',
            bill_length_mm: 'float64',
        })
        const result = t.derive(r => ({
            ratio: r.col('bill_length_mm').div(40),
        }))

        expect(result.schema.ratio).toEqual({ typecode: 'float', size: 64 })
        expect(result.schema.species).toEqual({ typecode: 'string' })
        expect(result.schema.bill_length_mm).toEqual({ typecode: 'float', size: 64 })

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string' }
            bill_length_mm: { typecode: 'float', size: 64 }
            ratio: { typecode: 'float', size: 64 }
        }>>()
    })

    it('accepts a direct mapping object without callback', () => {
        const result = penguins.derive({
            fixed_value: ty.lit(42),
        })
        const expectedSchema = {
            species: { typecode: 'string' },
            year: { typecode: 'int', size: 32 },
            bill_length_mm: { typecode: 'float', size: 64 },
            active: { typecode: 'boolean' },
            fixed_value: { typecode: 'float', size: 64 },
        }
        expect(result.schema).toEqual(expectedSchema)
        expectTypeOf(result.schema).toMatchTypeOf(expectedSchema)
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
    it('group reduces schema to key columns and aggregations', () => {
        const q = penguins.group(
            _r => ({ species: true }),
            g => g.agg({ n: ty.count() })
        )
        expect('species' in q.schema).toBe(true)
        expect('n' in q.schema).toBe(true)
        expect('bill_length_mm' in q.schema).toBe(false)
        expect('year' in q.schema).toBe(false)
        expectTypeOf(q).toMatchTypeOf<ty.Relation<{
            species: dt.DTString
            n: dt.DTInt64
        }>>()
        expectTypeOf<typeof q['schema']>().not.toHaveProperty('bill_length_mm')
        expectTypeOf<typeof q['schema']>().not.toHaveProperty('year')
    })
})

describe('Relation.filter()', () => {
    it('schema is preserved through filter', () => {
        const q = penguins.filter(r => r.col('bill_length_mm').gt(40))
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf<typeof penguins['schema']>()
    })

})

describe('Relation.sort()', () => {
    it('schema is preserved through sort', () => {
        const q = penguins.sort(r => r.col('year'))
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf<typeof penguins['schema']>()
    })
})
