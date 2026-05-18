/**
 * Generates tybis-dts.ts by dynamically pulling type definitions from the
 * built tybis package (dist/index.d.ts) and adding playground-specific
 * globals (ty, preview).
 * 
 * This ensures the Monaco editor always has up-to-date type definitions
 * without manually maintaining a duplicate copy.
 * 
 * Run this script:
 * - Before dev/build (automatically via package.json scripts)
 * - After making changes to tybis type definitions
 * 
 * Requires: tybis package must be built first (pnpm build in root)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const tybisDistPath = resolve(__dirname, '../../tybis/dist/index.d.ts')
console.log(`Reading tybis type definitions from: ${tybisDistPath}`)
const tybisDtsRaw = readFileSync(tybisDistPath, 'utf-8')

const sqlCompilerDistPath = resolve(__dirname, '../../sql-compiler/dist/index.d.ts')
console.log(`Reading sql-compiler type definitions from: ${sqlCompilerDistPath}`)
const sqlCompilerDtsRaw = readFileSync(sqlCompilerDistPath, 'utf-8')

const header = `/**
 * Type declarations injected into the Monaco editor so users get
 * autocomplete and type-checking for the tybis API and the \`preview\`
 * sandbox function.
 *
 * Auto-generated from tybis + tybis-sql-compiler package types.
 */

`

const escape = (s: string) => s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')

const escapedTybis = escape(tybisDtsRaw)
const escapedSqlCompiler = escape(sqlCompilerDtsRaw)

const outputPath = resolve(__dirname, '../src/lib/tybis-dts.generated.ts')
const outputContent = header + `export const TYBIS_DTS = /* ts */ \`declare module "tybis" { ${escapedTybis} }\`

export const TYBIS_SQL_COMPILER_DTS = /* ts */ \`declare module "tybis-sql-compiler" { ${escapedSqlCompiler} }\`
`

writeFileSync(outputPath, outputContent, 'utf-8')
console.log('Generated tybis-dts.generated.ts')
