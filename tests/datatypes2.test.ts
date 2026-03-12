import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import {
    isValidDataType,
    highestDataType,
    dtype,
    schema,
} from '../src/datatypes.js'
import * as ty from '../src/index.js'

describe('isValidDataType()', () => {
    it('returns true for all valid simple typecodes', () => {
        expect(isValidDataType({ typecode: 'null' })).toBe(true)
        expect(isValidDataType({ typecode: 'string' })).toBe(true)
        expect(isValidDataType({ typecode: 'boolean' })).toBe(true)
        expect(isValidDataType({ typecode: 'date' })).toBe(true)
        expect(isValidDataType({ typecode: 'time' })).toBe(true)
        expect(isValidDataType({ typecode: 'datetime' })).toBe(true)
        expect(isValidDataType({ typecode: 'interval' })).toBe(true)
        expect(isValidDataType({ typecode: 'uuid' })).toBe(true)
    })

    it('returns true for valid int types', () => {
        expect(isValidDataType({ typecode: 'int', size: 8 })).toBe(true)
        expect(isValidDataType({ typecode: 'int', size: 16 })).toBe(true)
        expect(isValidDataType({ typecode: 'int', size: 32 })).toBe(true)
        expect(isValidDataType({ typecode: 'int', size: 64 })).toBe(true)
    })

    it('returns true for valid float types', () => {
        expect(isValidDataType({ typecode: 'float', size: 8 })).toBe(true)
        expect(isValidDataType({ typecode: 'float', size: 16 })).toBe(true)
        expect(isValidDataType({ typecode: 'float', size: 32 })).toBe(true)
        expect(isValidDataType({ typecode: 'float', size: 64 })).toBe(true)
    })

    it('returns false for int with invalid size', () => {
        expect(isValidDataType({ typecode: 'int', size: 128 })).toBe(false)
        expect(isValidDataType({ typecode: 'int', size: 0 })).toBe(false)
        expect(isValidDataType({ typecode: 'int' })).toBe(false)
    })

    it('returns false for float with invalid size', () => {
        expect(isValidDataType({ typecode: 'float', size: 128 })).toBe(false)
        expect(isValidDataType({ typecode: 'float' })).toBe(false)
    })

    it('returns false for unknown typecodes', () => {
        expect(isValidDataType({ typecode: 'decimal' })).toBe(false)
        expect(isValidDataType({ typecode: 'binary' })).toBe(false)
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
        expect(highestDataType({ typecode: 'float', size: 64 }, { typecode: 'int', size: 32 })).toEqual({ typecode: 'float', size: 64 })
        expect(highestDataType({ typecode: 'int', size: 64 }, { typecode: 'float', size: 64 })).toEqual({ typecode: 'float', size: 64 })
    })

    it('returns float32 when float32 and int64 are present', () => {
        expect(highestDataType({ typecode: 'float', size: 32 }, { typecode: 'int', size: 64 })).toEqual({ typecode: 'float', size: 32 })
    })

    it('returns highest int when only ints are present', () => {
        expect(highestDataType({ typecode: 'int', size: 32 }, { typecode: 'int', size: 64 })).toEqual({ typecode: 'int', size: 64 })
        expect(highestDataType({ typecode: 'int', size: 8 }, { typecode: 'int', size: 16 })).toEqual({ typecode: 'int', size: 16 })
    })

    it('returns input type when passed a single one', () => {
        expect(highestDataType({ typecode: 'float', size: 32 })).toEqual({ typecode: 'float', size: 32 })
        expect(highestDataType({ typecode: 'int', size: 64 })).toEqual({ typecode: 'int', size: 64 })
        expect(highestDataType({ typecode: 'string' })).toEqual({ typecode: 'string' })
    })

    it('throws when a non numeric types provided along with a numeric', () => {
        expect(() => highestDataType({ typecode: 'string' }, { typecode: 'int', size: 32 })).toThrow('Cannot determine highest type for non-numeric types')
        expect(() => highestDataType({ typecode: 'boolean' }, { typecode: 'string' })).toThrow('Cannot determine highest type')
    })
})

describe('dtype()', () => {
    it('accepts a DataType object and returns it', () => {
        const dt = { typecode: 'string' } as const
        expect(dtype(dt)).toEqual({ typecode: 'string' })
        expectTypeOf(dt).toEqualTypeOf<{ readonly typecode: 'string' }>()
    })

    it('accepts an Expr and returns its dtype', () => {
        const result = dtype(ty.lit('hello'))
        expect(result).toEqual({ typecode: 'string' })
        // @ts-expect-error TODO: make this work
        expectTypeOf(result).toEqualTypeOf<{ readonly typecode: 'string' }>()
    })

    it('accepts an Op and returns its dtype', () => {
        const result = dtype(new ty.ops.IntLiteralOp(42))
        expect(result).toEqual({ typecode: 'int', size: 64 })
        // @ts-expect-error TODO: make this work
        expectTypeOf(result).toEqualTypeOf<{ readonly typecode: 'int', readonly size: 64 }>()
    })

    it('converts all int shorthands', () => {
        expect(dtype('int')).toEqual({ typecode: 'int', size: 64 })
        expectTypeOf(dtype('int')).toEqualTypeOf<{ typecode: 'int', size: 64 }>()
        expect(dtype('int8')).toEqual({ typecode: 'int', size: 8 })
        expectTypeOf(dtype('int8')).toEqualTypeOf<{ typecode: 'int', size: 8 }>()
        expect(dtype('int16')).toEqual({ typecode: 'int', size: 16 })
        expectTypeOf(dtype('int16')).toEqualTypeOf<{ typecode: 'int', size: 16 }>()
        expect(dtype('int32')).toEqual({ typecode: 'int', size: 32 })
        expectTypeOf(dtype('int32')).toEqualTypeOf<{ typecode: 'int', size: 32 }>()
        expect(dtype('int64')).toEqual({ typecode: 'int', size: 64 })
        expectTypeOf(dtype('int64')).toEqualTypeOf<{ typecode: 'int', size: 64 }>()
    })

    it('converts all float shorthands', () => {
        expect(dtype('float')).toEqual({ typecode: 'float', size: 64 })
        expectTypeOf(dtype('float')).toEqualTypeOf<{ typecode: 'float', size: 64 }>()
        expect(dtype('float8')).toEqual({ typecode: 'float', size: 8 })
        expectTypeOf(dtype('float8')).toEqualTypeOf<{ typecode: 'float', size: 8 }>()
        expect(dtype('float16')).toEqual({ typecode: 'float', size: 16 })
        expectTypeOf(dtype('float16')).toEqualTypeOf<{ typecode: 'float', size: 16 }>()
        expect(dtype('float32')).toEqual({ typecode: 'float', size: 32 })
        expectTypeOf(dtype('float32')).toEqualTypeOf<{ typecode: 'float', size: 32 }>()
        expect(dtype('float64')).toEqual({ typecode: 'float', size: 64 })
        expectTypeOf(dtype('float64')).toEqualTypeOf<{ typecode: 'float', size: 64 }>()
    })

    it('converts non-numeric shorthands', () => {
        expect(dtype('null')).toEqual({ typecode: 'null' })
        expectTypeOf(dtype('null')).toEqualTypeOf<{ typecode: 'null' }>()
        expect(dtype('string')).toEqual({ typecode: 'string' })
        expectTypeOf(dtype('string')).toEqualTypeOf<{ typecode: 'string' }>()
        expect(dtype('boolean')).toEqual({ typecode: 'boolean' })
        expectTypeOf(dtype('boolean')).toEqualTypeOf<{ typecode: 'boolean' }>()
        expect(dtype('date')).toEqual({ typecode: 'date' })
        expectTypeOf(dtype('date')).toEqualTypeOf<{ typecode: 'date' }>()
        expect(dtype('time')).toEqual({ typecode: 'time' })
        expectTypeOf(dtype('time')).toEqualTypeOf<{ typecode: 'time' }>()
        expect(dtype('datetime')).toEqual({ typecode: 'datetime' })
        expectTypeOf(dtype('datetime')).toEqualTypeOf<{ typecode: 'datetime' }>()
        expect(dtype('interval')).toEqual({ typecode: 'interval' })
        expectTypeOf(dtype('interval')).toEqualTypeOf<{ typecode: 'interval' }>()
        expect(dtype('uuid')).toEqual({ typecode: 'uuid' })
        expectTypeOf(dtype('uuid')).toEqualTypeOf<{ typecode: 'uuid' }>()
    })
})

describe('schema()', () => {
    it('converts a schema with shorthand string types', () => {
        const s = schema({ name: 'string', age: 'int32', score: 'float64' })
        expect(s.name).toEqual({ typecode: 'string' })
        expect(s.age).toEqual({ typecode: 'int', size: 32 })
        expect(s.score).toEqual({ typecode: 'float', size: 64 })
        expectTypeOf(s).toEqualTypeOf<{ name: { typecode: 'string' }, age: { typecode: 'int', size: 32 }, score: { typecode: 'float', size: 64 } }>()
    })

    it('passes through a schema that already uses DataType objects', () => {
        const already = { name: { typecode: 'string' }, active: { typecode: 'boolean' } } as const
        const s = schema(already)
        expect(s.name).toEqual({ typecode: 'string' })
        expect(s.active).toEqual({ typecode: 'boolean' })
        expectTypeOf(s).toEqualTypeOf(already)
    })

    it('converts mixed shorthand and DataType objects', () => {
        const s = schema({ name: 'string', score: { typecode: 'float', size: 32 } })
        expect(s.name).toEqual({ typecode: 'string' })
        expect(s.score).toEqual({ typecode: 'float', size: 32 })
        expectTypeOf(s).toEqualTypeOf<{ name: { typecode: 'string' }, score: { typecode: 'float', size: 32 } }>()
    })
})