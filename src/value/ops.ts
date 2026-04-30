import { type DataType, type InferDtype, type InferrableJsType } from '../datatype.js'
import * as dt from '../datatype'
import type { DataShape, HighestDataShape, InferDataShape } from '../datashape.js'
import { highestDataShape } from '../datashape.js'
import { IVExpr, IVOp, isVExpr, isVOp } from './core.js'

import * as litOps from './lit.js'
import { BaseOp } from './base-op.js'



type DT<T extends InferrableJsType | dt.IntoDtype> = T extends InferrableJsType ? dt.InferDtypeFromJs<T> : T extends dt.IntoDtype ? InferDtype<T> : never
/** Convert an expression, op, or JS value to an Op. */
export function toOpValue<T extends IVExpr | IVOp | InferrableJsType>(exprOrJs: T): IVOp<DT<T>, InferDataShape<T>> {
    if (isVOp(exprOrJs)) {
        return exprOrJs as any
    } else if (isVExpr(exprOrJs)) {
        return exprOrJs.toOp() as any
    } else {
        return litOps.litOp(exprOrJs as InferrableJsType) as any
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
// Generic operations
// ---------------------------------------------------------------------------

export class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, S> {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: IVOp<DataType, S>) { super(dt.DTBoolean(), operand.dshape()) }
}

export class IsNullOp<S extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, S> {
    readonly kind = 'is_null' as const
    constructor(readonly operand: IVOp<DataType, S>) { super(dt.DTBoolean(), operand.dshape()) }
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
    constructor(readonly left: IVOp<DataType, S1>, readonly right: IVOp<DataType, S2>) {
        super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>)
    }
}

export class GtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'gt' as const
    constructor(readonly left: IVOp<DataType, S1>, readonly right: IVOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class GteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'gte' as const
    constructor(readonly left: IVOp<DataType, S1>, readonly right: IVOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'lt' as const
    constructor(readonly left: IVOp<DataType, S1>, readonly right: IVOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'lte' as const
    constructor(readonly left: IVOp<DataType, S1>, readonly right: IVOp<DataType, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'min' as const
    constructor(readonly operand: IVOp<T, any>) { super(operand.dtype(), 'scalar') }
}

export class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'max' as const
    constructor(readonly operand: IVOp<T, any>) { super(operand.dtype(), 'scalar') }
}

// ---------------------------------------------------------------------------
// Boolean logic ops
// ---------------------------------------------------------------------------

export class LogicalNotOp<S extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, S> {
    readonly kind = 'not' as const
    constructor(readonly operand: IVOp<dt.DTBoolean, S>) { super(dt.DTBoolean(), operand.dshape()) }
}

export class LogicalAndOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'and' as const
    constructor(readonly left: IVOp<dt.DTBoolean, S1>, readonly right: IVOp<dt.DTBoolean, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LogicalOrOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, S2]>> {
    readonly kind = 'or' as const
    constructor(readonly left: IVOp<dt.DTBoolean, S1>, readonly right: IVOp<dt.DTBoolean, S2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

// ---------------------------------------------------------------------------
// Arithmetic ops
// ---------------------------------------------------------------------------

export class AddOp<
    S1 extends DataShape = DataShape,
    S2 extends DataShape = DataShape,
    D1 extends DataType = DataType,
    D2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly kind = 'add' as const
    constructor(readonly left: IVOp<D1, S1>, readonly right: IVOp<D2, S2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}

export class SubOp<
    S1 extends DataShape = DataShape,
    S2 extends DataShape = DataShape,
    D1 extends DataType = DataType,
    D2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly kind = 'sub' as const
    constructor(readonly left: IVOp<D1, S1>, readonly right: IVOp<D2, S2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}

export class MulOp<
    S1 extends DataShape = DataShape,
    S2 extends DataShape = DataShape,
    D1 extends DataType = DataType,
    D2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly kind = 'mul' as const
    constructor(readonly left: IVOp<D1, S1>, readonly right: IVOp<D2, S2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}

export class DivOp<
    S1 extends DataShape = DataShape,
    S2 extends DataShape = DataShape,
    D1 extends DataType = DataType,
    D2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[D1, D2]>, HighestDataShape<[S1, S2]>> {
    readonly kind = 'div' as const
    constructor(readonly left: IVOp<D1, S1>, readonly right: IVOp<D2, S2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}
export class SumOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'sum' as const
    constructor(readonly operand: IVOp<T, any>) { super(operand.dtype(), 'scalar') }
}

export class MeanOp extends BaseOp<dt.DTFloat64, 'scalar'> {
    readonly kind = 'mean' as const
    constructor(readonly operand: IVOp<any, any>) { super(dt.DTFloat64(), 'scalar') }
}


// ---------------------------------------------------------------------------
// String ops
// ---------------------------------------------------------------------------

export class UpperOp<S extends DataShape = DataShape> extends BaseOp<dt.DTString, S> {
    readonly kind = 'upper' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, S>) { super(dt.DTString(), operand.dshape()) }
}

export class LowerOp<S extends DataShape = DataShape> extends BaseOp<dt.DTString, S> {
    readonly kind = 'lower' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, S>) { super(dt.DTString(), operand.dshape()) }
}

export class ContainsOp<S1 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'contains' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, S1>, readonly pattern: litOps.StringLiteralOp) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), pattern.dshape()) as HighestDataShape<[S1, 'scalar']>) }
}

export class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, S1>, readonly prefix: litOps.StringLiteralOp) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), prefix.dshape()) as HighestDataShape<[S1, 'scalar']>) }
}

// ---------------------------------------------------------------------------
// Date ops
// ---------------------------------------------------------------------------

type TemporalDataType = { typecode: 'date' } | { typecode: 'time' } | { typecode: 'datetime' }

export class TemporalToStringOp<S extends DataShape = DataShape> extends BaseOp<dt.DTString, S> {
    readonly kind = 'temporal_to_string' as const
    constructor(readonly operand: IVOp<TemporalDataType, S>, readonly format: string) { super(dt.DTString(), operand.dshape()) }
}

// ---------------------------------------------------------------------------
// Sort specification
// ---------------------------------------------------------------------------

export class SortSpec {
    constructor(readonly op: IVOp<any, any>, readonly direction: 'asc' | 'desc') { }
}

// ---------------------------------------------------------------------------
// BuiltinOp — discriminated union for exhaustive compiler type-checking
// ---------------------------------------------------------------------------

export type BuiltinVOp =
    | litOps.IntLiteralOp
    | litOps.FloatLiteralOp
    | litOps.StringLiteralOp
    | litOps.BooleanLiteralOp
    | litOps.NullLiteralOp
    | litOps.DatetimeLiteralOp
    | litOps.DateLiteralOp
    | litOps.TimeLiteralOp
    // column reference
    | ColRefOp
    // generic
    | IsNotNullOp
    | IsNullOp
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
