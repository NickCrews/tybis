# Tybis: The typesafe, portable dataframe library for TypeScript

Tybis provides:

- A lazily-executed dataframe API with full compile-time schema tracking.
  If you rename a column, you get type errors telling you (and AI!) all the places you need to update.
- A clean, chainable expression system inspired by [PRQL](https://prql-lang.org/).
  The expression tree is a public API, you can inspect and transform it as you want, eg add your own optimization or rewrite rules!
  All of the above is in vanilla, dependency-free typescript. Deploy anywhere!
- SQL and PRQL generation via the optional [prqlc](https://www.npmjs.com/package/prqlc) compiler.
  TODO is to also provide clients to natively execute expressions on a real backend,
  eg duckdb or postgres.
- Escape hatches when we can't provide the functionality you need.

## Example Usage

```typescript
import * as ty from 'tybis'

const penguins = ty.table('penguins', {
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
    .sort(r => r.col('count').desc())
    .take(10)

console.log(result.toPrql())
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

console.log(result.toSql())
// SELECT species, year, COUNT(*) AS count, AVG(bill_length_mm) AS mean_bill
// FROM penguins
// WHERE bill_length_mm > 40
// GROUP BY species, year
// ORDER BY count DESC
// LIMIT 10
```

Tybis does NOT:
- Provide DDL or DML constructs, eg `INSERT` or `CREATE TABLE`. We focus the equivalent of `SELECT`.
  But, tybis is designed to be extensible, eg you can do `CREATE TABLE AS ${penguins.filter(r => r.col('bill_length_mm').gt(40)).toSql()}`

## API

### `table(name, schema)`

Define a table with an explicit name and schema. The schema maps column names to PRQL data types.

```typescript
const orders = ty.table('orders', {
    order_id: 'int64',
    customer_id: 'int64',
    amount: 'float64',
    placed_at: 'datetime',
    is_paid: 'boolean',
})
```

**Supported types**: `'string'`, `'int32'`, `'int64'`, `'float32'`, `'float64'`, `'boolean'`, `'date'`, `'datetime'`, `'interval'`

### `.filter(r => condition)`

Filter rows. The callback receives a row accessor and must return a `BoolExpr`.

```typescript
orders.filter(r => r.col('amount').gt(100))
orders.filter(r => r.col('is_paid').eq(true))
orders.filter(r => r.col('amount').gt(50).and(r.col('is_paid').eq(true)))
```

### `.group(keys, transform)`

Group rows by key columns and apply aggregations.

```typescript
orders.group(
    r => [r.col('customer_id')],
    g => g.agg({
        order_count: ty.count(),
        total_spent: g.col('amount').sum(),
        max_order: g.col('amount').max(),
    })
)
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

### `.derive(r => computations)`

Add computed columns to each row.

```typescript
orders.derive(r => ({
    amount_usd: r.col('amount').div(100),
}))
```

### `count()`

Aggregate function — counts the number of rows.

```typescript
g.agg({ n: ty.count() })
```

### `sql(rawSql, dtype)`

Embed a raw SQL expression with an explicit return type.

```typescript
orders.derive(() => ({
    db_version: ty.sql('version()', 'string'),
}))
```

### `.toPrql()`

Returns the PRQL query string. Useful for debugging or inspecting generated queries.

### `.toSql()`

Compiles to SQL using the PRQL compiler. Returns a SQL string synchronously.

## Type Safety

Tybis tracks the schema of every table expression at compile time. Invalid column names are caught as TypeScript errors:

```typescript
const t = ty.table('t', { x: 'int32', y: 'float64' })

t.filter(r => r.col('z').gt(0))
//                  ^^^
// Argument of type '"z"' is not assignable to parameter of type '"x" | "y"'
```

Schema changes from `group` and `derive` are also tracked:

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