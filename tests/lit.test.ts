import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

const compiler = new ty.PrqlCompiler()
const compile = (e: ty.IExpr) => compiler.compileOp(e.toOp() as ty.BuiltinOp)

describe('lit()', () => {
    describe('string', () => {
        it('type is IExpr<string, scalar>', () => {
            const e = ty.lit('hello')
            expectTypeOf(e).toEqualTypeOf<ty.IExpr<'string', 'scalar'>>()
            expect(e.dtype).toBe('string')
            expect(e.dshape).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const op = ty.lit('world').toOp() as ty.StringLiteralOp
            expect(op.kind).toBe('string_literal')
            expect(op.value).toBe('world')
        })

        it('compiles with quotes', () => {
            expect(compile(ty.lit('hello'))).toBe('"hello"')
        })
    })

    describe('number', () => {
        it('type is IExpr<float64, scalar>', () => {
            const e = ty.lit(42)
            expectTypeOf(e).toEqualTypeOf<ty.IExpr<'float64', 'scalar'>>()
            expect(e.dtype).toBe('float64')
            expect(e.dshape).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const op = ty.lit(99).toOp() as ty.NumberLiteralOp
            expect(op.kind).toBe('number_literal')
            expect(op.value).toBe(99)
        })

        it('compiles to bare number', () => {
            expect(compile(ty.lit(42))).toBe('42')
            expect(compile(ty.lit(3.14))).toBe('3.14')
        })
    })

    describe('boolean', () => {
        it('type is IExpr<boolean, scalar>', () => {
            const e = ty.lit(true)
            expectTypeOf(e).toEqualTypeOf<ty.IExpr<'boolean', 'scalar'>>()
            expect(e.dtype).toBe('boolean')
            expect(e.dshape).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const op = ty.lit(true).toOp() as ty.BooleanLiteralOp
            expect(op.kind).toBe('boolean_literal')
            expect(op.value).toBe(true)
        })

        it('compiles to true/false', () => {
            expect(compile(ty.lit(true))).toBe('true')
            expect(compile(ty.lit(false))).toBe('false')
        })
    })

    describe('Date', () => {
        it('type is IExpr<datetime, scalar>', () => {
            const e = ty.lit(new Date('2024-01-15T00:00:00.000Z'))
            expectTypeOf(e).toEqualTypeOf<ty.IExpr<'datetime', 'scalar'>>()
            expect(e.dtype).toBe('datetime')
            expect(e.dshape).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const date = new Date('2024-01-15T00:00:00.000Z')
            const op = ty.lit(date).toOp() as ty.DatetimeLiteralOp
            expect(op.kind).toBe('datetime_literal')
            expect(op.value).toBe(date)
        })

        it('compiles with ISO format prefixed by @', () => {
            expect(compile(ty.lit(new Date('2024-01-15T12:00:00.000Z')))).toBe('@2024-01-15T12:00:00.000Z')
        })
    })

    describe('integration in queries', () => {
        const t = ty.relation('tbl', { x: 'float64', name: 'string' } as const)

        it('lit used in eq filter', () => {
            const q = t.filter(r => r.col('name').eq(ty.lit('alice')))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from tbl
              filter name == "alice""
            `)
        })

        it('lit used in gt filter', () => {
            const q = t.filter(r => r.col('x').gt(ty.lit(10)))
            expect(q.toPrql()).toMatchInlineSnapshot(`
              "from tbl
              filter x > 10"
            `)
        })
    })

    describe('error handling', () => {
        it('throws for unsupported value types', () => {
            expect(() => ty.lit(null as any)).toThrow()
            expect(() => ty.lit({} as any)).toThrow()
            expect(() => ty.lit([] as any)).toThrow()
        })
    })
})
