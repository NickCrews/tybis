import { defaultExampleId, exampleMetas, type ExampleMeta } from 'tybis-examples'

export interface Example extends ExampleMeta {
  code: string
}

const sources = import.meta.glob<string>('../../examples/*/example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const examples: Example[] = exampleMetas.map((meta) => {
  const code = sources[`../../examples/${meta.id}/example.ts`]
  if (code === undefined) throw new Error(`No source found for example ${meta.id}`)
  return { ...meta, code }
})

export const defaultExample = examples.find((e) => e.id === defaultExampleId) ?? examples[0]
