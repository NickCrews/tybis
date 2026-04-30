import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../index.js'
import * as dt from '../datatype.js'
import * as ops from './ops.js'
import * as vals from './index.js'

describe('isNotNull()', () => {
    it('produces a boolean columnar expr from a columnar column', () => {
        const table = ty.table('data', { name: 'string', x: 'float64' })
        const e = table.col('name').isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e.dtype()).toEqualTypeOf<dt.DTBoolean>()
    })

    it('produces a boolean scalar expr from a scalar literal', () => {
        const e = ty.lit('hello').isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('scalar')
    })
})

describe('isNull()', () => {
    it('produces a boolean columnar expr from a columnar column', () => {
        const table = ty.table('data', { name: 'string', x: 'float64' })
        const e = table.col('name').isNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e.dtype()).toEqualTypeOf<dt.DTBoolean>()
    })
})

describe('min() and max()', () => {
    it('min() returns a scalar expr with same dtype', () => {
        const table = ty.table('data', { score: 'float64' })
        const e = table.col('score').min()
        expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(e.dshape()).toBe('scalar')
    })

    it('max() returns a scalar expr with same dtype', () => {
        const table = ty.table('data', { score: 'float64' })
        const e = table.col('score').max()
        expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(e.dshape()).toBe('scalar')
    })

    it('min() on a string column preserves string dtype', () => {
        const table = ty.table('data', { name: 'string' })
        const e = table.col('name').min()
        expect(e.dtype()).toEqual({ typecode: 'string' })
        expect(e.dshape()).toBe('scalar')
    })
})

describe('BooleanExpr.not()', () => {
    it('produces a boolean expr with same shape', () => {
        const table = ty.table('data', { active: 'boolean' })
        const e = table.col('active').not()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
    })

    it('preserves scalar shape', () => {
        const e = ty.lit(true).not()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('scalar')
    })
})

describe('sql() factory function', () => {
    it('creates a raw SQL expr with given dtype and dshape', () => {
        const e = vals.sql('custom_function(x)', { typecode: 'float', size: 64 }, 'columnar')
        expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(e.dshape()).toBe('columnar')
    })

    it('creates a scalar raw SQL expr', () => {
        const e = vals.sql('COUNT(*)', { typecode: 'int', size: 64 }, 'scalar')
        expect(e.dtype()).toEqual({ typecode: 'int', size: 64 })
        expect(e.dshape()).toBe('scalar')
    })
})

describe('count() factory function', () => {
    it('returns an int64 scalar expr', () => {
        const e = ty.count()
        expect(e.dtype()).toEqual({ typecode: 'int', size: 64 })
        expect(e.dshape()).toBe('scalar')
        expectTypeOf(e.dtype()).toEqualTypeOf<dt.DTInt64>()
        expectTypeOf(e.dshape()).toEqualTypeOf<'scalar'>()
    })
})

describe('opToExpr()', () => {
    it('wraps a NullLiteralOp in a NullExpr', () => {
        const op = new ops.NullLiteralOp()
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'null' })
        expect(expr.dshape()).toBe('scalar')
    })

    it('wraps an IntervalLiteralOp in an IntervalExpr', () => {
        const op = new ops.IntervalLiteralOp(5)
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'interval' })
        expect(expr.dshape()).toBe('scalar')
    })

    it('wraps a UuidLiteralOp in a UUIDExpr', () => {
        const op = new ops.UuidLiteralOp('550e8400-e29b-41d4-a716-446655440000')
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'uuid' })
        expect(expr.dshape()).toBe('scalar')
    })

    it('wraps a BooleanLiteralOp in a BooleanExpr', () => {
        const op = new ops.BooleanLiteralOp(true)
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'boolean' })
    })
})
