# Tybis Implementation - Work Plan

**Project**: Typesafe dataframe library for TypeScript backed by PRQL

**Status**: ✅ MVP COMPLETE (PRQL pivot)

## Overview

A fully type-safe TypeScript dataframe library that compiles to SQL using the
[prqlc](https://www.npmjs.com/package/prqlc) compiler. Schema is tracked at
compile time through all operations. No database connection is required — the
library focuses purely on query construction and SQL generation.

## Current Architecture

```
tybis/
├── src/
│   ├── index.ts       # Public exports
│   ├── datatypes.ts   # PRQL type system
│   ├── expr.ts        # Expression classes (Expr, Col, BoolExpr, AggExpr, SortExpr)
│   └── table.ts       # Table class, IR, PRQL text generation
└── tests/
    ├── types.test.ts        # Compile-time schema tracking tests
    └── integration.test.ts  # PRQL/SQL generation tests
```

## Implementation Steps

### ✅ 1. Project Setup
- TypeScript with strict mode, tsup for dual CJS/ESM output, vitest for tests
- `prqlc` as the sole runtime dependency

### ✅ 2. Type System (`src/datatypes.ts`)
- `DataType`: PRQL types — `string | int32 | int64 | float32 | float64 | boolean | date | datetime | interval`
- `Schema`: `Record<string, DataType>`
- `JSType<T>`: maps DataType to TypeScript runtime types
- `SchemaToJS<S>`: maps a whole schema to JS types

### ✅ 3. Expression System (`src/expr.ts`)
- `Expr<T>`: base class carrying PRQL text and DataType
  - Comparison: `.gt()`, `.gte()`, `.lt()`, `.lte()`, `.eq()`
  - Arithmetic: `.div()`
  - Aggregation: `.mean()`, `.sum()`, `.min()`, `.max()`
  - Sort: `.desc()`, `.asc()`
  - Null: `.is_not_null()`
- `BoolExpr`: boolean expression with `.and()`, `.or()` — used in `.filter()`
- `AggExpr<T>`: aggregation expression — used in `.agg({})`
- `SortExpr`: sort key with direction — used in `.sort()`
- `Col<N, T, S>`: typed column reference
- `count()`: aggregate function counting rows
- `sql(rawSql, dtype)`: embed raw SQL with explicit type

### ✅ 4. Table API (`src/table.ts`)
- Internal IR: simple discriminated union (`table | filter | derive | group | sort | take`)
- `toPRQL(node)`: compiles IR to PRQL text string
- `Table<S>` methods:
  - `.filter(r => BoolExpr)` → `Table<S>`
  - `.group(r => Col[], g => g.agg({}))` → `Table<KeySchema & AggSchema>`
  - `.derive(r => Record<string, Expr>)` → `Table<S & DerivedSchema>`
  - `.sort(r => SortExpr | Expr | array)` → `Table<S>`
  - `.take(n)` → `Table<S>`
  - `.to_prql()` → PRQL text string
  - `.to_sql()` → SQL string (via `prqlc.compile()`)
- `table(name, schema)`: public factory function

### ✅ 5. Testing (15 tests, all passing)
- `types.test.ts`: compile-time schema tracking for table, group+agg, derive
- `integration.test.ts`: PRQL text output and SQL generation for all operations

## Key Design Decisions

### PRQL text as compilation target
Rather than generating PRQL's internal RQ JSON format (which uses numeric column
IDs and requires re-implementing semantic analysis), we generate PRQL text and
pass it to `prqlc.compile()`. This is simpler and maps directly to our IR.

### Synchronous `to_sql()`
No database connection means SQL generation is synchronous — a significant
improvement over the previous DuckDB-backed async approach.

### Explicit schema, no inference
Schemas are always declared explicitly via `table(name, schema)`. Schema
inference from runtime data has been removed.

### No Op classes
The old approach used a complex discriminated union of Op classes with opcode
strings. The new IR is a simple private type inside `table.ts` — no need to
expose internal IR types publicly.

## Post-MVP Roadmap

1. **More column operations**: string functions, date arithmetic, casting
2. **Joins**: inner/left/right/full joins with schema merging
3. **Select / rename**: `.select()` to pick or rename columns
4. **Window functions**: `row_number`, `rank`, `lag`, `lead`
5. **Multiple sort keys with type safety**: enforce sort keys belong to schema
6. **Target dialects**: expose `CompileOptions.target` (e.g. `sql.duckdb`, `sql.postgres`)
