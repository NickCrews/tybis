/**
 * Type declarations injected into the Monaco editor so users get
 * autocomplete and type-checking for the tybis API and the `preview`
 * sandbox function.
 *
 * This is intentionally simplified compared to the full tybis types;
 * the goal is useful IDE feedback, not 100% fidelity.
 */
export const TYBIS_DTS = /* ts */ `
type DataType =
  | 'string'
  | 'int32'
  | 'int64'
  | 'float32'
  | 'float64'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'interval'

type Schema = Record<string, DataType>

type NumericDataType = 'int32' | 'int64' | 'float32' | 'float64'

// ---------------------------------------------------------------------------
// Expression types
// ---------------------------------------------------------------------------

interface BooleanExpr {
  and(other: BooleanExpr): BooleanExpr
  or(other: BooleanExpr): BooleanExpr
}

interface NumericExpr {
  gt(n: number | NumericExpr): BooleanExpr
  gte(n: number | NumericExpr): BooleanExpr
  lt(n: number | NumericExpr): BooleanExpr
  lte(n: number | NumericExpr): BooleanExpr
  eq(n: number | NumericExpr): BooleanExpr
  add(other: number | NumericExpr): NumericExpr
  sub(other: number | NumericExpr): NumericExpr
  mul(other: number | NumericExpr): NumericExpr
  div(other: number | NumericExpr): NumericExpr
  /** Aggregate: average */
  mean(): NumericExpr
  /** Aggregate: sum */
  sum(): NumericExpr
  /** Aggregate: min */
  min(): NumericExpr
  /** Aggregate: max */
  max(): NumericExpr
  /** Sort descending */
  desc(): SortExpr
  /** Sort ascending */
  asc(): SortExpr
  isNotNull(): BooleanExpr
}

interface StringExpr {
  eq(s: string | StringExpr): BooleanExpr
  upper(): StringExpr
  lower(): StringExpr
  contains(s: string): BooleanExpr
  startsWith(s: string): BooleanExpr
  isNotNull(): BooleanExpr
  desc(): SortExpr
  asc(): SortExpr
}

interface BooleanCol extends BooleanExpr {
  eq(b: boolean | BooleanExpr): BooleanExpr
  desc(): SortExpr
  asc(): SortExpr
}

interface SortExpr {}

// ---------------------------------------------------------------------------
// Row / group accessors
// ---------------------------------------------------------------------------

type ColForType<K extends string, T extends DataType> =
  T extends NumericDataType ? NumericExpr & { name: K } :
  T extends 'string'        ? StringExpr  & { name: K } :
  T extends 'boolean'       ? BooleanCol  & { name: K } :
  (BooleanExpr | NumericExpr | StringExpr) & { name: K }

interface RowAccessor<S extends Schema> {
  col<K extends keyof S & string>(name: K): ColForType<K, S[K]>
}

interface AggResult<A extends Record<string, NumericExpr | StringExpr | BooleanExpr>> {
  aggregations: A
}

interface GroupAccessor<S extends Schema> extends RowAccessor<S> {
  agg<A extends Record<string, NumericExpr | StringExpr | BooleanExpr>>(
    aggregations: A
  ): AggResult<A>
}

// ---------------------------------------------------------------------------
// Relation
// ---------------------------------------------------------------------------

interface Relation<S extends Schema = Schema> {
  readonly schema: S

  col<K extends keyof S & string>(name: K): ColForType<K, S[K]>

  filter(predicate: (r: RowAccessor<S>) => BooleanExpr): Relation<S>

  group<KC extends (NumericExpr | StringExpr | BooleanExpr)[]>(
    keys: (r: RowAccessor<S>) => KC,
    transform: (g: GroupAccessor<S>) => AggResult<any>
  ): Relation<any>

  sort(
    key: (r: RowAccessor<S>) => SortExpr | SortExpr[]
  ): Relation<S>

  take(n: number): Relation<S>

  derive<C extends Record<string, NumericExpr | StringExpr | BooleanExpr>>(
    fn: (r: RowAccessor<S>) => C
  ): Relation<S & { [K in keyof C]: DataType }>

  toPrql(): string
  toSql(): string
  compile(compiler: any): string
}

// ---------------------------------------------------------------------------
// Sandbox globals
// ---------------------------------------------------------------------------

/**
 * The tybis module — available as \`ty\` in the playground sandbox.
 */
declare const ty: {
  /**
   * Define a relation (table) with a name and schema.
   * @example
   * const orders = ty.relation('orders', {
   *   order_id: 'int64',
   *   amount: 'float64',
   * } as const)
   */
  relation<S extends Schema>(name: string, schema: S): Relation<S>

  /** Alias for \`relation()\`. */
  table<S extends Schema>(name: string, schema: S): Relation<S>

  /** Aggregate function — counts all rows. */
  count(): NumericExpr

  /**
   * Embed a raw SQL fragment with an explicit return type.
   * @example ty.sql("EXTRACT(YEAR FROM created_at)", 'int32')
   */
  sql(rawSql: string, dtype: DataType): NumericExpr | StringExpr | BooleanExpr

  /** Create a literal value expression. */
  lit(value: string | number | boolean | null): NumericExpr | StringExpr | BooleanExpr
}

/**
 * Push a relation to the output panel.
 * Call this at the end of your query to display PRQL and SQL.
 * @example preview(myRelation)
 */
declare function preview(relation: Relation<any>): void
`
