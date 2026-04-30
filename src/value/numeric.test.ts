import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ops from './ops.js'
import * as ty from '../index.js'
import { FloatLiteralOp } from './lit.js'

describe('Numeric Operations', () => {
    describe('addition', () => {
        it('should have columnar shape when adding columnar + scalar', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new FloatLiteralOp(5)
            const op = new ops.AddOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have columnar shape when adding scalar + columnar', () => {
            const scalar = new FloatLiteralOp(5)
            const col = new ops.ColRefOp('x', 'float64')
            const op = new ops.AddOp(scalar, col)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when adding scalar + scalar', () => {
            const scalar1 = new FloatLiteralOp(5)
            const scalar2 = new FloatLiteralOp(10)
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
            const scalar = new FloatLiteralOp(5)
            const op = new ops.SubOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('multiplication', () => {
        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new FloatLiteralOp(2)
            const op = new ops.MulOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('division', () => {
        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new FloatLiteralOp(2)
            const op = new ops.DivOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'float', size: 64 })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })
})

describe('Comparison Operations', () => {
    const table = ty.table('data', {
        f64a: 'float64',
        f64b: 'float64',
        name: 'string',
    })

    describe('equality', () => {
        it('should have basic functionality for eq', () => {
            const q = table.derive(r => ({ is_five: r.col('f64a').eq(5) }))
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
            expect(q.col('is_greater').dtype()).toEqual({ typecode: 'boolean' })
            expect(q.col('is_greater').dshape()).toBe('columnar')
            expectTypeOf(q.col('is_greater').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_greater').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('f64a', 'float64')
            const scalar = new FloatLiteralOp(10)
            const op = new ops.GtOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('greater than or equal', () => {
        it('should have basic functionality for gte', () => {
            const q = table.derive(r => ({ is_gte: r.col('f64a').gte(10) }))
            expect(q.col('is_gte').dtype()).toEqual({ typecode: 'boolean' })
            expect(q.col('is_gte').dshape()).toBe('columnar')
            expectTypeOf(q.col('is_gte').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_gte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('x', 'float64')
            const scalar = new FloatLiteralOp(10)
            const op = new ops.GteOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('less than', () => {
        it('should have basic functionality for lt', () => {
            const q = table.derive(r => ({ is_less: r.col('f64a').lt(20) }))
            expect(q.col('is_less').dtype()).toEqual({ typecode: 'boolean' })
            expect(q.col('is_less').dshape()).toBe('columnar')
            expectTypeOf(q.col('is_less').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_less').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('f64a', 'float64')
            const scalar = new FloatLiteralOp(20)
            const op = new ops.LtOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })

    describe('less than or equal', () => {
        it('should have basic functionality for lte', () => {
            const q = table.derive(r => ({ is_lte: r.col('f64a').lte(20) }))
            expect(q.col('is_lte').dtype()).toEqual({ typecode: 'boolean' })
            expect(q.col('is_lte').dshape()).toBe('columnar')
            expectTypeOf(q.col('is_lte').dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(q.col('is_lte').dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have correct shape for mixed shapes', () => {
            const col = new ops.ColRefOp('f64a', 'float64')
            const scalar = new FloatLiteralOp(20)
            const op = new ops.LteOp(col, scalar)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })
    })
})
