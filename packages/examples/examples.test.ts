import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileRelation, defaultExampleId, exampleMetas } from './index.js'

const root = import.meta.dirname

describe('example list', () => {
  it('has one entry per example folder', () => {
    const folders = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules')
      .map((entry) => entry.name)
    expect(exampleMetas.map((meta) => meta.id).sort()).toEqual(folders.sort())
  })

  it('has a default example that exists', () => {
    expect(exampleMetas.map((meta) => meta.id)).toContain(defaultExampleId)
  })
})

describe.each(exampleMetas)('$id', ({ id }) => {
  it('compiles to the expected PRQL and SQL', async () => {
    const { default: relation } = await import(join(root, id, 'example.ts'))
    const result = compileRelation(relation)

    if (result.kind === 'error') throw new Error(result.message)
    if (result.sqlError !== null) throw new Error(result.sqlError)
    // The playground's SQL tab has no params display, so an example with
    // params would show an incomplete query.
    expect(result.params).toEqual([])

    await expect(`${result.prql}\n`).toMatchFileSnapshot(join(root, id, 'expected.prql'))
    await expect(`${result.sql}\n`).toMatchFileSnapshot(join(root, id, 'expected.sql'))
  })
})
