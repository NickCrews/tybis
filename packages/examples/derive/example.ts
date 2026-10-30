import * as ty from 'tybis';

const products = ty.table('products', {
  name: 'string',
  price_cents: 'int64',
  quantity: 'int32',
})

const enriched = products
  .derive(r => ({
    price_dollars: r.price_cents.div(100),
    revenue_cents: r.price_cents.mul(r.quantity),
  }))
  .sort({ revenue_cents: 'desc' })

export default enriched
