import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('Group aggregation', () => {
    const penguins = ty.relation('penguins', {
        species: 'string',
        year: 'int32',
        bill_length_mm: 'float64',
    })

    it('should accept scalar expressions in agg()', () => {
        const q = penguins.group(
            r => [r.col('species')],
            g => g.agg({
                count: ty.count(),
                mean_bill: g.col('bill_length_mm').mean(),
                max_bill: g.col('bill_length_mm').max(),
                sum_bill: g.col('bill_length_mm').sum(),
            })
        )
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from penguins
          group {species} (
            aggregate {
              count = count this,
              mean_bill = average bill_length_mm,
              max_bill = max bill_length_mm,
              sum_bill = sum bill_length_mm
            }
          )"
        `)
        expectTypeOf(q.col('species')).toEqualTypeOf<ty.Expr<ty.dt.DTString, 'columnar'>>()
        expectTypeOf(q.col('count')).toEqualTypeOf<ty.Expr<ty.dt.DTInt64, 'columnar'>>()
        expectTypeOf(q.col('mean_bill')).toEqualTypeOf<ty.Expr<ty.dt.DTFloat64, 'columnar'>>()
        expectTypeOf(q.col('max_bill')).toEqualTypeOf<ty.Expr<ty.dt.DTFloat64, 'columnar'>>()
        expectTypeOf(q.col('sum_bill')).toEqualTypeOf<ty.Expr<ty.dt.DTFloat64, 'columnar'>>()
    })

    it('should throw runtime and type error when passing columnar expression to agg()', () => {
        expect(() => {
            penguins.group(
                r => [r.col('species')],
                g => g.agg({
                    // @ts-expect-error - This is intentionally wrong to test runtime validation
                    bill: g.col('bill_length_mm'),
                })
            )
        }).toThrow(/must be a scalar expression/)
    })

    it('should throw runtime and type error when passing derived columnar expression to agg()', () => {
        expect(() => {
            penguins.group(
                r => [r.col('species')],
                g => g.agg({
                    // @ts-expect-error - This is intentionally wrong to test runtime validation
                    uppercased: g.col('species').upper()
                })
            )
        }).toThrow(/must be a scalar expression/)
    })
})
