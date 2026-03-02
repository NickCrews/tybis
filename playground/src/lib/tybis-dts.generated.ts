/**
 * Type declarations injected into the Monaco editor so users get
 * autocomplete and type-checking for the tybis API and the `preview`
 * sandbox function.
 * 
 * Auto-generated from tybis package types.
 */

export const TYBIS_DTS = /* ts */ `declare module "tybis" { type DataType = 'string' | 'int32' | 'int64' | 'float32' | 'float64' | 'boolean' | 'date' | 'time' | 'datetime' | 'interval' | 'uuid';
type Schema = Record<string, DataType>;
type JSType<T extends DataType> = T extends 'string' ? string : T extends 'int32' | 'int64' | 'float32' | 'float64' ? number : T extends 'boolean' ? boolean : T extends 'date' | 'time' | 'datetime' ? Date : T extends 'interval' | 'uuid' ? string : never;
type SchemaToJS<S extends Schema> = {
    [K in keyof S]: JSType<S[K]>;
};
type JsType = string | number | boolean | Date;
type InferDtype<JS extends JsType> = JS extends string ? 'string' : JS extends number ? 'float64' : JS extends boolean ? 'boolean' : JS extends Date ? 'datetime' : never;

type DataShape = 'scalar' | 'columnar';
type HighestDataShape<Shapes extends DataShape[]> = Shapes extends [] ? never : 'columnar' extends Shapes[number] ? 'columnar' : 'scalar';

interface IOp<T extends DataType = DataType, S extends DataShape = DataShape> {
    readonly kind: string;
    readonly dtype: T;
    readonly dshape: S;
    toOp(): IOp<T, S>;
    toExpr(): IExpr<T, S>;
}
interface IExpr<T extends DataType = DataType, S extends DataShape = DataShape> {
    readonly dtype: T;
    readonly dshape: S;
    toOp(): IOp<T, S>;
    toExpr(): IExpr<T, S>;
}
declare abstract class BaseOp<T extends DataType = DataType, S extends DataShape = DataShape> implements IOp<T, S> {
    abstract readonly kind: string;
    readonly dtype: T;
    readonly dshape: S;
    constructor(dtype: T, dshape: S);
    toOp(): this;
    toExpr(): IExpr<T, S>;
}
declare class ColRefOp<N extends string = string, T extends DataType = DataType> extends BaseOp<T, 'columnar'> {
    readonly name: N;
    readonly kind: "col_ref";
    constructor(name: N, dtype: T);
}
declare class NumberLiteralOp extends BaseOp<'float64', 'scalar'> {
    readonly value: number;
    readonly kind: "number_literal";
    constructor(value: number);
}
declare class StringLiteralOp extends BaseOp<'string', 'scalar'> {
    readonly value: string;
    readonly kind: "string_literal";
    constructor(value: string);
}
declare class BooleanLiteralOp extends BaseOp<'boolean', 'scalar'> {
    readonly value: boolean;
    readonly kind: "boolean_literal";
    constructor(value: boolean);
}
declare class NullLiteralOp extends BaseOp<'string', 'scalar'> {
    readonly kind: "null_literal";
    constructor();
}
declare class DatetimeLiteralOp extends BaseOp<'datetime', 'scalar'> {
    readonly value: Date;
    readonly kind: "datetime_literal";
    constructor(value: Date);
}
declare class DateLiteralOp extends BaseOp<'date', 'scalar'> {
    readonly value: Date;
    readonly kind: "date_literal";
    constructor(value: Date);
}
declare class TimeLiteralOp extends BaseOp<'time', 'scalar'> {
    readonly value: Date;
    readonly kind: "time_literal";
    constructor(value: Date);
}
declare class EqOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "eq";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class GtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "gt";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class GteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "gte";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class LtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "lt";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class LteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "lte";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly operand: IOp<DataType, S>;
    readonly kind: "is_not_null";
    constructor(operand: IOp<DataType, S>);
}
declare class AndOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<'boolean', S1>;
    readonly right: IOp<'boolean', S2>;
    readonly kind: "and";
    constructor(left: IOp<'boolean', S1>, right: IOp<'boolean', S2>);
}
declare class OrOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<'boolean', S1>;
    readonly right: IOp<'boolean', S2>;
    readonly kind: "or";
    constructor(left: IOp<'boolean', S1>, right: IOp<'boolean', S2>);
}
declare class AddOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "add";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class SubOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "sub";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class MulOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "mul";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class DivOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly left: IOp<DataType, S1>;
    readonly right: IOp<DataType, S2>;
    readonly kind: "div";
    constructor(left: IOp<DataType, S1>, right: IOp<DataType, S2>);
}
declare class UpperOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly operand: IOp<'string', S>;
    readonly kind: "upper";
    constructor(operand: IOp<'string', S>);
}
declare class LowerOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly operand: IOp<'string', S>;
    readonly kind: "lower";
    constructor(operand: IOp<'string', S>);
}
declare class ContainsOp<S1 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, 'scalar']>> {
    readonly operand: IOp<'string', S1>;
    readonly pattern: StringLiteralOp;
    readonly kind: "contains";
    constructor(operand: IOp<'string', S1>, pattern: StringLiteralOp);
}
declare class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, 'scalar']>> {
    readonly operand: IOp<'string', S1>;
    readonly prefix: StringLiteralOp;
    readonly kind: "starts_with";
    constructor(operand: IOp<'string', S1>, prefix: StringLiteralOp);
}
type TemporalDataType = 'date' | 'time' | 'datetime';
declare class TemporalToStringOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly operand: IOp<TemporalDataType, S>;
    readonly format: string;
    readonly kind: "temporal_to_string";
    constructor(operand: IOp<TemporalDataType, S>, format: string);
}
declare class MeanOp extends BaseOp<'float64', 'scalar'> {
    readonly operand: IOp;
    readonly kind: "mean";
    constructor(operand: IOp);
}
declare class SumOp extends BaseOp<'float64', 'scalar'> {
    readonly operand: IOp;
    readonly kind: "sum";
    constructor(operand: IOp);
}
declare class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IOp<T>;
    readonly kind: "min";
    constructor(operand: IOp<T>);
}
declare class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly operand: IOp<T>;
    readonly kind: "max";
    constructor(operand: IOp<T>);
}
declare class CountOp extends BaseOp<'int64', 'scalar'> {
    readonly kind: "count";
    constructor();
}
declare class RawSqlOp<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseOp<T, S> {
    readonly rawSql: string;
    readonly kind: "raw_sql";
    constructor(rawSql: string, dtype: T, dshape: S);
}
declare class SortSpec {
    readonly op: IOp;
    readonly direction: 'asc' | 'desc';
    constructor(op: IOp, direction: 'asc' | 'desc');
}
type BuiltinOp = ColRefOp | NumberLiteralOp | StringLiteralOp | BooleanLiteralOp | NullLiteralOp | DatetimeLiteralOp | DateLiteralOp | TimeLiteralOp | EqOp | GtOp | GteOp | LtOp | LteOp | IsNotNullOp | AndOp | OrOp | AddOp | SubOp | MulOp | DivOp | UpperOp | LowerOp | ContainsOp | StartsWithOp | TemporalToStringOp | MeanOp | SumOp | MinOp | MaxOp | CountOp | RawSqlOp;

type IRNode = {
    kind: 'from';
    name: string;
} | {
    kind: 'filter';
    source: IRNode;
    condition: IOp<'boolean'>;
} | {
    kind: 'derive';
    source: IRNode;
    derivations: [string, IOp][];
} | {
    kind: 'group';
    source: IRNode;
    keys: string[];
    aggregations: [string, IOp][];
} | {
    kind: 'sort';
    source: IRNode;
    keys: SortSpec[];
} | {
    kind: 'take';
    source: IRNode;
    n: number;
};

interface Compiler<O extends IOp = BuiltinOp> {
    compileOp(op: O): string;
    compileIR(node: IRNode): string;
}

type NumericDataType = 'int32' | 'int64' | 'float32' | 'float64';
declare function opToExpr<S extends DataShape>(op: IOp<'string', S>): StringExpr<S>;
declare function opToExpr<S extends DataShape>(op: IOp<'boolean', S>): BooleanExpr<S>;
declare function opToExpr<T extends NumericDataType, S extends DataShape>(op: IOp<T, S>): NumericExpr<T, S>;
declare function opToExpr<S extends DataShape>(op: IOp<'date', S>): DateExpr<S>;
declare function opToExpr<S extends DataShape>(op: IOp<'time', S>): TimeExpr<S>;
declare function opToExpr<S extends DataShape>(op: IOp<'uuid', S>): UUIDExpr<S>;
declare function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): BaseExpr<T, S>;
declare abstract class BaseExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IExpr<T, S> {
    abstract readonly dtype: T;
    abstract readonly dshape: S;
    abstract toOp(): IOp<T, S>;
    toExpr(): this;
    eq(value: string | number | boolean | IExpr<DataType>): BooleanExpr<"columnar" extends DataShape | S ? "columnar" : "scalar">;
    isNotNull(): BooleanExpr<S>;
    mean(): BaseExpr<'float64', 'scalar'>;
    sum(): BaseExpr<'float64', 'scalar'>;
    min(): BaseExpr<T, 'scalar'>;
    max(): BaseExpr<T, 'scalar'>;
    desc(): SortExpr;
    asc(): SortExpr;
}
declare abstract class NumericExpr<T extends NumericDataType = NumericDataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {
    gt(value: number | IExpr<NumericDataType>): BooleanExpr<"columnar" extends DataShape | S ? "columnar" : "scalar">;
    gte(value: number | IExpr<NumericDataType>): BooleanExpr<"columnar" extends DataShape | S ? "columnar" : "scalar">;
    lt(value: number | IExpr<NumericDataType>): BooleanExpr<"columnar" extends DataShape | S ? "columnar" : "scalar">;
    lte(value: number | IExpr<NumericDataType>): BooleanExpr<"columnar" extends DataShape | S ? "columnar" : "scalar">;
    add(value: number | IExpr<NumericDataType>): NumericExpr<"float64", "columnar" extends DataShape | S ? "columnar" : "scalar">;
    sub(value: number | IExpr<NumericDataType>): NumericExpr<"float64", "columnar" extends DataShape | S ? "columnar" : "scalar">;
    mul(value: number | IExpr<NumericDataType>): NumericExpr<"float64", "columnar" extends DataShape | S ? "columnar" : "scalar">;
    div(value: number | IExpr<NumericDataType>): NumericExpr<"float64", "columnar" extends DataShape | S ? "columnar" : "scalar">;
}
declare abstract class StringExpr<S extends DataShape = DataShape> extends BaseExpr<'string', S> {
    readonly dtype: "string";
    upper(): StringExpr<S>;
    lower(): StringExpr<S>;
    contains(pattern: string): BooleanExpr<"columnar" extends "scalar" | S ? S & "columnar" : "scalar">;
    startsWith(prefix: string): BooleanExpr<"columnar" extends "scalar" | S ? S & "columnar" : "scalar">;
}
declare abstract class BooleanExpr<S extends DataShape = DataShape> extends BaseExpr<'boolean', S> {
    readonly dtype: "boolean";
    and(other: IExpr<'boolean'>): BooleanExpr<"columnar" extends DataShape | S ? "columnar" : "scalar">;
    or(other: IExpr<'boolean'>): BooleanExpr<"columnar" extends DataShape | S ? "columnar" : "scalar">;
}
declare abstract class DateExpr<S extends DataShape = DataShape> extends BaseExpr<'date', S> {
    readonly dtype: "date";
    toString(format: string): StringExpr<S>;
}
declare abstract class TimeExpr<S extends DataShape = DataShape> extends BaseExpr<'time', S> {
    readonly dtype: "time";
    toString(format: string): StringExpr<S>;
}
declare abstract class DateTimeExpr<S extends DataShape = DataShape> extends BaseExpr<'datetime', S> {
    readonly dtype: "datetime";
    toString(format: string): StringExpr<S>;
}
declare abstract class UUIDExpr<S extends DataShape = DataShape> extends BaseExpr<'uuid', S> {
    readonly dtype: "uuid";
}
type Col<N extends string = string, T extends DataType = DataType, S extends Schema = Schema> = T extends 'string' ? StringCol<N> : T extends NumericDataType ? NumericCol<N, T> : T extends 'boolean' ? BooleanCol<N> : T extends 'date' ? DateCol<N> : T extends 'time' ? TimeCol<N> : T extends 'datetime' ? DateTimeCol<N> : T extends 'uuid' ? UUIDCol<N> : ColRef<N, T>;
declare class StringCol<N extends string = string> extends StringExpr<'columnar'> {
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N);
    toOp(): ColRefOp<N, 'string'>;
}
declare class NumericCol<N extends string = string, T extends NumericDataType = NumericDataType> extends NumericExpr<T, 'columnar'> {
    readonly dtype: T;
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N, dtype: T);
    toOp(): ColRefOp<N, T>;
}
declare class BooleanCol<N extends string = string> extends BooleanExpr<'columnar'> {
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N);
    toOp(): ColRefOp<N, 'boolean'>;
}
declare class DateCol<N extends string = string> extends DateExpr<'columnar'> {
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N);
    toOp(): ColRefOp<N, 'date'>;
}
declare class TimeCol<N extends string = string> extends TimeExpr<'columnar'> {
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N);
    toOp(): ColRefOp<N, 'time'>;
}
declare class DateTimeCol<N extends string = string> extends DateTimeExpr<'columnar'> {
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N);
    toOp(): ColRefOp<N, 'datetime'>;
}
declare class UUIDCol<N extends string = string> extends UUIDExpr<'columnar'> {
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N);
    toOp(): ColRefOp<N, 'uuid'>;
}
declare class ColRef<N extends string = string, T extends DataType = DataType> extends BaseExpr<T, 'columnar'> {
    readonly dtype: T;
    readonly dshape: "columnar";
    readonly name: N;
    private readonly _op;
    constructor(name: N, dtype: T);
    toOp(): ColRefOp<N, T>;
}
declare function col<N extends string, T extends DataType>(name: N, dtype: T): Col<N, T>;
declare class SortExpr {
    readonly expr: BaseExpr;
    readonly direction: 'asc' | 'desc';
    constructor(expr: BaseExpr, direction: 'asc' | 'desc');
    toSortSpec(): SortSpec;
}
declare function count(): BaseExpr<'int64', 'scalar'>;
declare function sql<T extends DataType, S extends DataShape>(rawSql: string, dtype: T, dshape: S): BaseExpr<T, S>;
declare function lit<JS extends JsType>(value: JS): IExpr<InferDtype<JS>, 'scalar'>;

declare class RowAccessor<S extends Schema> {
    private readonly _schema;
    constructor(_schema: S);
    col<K extends keyof S & string>(name: K): Col<K, S[K], S>;
}
/** Result of calling g.agg({...}) inside a group() callback. */
declare class GroupResult<A extends Record<string, BaseExpr<DataType, 'scalar'>>> {
    readonly aggregations: A;
    constructor(aggregations: A);
}
declare class GroupAccessor<S extends Schema> extends RowAccessor<S> {
    agg<A extends Record<string, BaseExpr<DataType, 'scalar'>>>(aggregations: A): GroupResult<A>;
}
type ColName<C> = C extends StringCol<infer N> ? N : C extends NumericCol<infer N, NumericDataType> ? N : C extends BooleanCol<infer N> ? N : C extends ColRef<infer N, DataType> ? N : never;
type ColArrayNames<KC> = KC extends Array<infer C> ? ColName<C> : never;
type AggResultSchema<A extends Record<string, BaseExpr<DataType, 'scalar'>>> = {
    [K in keyof A]: A[K] extends BaseExpr<infer T, 'scalar'> ? T : never;
};
declare class Relation<S extends Schema = Schema> {
    readonly schema: S;
    /** @internal */ readonly _ir: IRNode;
    constructor(schema: S, 
    /** @internal */ _ir: IRNode);
    /**
     * Get a column expression by name.
     * @example penguins.col("bill_length_mm")
     */
    col<K extends keyof S & string>(name: K): Col<K, S[K], S>;
    /**
     * Filter rows using a boolean expression.
     * @example penguins.filter(r => r.col("bill_length_mm").gt(40))
     */
    filter(cb: (r: RowAccessor<S>) => BooleanExpr): Relation<S>;
    /**
     * Group rows by key columns and apply aggregations.
     * @example
     * penguins.group(
     *   r => [r.col("species"), r.col("year")],
     *   g => g.agg({ count: count(), mean_bill: g.col("bill_length_mm").mean() })
     * )
     */
    group<KC extends Col<any, any, S>[], A extends Record<string, BaseExpr<DataType, 'scalar'>>>(keys: (r: RowAccessor<S>) => KC, transform: (g: GroupAccessor<S>) => GroupResult<A>): Relation<Pick<S, ColArrayNames<KC> & keyof S> & AggResultSchema<A>>;
    /**
     * Add computed columns to each row.
     * @example penguins.derive(r => ({ ratio: r.col("bill_length_mm").div(40) }))
     */
    derive<D extends Record<string, BaseExpr<DataType>>>(cb: (r: RowAccessor<S>) => D): Relation<S & {
        [K in keyof D]: D[K] extends BaseExpr<infer T> ? T : never;
    }>;
    /**
     * Sort rows by one or more keys.
     * @example penguins.sort(r => r.col("count").desc())
     * @example penguins.sort(r => [r.col("species"), r.col("year").desc()])
     */
    sort(cb: (r: RowAccessor<S>) => SortExpr | BaseExpr<DataType> | (SortExpr | BaseExpr<DataType>)[]): Relation<S>;
    /**
     * Take the first n rows.
     * @example penguins.take(10)
     */
    take(n: number): Relation<S>;
    compile(compiler: Compiler<any>): string;
    /** Compile to a PRQL query string. */
    toPrql(): string;
    /** Compile to SQL using the PRQL compiler. */
    toSql(): string;
}
/**
 * Define a relation with an explicit name and schema.
 * @example
 * const penguins = relation('penguins', {
 *   species: 'string',
 *   year: 'int32',
 *   bill_length_mm: 'float64',
 * })
 */
declare function relation<S extends Schema>(name: string, schema: S): Relation<S>;

declare class PrqlCompiler implements Compiler {
    compileOp(op: BuiltinOp): string;
    compileSortKey(spec: SortSpec): string;
    compileIR(node: IRNode): string;
}

declare class SqlCompiler implements Compiler {
    private readonly prqlCompiler;
    compileOp(op: BuiltinOp): string;
    compileIR(node: IRNode): string;
}

export { AndOp, BaseOp, BooleanCol, BooleanExpr, BooleanLiteralOp, type BuiltinOp, type Col, ColRef, ColRefOp, type Compiler, ContainsOp, CountOp, type DataShape, type DataType, DateExpr, DateTimeExpr, DatetimeLiteralOp, DivOp, EqOp, BaseExpr as Expr, GtOp, GteOp, type IExpr, type IOp, type IRNode, IsNotNullOp, type JSType, LowerOp, LtOp, LteOp, MaxOp, MeanOp, MinOp, NullLiteralOp, NumberLiteralOp, NumericCol, type NumericDataType, NumericExpr, OrOp, PrqlCompiler, RawSqlOp, Relation, type Schema, type SchemaToJS, SortExpr, SortSpec, SqlCompiler, StartsWithOp, StringCol, StringExpr, StringLiteralOp, SumOp, TimeExpr, UUIDExpr, UpperOp, col, count, lit, opToExpr, relation, sql };
 }`
