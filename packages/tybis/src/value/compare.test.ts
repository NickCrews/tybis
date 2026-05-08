import { describe, it, expect } from 'vitest'
import { isComparable, coerceToComparable } from './compare.js'
import * as ty from '../index.js'

describe('isComparable()', () => {
    it('returns true for same typecodes', () => {
        expect(isComparable({ typecode: 'string', nullable: true }, { typecode: 'string', nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'boolean', nullable: true }, { typecode: 'boolean', nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'date', nullable: true }, { typecode: 'date', nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'time', nullable: true }, { typecode: 'time', nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'datetime', nullable: true }, { typecode: 'datetime', nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'uuid', nullable: true }, { typecode: 'uuid', nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'interval', nullable: true }, { typecode: 'interval', nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'int', size: 32, nullable: true }, { typecode: 'int', size: 32, nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'float', size: 64, nullable: true }, { typecode: 'float', size: 64, nullable: true })).toBe(true)
    })

    it('returns true when comparing int and float (cross-numeric)', () => {
        expect(isComparable({ typecode: 'int', size: 32, nullable: true }, { typecode: 'float', size: 64, nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'float', size: 32, nullable: true }, { typecode: 'int', size: 64, nullable: true })).toBe(true)
        expect(isComparable({ typecode: 'int', size: 64, nullable: true }, { typecode: 'int', size: 32, nullable: true })).toBe(true)
    })

    it('returns false for incompatible types', () => {
        expect(isComparable({ typecode: 'string', nullable: true }, { typecode: 'boolean', nullable: true })).toBe(false)
        expect(isComparable({ typecode: 'string', nullable: true }, { typecode: 'int', size: 64, nullable: true })).toBe(false)
        expect(isComparable({ typecode: 'date', nullable: true }, { typecode: 'datetime', nullable: true })).toBe(false)
        expect(isComparable({ typecode: 'int', size: 32, nullable: true }, { typecode: 'string', nullable: true })).toBe(false)
    })
})

describe('coerceToComparable()', () => {
    it('coerces a JS literal value to an op', () => {
        const target = { typecode: 'float', size: 64, nullable: true } as const
        const result = coerceToComparable(target, 42)
        expect(result.dtype()).toEqual({ typecode: 'float', size: 64, nullable: true })
        expect(result.dshape()).toBe('scalar')
    })

    it('coerces a string literal for string target', () => {
        const target = { typecode: 'string', nullable: true } as const
        const result = coerceToComparable(target, 'hello')
        expect(result.dtype()).toEqual({ typecode: 'string', nullable: true })
        expect(result.dshape()).toBe('scalar')
    })

    it('accepts a compatible Expr and returns its op', () => {
        const target = { typecode: 'float', size: 64, nullable: true } as const
        const expr = ty.lit(10.5)
        const result = coerceToComparable(target, expr)
        expect(result.dtype().typecode).toBe('float')
        expect(result.dshape()).toBe('scalar')
    })

    it('accepts a compatible float Expr and returns its op', () => {
        const target = { typecode: 'float', size: 64, nullable: true } as const
        const expr = ty.lit(3.14)
        const result = coerceToComparable(target, expr)
        expect(result.dtype().typecode).toBe('float')
        expect(result.dshape()).toBe('scalar')
    })

    it('accepts an int Expr when target is float (cross-numeric)', () => {
        const target = { typecode: 'float', size: 64, nullable: true } as const
        const expr = ty.lit(5, 'int32')
        const result = coerceToComparable(target, expr)
        expect(result.dtype().typecode).toBe('int')
    })

    it('throws when expr dtype is incompatible with target', () => {
        const target = { typecode: 'float', size: 64, nullable: true } as const
        const incompatibleExpr = ty.lit('hello')
        // @ts-expect-error — string expr is not comparable to float
        expect(() => coerceToComparable(target, incompatibleExpr)).toThrow('Cannot compare')
    })

    it('throws when op dtype is incompatible with target', () => {
        const target = { typecode: 'string', nullable: true } as const
        const float64 = ty.lit(42)
        // @ts-expect-error — float op is not comparable to string
        expect(() => coerceToComparable(target, float64)).toThrow('Cannot compare')
    })
})
