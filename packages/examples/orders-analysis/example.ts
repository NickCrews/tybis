import * as ty from 'tybis';

const orders = ty.table('orders', {
  order_id: 'int64',
  customer_id: 'int64',
  amount: 'float64',
  placed_at: 'datetime',
  is_paid: 'boolean',
})

// Top paying customers with at least one paid order over $50
const topCustomers = orders
  .filter(r => r.is_paid.eq(true))
  .filter(r => r.amount.gt(50))
  .groupBy({ customer_id: true })
  .agg(r => ({
    order_count: ty.count(),
    total_spent: r.amount.sum(),
    max_order: r.amount.max(),
  }))
  .sort({ total_spent: 'desc' })
  .take(20)

export default topCustomers
