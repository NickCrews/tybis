/**
 * Print the PRQL and SQL that an example compiles to:
 *
 *     pnpm example penguins-filter
 */

import { compileRelation, exampleMetas } from './index.js'

const id = process.argv[2]
const ids = exampleMetas.map((meta) => meta.id)

if (id === undefined || !ids.includes(id)) {
  console.error(`Usage: pnpm example <id>\n\nAvailable examples:\n  ${ids.join('\n  ')}`)
  process.exit(1)
}

const { default: relation } = await import(`./${id}/example.ts`)
const result = compileRelation(relation)

if (result.kind === 'error') {
  console.error(result.message)
  process.exit(1)
}

console.log(`-- PRQL\n${result.prql}\n`)
if (result.sqlError !== null) {
  console.error(`SQL compilation failed: ${result.sqlError}`)
  process.exit(1)
}
console.log(`-- SQL\n${result.sql}`)
