import * as ty from 'tybis';

const penguins = ty.table('penguins', {
  species: 'string',
  year: 'int32',
  bill_length_mm: 'float64',
  body_mass_g: 'float64',
})

const bySpecies = penguins
  .groupBy({ species: true })
  .agg(g => ({
    count: ty.count(),
    avg_bill: g.bill_length_mm.mean(),
    avg_mass: g.body_mass_g.mean(),
    max_mass: g.body_mass_g.max(),
  }))
  .sort({ avg_mass: 'desc' })

export default bySpecies
