import { inferDtypeFromJs, type DataType, type InferDtype, type JsType } from './datatypes.js'
import * as dt from './datatypes.js'
import type { DataShape, HighestDataShape, InferDataShape } from './datashape.js'
import { highestDataShape } from './datashape.js'
import { IExpr, IOp, isExpr, isOp, IsOpSymbol } from './core.js'
import { Expr, opToExpr } from './expr.js'

// ---------------------------------------------------------------------------
// Base Op class
// ---------------------------------------------------------------------------

export abstract class BaseOp<T extends DataType = DataType, S extends DataShape = DataShape> implements IOp<T, S> {
    [IsOpSymbol] = true
    abstract readonly kind: string
    private readonly _dtype: T
    private readonly _dshape: S
    constructor(dtype: T, dshape: S) {
        this._dtype = dtype
        this._dshape = dshape
    }
    dtype(): T { return this._dtype }
    dshape(): S { return this._dshape }
    toExpr(): Expr<T, S> { return opToExpr(this) }
    getName(): string { return this.kind }
}

type DT<T extends JsType | dt.IntoDtype> = T extends JsType ? dt.InferDtypeFromJs<T> : T extends dt.IntoDtype ? InferDtype<T> : never
/** Convert an expression, op, or JS value to an Op. */
export function toOpValue<T extends IExpr | IOp | JsType>(exprOrJs: T): IOp<DT<T>, InferDataShape<T>> {
    if (isOp(exprOrJs)) {
        return exprOrJs as any
    } else if (isExpr(exprOrJs)) {
        return exprOrJs.toOp() as any
    } else {
        return litOp(exprOrJs as JsType) as any
    }
}


// ---------------------------------------------------------------------------
// Column reference
// ---------------------------------------------------------------------------

export class ColRefOp<N extends string = string, T extends dt.IntoDtype = DataType> extends BaseOp<dt.InferDtype<T>, 'columnar'> {
    readonly kind = 'col_ref' as const
    constructor(readonly name: N, dtype: T) { super(dt.dtype(dtype), 'columnar') }
    getName(): string { return this.name }
}

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

export class IntLiteralOp extends BaseOp<dt.DTInt<64>, 'scalar'> {
    readonly kind = 'int_literal' as const
    constructor(readonly value: number) { super(dt.DTInt(64), 'scalar') }
}
export class FloatLiteralOp extends BaseOp<dt.DTFloat<64>, 'scalar'> {
    readonly kind = 'float_literal' as const
    constructor(readonly value: number) { super(dt.DTFloat(64), 'scalar') }
}

export class StringLiteralOp extends BaseOp<dt.DTString, 'scalar'> {
    readonly kind = 'string_literal' as const
    constructor(readonly value: string) { super(dt.DTString(), 'scalar') }
}

export class BooleanLiteralOp extends BaseOp<dt.DTBoolean, 'scalar'> {
    readonly kind = 'boolean_literal' as const
    constructor(readonly value: boolean) { super(dt.DTBoolean(), 'scalar') }
}

export class NullLiteralOp extends BaseOp<dt.DTString, 'scalar'> {
    readonly kind = 'null_literal' as const
    constructor() { super(dt.DTString(), 'scalar') }
}

export class DatetimeLiteralOp extends BaseOp<dt.DTDateTime, 'scalar'> {
    readonly kind = 'datetime_literal' as const
    constructor(readonly value: Date) { super(dt.DTDateTime(), 'scalar') }
}

export class DateLiteralOp extends BaseOp<dt.DTDate, 'scalar'> {
    readonly kind = 'date_literal' as const
    constructor(readonly value: Date) { super(dt.DTDate(), 'scalar') }
}

export class TimeLiteralOp extends BaseOp<dt.DTTime, 'scalar'> {
    readonly kind = 'time_literal' as const
    constructor(readonly value: Date) { super(dt.DTTime(), 'scalar') }
}

/** Create a literal Op from a JS value. */
export function litOp<JS extends JsType>(value: JS): IOp<dt.InferDtypeFromJs<JS>, 'scalar'> {
    const inferredDtype = inferDtypeFromJs(value)
    type R = IOp<dt.InferDtypeFromJs<JS>, 'scalar'>
    const tc = inferredDtype.typecode
    switch (tc) {
        case 'string':
            return new StringLiteralOp(value as string) as unknown as R
        case 'boolean':
            return new BooleanLiteralOp(value as boolean) as unknown as R
        case 'float':
            return new FloatLiteralOp(value as number) as unknown as R
        case 'datetime':
            return new DatetimeLiteralOp(value as Date) as unknown as R
        default:
            throw new Error(`Unsupported JS value type: ${tc satisfies never}`)
    }
}

// ---------------------------------------------------------------------------
// Generic operations
// ---------------------------------------------------------------------------

export class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, S> {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: IOp<DataType, S>) { super(dt.DTBoolean(), operand.dshape()) }
}

export class CountOp extends BaseOp<dt.DTInt<64>, 'scalar'> {
    readonly kind = 'count' as const
    constructor() { super(dt.DTInt64(), 'scalar') }
}
export class RawSqlOp<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseOp<T, S> {
    readonly kind = 'raw_sql' as const
    constructor(readonly rawSql: string, dtype: T, dshape: S) { super(dtype, dshape) }
}

// ---------------------------------------------------------------------------
// Comparison ops
// ---------------------------------------------------------------------------

export class EqOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'eq' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class GtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'gt' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class GteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'gte' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'lt' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'lte' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'min' as const
    constructor(readonly operand: IOp<T, any>) { super(operand.dtype(), 'scalar') }
}

export class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'max' as const
    constructor(readonly operand: IOp<T, any>) { super(operand.dtype(), 'scalar') }
}

// ---------------------------------------------------------------------------
// Boolean logic ops
// ---------------------------------------------------------------------------

export class LogicalNotOp<S extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, S> {
    readonly kind = 'not' as const
    constructor(readonly operand: IOp<dt.DTBoolean, S>) { super(dt.DTBoolean(), operand.dshape()) }
}

export class LogicalAndOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'and' as const
    constructor(readonly left: IOp<dt.DTBoolean, S1>, readonly right: IOp<dt.DTBoolean, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LogicalOrOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'or' as const
    constructor(readonly left: IOp<dt.DTBoolean, S1>, readonly right: IOp<dt.DTBoolean, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

// ---------------------------------------------------------------------------
// Arithmetic ops
// ---------------------------------------------------------------------------

export class AddOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTFloat64, HighestDataShape<[S1, S2]>> {
    readonly kind = 'add' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTFloat64(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class SubOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTFloat64, HighestDataShape<[S1, S2]>> {
    readonly kind = 'sub' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTFloat64(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class MulOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTFloat64, HighestDataShape<[S1, S2]>> {
    readonly kind = 'mul' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTFloat64(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class DivOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTFloat64, HighestDataShape<[S1, S2]>> {
    readonly kind = 'div' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super(dt.DTFloat64(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}
export class SumOp extends BaseOp<dt.DTFloat64, 'scalar'> {
    readonly kind = 'sum' as const
    constructor(readonly operand: IOp) { super(dt.DTFloat64(), 'scalar') }
}

export class MeanOp extends BaseOp<dt.DTFloat64, 'scalar'> {
    readonly kind = 'mean' as const
    constructor(readonly operand: IOp) { super(dt.DTFloat64(), 'scalar') }
}


// ---------------------------------------------------------------------------
// String ops
// ---------------------------------------------------------------------------

export class UpperOp<S extends DataShape = DataShape> extends BaseOp<dt.DTString, S> {
    readonly kind = 'upper' as const
    constructor(readonly operand: IOp<{ typecode: 'string' }, S>) { super(dt.DTString(), operand.dshape()) }
}

export class LowerOp<S extends DataShape = DataShape> extends BaseOp<dt.DTString, S> {
    readonly kind = 'lower' as const
    constructor(readonly operand: IOp<{ typecode: 'string' }, S>) { super(dt.DTString(), operand.dshape()) }
}

export class ContainsOp<S1 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'contains' as const
    constructor(readonly operand: IOp<{ typecode: 'string' }, S1>, readonly pattern: StringLiteralOp) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), pattern.dshape()) as HighestDataShape<[S1, 'scalar']>) }
}

export class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IOp<{ typecode: 'string' }, S1>, readonly prefix: StringLiteralOp) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), prefix.dshape()) as HighestDataShape<[S1, 'scalar']>) }
}

// ---------------------------------------------------------------------------
// Date ops
// ---------------------------------------------------------------------------

type TemporalDataType = { typecode: 'date' } | { typecode: 'time' } | { typecode: 'datetime' }

export class TemporalToStringOp<S extends DataShape = DataShape> extends BaseOp<dt.DTString, S> {
    readonly kind = 'temporal_to_string' as const
    constructor(readonly operand: IOp<TemporalDataType, S>, readonly format: string) { super(dt.DTString(), operand.dshape()) }
}

// ---------------------------------------------------------------------------
// Sort specification
// ---------------------------------------------------------------------------

export class SortSpec {
    constructor(readonly op: IOp, readonly direction: 'asc' | 'desc') { }
}

// ---------------------------------------------------------------------------
// BuiltinOp — discriminated union for exhaustive compiler type-checking
// ---------------------------------------------------------------------------

export type BuiltinOp =
    | ColRefOp
    | IntLiteralOp
    | FloatLiteralOp
    | StringLiteralOp
    | BooleanLiteralOp
    | NullLiteralOp
    | DatetimeLiteralOp
    | DateLiteralOp
    | TimeLiteralOp
    // generic
    | IsNotNullOp
    | CountOp
    | RawSqlOp
    // comparison ops
    | EqOp
    | GtOp
    | GteOp
    | LtOp
    | LteOp
    | MinOp
    | MaxOp
    // boolean logic ops
    | LogicalNotOp
    | LogicalAndOp
    | LogicalOrOp
    // arithmetic ops
    | AddOp
    | SubOp
    | MulOp
    | DivOp
    | SumOp
    | MeanOp
    // string ops
    | UpperOp
    | LowerOp
    | ContainsOp
    | StartsWithOp
    // temporal ops
    | TemporalToStringOp
