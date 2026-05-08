import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import {
    isValidDataType,
    highestDataType,
    inferDtypeFromJs,
    dtype,
    DTCustom,
    type JSTypeFromDtype,
} from './datatype'
import * as ty from './index.js'

describe('inferDtype', () => {
    it('infers strings as string type', () => {
        expect(inferDtypeFromJs('hello')).toEqual({ typecode: 'string', nullable: true })
        expect(inferDtypeFromJs('')).toEqual({ typecode: 'string', nullable: true })
    })

    it('infers booleans as boolean type', () => {
        expect(inferDtypeFromJs(true)).toEqual({ typecode: 'boolean', nullable: true })
        expect(inferDtypeFromJs(false)).toEqual({ typecode: 'boolean', nullable: true })
    })

    it('infers numbers as float64 type', () => {
        expect(inferDtypeFromJs(42)).toEqual({ typecode: 'float', size: 64, nullable: true })
        expect(inferDtypeFromJs(3.14)).toEqual({ typecode: 'float', size: 64, nullable: true })
        expect(inferDtypeFromJs(0)).toEqual({ typecode: 'float', size: 64, nullable: true })
        expect(inferDtypeFromJs(-1)).toEqual({ typecode: 'float', size: 64, nullable: true })
    })

    it('infers Dates as datetime', () => {
        expect(inferDtypeFromJs(new Date())).toEqual({ typecode: 'datetime', nullable: true })
        expect(inferDtypeFromJs(new Date('2024-01-01'))).toEqual({ typecode: 'datetime', nullable: true })
    })

    it('infers nulls and undefined as null', () => {
        expect(inferDtypeFromJs(null)).toEqual({ typecode: 'null', nullable: true })
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

describe('isValidDataType()', () => {
    it('returns true for all valid simple typecodes', () => {
        expect(isValidDataType({ typecode: 'null', nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'string', nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'boolean', nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'date', nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'time', nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'datetime', nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'interval', nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'uuid', nullable: true })).toBe(true)
    })

    it('returns true for valid int types', () => {
        expect(isValidDataType({ typecode: 'int', size: 8, nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'int', size: 16, nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'int', size: 32, nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'int', size: 64, nullable: true })).toBe(true)
    })

    it('returns true for valid float types', () => {
        expect(isValidDataType({ typecode: 'float', size: 8, nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'float', size: 16, nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'float', size: 32, nullable: true })).toBe(true)
        expect(isValidDataType({ typecode: 'float', size: 64, nullable: true })).toBe(true)
    })

    it('returns false for int with invalid size', () => {
        expect(isValidDataType({ typecode: 'int', size: 128, nullable: true })).toBe(false)
        expect(isValidDataType({ typecode: 'int', size: 0, nullable: true })).toBe(false)
        expect(isValidDataType({ typecode: 'int', nullable: true })).toBe(false)
    })

    it('returns false for float with invalid size', () => {
        expect(isValidDataType({ typecode: 'float', size: 128, nullable: true })).toBe(false)
        expect(isValidDataType({ typecode: 'float', nullable: true })).toBe(false)
    })

    it('returns true for valid custom types', () => {
        expect(isValidDataType({ typecode: 'custom', meta: { foo: 'bar' } })).toBe(true)
        expect(isValidDataType({ typecode: 'custom', meta: null })).toBe(true)
        expect(isValidDataType(DTCustom({ scale: 10 }))).toBe(true)
    })

    it('returns false for custom without meta', () => {
        expect(isValidDataType({ typecode: 'custom', nullable: true })).toBe(false)
    })

    it('returns false for unknown typecodes', () => {
        expect(isValidDataType({ typecode: 'decimal', nullable: true })).toBe(false)
        expect(isValidDataType({ typecode: 'binary', nullable: true })).toBe(false)
    })

    it('returns false for non-objects', () => {
        expect(isValidDataType(null)).toBe(false)
        expect(isValidDataType(undefined)).toBe(false)
        expect(isValidDataType('string')).toBe(false)
        expect(isValidDataType(42)).toBe(false)
        expect(isValidDataType({})).toBe(false)
    })
})

describe('highestDataType()', () => {
    it('returns float64 when any float64 is present', () => {
        expect(highestDataType({ typecode: 'float', size: 64, nullable: true }, { typecode: 'int', size: 32, nullable: true })).toEqual({ typecode: 'float', size: 64, nullable: true })
        expect(highestDataType({ typecode: 'int', size: 64, nullable: true }, { typecode: 'float', size: 64, nullable: true })).toEqual({ typecode: 'float', size: 64, nullable: true })
    })

    it('returns float32 when float32 and int64 are present', () => {
        expect(highestDataType({ typecode: 'float', size: 32, nullable: true }, { typecode: 'int', size: 64, nullable: true })).toEqual({ typecode: 'float', size: 32, nullable: true })
    })

    it('returns highest int when only ints are present', () => {
        expect(highestDataType({ typecode: 'int', size: 32, nullable: true }, { typecode: 'int', size: 64, nullable: true })).toEqual({ typecode: 'int', size: 64, nullable: true })
        expect(highestDataType({ typecode: 'int', size: 8, nullable: true }, { typecode: 'int', size: 16, nullable: true })).toEqual({ typecode: 'int', size: 16, nullable: true })
    })

    it('returns input type when passed a single one', () => {
        expect(highestDataType({ typecode: 'float', size: 32, nullable: true })).toEqual({ typecode: 'float', size: 32, nullable: true })
        expect(highestDataType({ typecode: 'int', size: 64, nullable: true })).toEqual({ typecode: 'int', size: 64, nullable: true })
        expect(highestDataType({ typecode: 'string', nullable: true })).toEqual({ typecode: 'string', nullable: true })
    })

    it('throws when a non numeric types provided along with a numeric', () => {
        expect(() => highestDataType({ typecode: 'string', nullable: true }, { typecode: 'int', size: 32, nullable: true })).toThrow('Cannot determine highest type for non-numeric types')
        expect(() => highestDataType({ typecode: 'boolean', nullable: true }, { typecode: 'string', nullable: true })).toThrow('Cannot determine highest type')
    })
})

describe('dtype()', () => {
    it('accepts a DataType object and returns it', () => {
        const dt = { typecode: 'string', nullable: true } as const
        expect(dtype(dt)).toEqual({ typecode: 'string', nullable: true })
        expectTypeOf(dt).toEqualTypeOf<{ readonly typecode: 'string', readonly nullable: true }>()
    })

    it('accepts an Expr and returns its dtype', () => {
        const result = dtype(ty.lit('hello'))
        expect(result).toEqual({ typecode: 'string', nullable: true })
        // @ts-expect-error TODO: make this work
        expectTypeOf(result).toEqualTypeOf<{ readonly typecode: 'string' }>()
    })

    it('accepts an Op and returns its dtype', () => {
        const result = dtype(ty.lit('hello').toOp())
        expect(result).toEqual({ typecode: 'string', nullable: true })
        // @ts-expect-error TODO: make this work
        expectTypeOf(result).toEqualTypeOf<{ readonly typecode: 'string' }>()
    })

    it('converts all int shorthands', () => {
        expect(dtype('int')).toEqual({ typecode: 'int', size: 64, nullable: true })
        expectTypeOf(dtype('int')).toEqualTypeOf<{ typecode: 'int', size: 64, nullable: boolean }>()
        expect(dtype('int8')).toEqual({ typecode: 'int', size: 8, nullable: true })
        expectTypeOf(dtype('int8')).toEqualTypeOf<{ typecode: 'int', size: 8, nullable: boolean }>()
        expect(dtype('int16')).toEqual({ typecode: 'int', size: 16, nullable: true })
        expectTypeOf(dtype('int16')).toEqualTypeOf<{ typecode: 'int', size: 16, nullable: boolean }>()
        expect(dtype('int32')).toEqual({ typecode: 'int', size: 32, nullable: true })
        expectTypeOf(dtype('int32')).toEqualTypeOf<{ typecode: 'int', size: 32, nullable: boolean }>()
        expect(dtype('int64')).toEqual({ typecode: 'int', size: 64, nullable: true })
        expectTypeOf(dtype('int64')).toEqualTypeOf<{ typecode: 'int', size: 64, nullable: boolean }>()
    })

    it('converts all float shorthands', () => {
        expect(dtype('float')).toEqual({ typecode: 'float', size: 64, nullable: true })
        expectTypeOf(dtype('float')).toEqualTypeOf<{ typecode: 'float', size: 64, nullable: boolean }>()
        expect(dtype('float8')).toEqual({ typecode: 'float', size: 8, nullable: true })
        expectTypeOf(dtype('float8')).toEqualTypeOf<{ typecode: 'float', size: 8, nullable: boolean }>()
        expect(dtype('float16')).toEqual({ typecode: 'float', size: 16, nullable: true })
        expectTypeOf(dtype('float16')).toEqualTypeOf<{ typecode: 'float', size: 16, nullable: boolean }>()
        expect(dtype('float32')).toEqual({ typecode: 'float', size: 32, nullable: true })
        expectTypeOf(dtype('float32')).toEqualTypeOf<{ typecode: 'float', size: 32, nullable: boolean }>()
        expect(dtype('float64')).toEqual({ typecode: 'float', size: 64, nullable: true })
        expectTypeOf(dtype('float64')).toEqualTypeOf<{ typecode: 'float', size: 64, nullable: boolean }>()
    })

    it('converts non-numeric shorthands', () => {
        expect(dtype('null')).toEqual({ typecode: 'null', nullable: true })
        expectTypeOf(dtype('null')).toEqualTypeOf<{ typecode: 'null', nullable: boolean }>()
        expect(dtype('string')).toEqual({ typecode: 'string', nullable: true })
        expectTypeOf(dtype('string')).toEqualTypeOf<{ typecode: 'string', nullable: boolean }>()
        expect(dtype('boolean')).toEqual({ typecode: 'boolean', nullable: true })
        expectTypeOf(dtype('boolean')).toEqualTypeOf<{ typecode: 'boolean', nullable: boolean }>()
        expect(dtype('date')).toEqual({ typecode: 'date', nullable: true })
        expectTypeOf(dtype('date')).toEqualTypeOf<{ typecode: 'date', nullable: boolean }>()
        expect(dtype('time')).toEqual({ typecode: 'time', nullable: true })
        expectTypeOf(dtype('time')).toEqualTypeOf<{ typecode: 'time', nullable: boolean }>()
        expect(dtype('datetime')).toEqual({ typecode: 'datetime', nullable: true })
        expectTypeOf(dtype('datetime')).toEqualTypeOf<{ typecode: 'datetime', nullable: boolean }>()
        expect(dtype('interval')).toEqual({ typecode: 'interval', nullable: true })
        expectTypeOf(dtype('interval')).toEqualTypeOf<{ typecode: 'interval', nullable: boolean }>()
        expect(dtype('uuid')).toEqual({ typecode: 'uuid', nullable: true })
        expectTypeOf(dtype('uuid')).toEqualTypeOf<{ typecode: 'uuid', nullable: boolean }>()
    })
})

describe('DTCustom', () => {
    it('creates a custom datatype with arbitrary meta', () => {
        const dt = DTCustom({ precision: 10, scale: 2 })
        expect(dt).toEqual({ typecode: 'custom', meta: { precision: 10, scale: 2 }, nullable: true })
    })

    it('is a valid DataType', () => {
        expect(isValidDataType(DTCustom('anything'))).toBe(true)
    })
})

describe('JSTypeFromDtype', () => {
    it('nullable: true on string resolves to string | null', () => {
        expectTypeOf<JSTypeFromDtype<{ typecode: 'string', nullable: true }>>().toEqualTypeOf<string | null>()
    })

    it('nullable: false on string resolves to string', () => {
        expectTypeOf<JSTypeFromDtype<{ typecode: 'string', nullable: false }>>().toEqualTypeOf<string>()
    })

    it('nullable: true on int resolves to number | null', () => {
        expectTypeOf<JSTypeFromDtype<{ typecode: 'int', size: 32, nullable: true }>>().toEqualTypeOf<number | null>()
    })

    it('nullable: false on int resolves to number', () => {
        expectTypeOf<JSTypeFromDtype<{ typecode: 'int', size: 32, nullable: false }>>().toEqualTypeOf<number>()
    })

    it('DTCustom with nullable: false resolves to unknown', () => {
        expectTypeOf<JSTypeFromDtype<{ typecode: 'custom', meta: unknown, nullable: false }>>().toEqualTypeOf<unknown>()
    })

    it('DTCustom with nullable: true resolves to unknown', () => {
        expectTypeOf<JSTypeFromDtype<{ typecode: 'custom', meta: unknown, nullable: true }>>().toEqualTypeOf<unknown>()
    })
})
