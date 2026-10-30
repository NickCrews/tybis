import * as ty from 'tybis'
import { DuckDbSqlCompiler } from 'tybis-sql-compiler'
import { toPrql } from 'tybis-prql-compiler'

export type CompileResult =
  | { kind: 'ok'; prql: string; sql: string | null; params: unknown[]; sqlError: string | null }
  | { kind: 'error'; message: string }

/**
 * Compile a relation to every target the playground displays.
 *
 * The playground, the snapshot tests, and the CLI all use this function, so a
 * passing snapshot means the playground shows that output.
 */
export function compileRelation(relation: ty.Relation): CompileResult {
  const rel = relation as ty.Relation<ty.Schema, ty.BuiltinROp>

  let prql: string
  try {
    prql = toPrql(rel)
  } catch (err) {
    return { kind: 'error', message: `toPrql() failed: ${err}` }
  }

  try {
    const { sql, params } = rel.compile(new DuckDbSqlCompiler())
    return { kind: 'ok', prql, sql, params, sqlError: null }
  } catch (err) {
    return { kind: 'ok', prql, sql: null, params: [], sqlError: String(err) }
  }
}
