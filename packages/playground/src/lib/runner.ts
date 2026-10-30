import * as Babel from '@babel/standalone'
import * as ty from 'tybis'
import * as tysql from 'tybis-sql-compiler'
import { compileRelation, type CompileResult } from 'tybis-examples'

/** The modules that user code can import. */
const MODULES: Record<string, unknown> = {
  'tybis': ty,
  'tybis-sql-compiler': tysql,
}

function requireModule(name: string): unknown {
  if (!(name in MODULES)) {
    throw new Error(`Cannot import '${name}'. Available modules: ${Object.keys(MODULES).join(', ')}`)
  }
  return MODULES[name]
}

/**
 * Transpile TypeScript user code to plain JavaScript by stripping type
 * annotations and converting ES modules to CommonJS, so that the code can run
 * inside a function body with its imports and exports routed through the
 * `require` and `exports` that we pass in.
 */
function transpile(tsCode: string): string {
  const result = Babel.transform(tsCode, {
    filename: 'user.ts',
    presets: [
      ['typescript', { allExtensions: true }],
    ],
    plugins: ['transform-modules-commonjs'],
    sourceType: 'module',
  })
  if (!result.code) throw new Error('Transpilation produced no output')
  return result.code
}

/**
 * Run user TypeScript code in a function on the current page.
 *
 * This is not a security boundary: imports are limited to `MODULES`, but the
 * code can still reach every browser global.
 *
 * The code's default export is the relation to show in the output panel.
 *
 * Returns the compiled output of that relation, or an error.
 */
export async function runCode(tsCode: string): Promise<CompileResult> {
  let jsCode: string
  try {
    jsCode = transpile(tsCode)
  } catch (err) {
    return { kind: 'error', message: String(err) }
  }

  const exports: { default?: unknown } = {}
  try {
    const fn = new Function('require', 'exports', jsCode)
    await fn(requireModule, exports)
  } catch (err) {
    return { kind: 'error', message: String(err) }
  }

  if (!(exports.default instanceof ty.Relation)) {
    return {
      kind: 'error',
      message: 'No output — add `export default relation` to see results.',
    }
  }

  return compileRelation(exports.default)
}
