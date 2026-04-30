export interface Example {
  id: string
  label: string
  description: string
  code: string
}

export const examples: Example[] = [
  {
    id: 'penguins-filter',
    label: 'Penguins — Filter',
    description: 'Simple filter on the penguins dataset',
    code: `// Filter the penguins dataset for large bills
import * as ty from 'tybis';

const penguins = ty.relation('penguins', {
  species: 'string',
  island: 'string',
  year: 'int32',
  bill_length_mm: 'float64',
  bill_depth_mm: 'float64',
  body_mass_g: 'float64',
})

const bigBills = penguins
  .filter(r => r.col('bill_length_mm').gt(45))

preview(bigBills)
`,
  },
  {
    id: 'penguins-group-agg',
    label: 'Penguins — Group & Aggregate',
    description: 'Group penguins by species and compute stats',
    code: `// Aggregate penguin measurements by species
import * as ty from 'tybis';

const penguins = ty.relation('penguins', {
  species: 'string',
  year: 'int32',
  bill_length_mm: 'float64',
  body_mass_g: 'float64',
})

const bySpecies = penguins
  .group(
    r => [r.col('species')],
    g => g.agg({
      count: ty.count(),
      avg_bill: g.col('bill_length_mm').mean(),
      avg_mass: g.col('body_mass_g').mean(),
      max_mass: g.col('body_mass_g').max(),
    })
  )
  .sort(r => r.col('avg_mass').desc())

preview(bySpecies)
`,
  },
  {
    id: 'penguins-full-pipeline',
    label: 'Penguins — Full Pipeline',
    description: 'Filter → group → sort → take pipeline from the README',
    code: `// Full pipeline: filter, group, sort, take
import * as ty from 'tybis';

const penguins = ty.relation('penguins', {
  species: 'string',
  year: 'int32',
  bill_length_mm: 'float64',
})

const result = penguins
  .filter(r => r.col('bill_length_mm').gt(40))
  .group(
    r => [r.col('species'), r.col('year')],
    g => g.agg({
      count: ty.count(),
      mean_bill: g.col('bill_length_mm').mean(),
    })
  )
  .select(r => ({
    species: true,
    year: false, // Drop year
    count: true,
    mean_bill_cm: r.col('mean_bill').div(10), // Rename and transform
  }))
  .sort(r => r.col('count').desc())
  .take(10)

preview(result)
`,
  },
  {
    id: 'orders-analysis',
    label: 'E-commerce — Orders',
    description: 'Analyse an orders table by customer',
    code: `// E-commerce orders analysis
import * as ty from 'tybis';

const orders = ty.relation('orders', {
  order_id: 'int64',
  customer_id: 'int64',
  amount: 'float64',
  placed_at: 'datetime',
  is_paid: 'boolean',
})

// Top paying customers with at least one paid order
const topCustomers = orders
  .filter(r => r.col('is_paid').eq(true))
  .filter(r => r.col('amount').gt(50))
  .group(
    r => [r.col('customer_id')],
    g => g.agg({
      order_count: ty.count(),
      total_spent: g.col('amount').sum(),
      max_order:   g.col('amount').max(),
    })
  )
  .sort(r => r.col('total_spent').desc())
  .take(20)

preview(topCustomers)
`,
  },
  {
    id: 'derive',
    label: 'Derive — Computed Columns',
    description: 'Add computed columns with derive()',
    code: `// Add computed/derived columns
import * as ty from 'tybis';

const products = ty.relation('products', {
  name: 'string',
  price_cents: 'int64',
  quantity: 'int32',
})

const enriched = products
  .derive(r => ({
    price_dollars: r.col('price_cents').div(100),
    revenue_cents: r.col('price_cents').mul(r.col('quantity')),
  }))
  .sort(r => r.col('revenue_cents').desc())

preview(enriched)
`,
  },
  {
    id: 'raw-sql',
    label: 'Escape Hatch — Raw SQL',
    description: 'Use ty.sql() for expressions the API does not cover',
    code: `// Escape hatch: embed raw SQL expressions
import * as ty from 'tybis';

const events = ty.relation('events', {
  id: 'int64',
  user_id: 'int64',
  event_name: 'string',
  occurred_at: 'datetime',
})

const withExtract = events
  .derive(() => ({
    // Pull the year out using a raw SQL expression
    year: ty.sql("EXTRACT(YEAR FROM occurred_at)", 'int32'),
  }))
  .group(
    r => [r.col('event_name'), r.col('year')],
    g => g.agg({ n: ty.count() })
  )
  .sort(r => r.col('n').desc())

preview(withExtract)
`,
  },
]

export const defaultExample = examples[2] // Full pipeline
