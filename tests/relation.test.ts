import { describe, it } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'
import * as dt from '../src/datatype.js'

describe('Type Safety', () => {
    it('should accept an explicit schema', () => {
        const penguins = ty.relation('penguins', {
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
        const penguins = ty.relation('penguins', {
            species: 'string',
            year: 'int32',
            bill_length_mm: 'float64',
        })

        const result = penguins.group(
            r => [r.col('species'), r.col('year')],
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
        const penguins = ty.relation('penguins', {
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

    it('string columns should have string methods', () => {
        const r = ty.relation('t', { name: 'string' })
        const nameCol = r.col('name')
        expectTypeOf(nameCol.upper()).toMatchTypeOf<ty.IExpr<dt.DTString, 'columnar'>>()
        expectTypeOf(nameCol.lower()).toMatchTypeOf<ty.IExpr<dt.DTString, 'columnar'>>()
        expectTypeOf(nameCol.contains('x')).toMatchTypeOf<ty.IExpr<dt.DTBoolean, 'columnar'>>()
    })

    it('numeric columns should have comparison methods', () => {
        const numCol = ty.col('age', 'int32')
        expectTypeOf(numCol.gt(5)).toMatchTypeOf<ty.IExpr<dt.DTBoolean, 'columnar'>>()
        expectTypeOf(numCol.div(2)).toMatchTypeOf<ty.IExpr<dt.DTFloat64, 'columnar'>>()
    })
})
