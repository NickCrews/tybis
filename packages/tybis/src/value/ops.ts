import { type DataType, type InferDtype, type InferrableJsType } from '../datatype.js'
import * as dt from '../datatype.js'
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

export class ColRefOp<N extends string = string, DT extends dt.IntoDtype = DataType> extends BaseOp<dt.InferDtype<DT>, 'columnar'> {
    readonly kind = 'col_ref' as const
    constructor(readonly name: N, dtype: DT) { super(dt.dtype(dtype), 'columnar') }
    getName(): string { return this.name }
}

// ---------------------------------------------------------------------------
// Generic operations
// ---------------------------------------------------------------------------

export class IsNotNullOp<DS extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, DS> {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: IVOp<DataType, DS>) { super(dt.DTBoolean(), operand.dshape()) }
}

export class IsNullOp<DS extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, DS> {
    readonly kind = 'is_null' as const
    constructor(readonly operand: IVOp<DataType, DS>) { super(dt.DTBoolean(), operand.dshape()) }
}

export class CountOp extends BaseOp<dt.DTInt<64>, 'scalar'> {
    readonly kind = 'count' as const
    constructor() { super(dt.DTInt64(), 'scalar') }
}
export class RawSqlOp<DT extends DataType = DataType, DS extends DataShape = DataShape> extends BaseOp<DT, DS> {
    readonly kind = 'raw_sql' as const
    constructor(readonly rawSql: string, dtype: DT, dshape: DS) { super(dtype, dshape) }
}

// ---------------------------------------------------------------------------
// Comparison ops
// ---------------------------------------------------------------------------

export class EqOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'eq' as const
    constructor(readonly left: IVOp<DataType, DS1>, readonly right: IVOp<DataType, DS2>) {
        super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[DS1, DS2]>)
    }
}

export class GtOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'gt' as const
    constructor(readonly left: IVOp<DataType, DS1>, readonly right: IVOp<DataType, DS2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[DS1, DS2]>) }
}

export class GteOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'gte' as const
    constructor(readonly left: IVOp<DataType, DS1>, readonly right: IVOp<DataType, DS2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[DS1, DS2]>) }
}

export class LtOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'lt' as const
    constructor(readonly left: IVOp<DataType, DS1>, readonly right: IVOp<DataType, DS2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[DS1, DS2]>) }
}

export class LteOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'lte' as const
    constructor(readonly left: IVOp<DataType, DS1>, readonly right: IVOp<DataType, DS2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[DS1, DS2]>) }
}

export class MinOp<DT extends DataType = DataType> extends BaseOp<DT, 'scalar'> {
    readonly kind = 'min' as const
    constructor(readonly operand: IVOp<DT, any>) { super(operand.dtype(), 'scalar') }
}

export class MaxOp<DT extends DataType = DataType> extends BaseOp<DT, 'scalar'> {
    readonly kind = 'max' as const
    constructor(readonly operand: IVOp<DT, any>) { super(operand.dtype(), 'scalar') }
}

// ---------------------------------------------------------------------------
// Boolean logic ops
// ---------------------------------------------------------------------------

export class LogicalNotOp<DS extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, DS> {
    readonly kind = 'not' as const
    constructor(readonly operand: IVOp<dt.DTBoolean, DS>) { super(dt.DTBoolean(), operand.dshape()) }
}

export class LogicalAndOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'and' as const
    constructor(readonly left: IVOp<dt.DTBoolean, DS1>, readonly right: IVOp<dt.DTBoolean, DS2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[DS1, DS2]>) }
}

export class LogicalOrOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'or' as const
    constructor(readonly left: IVOp<dt.DTBoolean, DS1>, readonly right: IVOp<dt.DTBoolean, DS2>) { super(dt.DTBoolean(), highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[DS1, DS2]>) }
}

// ---------------------------------------------------------------------------
// Arithmetic ops
// ---------------------------------------------------------------------------

export class AddOp<
    DS1 extends DataShape = DataShape,
    DS2 extends DataShape = DataShape,
    DT1 extends DataType = DataType,
    DT2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'add' as const
    constructor(readonly left: IVOp<DT1, DS1>, readonly right: IVOp<DT2, DS2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}

export class SubOp<
    DS1 extends DataShape = DataShape,
    DS2 extends DataShape = DataShape,
    DT1 extends DataType = DataType,
    DT2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'sub' as const
    constructor(readonly left: IVOp<DT1, DS1>, readonly right: IVOp<DT2, DS2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}

export class MulOp<
    DS1 extends DataShape = DataShape,
    DS2 extends DataShape = DataShape,
    DT1 extends DataType = DataType,
    DT2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'mul' as const
    constructor(readonly left: IVOp<DT1, DS1>, readonly right: IVOp<DT2, DS2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}

export class DivOp<
    DS1 extends DataShape = DataShape,
    DS2 extends DataShape = DataShape,
    DT1 extends DataType = DataType,
    DT2 extends DataType = DataType,
> extends BaseOp<dt.HighestDataType<[DT1, DT2]>, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'div' as const
    constructor(readonly left: IVOp<DT1, DS1>, readonly right: IVOp<DT2, DS2>) {
        super(
            dt.highestDataType(left.dtype(), right.dtype()),
            highestDataShape(left.dshape(), right.dshape()),
        )
    }
}
export class SumOp<DT extends DataType = DataType> extends BaseOp<DT, 'scalar'> {
    readonly kind = 'sum' as const
    constructor(readonly operand: IVOp<DT, any>) { super(operand.dtype(), 'scalar') }
}

export class MeanOp extends BaseOp<dt.DTFloat64, 'scalar'> {
    readonly kind = 'mean' as const
    constructor(readonly operand: IVOp<any, any>) { super(dt.DTFloat64(), 'scalar') }
}


// ---------------------------------------------------------------------------
// String ops
// ---------------------------------------------------------------------------

export class UpperOp<DS extends DataShape = DataShape> extends BaseOp<dt.DTString, DS> {
    readonly kind = 'upper' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, DS>) { super(dt.DTString(), operand.dshape()) }
}

export class LowerOp<DS extends DataShape = DataShape> extends BaseOp<dt.DTString, DS> {
    readonly kind = 'lower' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, DS>) { super(dt.DTString(), operand.dshape()) }
}

export class ContainsOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'contains' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, DS1>, readonly pattern: IVOp<{ typecode: 'string' }, DS2>) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), pattern.dshape())) }
}

export class StartsWithOp<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, DS1>, readonly prefix: IVOp<{ typecode: 'string' }, DS2>) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), prefix.dshape())) }
}

// ---------------------------------------------------------------------------
// Date ops
// ---------------------------------------------------------------------------

type TemporalDataType = { typecode: 'date' } | { typecode: 'time' } | { typecode: 'datetime' }

export class TemporalToStringOp<DS extends DataShape = DataShape> extends BaseOp<dt.DTString, DS> {
    readonly kind = 'temporal_to_string' as const
    constructor(readonly operand: IVOp<TemporalDataType, DS>, readonly format: string) { super(dt.DTString(), operand.dshape()) }
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
