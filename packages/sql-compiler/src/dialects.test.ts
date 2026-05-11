import { describe, it, expect } from 'vitest'
import * as ty from 'tybis'
import { DuckDbSqlCompiler } from './dialects/duckdb.js'
import { PostgresSqlCompiler } from './dialects/postgres.js'
import { MySqlSqlCompiler } from './dialects/mysql.js'
import { SqliteSqlCompiler } from './dialects/sqlite.js'

const t = ty.table('users', {
  id: 'int32',
  name: 'string',
  bio: 'string',
  created: 'datetime',
})

describe('Placeholder style', () => {
  const q = t.filter(r => r.col('name').eq('alice'))
  it('DuckDB uses $N', () => {
    expect(q.compile(new DuckDbSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "alice",
            ],
            "sql": "SELECT * FROM "users" WHERE "name" = $1",
          }
        `)
  })
  it('Postgres uses $N', () => {
    expect(q.compile(new PostgresSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "alice",
            ],
            "sql": "SELECT * FROM "users" WHERE "name" = $1",
          }
        `)
  })
  it('MySQL uses ?', () => {
    expect(q.compile(new MySqlSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "alice",
            ],
            "sql": "SELECT * FROM \`users\` WHERE \`name\` = ?",
          }
        `)
  })
  it('SQLite uses ?', () => {
    expect(q.compile(new SqliteSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "alice",
            ],
            "sql": "SELECT * FROM "users" WHERE "name" = ?",
          }
        `)
  })
})

describe('contains() — per-dialect functions', () => {
  const q = t.filter(r => r.col('bio').contains('hello'))
  it('DuckDB → contains()', () => {
    expect(q.compile(new DuckDbSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "hello",
            ],
            "sql": "SELECT * FROM "users" WHERE contains("bio", $1)",
          }
        `)
  })
  it('Postgres → strpos() > 0', () => {
    expect(q.compile(new PostgresSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "hello",
            ],
            "sql": "SELECT * FROM "users" WHERE strpos("bio", $1) > 0",
          }
        `)
  })
  it('MySQL → LOCATE() > 0', () => {
    expect(q.compile(new MySqlSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "hello",
            ],
            "sql": "SELECT * FROM \`users\` WHERE LOCATE(?, \`bio\`) > 0",
          }
        `)
  })
  it('SQLite → instr() > 0', () => {
    expect(q.compile(new SqliteSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "hello",
            ],
            "sql": "SELECT * FROM "users" WHERE instr("bio", ?) > 0",
          }
        `)
  })
})

describe('starts_with() — per-dialect functions', () => {
  const q = t.filter(r => r.col('name').startsWith('al'))
  it('DuckDB → starts_with()', () => {
    expect(q.compile(new DuckDbSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "al",
            ],
            "sql": "SELECT * FROM "users" WHERE starts_with("name", $1)",
          }
        `)
  })
  it('Postgres → starts_with()', () => {
    expect(q.compile(new PostgresSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "al",
            ],
            "sql": "SELECT * FROM "users" WHERE starts_with("name", $1)",
          }
        `)
  })
  it('MySQL → LEFT/CHAR_LENGTH form', () => {
    expect(q.compile(new MySqlSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "al",
              "al",
            ],
            "sql": "SELECT * FROM \`users\` WHERE LEFT(\`name\`, CHAR_LENGTH(?)) = ?",
          }
        `)
  })
  it('SQLite → substr/length form', () => {
    expect(q.compile(new SqliteSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "al",
              "al",
            ],
            "sql": "SELECT * FROM "users" WHERE substr("name", 1, length(?)) = ?",
          }
        `)
  })
})

describe('temporal_to_string() — per-dialect functions', () => {
  const q = t.derive(r => ({ d: r.col('created').toString('%Y-%m-%d') }))
  it('DuckDB → strftime()', () => {
    expect(q.compile(new DuckDbSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "%Y-%m-%d",
            ],
            "sql": "SELECT *, strftime("created", $1) AS "d" FROM "users"",
          }
        `)
  })
  it('Postgres → to_char()', () => {
    expect(q.compile(new PostgresSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "%Y-%m-%d",
            ],
            "sql": "SELECT *, to_char("created", $1) AS "d" FROM "users"",
          }
        `)
  })
  it('MySQL → DATE_FORMAT()', () => {
    expect(q.compile(new MySqlSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "%Y-%m-%d",
            ],
            "sql": "SELECT *, DATE_FORMAT(\`created\`, ?) AS \`d\` FROM \`users\`",
          }
        `)
  })
  it('SQLite → strftime() (format-first)', () => {
    expect(q.compile(new SqliteSqlCompiler())).toMatchInlineSnapshot(`
          {
            "params": [
              "%Y-%m-%d",
            ],
            "sql": "SELECT *, strftime(?, "created") AS "d" FROM "users"",
          }
        `)
  })
})
