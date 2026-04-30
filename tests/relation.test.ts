import { describe, it } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'
import * as dt from '../src/datatype.js'

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
