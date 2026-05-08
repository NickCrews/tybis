import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import { schema } from './index.js'

describe('schema()', () => {
    it('converts a schema with shorthand string types', () => {
        const s = schema({ name: 'string', age: 'int32', score: 'float64' })
        expect(s.name).toEqual({ typecode: 'string', nullable: true })
        expect(s.age).toEqual({ typecode: 'int', size: 32, nullable: true })
        expect(s.score).toEqual({ typecode: 'float', size: 64, nullable: true })
        expectTypeOf(s).toEqualTypeOf<{ name: { typecode: 'string', nullable: boolean }, age: { typecode: 'int', size: 32, nullable: boolean }, score: { typecode: 'float', size: 64, nullable: boolean } }>()
    })

    it('passes through a schema that already uses DataType objects', () => {
        const already = { name: { typecode: 'string', nullable: true }, active: { typecode: 'boolean', nullable: true } } as const
        const s = schema(already)
        expect(s.name).toEqual({ typecode: 'string', nullable: true })
        expect(s.active).toEqual({ typecode: 'boolean', nullable: true })
        expectTypeOf(s).toEqualTypeOf(already)
    })

    it('converts mixed shorthand and DataType objects', () => {
        const s = schema({ name: 'string', score: { typecode: 'float', size: 32, nullable: true } })
        expect(s.name).toEqual({ typecode: 'string', nullable: true })
        expect(s.score).toEqual({ typecode: 'float', size: 32, nullable: true })
        expectTypeOf(s).toEqualTypeOf<{ name: { typecode: 'string', nullable: boolean }, score: { typecode: 'float', size: 32, nullable: true } }>()
    })
})