import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

describe('Comparison Operations', () => {
    const table = ty.relation('data', {
        x: 'float64',
        y: 'float64',
        name: 'string',
    } as const)

    describe('equality', () => {
        it('should have basic functionality for eq', () => {
            const q = table.derive(r => ({ is_five: r.col('x').eq(5) }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from data
              derive {
                is_five = x == 5
              }"
            `)
            expectTypeOf(q.col('is_five').dtype()).toEqualTypeOf<'boolean'>()
            expectTypeOf(q.col('is_five').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have columnar shape when comparing columnar == scalar', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.NumberLiteralOp(5)
            const op = new ty.ops.EqOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when comparing scalar == scalar', () => {
            const scalar1 = new ty.ops.NumberLiteralOp(5)
            const scalar2 = new ty.ops.NumberLiteralOp(10)
            const op = new ty.ops.EqOp(scalar1, scalar2)
            expect(op.dshape()).toBe('scalar')
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('should have columnar shape when comparing columnar == columnar', () => {
            const col1 = new ty.ops.ColRefOp('x', 'float64')
            const col2 = new ty.ops.ColRefOp('y', 'float64')
            const op = new ty.ops.EqOp(col1, col2)
            expect(op.dshape()).toBe('columnar')
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should return boolean type', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.NumberLiteralOp(5)
            const op = new ty.ops.EqOp(col, scalar)
            expect(op.dtype()).toBe('boolean')
            expectTypeOf(op.dtype()).toEqualTypeOf<'boolean'>()
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
            expectTypeOf(q.col('is_greater').dtype()).toEqualTypeOf<'boolean'>()
            expectTypeOf(q.col('is_greater').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.NumberLiteralOp(10)
            const op = new ty.ops.GtOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toBe('boolean')
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
            expectTypeOf(q.col('is_gte').dtype()).toEqualTypeOf<'boolean'>()
            expectTypeOf(q.col('is_gte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.NumberLiteralOp(10)
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
            expectTypeOf(q.col('is_less').dtype()).toEqualTypeOf<'boolean'>()
            expectTypeOf(q.col('is_less').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.NumberLiteralOp(20)
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
            expectTypeOf(q.col('is_lte').dtype()).toEqualTypeOf<'boolean'>()
            expectTypeOf(q.col('is_lte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ty.ops.ColRefOp('x', 'float64')
            const scalar = new ty.ops.NumberLiteralOp(20)
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
