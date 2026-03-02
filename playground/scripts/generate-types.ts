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

const tybisDistPath = resolve(__dirname, '../../dist/index.d.ts')
const tybisDtsRaw = readFileSync(tybisDistPath, 'utf-8')

const header = `/**
 * Type declarations injected into the Monaco editor so users get
 * autocomplete and type-checking for the tybis API and the \`preview\`
 * sandbox function.
 * 
 * Auto-generated from tybis package types.
 */

`

const escapedDts = tybisDtsRaw
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')

const outputPath = resolve(__dirname, '../src/lib/tybis-dts.generated.ts')
const outputContent = header + `export const TYBIS_DTS = /* ts */ \`declare module "tybis" { ${escapedDts} }\`
`

writeFileSync(outputPath, outputContent, 'utf-8')
console.log('Generated tybis-dts.generated.ts from tybis/dist/index.d.ts')
