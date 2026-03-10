import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'

const compiler = new ty.PrqlCompiler()
const compile = (e: ty.Expr<any, any>) => compiler.compileOp(e.toOp() as ty.BuiltinOp)

describe('lit()', () => {
    describe('null', () => {
        it("lit(null)", () => {
            const e = ty.lit(null)
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTNull, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'null' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('null')
        })
    })

    describe('string', () => {
        it("lit('hello')", () => {
            const e = ty.lit('hello')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTString, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('"hello"')
        })

        it("lit('hello', 'string')", () => {
            const e = ty.lit('hello', 'string')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTString, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('"hello"')
        })
        it("lit(54, 'string')", () => {
            const e = ty.lit(54, 'string')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTString, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('"54"')
        })

        it("lit(new Date('2024-01-15T00:00:00.000Z'), 'string')", () => {
            const e = ty.lit(new Date('2024-01-15T00:00:00.000Z'), 'string')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTString, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'string' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('"2024-01-15T00:00:00.000Z"')
        })
    })

    describe('int', () => {
        it('lit(42)', () => {
            const e = ty.lit(42)
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'float', size: 64 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('42')
        })

        it('lit(42, "int32")', () => {
            const e = ty.lit(42, 'int32')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'int', size: 32 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'int', size: 32 })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('42')
        })

        it('lit("42", "int32")', () => {
            const e = ty.lit("42", 'int32')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'int', size: 32 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'int', size: 32 })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('42')
        })

        it('lit(3.14, "int32")', () => {
            // We can't get type errors here :(
            expect(() => ty.lit(3.14, 'int32')).toThrow('Cannot convert number \'3.14\' to int literal')
        })

        it('lit("bogus", "int32")', () => {
            // @ts-expect-error - should error with non-numeric string
            expect(() => ty.lit("bogus", 'int32')).toThrow('Cannot convert string \'bogus\' to int literal')
        })
    })

    describe('float', () => {
        it('lit(3.14)', () => {
            const e = ty.lit(3.14)
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'float', size: 64 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('3.14')
        })

        it('lit(42, "float")', () => {
            const e = ty.lit(42, 'float')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'float', size: 64 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('42')
        })

        it('lit("42", "float")', () => {
            const e = ty.lit("42", 'float')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'float', size: 64 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('42')
        })

        it('lit("NaN", "float")', () => {
            const e = ty.lit("NaN", 'float')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<{ typecode: 'float', size: 64 }, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('NaN')
        })

        it('lit("bogus", "float")', () => {
            // @ts-expect-error - should error with non-numeric string
            expect(() => ty.lit("bogus", 'float')).toThrow('Cannot convert string \'bogus\' to float literal')
        })
    })

    describe('boolean', () => {
        it('lit(true)', () => {
            const e = ty.lit(true)
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTBoolean, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('true')
        })

        it("lit('true', 'boolean')", () => {
            const e = ty.lit('true', 'boolean')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTBoolean, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('true')
        })

        it("lit(0, 'boolean')", () => {
            const e = ty.lit(0, 'boolean')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTBoolean, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('false')
        })

        it("lit(null, 'boolean')", () => {
            const e = ty.lit(null, 'boolean')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTBoolean, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'boolean' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('false')
        })

        it("lit('bogus', 'boolean')", () => {
            // @ts-expect-error - should error with non-boolean string
            expect(() => ty.lit('bogus', 'boolean')).toThrow("Cannot convert string 'bogus' to boolean literal")
        })
    })

    describe('Date', () => {
        it("lit(new Date('2024-01-15T12:34:56.000Z'))", () => {
            const e = ty.lit(new Date('2024-01-15T12:34:56.000Z'))
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTDateTime, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'datetime' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('@2024-01-15T12:34:56.000Z')
        })

        it("lit(new Date('2024-01-15T12:34:56.000Z'), 'date')", () => {
            const e = ty.lit(new Date('2024-01-15T12:34:56.000Z'), 'date')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTDate, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'date' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('@2024-01-15')
        })

        it("lit('2024-01-15', 'date')", () => {
            const e = ty.lit('2024-01-15', 'date')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTDate, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'date' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('@2024-01-15')
        })

        it("lit('2024-01-15T12:34:56.000Z', 'datetime')", () => {
            const e = ty.lit('2024-01-15T12:34:56.000Z', 'datetime')
            expectTypeOf(e).toEqualTypeOf<ty.Expr<ty.dt.DTDateTime, 'scalar'>>()
            expect(e.dtype()).toEqual({ typecode: 'datetime' })
            expect(e.dshape()).toBe('scalar')
            expect(compile(e)).toBe('@2024-01-15T12:34:56.000Z')
        })

        it("lit('bogus', 'date')", () => {
            expect(() => ty.lit('bogus', 'date')).toThrow('Invalid date string: bogus')
        })

        it("lit('bogus', 'datetime')", () => {
            expect(() => ty.lit('bogus', 'datetime')).toThrow('Invalid date string: bogus')
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
            // @ts-expect-error - should error with no args
            expect(() => ty.lit()).toThrow()
            // @ts-expect-error - should error with no args
            expect(() => ty.lit(undefined)).toThrow()
            // @ts-expect-error - should error with no args
            expect(() => ty.lit({})).toThrow()
            // @ts-expect-error - should error with no args
            expect(() => ty.lit([])).toThrow()
        })
    })
})
