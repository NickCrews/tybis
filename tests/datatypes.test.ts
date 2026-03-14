import { describe, it, expect } from 'vitest'
import { inferDtypeFromJs } from '../src/datatype';

describe('inferDtype', () => {
    it('infers strings as string type', () => {
        expect(inferDtypeFromJs('hello')).toEqual({ typecode: 'string' })
        expect(inferDtypeFromJs('')).toEqual({ typecode: 'string' })
    })

    it('infers booleans as boolean type', () => {
        expect(inferDtypeFromJs(true)).toEqual({ typecode: 'boolean' })
        expect(inferDtypeFromJs(false)).toEqual({ typecode: 'boolean' })
    })

    it('infers numbers as float64 type', () => {
        expect(inferDtypeFromJs(42)).toEqual({ typecode: 'float', size: 64 })
        expect(inferDtypeFromJs(3.14)).toEqual({ typecode: 'float', size: 64 })
        expect(inferDtypeFromJs(0)).toEqual({ typecode: 'float', size: 64 })
        expect(inferDtypeFromJs(-1)).toEqual({ typecode: 'float', size: 64 })
    })

    it('infers Dates as datetime', () => {
        expect(inferDtypeFromJs(new Date())).toEqual({ typecode: 'datetime' })
        expect(inferDtypeFromJs(new Date('2024-01-01'))).toEqual({ typecode: 'datetime' })
    })

    it('infers nulls and undefined as null', () => {
        expect(inferDtypeFromJs(null)).toEqual({ typecode: 'null' })
    })

    it('throws error for unsupported types', () => {
        // @ts-expect-error
        expect(() => inferDtypeFromJs()).toThrow('Cannot infer dtype for value: undefined')
        // @ts-expect-error
        expect(() => inferDtypeFromJs(undefined)).toThrow('Cannot infer dtype for value: undefined')
        // @ts-expect-error
        expect(() => inferDtypeFromJs({})).toThrow('Cannot infer dtype for value: [object Object]')
        // @ts-expect-error
        expect(() => inferDtypeFromJs([])).toThrow('Cannot infer dtype for value: ')
    })
})
