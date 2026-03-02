import { describe, it } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('Type Safety', () => {
    it('should accept an explicit schema', () => {
        const penguins = ty.relation('penguins', {
            species: 'string' as const,
            year: 'int32' as const,
            bill_length_mm: 'float64' as const,
        })

        expectTypeOf(penguins).toMatchTypeOf<ty.Relation<{
            species: 'string'
            year: 'int32'
            bill_length_mm: 'float64'
        }>>()
    })

    it('should track schema through group and agg', () => {
        const penguins = ty.relation('penguins', {
            species: 'string' as const,
            year: 'int32' as const,
            bill_length_mm: 'float64' as const,
        })

        const result = penguins.group(
            r => [r.col('species'), r.col('year')],
            g => g.agg({
                count: ty.count(),
                mean_bill: g.col('bill_length_mm').mean(),
            })
        )

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: 'string'
            year: 'int32'
            count: 'int64'
            mean_bill: 'float64'
        }>>()
    })

    it('should track schema through derive', () => {
        const penguins = ty.relation('penguins', {
            species: 'string' as const,
            bill_length_mm: 'float64' as const,
        })

        const result = penguins.derive(r => ({
            ratio: r.col('bill_length_mm').div(40),
        }))

        expectTypeOf(result).toMatchTypeOf<ty.Relation<{
            species: 'string'
            bill_length_mm: 'float64'
            ratio: 'float64'
        }>>()
    })

    it('string columns should have string methods', () => {
        const r = ty.relation('t', { name: 'string' as const })
        const nameCol = r.col('name')
        // StringCol should have upper/lower/contains/startsWith
        expectTypeOf(nameCol.upper()).toMatchTypeOf<ty.IExpr<'string', 'columnar'>>()
        expectTypeOf(nameCol.lower()).toMatchTypeOf<ty.IExpr<'string', 'columnar'>>()
        expectTypeOf(nameCol.contains('x')).toMatchTypeOf<ty.IExpr<'boolean', 'columnar'>>()
    })

    it('numeric columns should have comparison methods', () => {
        const numCol = ty.col('age', 'int32')
        expectTypeOf(numCol.gt(5)).toMatchTypeOf<ty.IExpr<'boolean', 'columnar'>>()
        expectTypeOf(numCol.div(2)).toMatchTypeOf<ty.IExpr<'float64', 'columnar'>>()
    })
})
