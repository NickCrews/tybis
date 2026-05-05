import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import { table } from '../relation/index.js'
import { PrqlCompiler } from './prql-compiler.js'
import type { Compiler } from './base.js'
import type { BuiltinROp } from '../relation/index.js'

const penguins = table('penguins', { species: 'string', bill_length_mm: 'float64' })

describe('Compiler<Result>', () => {
    it('PrqlCompiler satisfies Compiler<string>', () => {
        expectTypeOf<PrqlCompiler>().toMatchTypeOf<Compiler<string>>()
    })

    it('rel.compile(PrqlCompiler) returns string', () => {
        const result = penguins.compile(new PrqlCompiler())
        expect(typeof result).toBe('string')
        expectTypeOf(result).toEqualTypeOf<string>()
    })

    it('rel.compile returns R for an arbitrary Compiler<R>', () => {
        type CompiledQuery = { sql: string; params: unknown[] }

        class StubSqlCompiler implements Compiler<CompiledQuery> {
            compileROp(_op: BuiltinROp): CompiledQuery {
                return { sql: 'SELECT 1', params: [] }
            }
        }

        const result = penguins.compile(new StubSqlCompiler())
        expect(result).toEqual({ sql: 'SELECT 1', params: [] })
        expectTypeOf(result).toEqualTypeOf<CompiledQuery>()
    })

    it('Compiler<Result> requires only compileROp', () => {
        // A minimal object with just compileROp satisfies the interface
        const minimal: Compiler<number> = {
            compileROp: (_op) => 42,
        }
        expectTypeOf(penguins.compile(minimal)).toEqualTypeOf<number>()
    })
})
