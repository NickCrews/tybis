import * as Babel from '@babel/standalone'
import * as ty from 'tybis'

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
    sourceType: 'script',
  })
  if (!result.code) throw new Error('Transpilation produced no output')
  return result.code
}

/**
 * Run user TypeScript code in a sandboxed function.
 *
 * The sandbox injects:
 *   - `ty`       – the full tybis module
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

  let captured: ty.Relation | null = null

  function preview(relation: ty.Relation) {
    captured = relation
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('ty', 'preview', jsCode)
    // Augment `ty` with a `table` alias for relation() so both names work.
    const tyWithAliases = { ...ty, table: ty.relation }
    await fn(tyWithAliases, preview)
  } catch (err) {
    return { kind: 'error', message: String(err) }
  }

  if (captured === null) {
    return {
      kind: 'error',
      message: 'No output — call preview(relation) to see results.',
    }
  }

  const rel = captured as ty.Relation

  let prql: string
  try {
    prql = rel.toPrql()
  } catch (err) {
    return { kind: 'error', message: `toPrql() failed: ${err}` }
  }

  let sql: string | null = null
  let sqlError: string | null = null
  try {
    sql = rel.toSql()
  } catch (err) {
    sqlError = String(err)
  }

  return { kind: 'ok', prql, sql, sqlError }
}
