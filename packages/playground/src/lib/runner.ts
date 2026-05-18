import * as Babel from '@babel/standalone'
import * as ty from 'tybis'
import * as tysql from 'tybis-sql-compiler'
import { DuckDbSqlCompiler } from 'tybis-sql-compiler'
import { toPrql } from 'tybis-prql-compiler'

export type PreviewResult =
  | { kind: 'ok'; prql: string; sql: string | null; sqlError: string | null }
  | { kind: 'error'; message: string }

/**
 * Transpile TypeScript user code to plain JavaScript by stripping type
 * annotations. We keep it as ESNext so the modern browser handles it natively.
 */
function transpile(tsCode: string): string {
  const result = Babel.transform(tsCode, {
    filename: 'user.ts',
    presets: [
      ['typescript', { allExtensions: true }],
    ],
    plugins: [],
    sourceType: 'module',
  })
  if (!result.code) throw new Error('Transpilation produced no output')
  return result.code
}

/**
 * Run user TypeScript code in a sandboxed function.
 *
 * The sandbox injects:
 *   - `preview`  – a function the user calls to push output to the panel
 *
 * Returns the result captured by `preview()`, or an error.
 */
export async function runCode(tsCode: string): Promise<PreviewResult> {
  let jsCode: string
  try {
    jsCode = transpile(tsCode)
  } catch (err) {
    return { kind: 'error', message: String(err) }
  }

  // mega hacky. There must be better ways to do this.
  jsCode = jsCode.replace(
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"]tybis['"]/g,
    'const $1 = __ty'
  )
  jsCode = jsCode.replace(
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"]tybis-sql-compiler['"]/g,
    'const $1 = __tysql'
  )

  let captured: ty.Relation | null = null

  function preview(relation: ty.Relation) {
    captured = relation
  }

  try {
    const fn = new Function('__ty', '__tysql', 'preview', jsCode)
    await fn(ty, tysql, preview)
  } catch (err) {
    return { kind: 'error', message: String(err) }
  }

  if (captured === null) {
    return {
      kind: 'error',
      message: 'No output — call preview(relation) to see results.',
    }
  }

  const rel = captured as ty.Relation<ty.Schema, ty.BuiltinROp>

  let prql: string
  try {
    prql = toPrql(rel)
  } catch (err) {
    return { kind: 'error', message: `toPrql() failed: ${err}` }
  }

  let sql: string | null = null
  let sqlError: string | null = null
  try {
    sql = rel.compile(new DuckDbSqlCompiler()).sql
  } catch (err) {
    sqlError = String(err)
  }

  return { kind: 'ok', prql, sql, sqlError }
}
