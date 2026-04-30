import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'
import * as ty from '../src/index.js'
import * as dt from '../src/datatype.js'
import * as ops from '../src/value/ops.js'
import * as vals from '../src/value/index.js'

const compiler = new ty.PrqlCompiler()
const compile = (e: vals.VExpr<any, any>) => compiler.compileOp(e.toOp() as ops.BuiltinOp)

describe('isNotNull()', () => {
    it('produces a boolean columnar expr from a columnar column', () => {
        const table = ty.relation('data', { name: 'string', x: 'float64' })
        const e = table.col('name').isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
        expectTypeOf(e.dtype()).toEqualTypeOf<dt.DTBoolean>()
    })

    it('produces a boolean scalar expr from a scalar literal', () => {
        const e = ty.lit('hello').isNotNull()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('scalar')
    })

    it('compiles to is_not_null in a filter', () => {
        const table = ty.relation('data', { name: 'string' })
        const q = table.filter(r => r.col('name').isNotNull())
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from data
          filter name != null"
        `)
    })
})

describe('min() and max()', () => {
    it('min() returns a scalar expr with same dtype', () => {
        const table = ty.relation('data', { score: 'float64' })
        const e = table.col('score').min()
        expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(e.dshape()).toBe('scalar')
    })

    it('max() returns a scalar expr with same dtype', () => {
        const table = ty.relation('data', { score: 'float64' })
        const e = table.col('score').max()
        expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(e.dshape()).toBe('scalar')
    })

    it('min() on a string column preserves string dtype', () => {
        const table = ty.relation('data', { name: 'string' })
        const e = table.col('name').min()
        expect(e.dtype()).toEqual({ typecode: 'string' })
        expect(e.dshape()).toBe('scalar')
    })

    it('max() compiles correctly in group agg', () => {
        const table = ty.relation('data', { category: 'string', score: 'float64' })
        const q = table.group(
            r => [r.col('category')],
            g => g.agg({ max_score: g.col('score').max() })
        )
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from data
          group {category} (
            aggregate {
              max_score = max score
            }
          )"
        `)
    })

    it('min() compiles correctly in group agg', () => {
        const table = ty.relation('data', { category: 'string', score: 'float64' })
        const q = table.group(
            r => [r.col('category')],
            g => g.agg({ min_score: g.col('score').min() })
        )
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from data
          group {category} (
            aggregate {
              min_score = min score
            }
          )"
        `)
    })
})

describe('BooleanExpr.not()', () => {
    it('produces a boolean expr with same shape', () => {
        const table = ty.relation('data', { active: 'boolean' })
        const e = table.col('active').not()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('columnar')
    })

    it('preserves scalar shape', () => {
        const e = ty.lit(true).not()
        expect(e.dtype()).toEqual({ typecode: 'boolean' })
        expect(e.dshape()).toBe('scalar')
    })

    it('compiles not() in a filter', () => {
        const table = ty.relation('data', { active: 'boolean' })
        const q = table.filter(r => r.col('active').not())
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from data
          filter !(active)"
        `)
    })

    it('chains not() with and()', () => {
        const table = ty.relation('data', { a: 'boolean', b: 'boolean' })
        const q = table.filter(r => r.col('a').not().and(r.col('b')))
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from data
          filter (!(a)) && (b)"
        `)
    })
})

describe('sql() factory function', () => {
    it('creates a raw SQL expr with given dtype and dshape', () => {
        const e = vals.sql('custom_function(x)', { typecode: 'float', size: 64 }, 'columnar')
        expect(e.dtype()).toEqual({ typecode: 'float', size: 64 })
        expect(e.dshape()).toBe('columnar')
    })

    it('creates a scalar raw SQL expr', () => {
        const e = vals.sql('COUNT(*)', { typecode: 'int', size: 64 }, 'scalar')
        expect(e.dtype()).toEqual({ typecode: 'int', size: 64 })
        expect(e.dshape()).toBe('scalar')
    })

    it('compiles to a PRQL s-string (raw SQL)', () => {
        const e = vals.sql('my_udf(col)', { typecode: 'string' }, 'columnar')
        expect(compile(e)).toBe('s"my_udf(col)"')
    })

    it('can be used in a derive', () => {
        const table = ty.relation('data', { x: 'float64' })
        const q = table.derive(() => ({
            custom: vals.sql('x * 2 + 1', { typecode: 'float', size: 64 }, 'columnar')
        }))
        expect(q.toPrql()).toMatchInlineSnapshot(`
          "from data
          derive {
            custom = s"x * 2 + 1"
          }"
        `)
    })
})

describe('count() factory function', () => {
    it('returns an int64 scalar expr', () => {
        const e = ty.count()
        expect(e.dtype()).toEqual({ typecode: 'int', size: 64 })
        expect(e.dshape()).toBe('scalar')
        expectTypeOf(e.dtype()).toEqualTypeOf<dt.DTInt64>()
        expectTypeOf(e.dshape()).toEqualTypeOf<'scalar'>()
    })

    it('compiles to count this', () => {
        expect(compile(ty.count())).toBe('count this')
    })
})

describe('opToExpr()', () => {
    it('wraps a NullLiteralOp in a NullExpr', () => {
        const op = new ops.NullLiteralOp()
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'null' })
        expect(expr.dshape()).toBe('scalar')
    })

    it('wraps an IntervalLiteralOp in an IntervalExpr', () => {
        const op = new ops.IntervalLiteralOp(5)
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'interval' })
        expect(expr.dshape()).toBe('scalar')
    })

    it('wraps a UuidLiteralOp in a UUIDExpr', () => {
        const op = new ops.UuidLiteralOp('550e8400-e29b-41d4-a716-446655440000')
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'uuid' })
        expect(expr.dshape()).toBe('scalar')
    })

    it('wraps a BooleanLiteralOp in a BooleanExpr', () => {
        const op = new ops.BooleanLiteralOp(true)
        const expr = vals.vOpToVExpr(op)
        expect(expr.dtype()).toEqual({ typecode: 'boolean' })
    })
})
