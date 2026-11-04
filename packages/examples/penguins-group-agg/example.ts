import * as ty from 'tybis';

const penguins = ty.table('penguins', {
  species: 'string',
  year: 'int32',
  bill_length_mm: 'float64',
  body_mass_g: 'float64',
})

const bySpecies = penguins
  .groupBy({ species: true })
  .agg(r => ({
    count: ty.count(),
    avg_bill: r.bill_length_mm.mean(),
    avg_mass: r.body_mass_g.mean(),
    max_mass: r.body_mass_g.max(),
  }))
  .sort({ avg_mass: 'desc' })

export default bySpecies
