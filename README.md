# Tybis: The typesafe, portable dataframe library for typescript

Tybis is a typescript port of [Ibis](https://github.com/ibis-project/ibis). It provides

- a lazily-executed dataframe API and expression system, similar to polars, that is fully typesafe (eg the schema of all relations is tracked)
- a human readable, JSON serializable IR for representing relational operations.
- compilers that convert this IR to various SQL dialects. At first, we will only support duckdb by converting our IR to duckdb's JSON format: https://duckdb.org/docs/stable/data/json/sql_to_and_from_json

## Example Usage

```typescript
import * as ty from 'tybis'

const data = [
    {species: "Adelie", year: 2007, length: 14.5},
    {species: "Adelie", year: 2008, length: 15.5},
    {species: "Gentoo", year: 2009, length: 11.5},
    {species: "Gentoo", year: 20020, length: 11.5},
] as const;

penguins = await ty.duckdb.table(data) // Creates a table expression that is bound to the default duckdb connection
grouped = penguins.group_by(
        ty.col("species"),
        ty.col("year"),
    ).agg(
        count=ty.count(),
        mean_length=ty.col("length").mean(),
    ).order_by(ty.col("count"))
console.log(grouped)  // Human readable expression string format, does not execute.
console.log(grouped.to_json()) // {"op": "select", "order_by": {"op": "col", "col": "count"}, ...}
console.log(grouped.to_sql()) // SELECT ...
console.log(await grouped.to_records()) // [{"species": ...}, {...}, ...]
```