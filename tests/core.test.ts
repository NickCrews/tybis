import { describe, it, expect } from 'vitest'
import { isOp, isExpr, IsOpSymbol, IsExprSymbol } from '../src/value/core.js'
import * as ty from '../src/index.js'
import * as ops from '../src/value/ops.js'

describe('isOp()', () => {
    describe('symbol-based detection', () => {
        it('returns true for objects with IsOpSymbol = true', () => {
            const op = new ops.FloatLiteralOp(42)
            expect(isOp(op)).toBe(true)
        })

        it('returns false for objects with IsOpSymbol = false', () => {
            const fakeOp = { [IsOpSymbol]: false, kind: 'fake', dtype: () => ({ typecode: 'float', size: 64 }), dshape: () => 'scalar' }
            expect(isOp(fakeOp)).toBe(false)
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
            expect(isOp(obj)).toBe(true)
        })

        it('returns false for objects missing toExpr()', () => {
            const obj = {
                kind: 'fake_op',
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'scalar',
            }
            expect(isOp(obj)).toBe(false)
        })

        it('returns false when kind is missing', () => {
            const obj = {
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'scalar',
            }
            expect(isOp(obj)).toBe(false)
        })

        it('returns false when dtype() returns an invalid datatype', () => {
            const obj = {
                kind: 'fake',
                dtype: () => ({ typecode: 'unknown_type' }),
                dshape: () => 'scalar',
            }
            expect(isOp(obj)).toBe(false)
        })

        it('returns false when dshape() returns an invalid shape', () => {
            const obj = {
                kind: 'fake',
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'invalid_shape',
            }
            expect(isOp(obj)).toBe(false)
        })

        it('returns false for null', () => {
            expect(isOp(null)).toBe(false)
        })

        it('returns false for primitives', () => {
            expect(isOp(42)).toBe(false)
            expect(isOp('hello')).toBe(false)
            expect(isOp(true)).toBe(false)
            expect(isOp(undefined)).toBe(false)
        })

        it('returns false for plain objects missing dtype/dshape', () => {
            expect(isOp({})).toBe(false)
        })
    })

    describe('with real ops', () => {
        it('recognizes ColRefOp', () => {
            expect(isOp(new ops.ColRefOp('name', 'string'))).toBe(true)
        })

        it('recognizes IntLiteralOp', () => {
            expect(isOp(new ops.IntLiteralOp(10))).toBe(true)
        })

        it('recognizes StringLiteralOp', () => {
            expect(isOp(new ops.StringLiteralOp('hello'))).toBe(true)
        })
    })

    it('does not recognize an Expr as an Op', () => {
        const result = isOp(ty.lit(42))
        expect(result).toBe(false)
    })
})

describe('isExpr()', () => {
    describe('symbol-based detection', () => {
        it('returns true for objects with IsExprSymbol = true', () => {
            const expr = ty.lit('hello')
            expect(isExpr(expr)).toBe(true)
        })

        it('returns false for objects with IsExprSymbol = false', () => {
            const fakeExpr = {
                [IsExprSymbol]: false,
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'scalar',
            }
            expect(isExpr(fakeExpr)).toBe(false)
        })
    })

    describe('fallback duck-type detection', () => {
        it('returns false for objects with valid dtype() and valid dshape() but missing toOp()', () => {
            const obj = {
                dtype: () => ({ typecode: 'boolean' }),
                dshape: () => 'columnar',
            }
            expect(isExpr(obj)).toBe(false)
        })

        it('returns true for objects with valid dtype(), valid dshape(), and toOp()', () => {
            const obj = {
                dtype: () => ({ typecode: 'boolean' }),
                dshape: () => 'columnar',
                toOp: () => new ops.BooleanLiteralOp(true),
            }
            expect(isExpr(obj)).toBe(true)
        })

        it('returns false when dtype() returns an invalid datatype', () => {
            const obj = {
                dtype: () => ({ typecode: 'not_a_real_type' }),
                dshape: () => 'scalar',
            }
            expect(isExpr(obj)).toBe(false)
        })

        it('returns false when dshape() returns an invalid shape', () => {
            const obj = {
                dtype: () => ({ typecode: 'string' }),
                dshape: () => 'wrong',
            }
            expect(isExpr(obj)).toBe(false)
        })

        it('returns false for null', () => {
            expect(isExpr(null)).toBe(false)
        })

        it('returns false for primitives', () => {
            expect(isExpr(42)).toBe(false)
            expect(isExpr('hello')).toBe(false)
        })

        it('returns false for plain objects missing required methods', () => {
            expect(isExpr({})).toBe(false)
        })
    })

    describe('with real expressions', () => {
        it('recognizes lit() result', () => {
            expect(isExpr(ty.lit(42))).toBe(true)
        })

        it('recognizes col() result', () => {
            expect(isExpr(ty.col('name', 'string'))).toBe(true)
        })

        it('does not recognize an Op as an Expr', () => {
            const op = new ops.StringLiteralOp('hello')
            const result = isExpr(op)
            expect(result).toBe(false)
        })
    })
})
