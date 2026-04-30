import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'
import * as ops from '../src/value/ops.js'

describe('Comparison Operations', () => {
    const table = ty.table('data', {
        f64a: 'float64',
        f64b: 'float64',
        name: 'string',
    })

    describe('equality', () => {
        it('should have basic functionality for eq', () => {
            const q = table.derive(r => ({ is_five: r.col('f64a').eq(5) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_five = f64a == 5
              }"
            `)
            expect(q.col('is_five').dtype()).toEqual({ typecode: 'boolean' })
            expect(q.col('is_five').dshape()).toEqual('columnar')
            expectTypeOf(q.col('is_five').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_five').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have columnar shape when comparing columnar == scalar', () => {
            const e = table.col("f64a").eq(5)
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })
        it('should have columnar shape when comparing scalar == columnar', () => {
            const e = ty.lit(5).eq(table.col("f64a"))
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })

        it('should have scalar shape when comparing scalar == scalar', () => {
            const e = ty.lit(5).eq(10)
            expect(e.dshape()).toBe('scalar')
            expectTypeOf(e.dshape()).toEqualTypeOf<'scalar'>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })

        it('should have columnar shape when comparing columnar == columnar', () => {
            const e = table.col("f64a").eq(table.col("f64b"))
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })

        it('should error when comparing incompatible types', () => {
            // @ts-expect-error
            expect(() => ty.lit(5).eq("hello")).toThrow()
            // @ts-expect-error
            expect(() => table.col("f64a").eq(table.col("name"))).toThrow()
            // @ts-expect-error
            expect(() => table.col("f64a").eq("hello")).toThrow()
        })
    })

    describe('greater than', () => {
        it('should have basic functionality for gt', () => {
            const q = table.derive(r => ({ is_greater: r.col('f64a').gt(5) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_greater = f64a > 5
              }"
            `)
            expectTypeOf(q.col('is_greater').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_greater').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('f64a', 'float64')
            const scalar = new ops.FloatLiteralOp(10)
            const op = new ops.GtOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
        })
    })

    describe('greater than or equal', () => {
        it('should have basic functionality for gte', () => {
            const q = table.derive(r => ({ is_gte: r.col('f64a').gte(10) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_gte = f64a >= 10
              }"
            `)
            expectTypeOf(q.col('is_gte').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_gte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(10)
            const op = new ops.GteOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('less than', () => {
        it('should have basic functionality for lt', () => {
            const q = table.derive(r => ({ is_less: r.col('f64a').lt(20) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_less = f64a < 20
              }"
            `)
            expectTypeOf(q.col('is_less').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_less').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('f64a', 'float64')
            const scalar = new ops.FloatLiteralOp(20)
            const op = new ops.LtOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('less than or equal', () => {
        it('should have basic functionality for lte', () => {
            const q = table.derive(r => ({ is_lte: r.col('f64a').lte(20) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_lte = f64a <= 20
              }"
            `)
            expectTypeOf(q.col('is_lte').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_lte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('f64a', 'float64')
            const scalar = new ops.FloatLiteralOp(20)
            const op = new ops.LteOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('combined comparisons', () => {
        it('should handle complex filter expressions', () => {
            const q = table.filter(r =>
                r.col('f64a').gt(10).and(r.col('f64b').lt(20))
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              filter (f64a > 10) && (f64b < 20)"
            `)
        })

        it('should handle or expressions', () => {
            const q = table.filter(r =>
                r.col('f64a').gt(100).or(r.col('f64b').lt(5))
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              filter (f64a > 100) || (f64b < 5)"
            `)
        })
    })
})