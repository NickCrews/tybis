import { describe, it, expect } from 'vitest'
import * as ty from 'tybis'
import { type VExpr } from 'tybis'
import { PrqlCompiler, type SupportedPrqlVops } from './prql-compiler.js'
import { toPrql } from './index.js'
import { sql } from 'tybis-sql-compiler'

const compiler = new PrqlCompiler()
const compile = (e: VExpr<any, any>) => compiler.compileVOp(e.toOp() as SupportedPrqlVops)

describe('PrqlCompiler value ops', () => {
  describe('literals', () => {
    it('null', () => {
      expect(compile(ty.lit(null))).toBe('null')
    })

    it('string', () => {
      expect(compile(ty.lit('hello'))).toBe('"hello"')
      expect(compile(ty.lit('hello', 'string'))).toBe('"hello"')
      expect(compile(ty.lit(54, 'string'))).toBe('"54"')
      expect(compile(ty.lit(new Date('2024-01-15T00:00:00.000Z'), 'string')))
        .toBe('"2024-01-15T00:00:00.000Z"')
    })

    it('int', () => {
      expect(compile(ty.lit(42))).toBe('42')
      expect(compile(ty.lit(42, 'int32'))).toBe('42')
      expect(compile(ty.lit("42", 'int32'))).toBe('42')
    })

    it('float', () => {
      expect(compile(ty.lit(3.14))).toBe('3.14')
      expect(compile(ty.lit(42, 'float'))).toBe('42')
      expect(compile(ty.lit("42", 'float'))).toBe('42')
      expect(compile(ty.lit("NaN", 'float'))).toBe('NaN')
    })

    it('boolean', () => {
      expect(compile(ty.lit(true))).toBe('true')
      expect(compile(ty.lit('true', 'boolean'))).toBe('true')
      expect(compile(ty.lit(0, 'boolean'))).toBe('false')
      expect(compile(ty.lit(null, 'boolean'))).toBe('false')
    })

    it('date / datetime', () => {
      expect(compile(ty.lit(new Date('2024-01-15T12:34:56.000Z'))))
        .toBe('@2024-01-15T12:34:56.000Z')
      expect(compile(ty.lit(new Date('2024-01-15T12:34:56.000Z'), 'date')))
        .toBe('@2024-01-15')
      expect(compile(ty.lit('2024-01-15', 'date'))).toBe('@2024-01-15')
      expect(compile(ty.lit('2024-01-15T12:34:56.000Z', 'datetime')))
        .toBe('@2024-01-15T12:34:56.000Z')
    })
  })

  describe('factory functions', () => {
    it('count() compiles to "count this"', () => {
      expect(compile(ty.count())).toBe('count this')
    })

    it('sql() compiles to a PRQL s-string', () => {
      const e = sql('my_udf(col)', { typecode: 'string', nullable: true }, 'columnar')
      expect(compile(e)).toBe('s"my_udf(col)"')
    })
  })
})

describe('PrqlCompiler relation ops', () => {
  const penguins = ty.table('penguins', {
    species: 'string',
    year: 'int32',
    bill_length_mm: 'float64',
  })

  it('simple relation', () => {
    expect(toPrql(penguins)).toMatchInlineSnapshot(`"from penguins"`)
  })

  it('filter', () => {
    const q = penguins.filter(r => r.bill_length_mm.gt(40))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          filter bill_length_mm > 40"
        `)
  })

  it('group + agg', () => {
    const q = penguins
      .groupBy(_r => ({ species: true, year: true }))
      .agg(g => ({
        count: ty.count(),
        mean_bill: g.bill_length_mm.mean(),
      }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          group {species, year} (
            aggregate {
              count = count this,
              mean_bill = average bill_length_mm
            }
          )"
        `)
  })

  it('sort descending', () => {
    const q = penguins.sort(r => r.bill_length_mm.desc())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          sort {-bill_length_mm}"
        `)
  })

  it('take', () => {
    const q = penguins.take(10)
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          take 10"
        `)
  })

  it('select', () => {
    const q = penguins.select(r => ({
      species: r.species,
      half_bill: r.bill_length_mm.div(2),
      one: ty.lit(1),
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          select {
            species = species,
            half_bill = bill_length_mm / 2,
            one = 1
          }"
        `)
  })

  it('select shorthand', () => {
    const q = penguins.select(_r => ({ species: true }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          select {
            species = species
          }"
        `)
  })

  it('select with false drops a column', () => {
    const q = penguins.select(_r => ({
      species: true,
      year: false,
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          select {
            species = species
          }"
        `)
  })

  it('derive a computed column', () => {
    const q = penguins.derive(r => ({
      ratio: r.bill_length_mm.div(40),
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          derive {
            ratio = bill_length_mm / 40
          }"
        `)
  })

  it('chained operations', () => {
    const q = penguins
      .filter(_r => _r.bill_length_mm.gt(40))
      .groupBy(_r => ({ species: true, year: true }))
      .agg(g => ({
        count: ty.count(),
        mean_bill: g.bill_length_mm.mean(),
      }))
      .sort(_r => _r.count.desc())
      .take(10)
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          filter bill_length_mm > 40
          group {species, year} (
            aggregate {
              count = count this,
              mean_bill = average bill_length_mm
            }
          )
          sort {-count}
          take 10"
        `)
  })
})

describe('PrqlCompiler — derive', () => {
  it('multiple derived columns', () => {
    const penguins = ty.table('penguins', {
      species: 'string',
      year: 'int32',
      bill_length_mm: 'float64',
    })
    const q = penguins.derive(r => ({
      half_bill: r.bill_length_mm.div(2),
      double_bill: r.bill_length_mm.mul(2),
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          derive {
            half_bill = bill_length_mm / 2,
            double_bill = bill_length_mm * 2
          }"
        `)
  })
})

describe('PrqlCompiler — sort', () => {
  const penguins = ty.table('penguins', {
    species: 'string',
    year: 'int32',
    bill_length_mm: 'float64',
  })

  it('asc()', () => {
    const q = penguins.sort(r => r.bill_length_mm.asc())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          sort {bill_length_mm}"
        `)
  })

  it('bare column (default ascending)', () => {
    const q = penguins.sort(r => r.year)
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          sort {year}"
        `)
  })

  it('multiple keys with mixed asc/desc', () => {
    const q = penguins.sort(r => [r.species, r.bill_length_mm.desc()])
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          sort {species, -bill_length_mm}"
        `)
  })

  it('multiple ascending keys', () => {
    const q = penguins.sort(r => [r.species.asc(), r.year.asc()])
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          sort {species, year}"
        `)
  })

  it('multiple descending keys', () => {
    const q = penguins.sort(r => [r.species.desc(), r.year.desc()])
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          sort {-species, -year}"
        `)
  })
})

describe('PrqlCompiler — comparison ops', () => {
  const table = ty.table('data', {
    f64a: 'float64',
    f64b: 'float64',
    name: 'string',
  })

  it('eq', () => {
    const q = table.derive(r => ({ is_five: r.f64a.eq(5) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          derive {
            is_five = f64a == 5
          }"
        `)
  })

  it('gt', () => {
    const q = table.derive(r => ({ is_greater: r.f64a.gt(5) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          derive {
            is_greater = f64a > 5
          }"
        `)
  })

  it('gte', () => {
    const q = table.derive(r => ({ is_gte: r.f64a.gte(10) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          derive {
            is_gte = f64a >= 10
          }"
        `)
  })

  it('lt', () => {
    const q = table.derive(r => ({ is_less: r.f64a.lt(20) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          derive {
            is_less = f64a < 20
          }"
        `)
  })

  it('lte', () => {
    const q = table.derive(r => ({ is_lte: r.f64a.lte(20) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          derive {
            is_lte = f64a <= 20
          }"
        `)
  })

  it('and / combined comparisons', () => {
    const q = table.filter(r =>
      r.f64a.gt(10).and(r.f64b.lt(20))
    )
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          filter (f64a > 10) && (f64b < 20)"
        `)
  })

  it('or', () => {
    const q = table.filter(r =>
      r.f64a.gt(100).or(r.f64b.lt(5))
    )
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          filter (f64a > 100) || (f64b < 5)"
        `)
  })

  it('not', () => {
    const t = ty.table('data', { active: 'boolean' })
    const q = t.filter(r => r.active.not())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          filter !(active)"
        `)
  })

  it('not chained with and', () => {
    const t = ty.table('data', { a: 'boolean', b: 'boolean' })
    const q = t.filter(r => r.a.not().and(r.b))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          filter (!(a)) && (b)"
        `)
  })

  it('isNotNull in a filter', () => {
    const t = ty.table('data', { name: 'string' })
    const q = t.filter(r => r.name.isNotNull())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          filter name != null"
        `)
  })

  it('isNull in a filter', () => {
    const t = ty.table('data', { name: 'string' })
    const q = t.filter(r => r.name.isNull())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          filter name == null"
        `)
  })
})

describe('PrqlCompiler — numeric ops', () => {
  const table = ty.table('nums', {
    x: 'float64',
    y: 'float64',
  })

  it('addition columnar + scalar', () => {
    const q = table.derive(r => ({ result: r.x.add(5) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from nums
          derive {
            result = x + 5
          }"
        `)
  })

  it('addition columnar + columnar', () => {
    const q = table.derive(r => ({ result: r.x.add(r.y) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from nums
          derive {
            result = x + y
          }"
        `)
  })

  it('subtraction', () => {
    const q = table.derive(r => ({ result: r.x.sub(r.y) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from nums
          derive {
            result = x - y
          }"
        `)
  })

  it('multiplication', () => {
    const q = table.derive(r => ({ result: r.x.mul(2) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from nums
          derive {
            result = x * 2
          }"
        `)
  })

  it('division', () => {
    const q = table.derive(r => ({ result: r.x.div(r.y) }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from nums
          derive {
            result = x / y
          }"
        `)
  })
})

describe('PrqlCompiler — string ops', () => {
  const table = ty.table('users', {
    name: 'string',
    email: 'string',
  })

  it('upper', () => {
    const q = table.derive(r => ({ name_upper: r.name.upper() }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          derive {
            name_upper = upper name
          }"
        `)
  })

  it('lower', () => {
    const q = table.derive(r => ({ name_lower: r.name.lower() }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          derive {
            name_lower = lower name
          }"
        `)
  })

  it('contains', () => {
    const q = table.filter(r => r.email.contains('gmail'))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          filter contains email "gmail""
        `)
  })

  it('startsWith', () => {
    const q = table.filter(r => r.name.startsWith('Dr.'))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          filter starts_with name "Dr.""
        `)
  })

  it('chained string operations', () => {
    const q = table.derive(r => ({
      normalized: r.name.lower().upper()
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          derive {
            normalized = upper lower name
          }"
        `)
  })

  it('combined contains and startsWith', () => {
    const q = table.filter(r =>
      r.email.contains('gmail').and(
        r.name.startsWith('A')
      )
    )
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          filter (contains email "gmail") && (starts_with name "A")"
        `)
  })
})

describe('PrqlCompiler — aggregation ops', () => {
  it('count, mean, max, sum', () => {
    const penguins = ty.table('penguins', {
      species: 'string',
      year: 'int32',
      bill_length_mm: 'float64',
    })
    const q = penguins
      .groupBy(_r => ({ species: true }))
      .agg(g => ({
        count: ty.count(),
        mean_bill: g.bill_length_mm.mean(),
        max_bill: g.bill_length_mm.max(),
        sum_bill: g.bill_length_mm.sum(),
      }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          group {species} (
            aggregate {
              count = count this,
              mean_bill = average bill_length_mm,
              max_bill = max bill_length_mm,
              sum_bill = sum bill_length_mm
            }
          )"
        `)
  })

  it('renames and expressions in group keys', () => {
    const penguins = ty.table('penguins', {
      species: 'string',
      year: 'int32',
      bill_length_mm: 'float64',
    })
    const q = penguins
      .groupBy(r => ({
        kind: r.species,
        decade: r.year.div(10),
      }))
      .agg({ count: ty.count() })
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from penguins
          group {kind = species, decade = year / 10} (
            aggregate {
              count = count this
            }
          )"
        `)
  })

  it('max in group agg', () => {
    const t = ty.table('data', { category: 'string', score: 'float64' })
    const q = t
      .groupBy(_r => ({ category: true }))
      .agg(g => ({ max_score: g.score.max() }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          group {category} (
            aggregate {
              max_score = max score
            }
          )"
        `)
  })

  it('min in group agg', () => {
    const t = ty.table('data', { category: 'string', score: 'float64' })
    const q = t
      .groupBy(_r => ({ category: true }))
      .agg(g => ({ min_score: g.score.min() }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          group {category} (
            aggregate {
              min_score = min score
            }
          )"
        `)
  })
})

describe('PrqlCompiler — sql() raw expressions', () => {
  it('raw SQL inside derive', () => {
    const t = ty.table('data', { x: 'float64' })
    const q = t.derive(() => ({
      custom: sql('x * 2 + 1', { typecode: 'float', size: 64, nullable: true }, 'columnar')
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from data
          derive {
            custom = s"x * 2 + 1"
          }"
        `)
  })
})

describe('PrqlCompiler — lit usage in queries', () => {
  const t = ty.table('tbl', { x: 'float64', name: 'string' })

  it('lit in eq filter', () => {
    const q = t.filter(r => r.name.eq(ty.lit('alice')))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from tbl
          filter name == "alice""
        `)
  })

  it('lit in gt filter', () => {
    const q = t.filter(r => r.x.gt(ty.lit(10)))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from tbl
          filter x > 10"
        `)
  })
})

describe('PrqlCompiler — date / datetime / time toString', () => {
  it('date toString in derive', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_date: 'date',
      description: 'string',
    })
    const q = events.derive(r => ({
      formatted_date: r.event_date.toString('%Y-%m-%d'),
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          derive {
            formatted_date = date.to_text "%Y-%m-%d" event_date
          }"
        `)
  })

  it('datetime toString in derive', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_datetime: 'datetime',
      description: 'string',
    })
    const q = events.derive(r => ({
      formatted_date: r.event_datetime.toString('%Y-%m-%d'),
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          derive {
            formatted_date = date.to_text "%Y-%m-%d" event_datetime
          }"
        `)
  })

  it('time toString in derive', () => {
    const logs = ty.table('logs', {
      id: 'int32',
      mytime: 'time',
      message: 'string',
    })
    const q = logs.derive(r => ({
      formatted_time: r.mytime.toString('%H:%M:%S'),
    }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from logs
          derive {
            formatted_time = date.to_text "%H:%M:%S" mytime
          }"
        `)
  })

  it('date eq comparison filter', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_date: 'date',
    })
    const q = events.filter(r => r.event_date.eq(r.event_date))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          filter event_date == event_date"
        `)
  })

  it('date isNotNull filter', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_date: 'date',
    })
    const q = events.filter(r => r.event_date.isNotNull())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          filter event_date != null"
        `)
  })

  it('date sort desc', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_date: 'date',
    })
    const q = events.sort(r => r.event_date.desc())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          sort {-event_date}"
        `)
  })

  it('datetime eq comparison filter', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_datetime: 'datetime',
    })
    const q = events.filter(r => r.event_datetime.eq(r.event_datetime))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          filter event_datetime == event_datetime"
        `)
  })

  it('datetime isNotNull filter', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_datetime: 'datetime',
    })
    const q = events.filter(r => r.event_datetime.isNotNull())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          filter event_datetime != null"
        `)
  })

  it('datetime sort desc', () => {
    const events = ty.table('events', {
      id: 'int32',
      event_datetime: 'datetime',
    })
    const q = events.sort(r => r.event_datetime.desc())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from events
          sort {-event_datetime}"
        `)
  })

  it('time eq comparison filter', () => {
    const logs = ty.table('logs', {
      id: 'int32',
      mytime: 'time',
      mytime2: 'time',
    })
    const q = logs.filter(r => r.mytime.eq(r.mytime2))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from logs
          filter mytime == mytime2"
        `)
  })

  it('time isNotNull filter', () => {
    const logs = ty.table('logs', {
      id: 'int32',
      mytime: 'time',
    })
    const q = logs.filter(r => r.mytime.isNotNull())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from logs
          filter mytime != null"
        `)
  })

  it('time sort asc', () => {
    const logs = ty.table('logs', {
      id: 'int32',
      mytime: 'time',
    })
    const q = logs.sort(r => r.mytime.asc())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from logs
          sort {mytime}"
        `)
  })
})

describe('PrqlCompiler — uuid', () => {
  const users = ty.table('users', {
    id: "uuid",
    name: "string",
    email: "string",
  })

  it('simple select', () => {
    expect(toPrql(users)).toMatchInlineSnapshot(`"from users"`)
  })

  it('filter by uuid equality', () => {
    const q = users.filter(r => r.id.eq(r.id))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          filter id == id"
        `)
  })

  it('filter by uuid isNotNull', () => {
    const q = users.filter(r => r.id.isNotNull())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          filter id != null"
        `)
  })

  it('sort by uuid', () => {
    const q = users.sort(r => r.id.asc())
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          sort {id}"
        `)
  })

  it('group by uuid', () => {
    const q = users
      .groupBy(_r => ({ id: true }))
      .agg({ count: ty.count() })
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          group {id} (
            aggregate {
              count = count this
            }
          )"
        `)
  })

  it('derive with uuid column', () => {
    const q = users.derive(r => ({ user_id: r.id }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          derive {
            user_id = id
          }"
        `)
  })

  it('eq across two uuid columns', () => {
    const orders = ty.table('orders', {
      order_id: "uuid",
      user_id: "uuid",
    })
    const q = orders.filter(r => r.user_id.eq(r.order_id))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from orders
          filter user_id == order_id"
        `)
  })

  it('min/max over uuid in group agg', () => {
    const q = users
      .groupBy(_r => ({ name: true }))
      .agg(g => ({
        min_id: g.id.min(),
        max_id: g.id.max(),
      }))
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from users
          group {name} (
            aggregate {
              min_id = min id,
              max_id = max id
            }
          )"
        `)
  })

  it('multiple uuid filter', () => {
    const relationships = ty.table('relationships', {
      follower_id: "uuid",
      following_id: "uuid",
      created_at: "date",
    })
    const q = relationships.filter(r =>
      r.follower_id.isNotNull()
        .and(r.following_id.isNotNull())
    )
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from relationships
          filter (follower_id != null) && (following_id != null)"
        `)
  })

  it('group by multiple uuid columns', () => {
    const relationships = ty.table('relationships', {
      follower_id: "uuid",
      following_id: "uuid",
      created_at: "date",
    })
    const q = relationships
      .groupBy(_r => ({ follower_id: true, following_id: true }))
      .agg({ count: ty.count() })
    expect(toPrql(q)).toMatchInlineSnapshot(`
          "from relationships
          group {follower_id, following_id} (
            aggregate {
              count = count this
            }
          )"
        `)
  })
})

describe('Relation.compile() with explicit PrqlCompiler', () => {
  it('compiles via the public Relation.compile API', () => {
    const penguins = ty.table('penguins', {
      species: 'string',
      year: 'int32',
      bill_length_mm: 'float64',
    })
    const q = penguins.filter(r => r.bill_length_mm.gt(40))
    expect(q.compile(new PrqlCompiler())).toMatchInlineSnapshot(`
          "from penguins
          filter bill_length_mm > 40"
        `)
  })
})
