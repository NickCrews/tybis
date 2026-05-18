# Tybis: The typesafe, portable dataframe library for TypeScript

This is very experimental, probably not even alpha stage.
Do don't want to rely on this, I'm changing things all the time.

Tybis provides:

- A lazily-executed dataframe API with full compile-time schema tracking.
  If you rename a column, you get type errors telling you (and AI!) all the places you need to update.
- A clean, chainable expression system inspired by [PRQL](https://prql-lang.org/).
  The expression tree is a public API, you can inspect and transform it as you want, eg add your own optimization or rewrite rules!
  All of the above is in vanilla, dependency-free typescript. Deploy anywhere!
- Compilation of an expression to SQL or PRQL using pure, dependency-free typescript.
  TODO is to also provide clients to natively execute expressions on a real backend,
  eg duckdb, postgres, airtable, or google sheets.
- Escape hatches when we can't provide the functionality you need.

Note: I just (March 6, 2026) was pointed to https://github.com/futu2/teta, which looks like almost the exact same idea.
I will probably hold off on working on this further until I see if we could join efforts with that.

## Example Usage

```typescript
import * as ty from 'tybis'
import { toSql } from 'tybis-sql-compiler'
import { toPrql } from 'tybis-prql-compiler'

const penguins = ty.table('penguins', {
    species: 'string',
    year: 'int32',
    bill_length_mm: 'float64',
})

const result = penguins
    .filter(r => r.col('bill_length_mm').gt(40))
    .group(
        r => ({ species: true, year: true }),
        g => g.agg({
            count: ty.count(),
            mean_bill: g.col('bill_length_mm').mean(),
        })
    )
    .sort(r => r.col('count').desc())
    .take(10)

console.log(toSql(result).sql)
// SELECT species, year, COUNT(*) AS count, AVG(bill_length_mm) AS mean_bill
// FROM penguins
// WHERE bill_length_mm > 40
// GROUP BY species, year
// ORDER BY count DESC
// LIMIT 10

console.log(toPrql(result))
// from penguins
// filter bill_length_mm > 40
// group {species, year} (
//   aggregate {
//     count = count this,
//     mean_bill = average bill_length_mm
//   }
// )
// sort {-count}
// take 10
```

Tybis does NOT:
- Provide DDL or DML constructs, eg `INSERT` or `CREATE TABLE`. We focus the equivalent of `SELECT`.
  But, tybis is designed to be extensible, eg you can do `CREATE TABLE AS ${penguins.filter(r => r.col('bill_length_mm').gt(40)).toSql()}`

## API

### `table(name, schema)`

Define a relation backed by a database table or view. The schema maps column names to tybis data types (see below).

```typescript
const orders = ty.table('orders', {
    order_id: 'int64',
    customer_id: 'int64',
    amount: 'float64',
    placed_at: 'datetime',
    is_paid: 'boolean',
})
```

**Datatype System**:

These are designed to closely mirror the apache arrow datatypes.

- `integer<8|16|32|64>` (maybe unsigned in the future)
- `float<8|16|32|64>`
- `string`
- `boolean`
- `uuid`
- `date`
- `time`
- `datetime`
- `interval`
- `null`
- `custom` (for holding raw opaque types from the specific backend)

In the future I plan to add arrays, structs, and maps.

### `.select(r => computations)`

Analogous to sql SELECT.

```typescript
orders.select(r => ({
    n: tybis.count(),
    amount_usd: r.col('amount').div(100),
    transaction_date: true, // keep the existing "transaction_date" column
    will_be_dropped: false, // this will be explicityl dropped
    constantly_42: ty.lit(42), // all rows filled with `42`
    constantly_true: ty.lit(true), // all rows filled with `true`
}))
```

### `.derive(r => computations)`

Add or overwrite computed columns to each row.
This is like .select(), but keeps around the existing columns.

```typescript
orders.derive(r => ({
    amount_usd: r.col('amount').div(100),
}))
```

### `.filter(r => condition)`

Filter rows. The callback receives a row accessor and must return a `BoolExpr`.

```typescript
orders.filter(r => r.col('amount').gt(100))
orders.filter(r => r.col('is_paid').eq(true))
orders.filter(r => r.col('amount').gt(50).and(r.col('is_paid').eq(true)))
```

### `.sort(r => key | keys)`

Sort rows. Use `.desc()` for descending, `.asc()` or a bare column for ascending.

```typescript
orders.sort(r => r.col('amount').desc())
orders.sort(r => [r.col('customer_id'), r.col('amount').desc()])
```

### `.take(n)`

Return only the first `n` rows.

```typescript
orders.take(100)
```

### `.group(keys, transform)`

Group rows by key columns and apply aggregations.

```typescript
orders.group(
    r => ({ customer_id: true }),
    g => g.agg({
        order_count: ty.count(),
        total_spent: g.col('amount').sum(),
        max_order: g.col('amount').max(),
    })
)
```

### `count()`

Aggregate function — counts the number of rows.

```typescript
g.agg({ n: ty.count() })
```

## Type Safety

Tybis tracks the schema of every table expression at compile time. Invalid column names are caught as TypeScript errors:

```typescript
const t = ty.table('t', { x: 'int32', y: 'float64' })

t.filter(r => r.col('z').gt(0))
//                  ^^^
// Argument of type '"z"' is not assignable to parameter of type '"x" | "y"'
```

Schema changes from all methods, such as `group` and `derive` are also tracked:

```typescript
const result = t.group(
    r => [r.col('x')],
    g => g.agg({ mean_y: g.col('y').mean() })
)
// result: Table<{ x: 'int32', mean_y: 'float64' }>
```

## Motivation and related work

I help maintain [Ibis](https://github.com/ibis-project/ibis), which is a python dataframe library
that provides a dataframe API to build up lazy expressions that can be compiled to SQL.
But there were a few things that I learned while working and using ibis daily:

- Python's typing system isn't advanced enough to be able to track the schema of tables through operations.
  It is too easy for a column rename to break some very distant functionality.
- Ibis is python, I want to be able to run this more easily on the web.
- Ibis doesn't have great separation between the compile and execute stages.
  You can have a Backend object, eg a DuckdbBackend object, but that both compiles to SQL
  and actually executes against a provided backend.
  I want this project to have more explicit separation between these steps,
  so that you could generate queries offline without access to an actual database,
  eg to generate SQL or dbt pipelines.
- I like in ibis the separation between an Operation, eg `Add(left, right)`,
  and the actual compilation step of turning that into eg SQL.
  That is what allows ibis to target different SQL backends, and even non-sql backends
  like polars. 
  It also allows for optimization and rewrite steps to be injected
  after the expression is built but before it is compiled.
  Tybis should do the same.
- Ibis calls relations Tables. This caused name overloading problems when differentiating between
  physical tables/views and the more general selection/projectsion.
  eg physical tables have a name/location in the backend ("myschema.mytable") and
  you can perform DDL/DML on them, but pselections/projections you can't.
  So, I named the main object in tybis "Relation".
  Maybe pedantic, but we'll see if it actually is confusing.
