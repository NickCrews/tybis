import { describe, it, expect } from 'vitest'
import * as ty from 'tybis'
import { DuckDbSqlCompiler } from './dialects/duckdb.js'
import { sql as sqlExpr, type SqlVOp } from './index.js'

const compiler = new DuckDbSqlCompiler()
const compileVal = (e: ty.VExpr<any, any>) =>
  compiler.compileVOp(e.toOp() as SqlVOp)
const finalizeVal = (e: ty.VExpr<any, any>) => {
  const sql = compiler.compileVOp(e.toOp() as SqlVOp)
  // Use `finalize` indirectly via compileROp on a tiny relation, or implement here.
  // Easiest: build a one-row relation that selects the expression.
  const params: unknown[] = []
  let out = ''
  for (const frag of sql) {
    if (typeof frag === 'string') out += frag
    else { params.push(frag.value); out += `$${params.length}` }
  }
  return { sql: out, params }
}

const t = ty.table('t', {
  s: 'string',
  i: 'int32',
  f: 'float64',
  b: 'boolean',
  d: 'date',
  dt: 'datetime',
  tm: 'time',
  u: 'uuid',
})
const compileR = (rel: ty.Relation<any>) => rel.compile(compiler)

describe('VOp output - literals', () => {
  it('int', () => {
    expect(finalizeVal(ty.lit(42, 'int32'))).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "42",
          }
        `)
  })
  it('float', () => {
    expect(finalizeVal(ty.lit(3.14))).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "3.14",
          }
        `)
  })
  it('string -> param', () => {
    expect(finalizeVal(ty.lit('hello'))).toMatchInlineSnapshot(`
          {
            "params": [
              "hello",
            ],
            "sql": "$1",
          }
        `)
  })
  it('boolean', () => {
    expect(finalizeVal(ty.lit(true))).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "TRUE",
          }
        `)
  })
  it('null', () => {
    expect(finalizeVal(ty.lit(null))).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "NULL",
          }
        `)
  })
  it('date -> param', () => {
    expect(finalizeVal(ty.lit('2024-01-15', 'date'))).toMatchInlineSnapshot(`
          {
            "params": [
              "2024-01-15",
            ],
            "sql": "$1",
          }
        `)
  })
  it('datetime -> param', () => {
    expect(finalizeVal(ty.lit('2024-01-15T12:34:56.000Z', 'datetime')))
      .toMatchInlineSnapshot(`
              {
                "params": [
                  "2024-01-15T12:34:56.000Z",
                ],
                "sql": "$1",
              }
            `)
  })
  it('uuid -> param', () => {
    expect(finalizeVal(ty.lit('11111111-2222-3333-4444-555555555555', 'uuid')))
      .toMatchInlineSnapshot(`
              {
                "params": [
                  "11111111-2222-3333-4444-555555555555",
                ],
                "sql": "$1",
              }
            `)
  })
})

describe('VOp output - column ref / count / raw_sql', () => {
  it('col_ref', () => {
    expect(compileVal(t.cols.s)).toMatchInlineSnapshot(`
          [
            ""s"",
          ]
        `)
  })
  it('count()', () => {
    expect(compileVal(ty.count())).toMatchInlineSnapshot(`
          [
            "COUNT(*)",
          ]
        `)
  })
  it('raw_sql passthrough', () => {
    const e = sqlExpr('my_udf(col)', ty.dtype('string'), 'columnar')
    expect(compileVal(e)).toMatchInlineSnapshot(`
          [
            "my_udf(col)",
          ]
        `)
  })
})

describe('Relation - simple cases', () => {
  it('SELECT *', () => {
    expect(compileR(t)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT * FROM "t"",
          }
        `)
  })

  it('filter eq with string param', () => {
    expect(compileR(t.filter(r => r.s.eq('hi'))))
      .toMatchInlineSnapshot(`
              {
                "params": [
                  "hi",
                ],
                "sql": "SELECT * FROM "t" WHERE "s" = $1",
              }
            `)
  })

  it('filter gt int', () => {
    expect(compileR(t.filter(r => r.i.gt(40))))
      .toMatchInlineSnapshot(`
              {
                "params": [],
                "sql": "SELECT * FROM "t" WHERE "i" > 40",
              }
            `)
  })

  it('filter is_not_null', () => {
    expect(compileR(t.filter(r => r.s.isNotNull())))
      .toMatchInlineSnapshot(`
              {
                "params": [],
                "sql": "SELECT * FROM "t" WHERE "s" IS NOT NULL",
              }
            `)
  })

  it('filter and / or / not', () => {
    expect(compileR(t.filter(r => r.i.gt(1).and(r.i.lt(10)))))
      .toMatchInlineSnapshot(`
              {
                "params": [],
                "sql": "SELECT * FROM "t" WHERE ("i" > 1) AND ("i" < 10)",
              }
            `)
  })

  it('select shorthand', () => {
    expect(compileR(t.select(_r => ({ s: true, i: true }))))
      .toMatchInlineSnapshot(`
              {
                "params": [],
                "sql": "SELECT "s", "i" FROM "t"",
              }
            `)
  })

  it('select with derived expressions', () => {
    const q = t.select(r => ({
      s: r.s,
      half: r.f.div(2),
      one: ty.lit(1),
    }))
    expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT "s", ("f" / 2) AS "half", 1 AS "one" FROM "t"",
          }
        `)
  })

  it('derive (no shadow)', () => {
    const q = t.derive(r => ({ doubled: r.i.mul(2) }))
    expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT *, ("i" * 2) AS "doubled" FROM "t"",
          }
        `)
  })

  it('group + agg', () => {
    const q = t
      .groupBy(_r => ({ s: true }))
      .agg(g => ({
        cnt: ty.count(),
        avg_f: g.f.mean(),
        tot: g.i.sum(),
      }))
    expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT "s", COUNT(*) AS "cnt", AVG("f") AS "avg_f", SUM("i") AS "tot" FROM "t" GROUP BY "s"",
          }
        `)
  })

  it('sort asc / desc', () => {
    expect(compileR(t.sort(r => r.i)))
      .toMatchInlineSnapshot(`
              {
                "params": [],
                "sql": "SELECT * FROM "t" ORDER BY "i"",
              }
            `)
    expect(compileR(t.sort(r => r.i.desc())))
      .toMatchInlineSnapshot(`
              {
                "params": [],
                "sql": "SELECT * FROM "t" ORDER BY "i" DESC",
              }
            `)
  })

  it('take', () => {
    expect(compileR(t.take(10))).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT * FROM "t" LIMIT 10",
          }
        `)
  })
})

describe('String ops - DuckDB', () => {
  it('upper / lower', () => {
    const q = t.derive(r => ({
      up: r.s.upper(),
      lo: r.s.lower(),
    }))
    expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [],
            "sql": "SELECT *, UPPER("s") AS "up", LOWER("s") AS "lo" FROM "t"",
          }
        `)
  })
  it('contains (DuckDB function form)', () => {
    const q = t.filter(r => r.s.contains('foo'))
    expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [
              "foo",
            ],
            "sql": "SELECT * FROM "t" WHERE contains("s", $1)",
          }
        `)
  })
  it('starts_with (DuckDB function form)', () => {
    const q = t.filter(r => r.s.startsWith('pre'))
    expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [
              "pre",
            ],
            "sql": "SELECT * FROM "t" WHERE starts_with("s", $1)",
          }
        `)
  })
})

describe('Temporal toString - DuckDB', () => {
  it('date', () => {
    const q = t.derive(r => ({ formatted: r.d.toString('%Y-%m-%d') }))
    expect(compileR(q)).toMatchInlineSnapshot(`
          {
            "params": [
              "%Y-%m-%d",
            ],
            "sql": "SELECT *, strftime("d", $1) AS "formatted" FROM "t"",
          }
        `)
  })
})
