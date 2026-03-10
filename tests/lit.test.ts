import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

const compiler = new ty.PrqlCompiler()
const compile = (e: ty.Expr<any, any>) => compiler.compileOp(e.toOp() as ty.BuiltinOp)

describe('lit()', () => {
    describe('string', () => {
        it('type is Expr<{typecode: string}, scalar>', () => {
            const e = ty.lit('hello')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'string' }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const op = ty.lit('world').toOp() as ty.ops.StringLiteralOp
            expect(op.kind).toBe('string_literal')
            expect(op.value).toBe('world')
        })

        it('compiles with quotes', () => {
            expect(compile(ty.lit('hello'))).toBe('"hello"')
        })
    })

    describe('number', () => {
        it('type is Expr<{typecode: float64}, scalar>', () => {
            const e = ty.lit(42)
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'float', size: 64 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
            expect(e.dshape()).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const op = ty.lit(99).toOp() as ty.ops.FloatLiteralOp
            expect(op.kind).toBe('float_literal')
            expect(op.value).toBe(99)
        })

        it('compiles to bare number', () => {
            expect(compile(ty.lit(42))).toBe('42')
            expect(compile(ty.lit(3.14))).toBe('3.14')
        })
    })

    describe('boolean', () => {
        it('type is Expr<{typecode: boolean}, scalar>', () => {
            const e = ty.lit(true)
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'boolean' }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const op = ty.lit(true).toOp() as ty.ops.BooleanLiteralOp
            expect(op.kind).toBe('boolean_literal')
            expect(op.value).toBe(true)
        })

        it('compiles to true/false', () => {
            expect(compile(ty.lit(true))).toBe('true')
            expect(compile(ty.lit(false))).toBe('false')
        })
    })

    describe('Date', () => {
        it('type is Expr<{typecode: datetime}, scalar>', () => {
            const e = ty.lit(new Date('2024-01-15T00:00:00.000Z'))
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'datetime' }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'datetime' })
            expect(e.dshape()).toBe('scalar')
        })

        it('preserves value and kind', () => {
            const date = new Date('2024-01-15T00:00:00.000Z')
            const op = ty.lit(date).toOp() as ty.ops.DatetimeLiteralOp
            expect(op.kind).toBe('datetime_literal')
            expect(op.value).toBe(date)
        })

        it('compiles with ISO format prefixed by @', () => {
            expect(compile(ty.lit(new Date('2024-01-15T12:00:00.000Z')))).toBe('@2024-01-15T12:00:00.000Z')
        })
    })

    describe('integration in queries', () => {
        const t = ty.relation('tbl', { x: 'float64', name: 'string' })

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
