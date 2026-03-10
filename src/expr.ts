import { type DataType, type InferDtype, type JsType, IntoDtype } from './datatypes.js'
import * as dt from './datatypes.js'
import type { DataShape, HighestDataShape, InferDataShape } from './datashape.js'
import * as ops from './ops.js'
import { IOp, IExpr, IsExprSymbol } from './core.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type NumericDataType = dt.DTInt | dt.DTFloat

export type Expr<T extends DataType = DataType, S extends DataShape = DataShape> =
    T extends { typecode: 'string' } ? StringExpr<S> :
    T extends NumericDataType ? NumericExpr<T, S> :
    T extends { typecode: 'boolean' } ? BooleanExpr<S> :
    T extends { typecode: 'date' } ? DateExpr<S> :
    T extends { typecode: 'time' } ? TimeExpr<S> :
    T extends { typecode: 'datetime' } ? DateTimeExpr<S> :
    T extends { typecode: 'uuid' } ? UUIDExpr<S> :
    T extends { typecode: 'interval' } ? IntervalExpr<S> :
    never

export function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): Expr<T, S> {
    const d = op.dtype()
    if (d.typecode === 'string') return new StringExpr(op as IOp<{ typecode: 'string' }, S>) as Expr<T, S>
    if (d.typecode === 'int') return new NumericExpr(op as IOp<NumericDataType, S>) as Expr<T, S>
    if (d.typecode === 'float') return new NumericExpr(op as IOp<NumericDataType, S>) as Expr<T, S>
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
    [IsExprSymbol] = true
    dtype(): T { return this._op.dtype() }
    dshape(): S { return this._op.dshape() }
    toOp(): IOp<T, S> { return this._op }
}
export class GenericExpr<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {

    isNotNull(): Expr<{ typecode: 'boolean' }, S> {
        return opToExpr(new ops.IsNotNullOp(this.toOp()))
    }

    // assumes that all expressions are "comparable"
    eq<T extends string | number | boolean | IExpr<DataType>>(value: T): BooleanExpr<HighestDataShape<[InferDataShape<T>, S]>> {
        return opToExpr(new ops.EqOp(this.toOp(), ops.toOpValue(value)))
    }
    gt(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.GtOp(this.toOp(), ops.toOpValue(value)))
    }
    gte(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.GteOp(this.toOp(), ops.toOpValue(value)))
    }
    lt(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.LtOp(this.toOp(), ops.toOpValue(value)))
    }
    lte(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.LteOp(this.toOp(), ops.toOpValue(value)))
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

// ---------------------------------------------------------------------------
// Numeric expressions (int32, int64, float32, float64)
// ---------------------------------------------------------------------------

export class NumericExpr<T extends NumericDataType = NumericDataType, S extends DataShape = DataShape> extends GenericExpr<T, S> {
    add(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.AddOp(this.toOp(), ops.toOpValue(value)))
    }
    sub(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.SubOp(this.toOp(), ops.toOpValue(value)))
    }
    mul(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.MulOp(this.toOp(), ops.toOpValue(value)))
    }
    div(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.DivOp(this.toOp(), ops.toOpValue(value)))
    }
    sum() {
        return opToExpr(new ops.SumOp(this.toOp()))
    }
    mean() {
        return opToExpr(new ops.MeanOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// String expressions
// ---------------------------------------------------------------------------

export class StringExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'string' }, S> {
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

export class BooleanExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'boolean' }, S> {
    and(other: IExpr<{ typecode: 'boolean' }>) {
        return opToExpr(new ops.LogicalAndOp(this.toOp(), other.toOp()))
    }
    or(other: IExpr<{ typecode: 'boolean' }>) {
        return opToExpr(new ops.LogicalOrOp(this.toOp(), other.toOp()))
    }
    not() {
        return opToExpr(new ops.LogicalNotOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// Date expressions
// ---------------------------------------------------------------------------

export class DateExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'date' }, S> {
    toString(format: string): StringExpr<S> {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

// ---------------------------------------------------------------------------
// Time expressions
// ---------------------------------------------------------------------------

export class TimeExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'time' }, S> {
    toString(format: string): StringExpr<S> {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class DateTimeExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'datetime' }, S> {
    toString(format: string): StringExpr<S> {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class IntervalExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'interval' }, S> {
    // could add interval-specific methods here, e.g. to extract components like years, months, etc.
}

// ---------------------------------------------------------------------------
// UUID expressions
// ---------------------------------------------------------------------------

export class UUIDExpr<S extends DataShape = DataShape> extends GenericExpr<{ typecode: 'uuid' }, S> {
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

export function lit<JS extends JsType>(value: JS): Expr<dt.InferDtypeFromJs<JS>, 'scalar'> {
    return ops.litOp(value).toExpr()
}
