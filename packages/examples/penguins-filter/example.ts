import * as ty from 'tybis';

const penguins = ty.table('penguins', {
  species: 'string',
  island: 'string',
  year: 'int32',
  bill_length_mm: 'float64',
  bill_depth_mm: 'float64',
  body_mass_g: 'float64',
})

const bigBills = penguins
  .filter(r => r.bill_length_mm.gt(45))

export default bigBills
