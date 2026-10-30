import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { exampleMetas } from 'tybis-examples'
import { runCode } from './runner'

const examplePath = (id: string, file: string) =>
  fileURLToPath(new URL(`../../../examples/${id}/${file}`, import.meta.url))

describe.each(exampleMetas)('runCode on example $id', ({ id }) => {
  it('produces the expected PRQL and SQL', async () => {
    const result = await runCode(readFileSync(examplePath(id, 'example.ts'), 'utf-8'))

    if (result.kind === 'error') throw new Error(result.message)
    expect(`${result.prql}\n`).toBe(readFileSync(examplePath(id, 'expected.prql'), 'utf-8'))
    expect(`${result.sql}\n`).toBe(readFileSync(examplePath(id, 'expected.sql'), 'utf-8'))
  })
})

describe('runCode', () => {
  it('supports named imports', async () => {
    const result = await runCode(`
      import { table } from 'tybis'
      export default table('t', { x: 'int32' })
    `)
    expect(result).toMatchObject({ kind: 'ok', prql: 'from t' })
  })

  it('returns an error when there is no default export', async () => {
    const result = await runCode(`const x = 1`)
    expect(result).toMatchObject({ kind: 'error', message: expect.stringContaining('export default') })
  })

  it('returns an error when the default export is not a relation', async () => {
    const result = await runCode(`export default 42`)
    expect(result).toMatchObject({ kind: 'error', message: expect.stringContaining('export default') })
  })

  it('returns an error when importing an unknown module', async () => {
    const result = await runCode(`
      import * as x from 'lodash'
      export default x
    `)
    expect(result).toMatchObject({ kind: 'error', message: expect.stringContaining('lodash') })
  })
})
