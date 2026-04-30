import { describe, it, expect } from 'vitest'
import { isVOp, isVExpr, IsVOpSymbol, IsVExprSymbol } from './core.js'
import * as ty from '../index.js'
import * as ops from './ops.js'

describe('isOp()', () => {
    describe('symbol-based detection', () => {
        it('returns true for objects with IsOpSymbol = true', () => {
            const op = new ops.FloatLiteralOp(42)
            expect(isVOp(op)).toBe(true)
        })

        it('returns false for objects with IsOpSymbol = false', () => {
            const fakeOp = { [IsVOpSymbol]: false, kind: 'fake', dtype: () => ({ typecode: 'float', size: 64 }), dshape: () => 'scalar' }
            expect(isVOp(fakeOp)).toBe(false)
        })
    })

    describe('fallback duck-type detection', () => {
        it('returns true for objects with kind, valid dtype(), valid dshape(), and toExpr()', () => {
            const obj = {
                kind: 'fake_op',
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'scalar',
                toExpr: () => ty.lit('test'),
            }
            expect(isVOp(obj)).toBe(true)
        })

        it('returns false for objects missing toExpr()', () => {
            const obj = {
                kind: 'fake_op',
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'scalar',
            }
            expect(isVOp(obj)).toBe(false)
        })

        it('returns false when kind is missing', () => {
            const obj = {
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'scalar',
            }
            expect(isVOp(obj)).toBe(false)
        })

        it('returns false when dtype() returns an invalid datatype', () => {
            const obj = {
                kind: 'fake',
                dtype: () => ({ typecode: 'unknown_type' }),
                dshape: () => 'scalar',
            }
            expect(isVOp(obj)).toBe(false)
        })

        it('returns false when dshape() returns an invalid shape', () => {
            const obj = {
                kind: 'fake',
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'invalid_shape',
            }
            expect(isVOp(obj)).toBe(false)
        })

        it('returns false for null', () => {
            expect(isVOp(null)).toBe(false)
        })

        it('returns false for primitives', () => {
            expect(isVOp(42)).toBe(false)
            expect(isVOp('hello')).toBe(false)
            expect(isVOp(true)).toBe(false)
            expect(isVOp(undefined)).toBe(false)
        })

        it('returns false for plain objects missing dtype/dshape', () => {
            expect(isVOp({})).toBe(false)
        })
    })

    describe('with real ops', () => {
        it('recognizes ColRefOp', () => {
            expect(isVOp(new ops.ColRefOp('name', 'string'))).toBe(true)
        })

        it('recognizes IntLiteralOp', () => {
            expect(isVOp(new ops.IntLiteralOp(10))).toBe(true)
        })

        it('recognizes StringLiteralOp', () => {
            expect(isVOp(new ops.StringLiteralOp('hello'))).toBe(true)
        })
    })

    it('does not recognize an Expr as an Op', () => {
        const result = isVOp(ty.lit(42))
        expect(result).toBe(false)
    })
})

describe('isExpr()', () => {
    describe('symbol-based detection', () => {
        it('returns true for objects with IsExprSymbol = true', () => {
            const expr = ty.lit('hello')
            expect(isVExpr(expr)).toBe(true)
        })

        it('returns false for objects with IsExprSymbol = false', () => {
            const fakeExpr = {
                [IsVExprSymbol]: false,
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'scalar',
            }
            expect(isVExpr(fakeExpr)).toBe(false)
        })
    })

    describe('fallback duck-type detection', () => {
        it('returns false for objects with valid dtype() and valid dshape() but missing toOp()', () => {
            const obj = {
                dtype: () => ({ typecode: 'boolean' }),
                dshape: () => 'columnar',
            }
            expect(isVExpr(obj)).toBe(false)
        })

        it('returns true for objects with valid dtype(), valid dshape(), and toOp()', () => {
            const obj = {
                dtype: () => ({ typecode: 'boolean' }),
                dshape: () => 'columnar',
                toOp: () => new ops.BooleanLiteralOp(true),
            }
            expect(isVExpr(obj)).toBe(true)
        })

        it('returns false when dtype() returns an invalid datatype', () => {
            const obj = {
                dtype: () => ({ typecode: 'not_a_real_type' }),
                dshape: () => 'scalar',
            }
            expect(isVExpr(obj)).toBe(false)
        })

        it('returns false when dshape() returns an invalid shape', () => {
            const obj = {
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'wrong',
            }
            expect(isVExpr(obj)).toBe(false)
        })

        it('returns false for null', () => {
            expect(isVExpr(null)).toBe(false)
        })

        it('returns false for primitives', () => {
            expect(isVExpr(42)).toBe(false)
            expect(isVExpr('hello')).toBe(false)
        })

        it('returns false for plain objects missing required methods', () => {
            expect(isVExpr({})).toBe(false)
        })
    })

    describe('with real expressions', () => {
        it('recognizes lit() result', () => {
            expect(isVExpr(ty.lit(42))).toBe(true)
        })

        it('recognizes col() result', () => {
            expect(isVExpr(ty.col('name', 'string'))).toBe(true)
        })

        it('does not recognize an Op as an Expr', () => {
            const op = new ops.StringLiteralOp('hello')
            const result = isVExpr(op)
            expect(result).toBe(false)
        })
    })
})
