import * as ty from 'tybis';
import * as tysql from 'tybis-sql-compiler';

const events = ty.table('events', {
  id: 'int64',
  user_id: 'int64',
  event_name: 'string',
  occurred_at: 'datetime',
})

const withExtract = events
  .derive({
    // Pull the year out using a raw SQL expression
    year: tysql.sql("EXTRACT(YEAR FROM occurred_at)", { typecode: 'int', size: 32, nullable: true }, 'columnar'),
  })
  .groupBy({ event_name: true, year: true })
  .agg({ n: ty.count() })
  .sort({ n: 'desc' })

export default withExtract
