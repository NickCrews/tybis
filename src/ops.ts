import { inferDtype, type DataType, type InferDtype, type JsType } from './datatypes.js'
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

/** Convert an expression, op, or JS value to an Op. */
export function toOpValue<T extends IExpr | IOp | JsType>(exprOrJs: T): IOp<InferDtype<T>, InferDataShape<T>> {
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

export class ColRefOp<N extends string = string, T extends DataType = DataType> extends BaseOp<T, 'columnar'> {
    readonly kind = 'col_ref' as const
    constructor(readonly name: N, dtype: T) { super(dtype, 'columnar') }
    getName(): string { return this.name }
}

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

export class NumberLiteralOp extends BaseOp<'float64', 'scalar'> {
    readonly kind = 'number_literal' as const
    constructor(readonly value: number) { super('float64', 'scalar') }
}

export class StringLiteralOp extends BaseOp<'string', 'scalar'> {
    readonly kind = 'string_literal' as const
    constructor(readonly value: string) { super('string', 'scalar') }
}

export class BooleanLiteralOp extends BaseOp<'boolean', 'scalar'> {
    readonly kind = 'boolean_literal' as const
    constructor(readonly value: boolean) { super('boolean', 'scalar') }
}

export class NullLiteralOp extends BaseOp<'string', 'scalar'> {
    readonly kind = 'null_literal' as const
    constructor() { super('string', 'scalar') }
}

export class DatetimeLiteralOp extends BaseOp<'datetime', 'scalar'> {
    readonly kind = 'datetime_literal' as const
    constructor(readonly value: Date) { super('datetime', 'scalar') }
}

export class DateLiteralOp extends BaseOp<'date', 'scalar'> {
    readonly kind = 'date_literal' as const
    constructor(readonly value: Date) { super('date', 'scalar') }
}

export class TimeLiteralOp extends BaseOp<'time', 'scalar'> {
    readonly kind = 'time_literal' as const
    constructor(readonly value: Date) { super('time', 'scalar') }
}

/** Create a literal Op from a JS value. */
export function litOp<JS extends JsType>(value: JS): IOp<InferDtype<JS>, 'scalar'> {
    const inferredDtype = inferDtype(value)
    type R = IOp<InferDtype<JS>, 'scalar'>
    switch (inferredDtype) {
        case 'string':
            return new StringLiteralOp(value as string) as unknown as R
        case 'boolean':
            return new BooleanLiteralOp(value as boolean) as unknown as R
        case 'float64':
            return new NumberLiteralOp(value as number) as unknown as R
        case 'datetime':
            return new DatetimeLiteralOp(value as Date) as unknown as R
        case 'date':
            return new DateLiteralOp(value as Date) as unknown as R
        case 'time':
            return new TimeLiteralOp(value as Date) as unknown as R
        default:
            throw new Error(`Unsupported JS value type: ${inferredDtype satisfies never}`)
    }
}

// ---------------------------------------------------------------------------
// Generic operations
// ---------------------------------------------------------------------------

export class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: IOp<DataType, S>) { super('boolean', operand.dshape()) }
}

export class CountOp extends BaseOp<'int64', 'scalar'> {
    readonly kind = 'count' as const
    constructor() { super('int64', 'scalar') }
}
export class RawSqlOp<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseOp<T, S> {
    readonly kind = 'raw_sql' as const
    constructor(readonly rawSql: string, dtype: T, dshape: S) { super(dtype, dshape) }
}

// ---------------------------------------------------------------------------
// Comparison ops
// ---------------------------------------------------------------------------

export class EqOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'eq' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class GtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'gt' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class GteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'gte' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'lt' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'lte' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'min' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype(), 'scalar') }
}

export class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'max' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype(), 'scalar') }
}

// ---------------------------------------------------------------------------
// Boolean logic ops
// ---------------------------------------------------------------------------

export class LogicalNotOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'not' as const
    constructor(readonly operand: IOp<'boolean', S>) { super('boolean', operand.dshape()) }
}

export class LogicalAndOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'and' as const
    constructor(readonly left: IOp<'boolean', S1>, readonly right: IOp<'boolean', S2>) { super('boolean', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class LogicalOrOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'or' as const
    constructor(readonly left: IOp<'boolean', S1>, readonly right: IOp<'boolean', S2>) { super('boolean', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

// ---------------------------------------------------------------------------
// Arithmetic ops
// ---------------------------------------------------------------------------

export class AddOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'add' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class SubOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'sub' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class MulOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'mul' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}

export class DivOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'div' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape(), right.dshape()) as HighestDataShape<[S1, S2]>) }
}
export class SumOp extends BaseOp<'float64', 'scalar'> {
    readonly kind = 'sum' as const
    constructor(readonly operand: IOp) { super('float64', 'scalar') }
}

export class MeanOp extends BaseOp<'float64', 'scalar'> {
    readonly kind = 'mean' as const
    constructor(readonly operand: IOp) { super('float64', 'scalar') }
}


// ---------------------------------------------------------------------------
// String ops
// ---------------------------------------------------------------------------

export class UpperOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'upper' as const
    constructor(readonly operand: IOp<'string', S>) { super('string', operand.dshape()) }
}

export class LowerOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'lower' as const
    constructor(readonly operand: IOp<'string', S>) { super('string', operand.dshape()) }
}

export class ContainsOp<S1 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'contains' as const
    constructor(readonly operand: IOp<'string', S1>, readonly pattern: StringLiteralOp) { super('boolean', highestDataShape(operand.dshape(), pattern.dshape()) as HighestDataShape<[S1, 'scalar']>) }
}

export class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IOp<'string', S1>, readonly prefix: StringLiteralOp) { super('boolean', highestDataShape(operand.dshape(), prefix.dshape()) as HighestDataShape<[S1, 'scalar']>) }
}

// ---------------------------------------------------------------------------
// Date ops
// ---------------------------------------------------------------------------

type TemporalDataType = 'date' | 'time' | 'datetime'

export class TemporalToStringOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'temporal_to_string' as const
    constructor(readonly operand: IOp<TemporalDataType, S>, readonly format: string) { super('string', operand.dshape()) }
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
    | NumberLiteralOp
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