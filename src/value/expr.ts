import { type DataType, IntoDtype } from '../datatype.js'
import * as dt from '../datatype.js'
import type { DataShape, HighestDataShape, InferDataShape } from '../datashape.js'
import * as ops from './ops.js'
import { IVOp, IVExpr, IsVExprSymbol } from './core.js'
import * as cmp from './compare.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IVOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type VExpr<T extends DataType = DataType, S extends DataShape = DataShape> =
    T extends { typecode: 'null' } ? NullExpr<S> :
    T extends { typecode: 'string' } ? StringExpr<S> :
    T extends dt.NumericDataType ? NumericExpr<T, S> :
    T extends { typecode: 'boolean' } ? BooleanExpr<S> :
    T extends { typecode: 'date' } ? DateExpr<S> :
    T extends { typecode: 'time' } ? TimeExpr<S> :
    T extends { typecode: 'datetime' } ? DateTimeExpr<S> :
    T extends { typecode: 'uuid' } ? UUIDExpr<S> :
    T extends { typecode: 'interval' } ? IntervalExpr<S> :
    never

export function vOpToVExpr<T extends DataType, S extends DataShape>(op: IVOp<T, S>): VExpr<T, S> {
    const d = op.dtype()
    if (d.typecode === 'null') return new NullExpr(op as IVOp<{ typecode: 'null' }, S>) as VExpr<T, S>
    if (d.typecode === 'string') return new StringExpr(op as IVOp<{ typecode: 'string' }, S>) as VExpr<T, S>
    if (d.typecode === 'int') return new NumericExpr(op as IVOp<dt.NumericDataType, S>) as VExpr<T, S>
    if (d.typecode === 'float') return new NumericExpr(op as IVOp<dt.NumericDataType, S>) as VExpr<T, S>
    if (d.typecode === 'boolean') return new BooleanExpr(op as IVOp<{ typecode: 'boolean' }, S>) as VExpr<T, S>
    if (d.typecode === 'date') return new DateExpr(op as IVOp<{ typecode: 'date' }, S>) as VExpr<T, S>
    if (d.typecode === 'time') return new TimeExpr(op as IVOp<{ typecode: 'time' }, S>) as VExpr<T, S>
    if (d.typecode === 'datetime') return new DateTimeExpr(op as IVOp<{ typecode: 'datetime' }, S>) as VExpr<T, S>
    if (d.typecode === 'uuid') return new UUIDExpr(op as IVOp<{ typecode: 'uuid' }, S>) as VExpr<T, S>
    if (d.typecode === 'interval') return new IntervalExpr(op as IVOp<{ typecode: 'interval' }, S>) as VExpr<T, S>
    throw new Error(`Unsupported dtype in opToExpr: ${(d satisfies never)}`)
}



// ---------------------------------------------------------------------------
// Abstract Expression classes (public-facing API)
// ---------------------------------------------------------------------------

export abstract class BaseVExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IVExpr<T, S> {
    constructor(private readonly _op: IVOp<T, S>) { }
    [IsVExprSymbol] = true as const
    dtype(): T { return this._op.dtype() }
    dshape(): S { return this._op.dshape() }
    toOp(): IVOp<T, S> { return this._op }
}

export class GenericVExpr<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseVExpr<T, S> {

    isNotNull(): VExpr<dt.DTBoolean, S> {
        return vOpToVExpr(new ops.IsNotNullOp(this.toOp()))
    }

    eq<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return vOpToVExpr(new ops.EqOp(this.toOp(), other))
    }
    gt<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return vOpToVExpr(new ops.GtOp(this.toOp(), other))
    }
    gte<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return vOpToVExpr(new ops.GteOp(this.toOp(), other))
    }
    lt<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return vOpToVExpr(new ops.LtOp(this.toOp(), other))
    }
    lte<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return vOpToVExpr(new ops.LteOp(this.toOp(), other))
    }
    min(): VExpr<T, 'scalar'> {
        return vOpToVExpr(new ops.MinOp(this.toOp()))
    }
    max(): VExpr<T, 'scalar'> {
        return vOpToVExpr(new ops.MaxOp(this.toOp()))
    }
    desc() {
        return new SortExpr(this, 'desc')
    }
    asc() {
        return new SortExpr(this, 'asc')
    }
}

export class NullExpr<S extends DataShape = DataShape> extends GenericVExpr<{ typecode: 'null' }, S> {
    // no methods yet, but could add null-specific things here if desired
}

// ---------------------------------------------------------------------------
// Numeric expressions (int32, int64, float32, float64)
// ---------------------------------------------------------------------------

export class NumericExpr<T extends dt.NumericDataType = dt.NumericDataType, S extends DataShape = DataShape> extends GenericVExpr<T, S> {
    add<T extends number | IVExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return vOpToVExpr(new ops.AddOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    sub<T extends number | IVExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return vOpToVExpr(new ops.SubOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    mul<T extends number | IVExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return vOpToVExpr(new ops.MulOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    div<T extends number | IVExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return vOpToVExpr(new ops.DivOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    sum(): NumericExpr<dt.DTFloat64, 'scalar'> {
        return vOpToVExpr(new ops.SumOp(this.toOp())) as any
    }
    mean(): NumericExpr<dt.DTFloat64, 'scalar'> {
        return vOpToVExpr(new ops.MeanOp(this.toOp())) as any
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export class StringExpr<S extends DataShape = DataShape> extends GenericVExpr<dt.DTString, S> {
    upper() {
        return vOpToVExpr(new ops.UpperOp(this.toOp()))
    }
    lower() {
        return vOpToVExpr(new ops.LowerOp(this.toOp()))
    }
    contains(pattern: string) {
        return vOpToVExpr(new ops.ContainsOp(this.toOp(), new ops.StringLiteralOp(pattern)))
    }
    startsWith(prefix: string) {
        return vOpToVExpr(new ops.StartsWithOp(this.toOp(), new ops.StringLiteralOp(prefix)))
    }
}

// ---------------------------------------------------------------------------
// Boolean expressions
// ---------------------------------------------------------------------------

export class BooleanExpr<S extends DataShape = DataShape> extends GenericVExpr<dt.DTBoolean, S> {
    and(other: boolean | IVExpr<dt.DTBoolean, any>) {
        return vOpToVExpr(new ops.LogicalAndOp(this.toOp(), ops.toOpValue(other)))
    }
    or(other: boolean | IVExpr<dt.DTBoolean, any>) {
        return vOpToVExpr(new ops.LogicalOrOp(this.toOp(), ops.toOpValue(other)))
    }
    not() {
        return vOpToVExpr(new ops.LogicalNotOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// Date expressions
// ---------------------------------------------------------------------------

export class DateExpr<S extends DataShape = DataShape> extends GenericVExpr<dt.DTDate, S> {
    toString(format: string): StringExpr<S> {
        return vOpToVExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

// ---------------------------------------------------------------------------
// Time expressions
// ---------------------------------------------------------------------------

export class TimeExpr<S extends DataShape = DataShape> extends GenericVExpr<dt.DTTime, S> {
    toString(format: string): StringExpr<S> {
        return vOpToVExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class DateTimeExpr<S extends DataShape = DataShape> extends GenericVExpr<dt.DTDateTime, S> {
    toString(format: string): StringExpr<S> {
        return vOpToVExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class IntervalExpr<S extends DataShape = DataShape> extends GenericVExpr<dt.DTInterval, S> {
    // could add interval-specific methods here, e.g. to extract components like years, months, etc.
}

// ---------------------------------------------------------------------------
// UUID expressions
// ---------------------------------------------------------------------------

export class UUIDExpr<S extends DataShape = DataShape> extends GenericVExpr<dt.DTUUID, S> {
    // no methods yet, but could add things like uuidv4(), etc.
}

export function col<N extends string, T extends IntoDtype>(name: N, dtype: T): VExpr<dt.InferDtype<T>, "columnar"> {
    const op = new ops.ColRefOp(name, dtype)
    return op.toExpr()
}

// ---------------------------------------------------------------------------
// SortExpr — sort key with direction (public-facing)
// ---------------------------------------------------------------------------

export class SortExpr {
    constructor(
        readonly expr: BaseVExpr,
        readonly direction: 'asc' | 'desc',
    ) { }
    toSortSpec(): ops.SortSpec {
        return new ops.SortSpec(this.expr.toOp(), this.direction)
    }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Counts the number of rows. Analogous to SQL's COUNT(*). Returns a NumericExpr with dtype=int64 and dshape='scalar'.
 */
export function count(): NumericExpr<dt.DTInt64, 'scalar'> {
    return vOpToVExpr(new ops.CountOp())
}

/**
 * Creates a raw SQL expression. The caller must provide the raw SQL string, as well as the expected dtype and dshape of the result.
 * This is an escape hatch for when you need to use a function or expression that isn't natively supported by Tybis.
 * 
 * The provided dtype and dshape will ONLY be used for type-checking and expression-building purposes,
 * and will have no effect at runtime.
 * So if you pass the wrong dtype/dshape, your code might type-check but then fail at runtime, or return incorrect results.
 * Use with caution!
 * 
 * @param rawSql The raw SQL string to use. TODO in the future this should support tagged template literals for better interpolation, eg ty.sql`DATE_ADD(${col('my_date')}, INTERVAL 1 DAY)`
 * @param dtype The expected data type of the result.
 * @param dshape The expected data shape of the result.
 * @returns A VExpr representing the raw SQL expression.
 */
export function sql<T extends DataType, S extends DataShape>(rawSql: string, dtype: T, dshape: S): VExpr<T, S> {
    return vOpToVExpr(new ops.RawSqlOp(rawSql, dtype, dshape))
}

/**
 * Create a scalar value expression that represents a single literal value, eg `ty.lit(42)` or `ty.lit("hello")`.
 * 
 * The dtype can be inferred from the value, or explicitly provided if needed.
 * 
 * Note how `ty.lit("name")` represents a string literal value, which is different from `myrelation.col("name")`, which represents a reference to a column named "name".
 * 
 * @param value The literal value to use.
 * @param dtype The optional data type of the literal. If not provided, it will be inferred from the value.
 * @returns A VExpr representing the literal value.
 */
export function lit<JS extends ops.AcceptableJsVal<DT>, DT extends dt.IntoDtype | undefined = undefined>(value: JS, dtype?: DT): VExpr<ops.ExplicitOrInferredDtype<JS, DT>, 'scalar'> {
    return ops.litOp(value, dtype).toExpr()
}
