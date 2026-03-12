import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import {
    isValidDataType,
    highestDataType,
    dtype,
    schema,
    dtypeFromShorthand,
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

    it('returns single float when only one float', () => {
        expect(highestDataType({ typecode: 'float', size: 32 })).toEqual({ typecode: 'float', size: 32 })
    })

    it('returns single int when only one int', () => {
        expect(highestDataType({ typecode: 'int', size: 64 })).toEqual({ typecode: 'int', size: 64 })
    })

    it('throws when no numeric types provided', () => {
        expect(() => highestDataType({ typecode: 'string' } as any)).toThrow('Cannot determine highest type for non-numeric types')
        expect(() => highestDataType({ typecode: 'boolean' } as any, { typecode: 'string' } as any)).toThrow('Cannot determine highest type')
    })
})

describe('dtype()', () => {
    it('accepts a DataType object and returns it', () => {
        const dt = { typecode: 'string' } as const
        expect(dtype(dt)).toEqual({ typecode: 'string' })
    })

    it('accepts shorthand strings and converts them', () => {
        expect(dtype('string')).toEqual({ typecode: 'string' })
        expect(dtype('int32')).toEqual({ typecode: 'int', size: 32 })
        expect(dtype('float64')).toEqual({ typecode: 'float', size: 64 })
        expect(dtype('boolean')).toEqual({ typecode: 'boolean' })
        expect(dtype('date')).toEqual({ typecode: 'date' })
    })

    it('accepts an Expr and returns its dtype', () => {
        const expr = ty.lit('hello')
        expect(dtype(expr)).toEqual({ typecode: 'string' })
    })

    it('accepts an Op and returns its dtype', () => {
        const op = new ty.ops.IntLiteralOp(42)
        expect(dtype(op)).toEqual({ typecode: 'int', size: 64 })
    })
})

describe('schema()', () => {
    it('converts a schema with shorthand string types', () => {
        const s = schema({ name: 'string', age: 'int32', score: 'float64' })
        expect(s.name).toEqual({ typecode: 'string' })
        expect(s.age).toEqual({ typecode: 'int', size: 32 })
        expect(s.score).toEqual({ typecode: 'float', size: 64 })
    })

    it('passes through a schema that already uses DataType objects', () => {
        const s = schema({ name: { typecode: 'string' }, active: { typecode: 'boolean' } })
        expect(s.name).toEqual({ typecode: 'string' })
        expect(s.active).toEqual({ typecode: 'boolean' })
    })

    it('converts mixed shorthand and DataType objects', () => {
        const s = schema({ name: 'string', score: { typecode: 'float', size: 32 } })
        expect(s.name).toEqual({ typecode: 'string' })
        expect(s.score).toEqual({ typecode: 'float', size: 32 })
    })
})

describe('dtypeFromShorthand()', () => {
    it('converts all int shorthands', () => {
        expect(dtypeFromShorthand('int')).toEqual({ typecode: 'int', size: 64 })
        expect(dtypeFromShorthand('int8')).toEqual({ typecode: 'int', size: 8 })
        expect(dtypeFromShorthand('int16')).toEqual({ typecode: 'int', size: 16 })
        expect(dtypeFromShorthand('int32')).toEqual({ typecode: 'int', size: 32 })
        expect(dtypeFromShorthand('int64')).toEqual({ typecode: 'int', size: 64 })
    })

    it('converts all float shorthands', () => {
        expect(dtypeFromShorthand('float')).toEqual({ typecode: 'float', size: 64 })
        expect(dtypeFromShorthand('float8')).toEqual({ typecode: 'float', size: 8 })
        expect(dtypeFromShorthand('float16')).toEqual({ typecode: 'float', size: 16 })
        expect(dtypeFromShorthand('float32')).toEqual({ typecode: 'float', size: 32 })
        expect(dtypeFromShorthand('float64')).toEqual({ typecode: 'float', size: 64 })
    })

    it('converts non-numeric shorthands', () => {
        expect(dtypeFromShorthand('null')).toEqual({ typecode: 'null' })
        expect(dtypeFromShorthand('string')).toEqual({ typecode: 'string' })
        expect(dtypeFromShorthand('boolean')).toEqual({ typecode: 'boolean' })
        expect(dtypeFromShorthand('date')).toEqual({ typecode: 'date' })
        expect(dtypeFromShorthand('time')).toEqual({ typecode: 'time' })
        expect(dtypeFromShorthand('datetime')).toEqual({ typecode: 'datetime' })
        expect(dtypeFromShorthand('interval')).toEqual({ typecode: 'interval' })
        expect(dtypeFromShorthand('uuid')).toEqual({ typecode: 'uuid' })
    })
})
