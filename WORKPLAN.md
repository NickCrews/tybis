# Tybis MVP Implementation - Work Plan

**Project**: Typesafe dataframe library for TypeScript with DuckDB execution backend

**Status**: ✅ MVP COMPLETE

## Overview

Built a fully type-safe TypeScript dataframe library with:
- Custom dataframe-oriented IR (not 1:1 SQL mapping)  
- DuckDB execution backend via `@duckdb/node-api`
- Complete schema tracking through all operations
- Core dataframe operations: table, group_by, agg, order_by
- Column references and aggregation functions (count, mean)
- JSON serialization and query execution

## Implementation Steps

### ✅ 1. Project Setup & Dependencies
- Initialized TypeScript project with `package.json` and `tsconfig.json` (strict mode)
- Installed: `@duckdb/node-api` (1.4.4-r.1), `vitest`, `expect-type`, `tsup`
- Created `src/index.ts` as main export entry point
- Used pnpm as package manager

### ✅ 2. Core Type System Design  
**File**: `src/types.ts`
- Defined `Schema` type (record of column names → types: 'string' | 'number' | 'boolean' | 'null')
- Created `Expr<T, Schema>` interface for type-safe expressions
- Built `InferSchema<T>` helper to extract schema from const data arrays
- Designed schema transformation utilities: `GroupBySchema`, `AggResult`, `MergeSchema`
- Added `SchemaToJS` for typed query results

### ✅ 3. Expression Tree Foundation
**File**: `src/expr.ts`
- Implemented base `Expr` class with IR node structure
- Created `Col<Name, Schema>` for column references via `ty.col(name)`
- Added method chaining: `.mean()`, `.sum()` etc. that preserve types
- Implemented aggregation functions: `count()`, `mean()` with proper return types
- All expressions have `toIR()` method for IR generation

### ✅ 4. Table API
**File**: `src/table.ts`
- Created `Table<Schema>` class as main dataframe interface
- Implemented `.group_by(...cols)` with type-level column tracking
- Implemented `.agg({name: expr})` with schema merging from aggregations  
- Implemented `.order_by(col)` preserving schema
- All operations return new immutable Table instances
- Added `GroupedTable` intermediate type for group_by → agg chaining

### ✅ 5. Custom IR Definition
**File**: `src/ir.ts`
- Designed dataframe-oriented JSON format with operation nodes:
  - `TableNode`: Base table with schema metadata
  - `ColNode`: Column reference  
  - `AggFuncNode`: Aggregation function (count, mean, etc.)
  - `GroupByNode`: Group by operation
  - `AggNode`: Aggregation with named expressions  
  - `OrderByNode`: Sorting
- All nodes include schema metadata for type tracking
- `.to_json()` method serializes to custom IR (human-readable)

### ✅ 6. DuckDB Compiler
**File**: `src/compiler/duckdb.ts`
- Built custom IR → DuckDB JSON converter
- DuckDB JSON format wraps query in `{error: false, statements: [{node: {...}}]}`
- Handles all operations: table, column refs, group_by, agg, order_by
- Maps aggregation functions: count → count_star, mean → avg
- Properly formats SELECT_NODE with modifiers, cte_map, select_list, from_table, etc.
- Adds required DuckDB fields: class, type, alias, query_location

### ✅ 7. Execution Layer
**File**: `src/backend/duckdb.ts`
- Created global DuckDB connection singleton (persistent across operations)
- Implemented `.to_records()` that compiles IR → DuckDB JSON → executes → returns typed results  
- Uses `json_execute_serialized_sql()` for direct JSON execution
- Handles async execution via `runAndReadAll()` and `getRowObjectsJS()`
- Return values are properly typed based on Table schema

### ✅ 8. Table Creation
**File**: `src/backend/duckdb.ts`
- Implemented `ty.duckdb.table(data)` function
- Uses `InferSchema` to extract schema from arrays (supports `as const`)
- Registers data as DuckDB table with appropriate SQL types (VARCHAR, DOUBLE, BOOLEAN)
- Returns `Table<InferredSchema>` instance
- Tables persist in shared connection for subsequent queries

### ✅ 9. Output Methods
- `.to_json()`: Returns custom IR as formatted JSON string
- `.to_sql()`: **Deferred** - DuckDB doesn't have JSON→SQL converter (throws error with message)
- `.toString()`: Human-readable format showing operation tree
- `.to_records()`: Executes query and returns typed results

### ✅ 10. Testing
**Files**: `tests/types.test.ts`, `tests/integration.test.ts`
- Type-level tests with `expect-type` verify compile-time schema tracking
- Integration tests execute full dataframe operations end-to-end
- Tests verify: table creation, group_by, agg, order_by, JSON serialization, execution
- All 5 tests passing ✅

## Key Implementation Decisions

### 1. Full Type Safety ✅
- Chose schema tracking through all operations using TypeScript generics and mapped types
- Every Table operation preserves and transforms the schema type appropriately
- Compile-time errors for invalid column names or incompatible operations

### 2. Custom IR ✅  
- Built dataframe-oriented IR (not 1:1 SQL mapping) for:
  - Easier type safety and schema tracking
  - Better re-hydration support with embedded schemas
  - More intuitive operation representation
- Compiles to DuckDB JSON format only for execution

### ✅ 3. Global DuckDB Connection
- Using singleton connection for simplicity
- Tables created on connection persist for subsequent queries
- Avoids connection management complexity in MVP

### 4. `to_sql()` Deferred ⏸️
- DuckDB's `json_serialize_sql` converts SQL→JSON, not JSON→SQL
- Would need custom SQL generator from our IR
- Marked as post-MVP feature

## Testing Results

```
✓ tests/types.test.ts (2)
  ✓ should infer schema from const data  
  ✓ should track schema through group_by and agg

✓ tests/integration.test.ts (3)
  ✓ should run the README example
  ✓ should execute group_by and agg
  ✓ should serialize to JSON IR

Test Files  2 passed (2)
Tests  5 passed (5)
```

## Verification Checklist

- ✅ README example compiles and executes without modifications
- ✅ Type errors for `ty.col("invalid_column")` appear at compile-time  
- ✅ `npm test` (pnpm test) passes all type and runtime tests
- ✅ `.to_json()` outputs valid JSON with schema metadata and operation tree
- ⏸️ `.to_sql()` - deferred to post-MVP (throws informative error)
- ✅ `.to_records()` returns correct typed results matching final schema

## Post-MVP Roadmap

1. **SQL Generation**: Implement custom SQL generator from IR for `.to_sql()`  
2. **More Aggregations**: Add sum, min, max, stddev, etc.
3. **Joins**: Implement inner/left/right joins with schema merging
4. **Filtering**: Add `.filter()` / `.where()` with predicate expressions
5. **Column Selection**: Add `.select()` for choosing specific columns
6. **More Column Operations**: String operations, math, date functions  
7. **Window Functions**: row_number, rank, lag, lead
8. **Multiple Backends**: Add support for other SQL databases
9. **Streaming**: Support for async iteration over large result sets
10. **Error Handling**: Better error messages and recovery

## Technical Notes

### DuckDB Integration
- Using `@duckdb/node-api` v1.4.4-r.1 (latest stable)
- Connection is async but kept singleton for table persistence
- JSON execution via `json_execute_serialized_sql()`
- Column types mapped: number→DOUBLE, string→VARCHAR, boolean→BOOLEAN

### TypeScript Patterns  
- Extensive use of mapped types and conditional types for schema transformations
- Generic constraints with `extends` for compile-time validation
- Branded types via `_type`/`_schema` properties for type tracking
- `as const` inference for literal type extraction

### Build & Development
- tsup for dual CJS/ESM output with type declarations
- Vitest for fast, TypeScript-native testing
- Strict TypeScript mode with `exactOptionalPropertyTypes`
- ES2022 target for modern JavaScript features

## Files Created

```
/Users/nc/code/tybis/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── src/
│   ├── index.ts          # Main exports
│   ├── types.ts          # Type system & schema utilities
│   ├── expr.ts           # Expression tree (Col, AggFunc)
│   ├── table.ts          # Table & GroupedTable classes
│   ├── ir.ts             # IR node definitions
│   ├── compiler/
│   │   └── duckdb.ts     # IR → DuckDB JSON compiler
│   └── backend/
│       └── duckdb.ts     # DuckDB execution & table creation
└── tests/
    ├── types.test.ts      # Type-level tests  
    └── integration.test.ts # End-to-end integration tests
```

---

**Implementation Status**: ✅ Complete  
**Test Status**: ✅ All Passing (5/5)
**README Example**: ✅ Working (except `.to_sql()` which is deferred)
