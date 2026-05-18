import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import { table } from '../relation/index.js'
import type { RCompiler } from './base.js'
import type { BuiltinROp } from '../relation/index.js'

const penguins = table('penguins', { species: 'string', bill_length_mm: 'float64' })

describe('Compiler<Result>', () => {

    it('rel.compile returns R for an arbitrary RCompiler<R>', () => {
        type CompiledQuery = { sql: string; params: unknown[] }

        class StubSqlCompiler implements RCompiler<CompiledQuery> {
            compileROp(_op: BuiltinROp): CompiledQuery {
                return { sql: 'SELECT 1', params: [] }
            }
        }
        expectTypeOf<StubSqlCompiler>().toMatchTypeOf<RCompiler<CompiledQuery>>()

        const result = penguins.compile(new StubSqlCompiler())
        expect(result).toEqual({ sql: 'SELECT 1', params: [] })
        expectTypeOf(result).toEqualTypeOf<CompiledQuery>()
    })

    it('Compiler<Result> requires only compileROp', () => {
        // A minimal object with just compileROp satisfies the interface
        const minimal: RCompiler<number> = {
            compileROp: (_op) => 42,
        }
        expectTypeOf(penguins.compile(minimal)).toEqualTypeOf<number>()
    })
})
