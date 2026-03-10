import { describe, it, expect } from 'vitest'
import { inferDtypeFromJs } from '../src/datatypes'

describe('inferDtype', () => {
    it('infers string type', () => {
        expect(inferDtypeFromJs('hello')).toEqual({ typecode: 'string' })
        expect(inferDtypeFromJs('')).toEqual({ typecode: 'string' })
    })

    it('infers boolean type', () => {
        expect(inferDtypeFromJs(true)).toEqual({ typecode: 'boolean' })
        expect(inferDtypeFromJs(false)).toEqual({ typecode: 'boolean' })
    })

    it('infers number type as float64', () => {
        expect(inferDtypeFromJs(42)).toEqual({ typecode: 'float', size: 64 })
        expect(inferDtypeFromJs(3.14)).toEqual({ typecode: 'float', size: 64 })
        expect(inferDtypeFromJs(0)).toEqual({ typecode: 'float', size: 64 })
        expect(inferDtypeFromJs(-1)).toEqual({ typecode: 'float', size: 64 })
    })

    it('infers Date type as datetime', () => {
        expect(inferDtypeFromJs(new Date())).toEqual({ typecode: 'datetime' })
        expect(inferDtypeFromJs(new Date('2024-01-01'))).toEqual({ typecode: 'datetime' })
    })

    it('throws error for unsupported types', () => {
        // @ts-expect-error
        expect(() => inferDtypeFromJs({})).toThrow('Cannot infer dtype for value: [object Object]')
        // @ts-expect-error
        expect(() => inferDtypeFromJs([])).toThrow('Cannot infer dtype for value: ')
        // @ts-expect-error
        expect(() => inferDtypeFromJs(null)).toThrow('Cannot infer dtype for value: null')
        // @ts-expect-error
        expect(() => inferDtypeFromJs(undefined)).toThrow('Cannot infer dtype for value: undefined')
    })
})
