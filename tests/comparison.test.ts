import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('Comparison Operations', () => {
    const table = ty.relation('data', {
        x: 'float64',
        y: 'float64',
        name: 'string',
    })

    describe('equality', () => {
        it('should have basic functionality for eq', () => {
            const q = table.derive(r => ({ is_five: r.col('x').eq(5) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_five = x == 5
              }"
            `)
            expect(q.col('is_five').dtype()).toEqual({ typecode: 'boolean' })
            expect(q.col('is_five').dshape()).toEqual('columnar')
            expectTypeOf(q.col('is_five').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_five').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have columnar shape when comparing columnar == scalar', () => {
            const e = table.col("x").eq(5)
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })
        it('should have columnar shape when comparing scalar == columnar', () => {
            const e = ty.lit(5).eq(table.col("x"))
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
            const e = table.col("x").eq(table.col("y"))
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })
    })

    describe('greater than', () => {
        it('should have basic functionality for gt', () => {
            const q = table.derive(r => ({ is_greater: r.col('x').gt(5) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_greater = x > 5
              }"
            `)
            // @ts-expect-error typecode literal type mismatch in type assertion
            expectTypeOf(q.col('is_greater').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_greater').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.FloatLiteralOp(10)
            const op = new ty.ops.GtOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
        })
    })

    describe('greater than or equal', () => {
        it('should have basic functionality for gte', () => {
            const q = table.derive(r => ({ is_gte: r.col('x').gte(10) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_gte = x >= 10
              }"
            `)
            // @ts-expect-error typecode literal type mismatch in type assertion
            expectTypeOf(q.col('is_gte').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_gte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.FloatLiteralOp(10)
            const op = new ty.ops.GteOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('less than', () => {
        it('should have basic functionality for lt', () => {
            const q = table.derive(r => ({ is_less: r.col('x').lt(20) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_less = x < 20
              }"
            `)
            // @ts-expect-error typecode literal type mismatch in type assertion
            expectTypeOf(q.col('is_less').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_less').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.FloatLiteralOp(20)
            const op = new ty.ops.LtOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('less than or equal', () => {
        it('should have basic functionality for lte', () => {
            const q = table.derive(r => ({ is_lte: r.col('x').lte(20) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_lte = x <= 20
              }"
            `)
            // @ts-expect-error typecode literal type mismatch in type assertion
            expectTypeOf(q.col('is_lte').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_lte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.FloatLiteralOp(20)
            const op = new ty.ops.LteOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('combined comparisons', () => {
        it('should handle complex filter expressions', () => {
            const q = table.filter(r =>
                r.col('x').gt(10).and(r.col('y').lt(20))
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              filter (x > 10) && (y < 20)"
            `)
        })

        it('should handle or expressions', () => {
            const q = table.filter(r =>
                r.col('x').gt(100).or(r.col('y').lt(5))
            )
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              filter (x > 100) || (y < 5)"
            `)
        })
    })
})
