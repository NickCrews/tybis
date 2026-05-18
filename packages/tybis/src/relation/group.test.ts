import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'

describe('Group aggregation', () => {
    const penguins = ty.table('penguins', {
        species: 'string',
        year: 'int32',
        bill_length_mm: 'float64',
    })

    it('should accept scalar expressions in agg() and produce correct schema', () => {
        const q = penguins
            .groupBy(_r => ({ species: true }))
            .agg(r => ({
                count: ty.count(),
                mean_bill: r.bill_length_mm.mean(),
                max_bill: r.bill_length_mm.max(),
                sum_bill: r.bill_length_mm.sum(),
            }))
        const expectedSchema = ty.schema({
            species: 'string',
            count: 'int64',
            mean_bill: 'float64',
            max_bill: 'float64',
            sum_bill: 'float64',
        })
        expectTypeOf(q.schema).toMatchTypeOf(expectedSchema)
        expect(q.schema).toEqual(expectedSchema)
    })

    it('should support renames and expressions in keys', () => {
        const q = penguins
            .groupBy(r => ({
                kind: r.species,
                decade: r.year.div(10),
            }))
            .agg({ count: ty.count() })
        const expectedSchema = ty.schema({
            kind: 'string',
            decade: 'float64',
            count: 'int64',
        })
        expectTypeOf(q.schema).toMatchTypeOf(expectedSchema)
        expect(q.schema).toEqual(expectedSchema)
    })

    it('should throw runtime and type error when passing columnar expression to agg()', () => {
        expect(() => {
            penguins
                .groupBy(_r => ({ species: true }))
                // @ts-expect-error - columnar expr is not assignable to scalar aggregation
                .agg(r => ({
                    bill: r.bill_length_mm,
                }))
        }).toThrow(/must be a scalar expression/)
    })

    it('should throw runtime and type error when passing derived columnar expression to agg()', () => {
        expect(() => {
            penguins
                .groupBy(_r => ({ species: true }))
                // @ts-expect-error - columnar expr is not assignable to scalar aggregation
                .agg(r => ({
                    uppercased: r.species.upper(),
                }))
        }).toThrow(/must be a scalar expression/)
    })

    it('should throw when no keys are provided', () => {
        expect(() => {
            penguins
                // @ts-expect-error - This is intentionally wrong to test runtime validation
                .groupBy(() => ({}))
                .agg({ count: ty.count() })
        }).toThrow(/requires at least one grouping key/)
    })
})
