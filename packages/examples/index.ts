export { compileRelation, type CompileResult } from './compile.js'

export interface ExampleMeta {
  /** The name of the folder holding the example. */
  id: string
  label: string
  description: string
}

/** Every example, in the order the playground lists them. */
export const exampleMetas: ExampleMeta[] = [
  {
    id: 'penguins-filter',
    label: 'Penguins — Filter',
    description: 'Simple filter on the penguins dataset',
  },
  {
    id: 'penguins-group-agg',
    label: 'Penguins — Group & Aggregate',
    description: 'Group penguins by species and compute stats',
  },
  {
    id: 'penguins-full-pipeline',
    label: 'Penguins — Full Pipeline',
    description: 'Filter → group → sort → take pipeline from the README',
  },
  {
    id: 'orders-analysis',
    label: 'E-commerce — Orders',
    description: 'Analyse an orders table by customer',
  },
  {
    id: 'derive',
    label: 'Derive — Computed Columns',
    description: 'Add computed columns with derive()',
  },
  {
    id: 'raw-sql',
    label: 'Escape Hatch — Raw SQL',
    description: 'Use tysql.sql() for expressions the API does not cover',
  },
]

export const defaultExampleId = 'penguins-full-pipeline'
