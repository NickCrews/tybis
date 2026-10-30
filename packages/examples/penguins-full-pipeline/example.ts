import * as ty from 'tybis';

const penguins = ty.table('penguins', {
  species: 'string',
  year: 'int32',
  bill_length_mm: 'float64',
})

const result = penguins
  .filter(r => r.bill_length_mm.gt(40))
  .groupBy({ species: true, year: true })
  .agg(g => ({
    count: ty.count(),
    mean_bill: g.bill_length_mm.mean(),
  }))
  .select(r => ({
    species: true,
    year: false, // Drop year
    count: true,
    mean_bill_cm: r.mean_bill.div(10), // Rename and transform
  }))
  .sort({ count: 'desc' })
  .take(10)

export default result
