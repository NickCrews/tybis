import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ops from './ops.js'

describe('Numeric Operations', () => {
    describe('addition', () => {
        it('should have columnar shape when adding columnar + scalar', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(5)
            const op = new ops.AddOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have columnar shape when adding scalar + columnar', () => {
            const scalar = new ops.FloatLiteralOp(5)
            const col = new ops.ColRefOp('x', 'float64')
            const op = new ops.AddOp(scalar, col)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when adding scalar + scalar', () => {
            const scalar1 = new ops.FloatLiteralOp(5)
            const scalar2 = new ops.FloatLiteralOp(10)
            const op = new ops.AddOp(scalar1, scalar2)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('should have columnar shape when adding columnar + columnar', () => {
            const col1 = new ops.ColRefOp('x', 'float64')
            const col2 = new ops.ColRefOp('y', 'float64')
            const op = new ops.AddOp(col1, col2)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('subtraction', () => {
        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(5)
            const op = new ops.SubOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('multiplication', () => {
        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(2)
            const op = new ops.MulOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('division', () => {
        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new ops.FloatLiteralOp(2)
            const op = new ops.DivOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })
})
