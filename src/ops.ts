import type { DataType, DataShape } from './datatypes.js'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface IOp<T extends DataType = DataType, S extends DataShape = DataShape> {
    readonly kind: string
    readonly dtype: T
    readonly dshape: S
    toOp(): IOp<T, S>
    toExpr(): IExpr<T, S>
}

export interface IExpr<T extends DataType = DataType, S extends DataShape = DataShape> {
    readonly dtype: T
    readonly dshape: S
    toOp(): IOp<T, S>
    toExpr(): IExpr<T, S>
}

// ---------------------------------------------------------------------------
// Registration for toExpr (breaks circular dependency with expr.ts)
// ---------------------------------------------------------------------------

type OpToExprFn = <T extends DataType, S extends DataShape>(op: IOp<T, S>) => IExpr<T, S>
let _opToExpr: OpToExprFn = () => { throw new Error('opToExpr not initialized') }
/** @internal */
export function _registerOpToExpr(fn: OpToExprFn): void { _opToExpr = fn }

// ---------------------------------------------------------------------------
// Base Op class
// ---------------------------------------------------------------------------

export abstract class BaseOp<T extends DataType = DataType, S extends DataShape = DataShape> implements IOp<T, S> {
    abstract readonly kind: string
    readonly dtype: T
    readonly dshape: S
    constructor(dtype: T, dshape: S) {
        this.dtype = dtype
        this.dshape = dshape
    }
    toOp(): this { return this }
    toExpr(): IExpr<T, S> { return _opToExpr(this) }
}

// ---------------------------------------------------------------------------
// Column reference
// ---------------------------------------------------------------------------

export class ColRefOp<N extends string = string, T extends DataType = DataType> extends BaseOp<T, 'columnar'> {
    readonly kind = 'col_ref' as const
    constructor(readonly name: N, dtype: T) { super(dtype, 'columnar') }
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

// ---------------------------------------------------------------------------
// Comparison ops
// ---------------------------------------------------------------------------

export class EqOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'eq' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean', left.dshape as S) }
}

export class GtOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'gt' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean', left.dshape as S) }
}

export class GteOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'gte' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean', left.dshape as S) }
}

export class LtOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'lt' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean', left.dshape as S) }
}

export class LteOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'lte' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean', left.dshape as S) }
}

export class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: IOp<DataType, S>) { super('boolean', operand.dshape) }
}

// ---------------------------------------------------------------------------
// Boolean logic ops
// ---------------------------------------------------------------------------

export class AndOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'and' as const
    constructor(readonly left: IOp<'boolean'>, readonly right: IOp<'boolean'>) { super('boolean', left.dshape as S) }
}

export class OrOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'or' as const
    constructor(readonly left: IOp<'boolean'>, readonly right: IOp<'boolean'>) { super('boolean', left.dshape as S) }
}

// ---------------------------------------------------------------------------
// Arithmetic ops
// ---------------------------------------------------------------------------

export class AddOp<S extends DataShape = DataShape> extends BaseOp<'float64', S> {
    readonly kind = 'add' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64', left.dshape as S) }
}

export class SubOp<S extends DataShape = DataShape> extends BaseOp<'float64', S> {
    readonly kind = 'sub' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64', left.dshape as S) }
}

export class MulOp<S extends DataShape = DataShape> extends BaseOp<'float64', S> {
    readonly kind = 'mul' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64', left.dshape as S) }
}

export class DivOp<S extends DataShape = DataShape> extends BaseOp<'float64', S> {
    readonly kind = 'div' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64', left.dshape as S) }
}

// ---------------------------------------------------------------------------
// String ops
// ---------------------------------------------------------------------------

export class UpperOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'upper' as const
    constructor(readonly operand: IOp<'string'>) { super('string', operand.dshape as S) }
}

export class LowerOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'lower' as const
    constructor(readonly operand: IOp<'string'>) { super('string', operand.dshape as S) }
}

export class ContainsOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'contains' as const
    constructor(readonly operand: IOp<'string'>, readonly pattern: StringLiteralOp) { super('boolean', operand.dshape as S) }
}

export class StartsWithOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IOp<'string'>, readonly prefix: StringLiteralOp) { super('boolean', operand.dshape as S) }
}

// ---------------------------------------------------------------------------
// Date ops
// ---------------------------------------------------------------------------

type TemporalDataType = 'date' | 'time' | 'datetime'

export class TemporalToStringOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'temporal_to_string' as const
    constructor(readonly operand: IOp<TemporalDataType>, readonly format: string) { super('string', operand.dshape as S) }
}

// ---------------------------------------------------------------------------
// Aggregation ops
// ---------------------------------------------------------------------------

export class MeanOp extends BaseOp<'float64', 'scalar'> {
    readonly kind = 'mean' as const
    constructor(readonly operand: IOp) { super('float64', 'scalar') }
}

export class SumOp extends BaseOp<'float64', 'scalar'> {
    readonly kind = 'sum' as const
    constructor(readonly operand: IOp) { super('float64', 'scalar') }
}

export class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'min' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype, 'scalar') }
}

export class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'max' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype, 'scalar') }
}

export class CountOp extends BaseOp<'int64', 'scalar'> {
    readonly kind = 'count' as const
    constructor() { super('int64', 'scalar') }
}

// ---------------------------------------------------------------------------
// Raw SQL
// ---------------------------------------------------------------------------

export class RawSqlOp<T extends DataType = DataType, S extends DataShape = DataShape> extends BaseOp<T, S> {
    readonly kind = 'raw_sql' as const
    constructor(readonly rawSql: string, dtype: T, dshape: S) { super(dtype, dshape) }
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
    | EqOp
    | GtOp
    | GteOp
    | LtOp
    | LteOp
    | IsNotNullOp
    | AndOp
    | OrOp
    | AddOp
    | SubOp
    | MulOp
    | DivOp
    | UpperOp
    | LowerOp
    | ContainsOp
    | StartsWithOp
    | TemporalToStringOp
    | MeanOp
    | SumOp
    | MinOp
    | MaxOp
    | CountOp
    | RawSqlOp