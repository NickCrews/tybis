import type { DataType } from './datatypes.js'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface IOp<T extends DataType = DataType> {
    readonly kind: string
    readonly dtype: T
    toOp(): IOp<T>
    toExpr(): IExpr<T>
}

export interface IExpr<T extends DataType = DataType> {
    readonly dtype: T
    toOp(): IOp<T>
    toExpr(): IExpr<T>
}

// ---------------------------------------------------------------------------
// Registration for toExpr (breaks circular dependency with expr.ts)
// ---------------------------------------------------------------------------

type OpToExprFn = <T extends DataType>(op: IOp<T>) => IExpr<T>
let _opToExpr: OpToExprFn = () => { throw new Error('opToExpr not initialized') }
/** @internal */
export function _registerOpToExpr(fn: OpToExprFn): void { _opToExpr = fn }

// ---------------------------------------------------------------------------
// Base Op class
// ---------------------------------------------------------------------------

export abstract class BaseOp<T extends DataType = DataType> implements IOp<T> {
    abstract readonly kind: string
    readonly dtype: T
    constructor(dtype: T) { this.dtype = dtype }
    toOp(): this { return this }
    toExpr(): IExpr<T> { return _opToExpr(this) }
}

// ---------------------------------------------------------------------------
// Column reference
// ---------------------------------------------------------------------------

export class ColRefOp<N extends string = string, T extends DataType = DataType> extends BaseOp<T> {
    readonly kind = 'col_ref' as const
    constructor(readonly name: N, dtype: T) { super(dtype) }
}

// ---------------------------------------------------------------------------
// Literals
// ---------------------------------------------------------------------------

export class NumberLiteralOp extends BaseOp<'float64'> {
    readonly kind = 'number_literal' as const
    constructor(readonly value: number) { super('float64') }
}

export class StringLiteralOp extends BaseOp<'string'> {
    readonly kind = 'string_literal' as const
    constructor(readonly value: string) { super('string') }
}

export class BooleanLiteralOp extends BaseOp<'boolean'> {
    readonly kind = 'boolean_literal' as const
    constructor(readonly value: boolean) { super('boolean') }
}

export class NullLiteralOp extends BaseOp<'string'> {
    readonly kind = 'null_literal' as const
    constructor() { super('string') }
}

export class DatetimeLiteralOp extends BaseOp<'datetime'> {
    readonly kind = 'datetime_literal' as const
    constructor(readonly value: Date) { super('datetime') }
}

// ---------------------------------------------------------------------------
// Comparison ops
// ---------------------------------------------------------------------------

export class EqOp extends BaseOp<'boolean'> {
    readonly kind = 'eq' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean') }
}

export class GtOp extends BaseOp<'boolean'> {
    readonly kind = 'gt' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean') }
}

export class GteOp extends BaseOp<'boolean'> {
    readonly kind = 'gte' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean') }
}

export class LtOp extends BaseOp<'boolean'> {
    readonly kind = 'lt' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean') }
}

export class LteOp extends BaseOp<'boolean'> {
    readonly kind = 'lte' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('boolean') }
}

export class IsNotNullOp extends BaseOp<'boolean'> {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: IOp) { super('boolean') }
}

// ---------------------------------------------------------------------------
// Boolean logic ops
// ---------------------------------------------------------------------------

export class AndOp extends BaseOp<'boolean'> {
    readonly kind = 'and' as const
    constructor(readonly left: IOp<'boolean'>, readonly right: IOp<'boolean'>) { super('boolean') }
}

export class OrOp extends BaseOp<'boolean'> {
    readonly kind = 'or' as const
    constructor(readonly left: IOp<'boolean'>, readonly right: IOp<'boolean'>) { super('boolean') }
}

// ---------------------------------------------------------------------------
// Arithmetic ops
// ---------------------------------------------------------------------------

export class AddOp extends BaseOp<'float64'> {
    readonly kind = 'add' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64') }
}

export class SubOp extends BaseOp<'float64'> {
    readonly kind = 'sub' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64') }
}

export class MulOp extends BaseOp<'float64'> {
    readonly kind = 'mul' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64') }
}

export class DivOp extends BaseOp<'float64'> {
    readonly kind = 'div' as const
    constructor(readonly left: IOp, readonly right: IOp) { super('float64') }
}

// ---------------------------------------------------------------------------
// String ops
// ---------------------------------------------------------------------------

export class UpperOp extends BaseOp<'string'> {
    readonly kind = 'upper' as const
    constructor(readonly operand: IOp<'string'>) { super('string') }
}

export class LowerOp extends BaseOp<'string'> {
    readonly kind = 'lower' as const
    constructor(readonly operand: IOp<'string'>) { super('string') }
}

export class ContainsOp extends BaseOp<'boolean'> {
    readonly kind = 'contains' as const
    constructor(readonly operand: IOp<'string'>, readonly pattern: StringLiteralOp) { super('boolean') }
}

export class StartsWithOp extends BaseOp<'boolean'> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IOp<'string'>, readonly prefix: StringLiteralOp) { super('boolean') }
}

// ---------------------------------------------------------------------------
// Aggregation ops
// ---------------------------------------------------------------------------

export class MeanOp extends BaseOp<'float64'> {
    readonly kind = 'mean' as const
    constructor(readonly operand: IOp) { super('float64') }
}

export class SumOp extends BaseOp<'float64'> {
    readonly kind = 'sum' as const
    constructor(readonly operand: IOp) { super('float64') }
}

export class MinOp<T extends DataType = DataType> extends BaseOp<T> {
    readonly kind = 'min' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype) }
}

export class MaxOp<T extends DataType = DataType> extends BaseOp<T> {
    readonly kind = 'max' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype) }
}

export class CountOp extends BaseOp<'int64'> {
    readonly kind = 'count' as const
    constructor() { super('int64') }
}

// ---------------------------------------------------------------------------
// Raw SQL
// ---------------------------------------------------------------------------

export class RawSqlOp<T extends DataType = DataType> extends BaseOp<T> {
    readonly kind = 'raw_sql' as const
    constructor(readonly rawSql: string, dtype: T) { super(dtype) }
}

// ---------------------------------------------------------------------------
// Agg wrapper — marks an inner op as an aggregation result
// ---------------------------------------------------------------------------

export class AggOp<T extends DataType = DataType> extends BaseOp<T> {
    readonly kind = 'agg' as const
    constructor(readonly inner: IOp, dtype: T) { super(dtype) }
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
    | MeanOp
    | SumOp
    | MinOp
    | MaxOp
    | CountOp
    | RawSqlOp
    | AggOp