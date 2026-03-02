import { describe, it, expect } from 'vitest'
import { inferDtype } from '../src/datatypes'

describe('inferDtype', () => {
    it('infers string type', () => {
        expect(inferDtype('hello')).toBe('string')
        expect(inferDtype('')).toBe('string')
    })

    it('infers boolean type', () => {
        expect(inferDtype(true)).toBe('boolean')
        expect(inferDtype(false)).toBe('boolean')
    })

    it('infers number type as float64', () => {
        expect(inferDtype(42)).toBe('float64')
        expect(inferDtype(3.14)).toBe('float64')
        expect(inferDtype(0)).toBe('float64')
        expect(inferDtype(-1)).toBe('float64')
    })

    it('infers Date type as datetime', () => {
        expect(inferDtype(new Date())).toBe('datetime')
        expect(inferDtype(new Date('2024-01-01'))).toBe('datetime')
    })

    it('throws error for unsupported types', () => {
        // @ts-expect-error
        expect(() => inferDtype({})).toThrow('Cannot infer dtype for value: [object Object]')
        // @ts-expect-error
        expect(() => inferDtype([])).toThrow('Cannot infer dtype for value: ')
        // @ts-expect-error
        expect(() => inferDtype(null)).toThrow('Cannot infer dtype for value: null')
        // @ts-expect-error
        expect(() => inferDtype(undefined)).toThrow('Cannot infer dtype for value: undefined')
    })
})