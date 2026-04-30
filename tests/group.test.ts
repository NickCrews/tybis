import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'
import * as dt from '../src/datatype.js'

describe('Group aggregation', () => {
    const penguins = ty.table('penguins', {
        species: 'string',
        year: 'int32',
        bill_length_mm: 'float64',
    })

    it('should accept scalar expressions in agg() and produce correct schema', () => {
        const q = penguins.group(
            _r => ({ species: true }),
            g => g.agg({
                count: ty.count(),
                mean_bill: g.col('bill_length_mm').mean(),
                max_bill: g.col('bill_length_mm').max(),
                sum_bill: g.col('bill_length_mm').sum(),
            })
        )
        expectTypeOf(q.col('species')).toEqualTypeOf<ty.VExpr<dt.DTString, 'columnar'>>()
        expectTypeOf(q.col('count')).toEqualTypeOf<ty.VExpr<dt.DTInt64, 'columnar'>>()
        expectTypeOf(q.col('mean_bill')).toEqualTypeOf<ty.VExpr<dt.DTFloat64, 'columnar'>>()
        expectTypeOf(q.col('max_bill')).toEqualTypeOf<ty.VExpr<dt.DTFloat64, 'columnar'>>()
        expectTypeOf(q.col('sum_bill')).toEqualTypeOf<ty.VExpr<dt.DTFloat64, 'columnar'>>()
    })

    it('should support renames and expressions in keys', () => {
        const q = penguins.group(
            r => ({
                kind: r.col('species'),
                decade: r.col('year').div(10)
            }),
            g => g.agg({ count: ty.count() })
        )
        expectTypeOf(q.col('kind')).toEqualTypeOf<ty.VExpr<dt.DTString, 'columnar'>>()
        expectTypeOf(q.col('decade')).toEqualTypeOf<ty.VExpr<dt.DTFloat64, 'columnar'>>()
    })

    it('should throw runtime and type error when passing columnar expression to agg()', () => {
        expect(() => {
            penguins.group(
                _r => ({ species: true }),
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
                _r => ({ species: true }),
                g => g.agg({
                    // @ts-expect-error - This is intentionally wrong to test runtime validation
                    uppercased: g.col('species').upper()
                })
            )
        }).toThrow(/must be a scalar expression/)
    })

    it('should throw when no keys are provided', () => {
        expect(() => {
            penguins.group(
                // @ts-expect-error - This is intentionally wrong to test runtime validation
                () => ({}),
                g => g.agg({ count: ty.count() })
            )
        }).toThrow(/requires at least one grouping key/)
    })
})
