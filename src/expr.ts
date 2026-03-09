import { inferDtype, type DataType, type InferDtype, type JsType, type Schema } from './datatypes.js'
import type { DataShape, HighestDataShape, InferDataShape } from './datashape.js'
import * as ops from './ops.js'
import { IOp, IExpr, IsExprSymbol, isOp, isExpr } from './core.js'

// ---------------------------------------------------------------------------
// opToExpr — wraps an IOp in the appropriate Expr subclass
// ---------------------------------------------------------------------------

export type NumericDataType = 'int32' | 'int64' | 'float32' | 'float64'

export type Expr<T extends DataType = DataType, S extends DataShape = DataShape> =
    T extends 'string' ? StringExpr<S> :
    T extends NumericDataType ? NumericExpr<T, S> :
    T extends 'boolean' ? BooleanExpr<S> :
    T extends 'date' ? DateExpr<S> :
    T extends 'time' ? TimeExpr<S> :
    T extends 'datetime' ? DateTimeExpr<S> :
    T extends 'uuid' ? UUIDExpr<S> :
    T extends 'interval' ? IntervalExpr<S> :
    never

export function opToExpr<T extends DataType, S extends DataShape>(op: IOp<T, S>): Expr<T, S> {
    const d = op.dtype
    if (d === 'string') return new StringExpr(op as IOp<'string', S>) as Expr<T, S>
    if (d === 'int32' || d === 'int64' || d === 'float32' || d === 'float64') return new NumericExpr(op as IOp<NumericDataType, S>) as Expr<T, S>
    if (d === 'boolean') return new BooleanExpr(op as IOp<'boolean', S>) as Expr<T, S>
    if (d === 'date') return new DateExpr(op as IOp<'date', S>) as Expr<T, S>
    if (d === 'time') return new TimeExpr(op as IOp<'time', S>) as Expr<T, S>
    if (d === 'datetime') return new DateTimeExpr(op as IOp<'datetime', S>) as Expr<T, S>
    if (d === 'uuid') return new UUIDExpr(op as IOp<'uuid', S>) as Expr<T, S>
    if (d === 'interval') return new IntervalExpr(op as IOp<'interval', S>) as Expr<T, S>
    throw new Error(`Unsupported dtype in opToExpr: ${d satisfies never}`)
}



// ---------------------------------------------------------------------------
// Abstract Expression classes (public-facing API)
// ---------------------------------------------------------------------------

export abstract class BaseExpr<T extends DataType = DataType, S extends DataShape = DataShape> implements IExpr<T, S> {
    readonly dtype: T
    readonly dshape: S
    constructor(private readonly _op: IOp<T, S>) {
        this.dtype = _op.dtype
        this.dshape = _op.dshape
    }
    [IsExprSymbol] = true
    toOp(): IOp<T, S> { return this._op }
}
export class GenericExpr<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseExpr<T, S> {

    isNotNull(): Expr<'boolean', S> {
        return opToExpr(new ops.IsNotNullOp(this.toOp()))
    }

    // assumes that all expressions are "comparable"
    eq<T extends string | number | boolean | IExpr<DataType>>(value: T): BooleanExpr<HighestDataShape<[InferDataShape<T>, S]>> {
        return opToExpr(new ops.EqOp(this.toOp(), toOpValue(value)))
    }
    gt(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.GtOp(this.toOp(), toOpValue(value)))
    }
    gte(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.GteOp(this.toOp(), toOpValue(value)))
    }
    lt(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.LtOp(this.toOp(), toOpValue(value)))
    }
    lte(value: number | IExpr<NumericDataType>): BooleanExpr<HighestDataShape<[InferDataShape<typeof value>, S]>> {
        return opToExpr(new ops.LteOp(this.toOp(), toOpValue(value)))
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
        return opToExpr(new ops.AddOp(this.toOp(), toOpValue(value)))
    }
    sub(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.SubOp(this.toOp(), toOpValue(value)))
    }
    mul(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.MulOp(this.toOp(), toOpValue(value)))
    }
    div(value: number | IExpr<NumericDataType>) {
        return opToExpr(new ops.DivOp(this.toOp(), toOpValue(value)))
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

export class StringExpr<S extends DataShape = DataShape> extends GenericExpr<'string', S> {
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

export class BooleanExpr<S extends DataShape = DataShape> extends GenericExpr<'boolean', S> {
    and(other: IExpr<'boolean'>) {
        return opToExpr(new ops.LogicalAndOp(this.toOp(), other.toOp()))
    }
    or(other: IExpr<'boolean'>) {
        return opToExpr(new ops.LogicalOrOp(this.toOp(), other.toOp()))
    }
    not() {
        return opToExpr(new ops.LogicalNotOp(this.toOp()))
    }
}

// ---------------------------------------------------------------------------
// Date expressions
// ---------------------------------------------------------------------------

export class DateExpr<S extends DataShape = DataShape> extends GenericExpr<'date', S> {
    toString(format: string) {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

// ---------------------------------------------------------------------------
// Time expressions
// ---------------------------------------------------------------------------

export class TimeExpr<S extends DataShape = DataShape> extends GenericExpr<'time', S> {
    toString(format: string) {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class DateTimeExpr<S extends DataShape = DataShape> extends GenericExpr<'datetime', S> {
    toString(format: string) {
        return opToExpr(new ops.TemporalToStringOp(this.toOp(), format))
    }
}

export class IntervalExpr<S extends DataShape = DataShape> extends GenericExpr<'interval', S> {
    // could add interval-specific methods here, e.g. to extract components like years, months, etc.
}

// ---------------------------------------------------------------------------
// UUID expressions
// ---------------------------------------------------------------------------

export class UUIDExpr<S extends DataShape = DataShape> extends GenericExpr<'uuid', S> {
    // no methods yet, but could add things like uuidv4(), etc.
}

export function col<N extends string, T extends DataType>(name: N, dtype: T): Expr<T, "columnar"> {
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

export function count(): NumericExpr<'int64', 'scalar'> {
    return opToExpr(new ops.CountOp())
}

export function sql<T extends DataType, S extends DataShape>(rawSql: string, dtype: T, dshape: S): Expr<T, S> {
    return opToExpr(new ops.RawSqlOp(rawSql, dtype, dshape))
}

export function lit<JS extends JsType>(value: JS): Expr<InferDtype<JS>, 'scalar'> {
    const op = litOp(value)
    return opToExpr(op)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function litOp<JS extends JsType>(value: JS): IOp<InferDtype<JS>, 'scalar'> {
    const inferredDtype = inferDtype(value)
    type R = IOp<InferDtype<JS>, 'scalar'>
    switch (inferredDtype) {
        case 'string':
            return new ops.StringLiteralOp(value as string) as unknown as R
        case 'boolean':
            return new ops.BooleanLiteralOp(value as boolean) as unknown as R
        case 'float64':
            return new ops.NumberLiteralOp(value as number) as unknown as R
        case 'datetime':
            return new ops.DatetimeLiteralOp(value as Date) as unknown as R
        default:
            throw new Error(`Unsupported JS value type: ${inferredDtype satisfies never}`)
    }
}

function toOpValue<T extends IExpr | IOp | JsType>(exprOrJs: T): IOp<InferDtype<T>, InferDataShape<T>> {
    if (isOp(exprOrJs)) {
        return exprOrJs as any
    } else if (isExpr(exprOrJs)) {
        return exprOrJs.toOp() as any
    } else {
        return litOp(exprOrJs as JsType) as any
    }
}