import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'
import * as dt from '../datatype.js'
import * as ops from './ops.js'

describe('String Operations', () => {
    describe('upper', () => {
        it('should preserve shape from operand', () => {
            const col = new ops.ColRefOp('name', 'string')
            const op = new ops.UpperOp(col)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should work with scalar strings', () => {
            const scalar = new ops.StringLiteralOp('hello')
            const op = new ops.UpperOp(scalar)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('on a relation column produces a columnar string expr', () => {
            const r = ty.table('t', { name: 'string' })
            const e = r.col('name').upper()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e).toMatchTypeOf<ty.IVExpr<dt.DTString, 'columnar'>>()
        })
    })

    describe('lower', () => {
        it('should preserve shape from operand', () => {
            const col = new ops.ColRefOp('name', 'string')
            const op = new ops.LowerOp(col)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should work with scalar strings', () => {
            const scalar = new ops.StringLiteralOp('HELLO')
            const op = new ops.LowerOp(scalar)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('on a relation column produces a columnar string expr', () => {
            const r = ty.table('t', { name: 'string' })
            const e = r.col('name').lower()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e).toMatchTypeOf<ty.IVExpr<dt.DTString, 'columnar'>>()
        })
    })

    describe('contains', () => {
        it('should have columnar shape when operand is columnar', () => {
            const col = new ops.ColRefOp('email', 'string')
            const pattern = new ops.StringLiteralOp('gmail')
            const op = new ops.ContainsOp(col, pattern)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when operand is scalar', () => {
            const str = new ops.StringLiteralOp('hello@gmail.com')
            const pattern = new ops.StringLiteralOp('gmail')
            const op = new ops.ContainsOp(str, pattern)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('on a relation column produces a columnar boolean expr', () => {
            const r = ty.table('t', { name: 'string' })
            const e = r.col('name').contains('x')
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
        })
    })

    describe('startsWith', () => {
        it('should have columnar shape when operand is columnar', () => {
            const col = new ops.ColRefOp('name', 'string')
            const prefix = new ops.StringLiteralOp('Dr.')
            const op = new ops.StartsWithOp(col, prefix)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when operand is scalar', () => {
            const str = new ops.StringLiteralOp('Dr. Smith')
            const prefix = new ops.StringLiteralOp('Dr.')
            const op = new ops.StartsWithOp(str, prefix)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })
    })
})
