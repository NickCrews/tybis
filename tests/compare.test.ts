import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import { isComparable, coerceToComparable } from '../src/value/compare.js'
import * as ty from '../src/index.js'

describe('isComparable()', () => {
    it('returns true for same typecodes', () => {
        expect(isComparable({ typecode: 'string' }, { typecode: 'string' })).toBe(true)
        expect(isComparable({ typecode: 'boolean' }, { typecode: 'boolean' })).toBe(true)
        expect(isComparable({ typecode: 'date' }, { typecode: 'date' })).toBe(true)
        expect(isComparable({ typecode: 'time' }, { typecode: 'time' })).toBe(true)
        expect(isComparable({ typecode: 'datetime' }, { typecode: 'datetime' })).toBe(true)
        expect(isComparable({ typecode: 'uuid' }, { typecode: 'uuid' })).toBe(true)
        expect(isComparable({ typecode: 'interval' }, { typecode: 'interval' })).toBe(true)
        expect(isComparable({ typecode: 'int', size: 32 }, { typecode: 'int', size: 32 })).toBe(true)
        expect(isComparable({ typecode: 'float', size: 64 }, { typecode: 'float', size: 64 })).toBe(true)
    })

    it('returns true when comparing int and float (cross-numeric)', () => {
        expect(isComparable({ typecode: 'int', size: 32 }, { typecode: 'float', size: 64 })).toBe(true)
        expect(isComparable({ typecode: 'float', size: 32 }, { typecode: 'int', size: 64 })).toBe(true)
        expect(isComparable({ typecode: 'int', size: 64 }, { typecode: 'int', size: 32 })).toBe(true)
    })

    it('returns false for incompatible types', () => {
        expect(isComparable({ typecode: 'string' }, { typecode: 'boolean' })).toBe(false)
        expect(isComparable({ typecode: 'string' }, { typecode: 'int', size: 64 })).toBe(false)
        expect(isComparable({ typecode: 'date' }, { typecode: 'datetime' })).toBe(false)
        expect(isComparable({ typecode: 'int', size: 32 }, { typecode: 'string' })).toBe(false)
    })
})

describe('coerceToComparable()', () => {
    it('coerces a JS literal value to an op', () => {
        const target = { typecode: 'float', size: 64 } as const
        const result = coerceToComparable(target, 42)
        expect(result.dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(result.dshape()).toBe('scalar')
    })

    it('coerces a string literal for string target', () => {
        const target = { typecode: 'string' } as const
        const result = coerceToComparable(target, 'hello')
        expect(result.dtype()).toEqual({ typecode: 'string' })
        expect(result.dshape()).toBe('scalar')
    })

    it('accepts a compatible Expr and returns its op', () => {
        const target = { typecode: 'float', size: 64 } as const
        const expr = ty.lit(10.5)
        const result = coerceToComparable(target, expr)
        expect(result.dtype().typecode).toBe('float')
        expect(result.dshape()).toBe('scalar')
    })

    it('accepts a compatible float Expr and returns its op', () => {
        const target = { typecode: 'float', size: 64 } as const
        const expr = ty.lit(3.14)
        const result = coerceToComparable(target, expr)
        expect(result.dtype().typecode).toBe('float')
        expect(result.dshape()).toBe('scalar')
    })

    it('accepts an int Expr when target is float (cross-numeric)', () => {
        const target = { typecode: 'float', size: 64 } as const
        const expr = ty.lit(5, 'int32')
        const result = coerceToComparable(target, expr)
        expect(result.dtype().typecode).toBe('int')
    })

    it('throws when expr dtype is incompatible with target', () => {
        const target = { typecode: 'float', size: 64 } as const
        const incompatibleExpr = ty.lit('hello')
        // @ts-expect-error — string expr is not comparable to float
        expect(() => coerceToComparable(target, incompatibleExpr)).toThrow('Cannot compare')
    })

    it('throws when op dtype is incompatible with target', () => {
        const target = { typecode: 'string' } as const
        const float64 = ty.lit(42)
        // @ts-expect-error — float op is not comparable to string
        expect(() => coerceToComparable(target, float64)).toThrow('Cannot compare')
    })
})
