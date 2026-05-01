import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import { schema } from './index.js'

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