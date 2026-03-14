import { type DataType, IntoDtype } from '../datatype.js'
import * as dt from '../datatype.js'
import type { DataShape, HighestDataShape, InferDataShape } from '../datashape.js'
import * as ops from './ops.js'
import { IOp, IExpr, IsExprSymbol } from './core.js'
import * as cmp from './compare.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type Expr<T extends DataType = DataType, S extends DataShape = DataShape> =
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

export function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): Expr<T, S> {
    const d = op.dtype()
    if (d.typecode === 'null') return new NullExpr(op as IOp<{ typecode: 'null' }, S>) as Expr<T, S>
    if (d.typecode === 'string') return new StringExpr(op as IOp<{ typecode: 'string' }, S>) as Expr<T, S>
    if (d.typecode === 'int') return new NumericExpr(op as IOp<dt.NumericDataType, S>) as Expr<T, S>
    if (d.typecode === 'float') return new NumericExpr(op as IOp<dt.NumericDataType, S>) as Expr<T, S>
    if (d.typecode === 'boolean') return new BooleanExpr(op as IOp<{ typecode: 'boolean' }, S>) as Expr<T, S>
    if (d.typecode === 'date') return new DateExpr(op as IOp<{ typecode: 'date' }, S>) as Expr<T, S>
    if (d.typecode === 'time') return new TimeExpr(op as IOp<{ typecode: 'time' }, S>) as Expr<T, S>
    if (d.typecode === 'datetime') return new DateTimeExpr(op as IOp<{ typecode: 'datetime' }, S>) as Expr<T, S>
    if (d.typecode === 'uuid') return new UUIDExpr(op as IOp<{ typecode: 'uuid' }, S>) as Expr<T, S>
    if (d.typecode === 'interval') return new IntervalExpr(op as IOp<{ typecode: 'interval' }, S>) as Expr<T, S>
    throw new Error(`Unsupported dtype in opToExpr: ${(d satisfies never)}`)
}



// ---------------------------------------------------------------------------
// Abstract Expression classes (public-facing API)
// ---------------------------------------------------------------------------

export abstract class BaseExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IExpr<T, S> {
    constructor(private readonly _op: IOp<T, S>) { }
    [IsExprSymbol] = true as const
    dtype(): T { return this._op.dtype() }
    dshape(): S { return this._op.dshape() }
    toOp(): IOp<T, S> { return this._op }
}

export class GenericExpr<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {

    isNotNull(): Expr<dt.DTBoolean, S> {
        return opToExpr(new ops.IsNotNullOp(this.toOp()))
    }

    eq<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return opToExpr(new ops.EqOp(this.toOp(), other))
    }
    gt<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return opToExpr(new ops.GtOp(this.toOp(), other))
    }
    gte<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return opToExpr(new ops.GteOp(this.toOp(), other))
    }
    lt<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return opToExpr(new ops.LtOp(this.toOp(), other))
    }
    lte<Value extends cmp.IntoValueComparableTo<T>>(value: Value): BooleanExpr<HighestDataShape<[InferDataShape<Value>, S]>> {
        const other = cmp.coerceToComparable(this.dtype(), value)
        return opToExpr(new ops.LteOp(this.toOp(), other))
    }
    min(): Expr<T, 'scalar'> {
        return opToExpr(new ops.MinOp(this.toOp()))
    }
    max(): Expr<T, 'scalar'> {
        return opToExpr(new ops.MaxOp(this.toOp()))
    }
    desc() {
        return new SortExpr(this, 'desc')
    }
    asc() {
        return new SortExpr(this, 'asc')
    }
}

export class NullExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'null' }, S> {
    // no methods yet, but could add null-specific things here if desired
}

// ---------------------------------------------------------------------------
// Numeric expressions (int32, int64, float32, float64)
// ---------------------------------------------------------------------------

export class NumericExpr<T extends dt.NumericDataType = dt.NumericDataType, S extends DataShape = DataShape> extends GenericExpr<T, S> {
    add<T extends number | IExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return opToExpr(new ops.AddOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    sub<T extends number | IExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return opToExpr(new ops.SubOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    mul<T extends number | IExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return opToExpr(new ops.MulOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    div<T extends number | IExpr<dt.NumericDataType, any>>(value: T): NumericExpr<dt.DTFloat64, HighestDataShape<[InferDataShape<T>, S]>> {
        return opToExpr(new ops.DivOp(this.toOp(), ops.toOpValue(value as any))) as any
    }
    sum(): NumericExpr<dt.DTFloat64, 'scalar'> {
        return opToExpr(new ops.SumOp(this.toOp())) as any
    }
    mean(): NumericExpr<dt.DTFloat64, 'scalar'> {
        return opToExpr(new ops.MeanOp(this.toOp())) as any
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export class StringExpr<S extends DataShape = DataShape> extends GenericExpr<dt.DTString, S> {
    upper() {
        return opToExpr(new ops.UpperOp(this.toOp()))
    }
    lower() {
        return opToExpr(new ops.LowerOp(this.toOp()))
    }
    contains(pattern: string) {
        return opToExpr(new ops.ContainsOp(this.toOp(), new ops.StringLiteralOp(pattern)))
    }
    startsWith(prefix: string) {
        return opToExpr(new ops.StartsWithOp(this.toOp(), new ops.StringLiteralOp(prefix)))
    }
}

// ---------------------------------------------------------------------------
// Boolean expressions
// ---------------------------------------------------------------------------

export class BooleanExpr<S extends DataShape = DataShape> extends GenericExpr<dt.DTBoolean, S> {
    and(other: boolean | IExpr<dt.DTBoolean, any>) {
        return opToExpr(new ops.LogicalAndOp(this.toOp(), ops.toOpValue(other)))
    }
    or(other: boolean | IExpr<dt.DTBoolean, any>) {
        return opToExpr(new ops.LogicalOrOp(this.toOp(), ops.toOpValue(other)))
    }
    not() {
        return opToExpr(new ops.LogicalNotOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// Date expressions
// ---------------------------------------------------------------------------

export class DateExpr<S extends DataShape = DataShape> extends GenericExpr<dt.DTDate, S> {
    toString(format: string): StringExpr<S> {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

// ---------------------------------------------------------------------------
// Time expressions
// ---------------------------------------------------------------------------

export class TimeExpr<S extends DataShape = DataShape> extends GenericExpr<dt.DTTime, S> {
    toString(format: string): StringExpr<S> {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class DateTimeExpr<S extends DataShape = DataShape> extends GenericExpr<dt.DTDateTime, S> {
    toString(format: string): StringExpr<S> {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class IntervalExpr<S extends DataShape = DataShape> extends GenericExpr<dt.DTInterval, S> {
    // could add interval-specific methods here, e.g. to extract components like years, months, etc.
}

// ---------------------------------------------------------------------------
// UUID expressions
// ---------------------------------------------------------------------------

export class UUIDExpr<S extends DataShape = DataShape> extends GenericExpr<dt.DTUUID, S> {
    // no methods yet, but could add things like uuidv4(), etc.
}

export function col<N extends string, T extends IntoDtype>(name: N, dtype: T): Expr<dt.InferDtype<T>, "columnar"> {
    const op = new ops.ColRefOp(name, dtype)
    return op.toExpr()
}

// ---------------------------------------------------------------------------
// SortExpr — sort key with direction (public-facing)
// ---------------------------------------------------------------------------

export class SortExpr {
    constructor(
        readonly expr: BaseExpr,
        readonly direction: 'asc' | 'desc',
    ) { }
    toSortSpec(): ops.SortSpec {
        return new ops.SortSpec(this.expr.toOp(), this.direction)
    }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function count(): NumericExpr<dt.DTInt64, 'scalar'> {
    return opToExpr(new ops.CountOp())
}

export function sql<T extends DataType, S extends DataShape>(rawSql: string, dtype: T, dshape: S): Expr<T, S> {
    return opToExpr(new ops.RawSqlOp(rawSql, dtype, dshape))
}

export function lit<JS extends ops.AcceptableJsVal<DT>, DT extends dt.IntoDtype | undefined = undefined>(value: JS, dtype?: DT): Expr<ops.ExplicitOrInferredDtype<JS, DT>, 'scalar'> {
    return ops.litOp(value, dtype).toExpr()
}
