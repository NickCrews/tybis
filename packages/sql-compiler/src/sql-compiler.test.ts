import { describe, it, expect } from 'vitest'
import * as ty from 'tybis'
import { SqlCompiler } from './sql-compiler.js'

const compiler = new SqlCompiler()
const compileOp = (e: ty.VExpr<any, any>) =>
    compiler.compileVOp(e.toOp() as ty.BuiltinVOp)
const toSql = (rel: ty.Relation<any>) => rel.compile(compiler)

describe('SqlCompiler value ops (delegates to PRQL)', () => {
    it('null literal', () => {
        expect(compileOp(ty.lit(null))).toBe('null')
    })

    it('string literal', () => {
        expect(compileOp(ty.lit('hello'))).toBe('"hello"')
    })

    it('int literal', () => {
        expect(compileOp(ty.lit(42, 'int32'))).toBe('42')
    })

    it('float literal', () => {
        expect(compileOp(ty.lit(3.14))).toBe('3.14')
    })

    it('boolean literal', () => {
        expect(compileOp(ty.lit(true))).toBe('true')
    })

    it('date literal', () => {
        expect(compileOp(ty.lit('2024-01-15', 'date'))).toBe('@2024-01-15')
    })

    it('datetime literal', () => {
        expect(compileOp(ty.lit('2024-01-15T12:34:56.000Z', 'datetime')))
            .toBe('@2024-01-15T12:34:56.000Z')
    })

    it('count() factory', () => {
        expect(compileOp(ty.count())).toBe('count this')
    })

    it('sql() factory produces s-string', () => {
        const e = ty.sql('my_udf(col)', { typecode: 'string' }, 'columnar')
        expect(compileOp(e)).toBe('s"my_udf(col)"')
    })
})

describe('SqlCompiler relation ops', () => {
    const penguins = ty.table('penguins', {
        species: 'string',
        year: 'int32',
        bill_length_mm: 'float64',
    })

    it('simple relation', () => {
        expect(toSql(penguins)).toMatchInlineSnapshot(`"SELECT * FROM penguins"`)
    })

    it('filter', () => {
        const sql = toSql(penguins.filter(r => r.col('bill_length_mm').gt(40)))
        expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins WHERE bill_length_mm > 40"`)
    })

    it('group + agg', () => {
        const sql = toSql(penguins.group(
            _r => ({ species: true, year: true }),
            g => g.agg({
                count: ty.count(),
                mean_bill: g.col('bill_length_mm').mean(),
            })
        ))
        expect(sql).toMatchInlineSnapshot(`"SELECT species, year, COUNT(*) AS count, AVG(bill_length_mm) AS mean_bill FROM penguins GROUP BY species, year"`)
    })

    it('sort descending', () => {
        const sql = toSql(penguins.sort(r => r.col('bill_length_mm').desc()))
        expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins ORDER BY bill_length_mm DESC"`)
    })

    it('take', () => {
        const sql = toSql(penguins.take(10))
        expect(sql).toMatchInlineSnapshot(`"SELECT * FROM penguins LIMIT 10"`)
    })

    it('select', () => {
        const sql = toSql(penguins.select(r => ({
            species: r.col('species'),
            half_bill: r.col('bill_length_mm').div(2),
            one: ty.lit(1),
        })))
        expect(sql).toMatchInlineSnapshot(`"SELECT species, (bill_length_mm / 2) AS half_bill, 1 AS one FROM penguins"`)
    })

    it('select shorthand', () => {
        const sql = toSql(penguins.select(_r => ({ species: true })))
        expect(sql).toMatchInlineSnapshot(`"SELECT species FROM penguins"`)
    })

    it('select with false drops a column', () => {
        const sql = toSql(penguins.select(_r => ({
            species: true,
            year: false,
        })))
        expect(sql).toMatchInlineSnapshot(`"SELECT species FROM penguins"`)
    })
})

describe('SqlCompiler — date / datetime / time toString', () => {
    it('date toString', () => {
        const events = ty.table('events', {
            id: 'int32',
            event_date: 'date',
            description: 'string',
        })
        const sql = toSql(events.derive(r => ({
            formatted_date: r.col('event_date').toString('%Y-%m-%d'),
        })))
        expect(sql).toMatchInlineSnapshot(`"SELECT *, strftime(event_date, '%Y-%m-%d') AS formatted_date FROM events"`)
    })

    it('datetime toString', () => {
        const events = ty.table('events', {
            id: 'int32',
            event_datetime: 'datetime',
            description: 'string',
        })
        const sql = toSql(events.derive(r => ({
            formatted_date: r.col('event_datetime').toString('%Y-%m-%d'),
        })))
        expect(sql).toMatchInlineSnapshot(`"SELECT *, strftime(event_datetime, '%Y-%m-%d') AS formatted_date FROM events"`)
    })

    it('time toString', () => {
        const logs = ty.table('logs', {
            id: 'int32',
            mytime: 'time',
            message: 'string',
        })
        const sql = toSql(logs.derive(r => ({
            formatted_time: r.col('mytime').toString('%H:%M:%S'),
        })))
        expect(sql).toMatchInlineSnapshot(`"SELECT *, strftime(mytime, '%H:%M:%S') AS formatted_time FROM logs"`)
    })
})

describe('SqlCompiler — uuid', () => {
    const users = ty.table('users', {
        id: "uuid",
        name: "string",
        email: "string",
    })

    it('simple select', () => {
        expect(toSql(users)).toMatchInlineSnapshot(`"SELECT * FROM users"`)
    })

    it('filter by uuid equality', () => {
        const sql = toSql(users.filter(r => r.col('id').eq(r.col('id'))))
        expect(sql).toMatchInlineSnapshot(`"SELECT * FROM users WHERE id = id"`)
    })

    it('filter by uuid isNotNull', () => {
        const sql = toSql(users.filter(r => r.col('id').isNotNull()))
        expect(sql).toMatchInlineSnapshot(`"SELECT * FROM users WHERE id IS NOT NULL"`)
    })

    it('sort by uuid', () => {
        const sql = toSql(users.sort(r => r.col('id').asc()))
        expect(sql).toMatchInlineSnapshot(`"SELECT * FROM users ORDER BY id"`)
    })

    it('derive with uuid column', () => {
        const sql = toSql(users.derive(r => ({ user_id: r.col('id') })))
        expect(sql).toMatchInlineSnapshot(`"SELECT *, id AS user_id FROM users"`)
    })
})
