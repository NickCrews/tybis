import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'
import * as dt from '../datatype.js'
import * as ops from './ops.js'
import { StringLiteralOp } from './lit.js'

describe('String Operations', () => {
    describe('upper', () => {
        it('should preserve shape from operand', () => {
            const col = new ops.ColRefOp('name', 'string')
            const op = new ops.UpperOp(col)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
        })

        it('should work with scalar strings', () => {
            const scalar = new StringLiteralOp('hello')
            const op = new ops.UpperOp(scalar)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
        })

        it('on a relation column produces a columnar string expr', () => {
            const r = ty.table('t', { name: 'string' })
            const e = r.col('name').upper()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('on a literal produces a scalar string expr', () => {
            const e = ty.lit('hello').upper()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('scalar')
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
            expectTypeOf(e.dshape()).toEqualTypeOf<'scalar'>()
        })
    })

    describe('lower', () => {
        it('should preserve shape from operand', () => {
            const col = new ops.ColRefOp('name', 'string')
            const op = new ops.LowerOp(col)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
        })

        it('should work with scalar strings', () => {
            const scalar = new StringLiteralOp('HELLO')
            const op = new ops.LowerOp(scalar)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'string' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
        })

        it('on a relation column produces a columnar string expr', () => {
            const r = ty.table('t', { name: 'string' })
            const e = r.col('name').lower()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('on a literal produces a scalar string expr', () => {
            const e = ty.lit('HELLO').lower()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('scalar')
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'string' }>()
            expectTypeOf(e.dshape()).toEqualTypeOf<'scalar'>()
        })
    })

    describe('contains', () => {
        it('should have columnar shape when operand is columnar', () => {
            const col = new ops.ColRefOp('email', 'string')
            const pattern = new StringLiteralOp('gmail')
            const op = new ops.ContainsOp(col, pattern)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('should have scalar shape when operand is scalar', () => {
            const str = new StringLiteralOp('hello@gmail.com')
            const pattern = new StringLiteralOp('gmail')
            const op = new ops.ContainsOp(str, pattern)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('on a relation column produces a columnar boolean expr', () => {
            const r = ty.table('t', { name: 'string', other: 'string' })
            const e = r.col('name').contains('x')
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(e.dshape()).toEqualTypeOf<'columnar'>()


            const e2 = r.col('name').contains(r.col('other'))
            expect(e2.dtype()).toEqual({ typecode: 'boolean' })
            expect(e2.dshape()).toBe('columnar')
            expectTypeOf(e2.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(e2.dshape()).toEqualTypeOf<'columnar'>()
        })

        it('correctly handles highest shape in type system', () => {
            const r = ty.table('t', { name: 'string' })
            const scalar = ty.lit('x')
            const col = r.col('name')

            const e1 = scalar.contains(col)
            expectTypeOf(e1.dshape()).toEqualTypeOf<'columnar'>()

            const e2 = col.contains(scalar)
            expectTypeOf(e2.dshape()).toEqualTypeOf<'columnar'>()

            const e3 = scalar.contains('y')
            expectTypeOf(e3.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('on a literal produces a scalar boolean expr', () => {
            const e = ty.lit('hello').contains('ell')
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('scalar')
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(e.dshape()).toEqualTypeOf<'scalar'>()
        })

        it('should work with a non-literal pattern', () => {
            const col = new ops.ColRefOp('email', 'string')
            const pattern = new ops.ColRefOp('domain', 'string')
            const op = new ops.ContainsOp(col, pattern)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })
    })

    describe('startsWith', () => {
        it('should have columnar shape when operand is columnar', () => {
            const col = new ops.ColRefOp('name', 'string')
            const prefix = new StringLiteralOp('Dr.')
            const op = new ops.StartsWithOp(col, prefix)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })

        it('should have scalar shape when operand is scalar', () => {
            const str = new StringLiteralOp('Dr. Smith')
            const prefix = new StringLiteralOp('Dr.')
            const op = new ops.StartsWithOp(str, prefix)
            expect(op.dshape()).toBe('scalar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'scalar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })

        it('should work with a non-literal prefix', () => {
            const col = new ops.ColRefOp('name', 'string')
            const prefix = new ops.ColRefOp('title', 'string')
            const op = new ops.StartsWithOp(col, prefix)
            expect(op.dshape()).toBe('columnar')
            expect(op.dtype()).toEqual({ typecode: 'boolean' })
            expectTypeOf(op.dshape()).toEqualTypeOf<'columnar'>()
            expectTypeOf(op.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })

        it('on a relation column produces a columnar boolean expr', () => {
            const r = ty.table('t', { name: 'string', title: 'string' })
            const e = r.col('name').startsWith('Dr.')
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('columnar')
            expectTypeOf(e).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            const e2 = r.col('name').startsWith(r.col('title'))
            expect(e2.dtype()).toEqual({ typecode: 'boolean' })
            expect(e2.dshape()).toBe('columnar')
            expectTypeOf(e2).toMatchTypeOf<ty.IVExpr<dt.DTBoolean, 'columnar'>>()
            expectTypeOf(e2.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
        })

        it('on a literal produces a scalar boolean expr', () => {
            const e = ty.lit('Dr. Smith').startsWith('Dr.')
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('scalar')
            expectTypeOf(e.dtype()).toEqualTypeOf<{ typecode: 'boolean' }>()
            expectTypeOf(e.dshape()).toEqualTypeOf<'scalar'>()
        })
    })
})
