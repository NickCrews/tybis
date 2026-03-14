import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'
import * as ops from '../src/value/ops.js'

describe('Numeric Operations', () => {
    const table = ty.relation('nums', {
        x: 'float64',
        y: 'float64',
    })

    describe('addition', () => {
        it('should generate correct PRQL for columnar + scalar', () => {
            const q = table.derive(r => ({
                result: r.col('x').add(5)
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from nums
              derive {
                result = x + 5
              }"
            `)
        })

        it('should generate correct PRQL for columnar + columnar', () => {
            const q = table.derive(r => ({
                result: r.col('x').add(r.col('y'))
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from nums
              derive {
                result = x + y
              }"
            `)
        })

        it('should have columnar shape when adding columnar + scalar', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(5)
            const op = new ops.AddOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have columnar shape when adding scalar + columnar', () => {
            const scalar = new ops.FloatLiteralOp(5)
            const col = new ops.ColRefOp('x', 'float64')
            const op = new ops.AddOp(scalar, col)
            expect(op.dshape()).toBe('columnar')
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when adding scalar + scalar', () => {
            const scalar1 = new ops.FloatLiteralOp(5)
            const scalar2 = new ops.FloatLiteralOp(10)
            const op = new ops.AddOp(scalar1, scalar2)
            expect(op.dshape()).toBe('scalar')
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('should have columnar shape when adding columnar + columnar', () => {
            const col1 = new ops.ColRefOp('x', 'float64')
            const col2 = new ops.ColRefOp('y', 'float64')
            const op = new ops.AddOp(col1, col2)
            expect(op.dshape()).toBe('columnar')
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('subtraction', () => {
        it('should generate correct PRQL for subtraction', () => {
            const q = table.derive(r => ({
                result: r.col('x').sub(r.col('y'))
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from nums
              derive {
                result = x - y
              }"
            `)
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(5)
            const op = new ops.SubOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('multiplication', () => {
        it('should generate correct PRQL for multiplication', () => {
            const q = table.derive(r => ({
                result: r.col('x').mul(2)
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from nums
              derive {
                result = x * 2
              }"
            `)
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(2)
            const op = new ops.MulOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })

    describe('division', () => {
        it('should generate correct PRQL for division', () => {
            const q = table.derive(r => ({
                result: r.col('x').div(r.col('y'))
            }))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from nums
              derive {
                result = x / y
              }"
            `)
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(2)
            const op = new ops.DivOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
        })
    })
})
