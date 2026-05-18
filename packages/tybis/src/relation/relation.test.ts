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
        expect(t.schema.species).toEqual({ typecode: 'string', nullable: true })
        expect(t.schema.year).toEqual({ typecode: 'int', size: 32, nullable: true })
        expect(t.schema.bill_length_mm).toEqual({ typecode: 'float', size: 64, nullable: true })
        expectTypeOf(t).toMatchTypeOf<ty.Relation<{
            species: dt.DTString
            year: dt.DTInt<32>
            bill_length_mm: dt.DTFloat<64>
        }>>()
    })
})

describe('Relation.cols', () => {
    it('throws when accessing a non-existent column with no close match', () => {
        // @ts-expect-error — 'totally_unknown_column' is not in the schema
        expect(() => penguins.cols.totally_unknown_column).toThrow("Column 'totally_unknown_column' does not exist")
    })

    it('throws with a typo suggestion when a close column exists', () => {
        // @ts-expect-error — 'spcies' is not in the schema
        expect(() => penguins.cols.spcies).toThrow("Did you mean 'species'?")
    })

    it('throws with a typo suggestion in filter callback', () => {
        expect(() =>
            // @ts-expect-error — 'yeer' is not in the schema
            penguins.filter(r => r.yeer.gt(2000))
        ).toThrow("Did you mean 'year'?")
    })

    it('throws without suggestion for completely unrelated column', () => {
        const err = (() => {
            // @ts-expect-error — 'xyz' is not in the schema
            try { const _ = penguins.cols.xyz } catch (e) { return e as Error }
        })()
        expect(err?.message).toContain("Column 'xyz' does not exist")
        expect(err?.message).not.toContain('Did you mean')
    })

    it('returns an expression typed by the column dtype', () => {
        const speciesCol = penguins.cols.species
        expect(speciesCol.dtype()).toEqual({ typecode: 'string', nullable: true })
        expectTypeOf(speciesCol).toMatchTypeOf<ty.IVExpr<dt.DTString, 'columnar'>>()

        const yearCol = penguins.cols.year
        expect(yearCol.dtype()).toEqual({ typecode: 'int', size: 32, nullable: true })
        expectTypeOf(yearCol).toMatchTypeOf<ty.IVExpr<dt.DTInt<32>, 'columnar'>>()
    })

    it('supports bracket access for non-identifier column names', () => {
        const oddTable = ty.table('odd', { 'first name': 'string' })
        const c = oddTable.cols['first name']
        expect(c.dtype()).toEqual({ typecode: 'string', nullable: true })
        expectTypeOf(c).toMatchTypeOf<ty.IVExpr<dt.DTString, 'columnar'>>()
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
        const result = penguins.select({ species2: penguins.cols.species })
        const expectedSchema = {
            species2: { typecode: 'string', nullable: true },
        }
        expect(result.schema).toEqual(expectedSchema)
        expectTypeOf(result.schema).toMatchTypeOf(expectedSchema)
    })

    it('does not error early if selecting a column from a different relation (TODO)', () => {
        const other = ty.table('other', { species: 'string' })
        // This currently throws an error because the column validator doesn't know to allow columns from other relations, but ideally it should work since the column name is valid and the dtype matches
        const outcome = penguins.select({ species_from_other: other.cols.species })
        const expectedSchema = {
            species_from_other: { typecode: 'string', nullable: true },
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
            species_alias: r.species,
            is_recent: r.year.gt(2000),
        }))

        expect(result.schema.species_alias).toEqual({ typecode: 'string', nullable: true })
        expect(result.schema.is_recent).toEqual({ typecode: 'boolean', nullable: true })
        expect('bill_length_mm' in result.schema).toBe(false)

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species_alias: { typecode: 'string', nullable: boolean }
            is_recent: { typecode: 'boolean', nullable: boolean }
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
            is_recent: r.year.gt(2000),
        }))

        expect(result.schema.species).toEqual({ typecode: 'string', nullable: true })
        expect(result.schema.is_recent).toEqual({ typecode: 'boolean', nullable: true })
        expect('bill_length_mm' in result.schema).toBe(false)
        expect('year' in result.schema).toBe(false)

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string', nullable: boolean }
            is_recent: { typecode: 'boolean', nullable: boolean }
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

        expect(result.schema.species).toEqual({ typecode: 'string', nullable: true })
        expect('year' in result.schema).toBe(false)
        expect('bill_length_mm' in result.schema).toBe(false)

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string', nullable: boolean }
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
            species: { typecode: 'string', nullable: true },
            active: { typecode: 'boolean', nullable: true },
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
            species: { typecode: 'string', nullable: true },
            my_favorite_number: { typecode: 'float', size: 64, nullable: true },
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
        expectTypeOf(q.schema).toEqualTypeOf(penguins.schema)
    })
})

describe('Relation.derive()', () => {
    it('adds multiple derived columns at once', () => {
        const q = penguins.derive(r => ({
            half_bill: r.bill_length_mm.div(2),
            double_bill: r.bill_length_mm.mul(2),
        }))
        expect(q.cols.half_bill.dtype()).toEqual({ typecode: 'float', size: 64, nullable: true })
        expect(q.cols.double_bill.dtype()).toEqual({ typecode: 'float', size: 64, nullable: true })
        expectTypeOf(q).toMatchTypeOf<ty.Relation<{
            species: dt.DTString
            year: dt.DTInt<32>
            bill_length_mm: dt.DTFloat<64>
            active: dt.DTBoolean
            half_bill: dt.DTFloat<64>
            double_bill: dt.DTFloat<64>
        }>>()
    })

    it('overrides an existing column when derive uses same name', () => {
        const q = penguins.derive(r => ({
            year: r.bill_length_mm.sum(),
        }))
        const expectedSchema = {
            species: { typecode: 'string', nullable: true },
            year: { typecode: 'float', size: 64, nullable: true }, // year is now float64 because sum returns float64
            bill_length_mm: { typecode: 'float', size: 64, nullable: true },
            active: { typecode: 'boolean', nullable: true },
        }
        expect(q.schema).toEqual(expectedSchema)
        expectTypeOf(q.schema).toMatchTypeOf(expectedSchema)
    })

    it('extends the schema with a new computed column', () => {
        const t = ty.table('penguins', {
            species: 'string',
            bill_length_mm: 'float64',
        })
        const result = t.derive(r => ({
            ratio: r.bill_length_mm.div(40),
        }))

        expect(result.schema.ratio).toEqual({ typecode: 'float', size: 64, nullable: true })
        expect(result.schema.species).toEqual({ typecode: 'string', nullable: true })
        expect(result.schema.bill_length_mm).toEqual({ typecode: 'float', size: 64, nullable: true })

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: { typecode: 'string', nullable: boolean }
            bill_length_mm: { typecode: 'float', size: 64, nullable: boolean }
            ratio: { typecode: 'float', size: 64, nullable: boolean }
        }>>()
    })

    it('accepts a direct mapping object without callback', () => {
        const result = penguins.derive({
            fixed_value: ty.lit(42),
        })
        const expectedSchema = {
            species: { typecode: 'string', nullable: true },
            year: { typecode: 'int', size: 32, nullable: true },
            bill_length_mm: { typecode: 'float', size: 64, nullable: true },
            active: { typecode: 'boolean', nullable: true },
            fixed_value: { typecode: 'float', size: 64, nullable: true },
        }
        expect(result.schema).toEqual(expectedSchema)
        expectTypeOf(result.schema).toMatchTypeOf(expectedSchema)
    })
})

describe('GroupedRelation.agg() validation', () => {
    it('throws when aggregation contains a columnar expression', () => {
        expect(() =>
            penguins
                .groupBy(_r => ({ species: true }))
                // @ts-expect-error — columnar expr is not assignable to scalar aggregation
                .agg(r => ({
                    bad: r.bill_length_mm,
                }))
        ).toThrow("Aggregation 'bad' must be a scalar expression")
    })
    it('groupBy().agg() reduces schema to key columns and aggregations', () => {
        const q = penguins
            .groupBy(_r => ({ species: true }))
            .agg({ n: ty.count() })
        expect('species' in q.schema).toBe(true)
        expect('n' in q.schema).toBe(true)
        expect('bill_length_mm' in q.schema).toBe(false)
        expect('year' in q.schema).toBe(false)
        expectTypeOf(q).toMatchTypeOf<ty.Relation<{
            species: dt.DTString
            n: dt.DTInt<64>
        }>>()
        expectTypeOf<typeof q['schema']>().not.toHaveProperty('bill_length_mm')
        expectTypeOf<typeof q['schema']>().not.toHaveProperty('year')
    })
})

describe('Relation.filter()', () => {
    it('schema is preserved through filter', () => {
        const q = penguins.filter(r => r.bill_length_mm.gt(40))
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf(penguins.schema)
    })

})

describe('Relation.sort()', () => {
    it('schema is preserved through sort', () => {
        const q = penguins.sort(r => r.year)
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf(penguins.schema)
    })

    it('accepts plain-object form with direction strings', () => {
        const q = penguins.sort({ species: 'asc', year: 'desc' })
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf(penguins.schema)
    })

    it('accepts options object with nulls handling', () => {
        const q = penguins.sort({ year: { dir: 'desc', nulls: 'last' } })
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf(penguins.schema)
    })

    it('accepts mixed string and options-object values', () => {
        const q = penguins.sort({ species: 'asc', year: { dir: 'desc', nulls: 'first' } })
        expect(q.schema).toEqual(penguins.schema)
        expectTypeOf(q.schema).toEqualTypeOf(penguins.schema)
    })

    it('throws with typo suggestion for unknown column in object form', () => {
        // @ts-expect-error — 'yeer' is not in the schema
        expect(() => penguins.sort({ yeer: 'desc' })).toThrowError(
            "Cannot sort by 'yeer': column does not exist. Did you mean 'year'?"
        )
    })

    it('throws when given an empty object', () => {
        expect(() => penguins.sort({})).toThrowError(/at least one key/)
    })

    it('accepts callback form with nulls options on .desc()', () => {
        const q = penguins.sort(r => r.year.desc({ nulls: 'last' }))
        expect(q.schema).toEqual(penguins.schema)
    })
})

describe('Relation.groupBy()', () => {
    it('accepts plain-object form', () => {
        const q = penguins
            .groupBy({ species: true })
            .agg({ n: ty.count() })
        expect('species' in q.schema).toBe(true)
        expect('n' in q.schema).toBe(true)
    })

    it('throws with typo suggestion for unknown column in object form', () => {
        expect(() =>
            // @ts-expect-error — 'specie' is not in the schema
            penguins.groupBy({ specie: true }).agg({ n: ty.count() })
        ).toThrowError("Cannot group by 'specie': column does not exist. Did you mean 'species'?")
    })
})
