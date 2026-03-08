import type { DataType } from './datatypes.js'
import type { DataShape, HighestDataShape } from './datashape.js'
import { highestDataShape } from './datashape.js'
import { IOp, IExpr, IsOpSymbol, IsExprSymbol } from './core.js'


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
    [IsOpSymbol] = true
    abstract readonly kind: string
    readonly dtype: T
    readonly dshape: S
    constructor(dtype: T, dshape: S) {
        this.dtype = dtype
        this.dshape = dshape
    }
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
// Generic operations
// ---------------------------------------------------------------------------

export class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'is_not_null' as const
    constructor(readonly operand: IOp<DataType, S>) { super('boolean', operand.dshape) }
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
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class GtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'gt' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class GteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'gte' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class LtOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'lt' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class LteOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'lte' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('boolean', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class MinOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'min' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype, 'scalar') }
}

export class MaxOp<T extends DataType = DataType> extends BaseOp<T, 'scalar'> {
    readonly kind = 'max' as const
    constructor(readonly operand: IOp<T>) { super(operand.dtype, 'scalar') }
}

// ---------------------------------------------------------------------------
// Boolean logic ops
// ---------------------------------------------------------------------------

export class LogicalNotOp<S extends DataShape = DataShape> extends BaseOp<'boolean', S> {
    readonly kind = 'not' as const
    constructor(readonly operand: IOp<'boolean', S>) { super('boolean', operand.dshape) }
}

export class LogicalAndOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'and' as const
    constructor(readonly left: IOp<'boolean', S1>, readonly right: IOp<'boolean', S2>) { super('boolean', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class LogicalOrOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, S2]>> {
    readonly kind = 'or' as const
    constructor(readonly left: IOp<'boolean', S1>, readonly right: IOp<'boolean', S2>) { super('boolean', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

// ---------------------------------------------------------------------------
// Arithmetic ops
// ---------------------------------------------------------------------------

export class AddOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'add' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class SubOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'sub' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class MulOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'mul' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
}

export class DivOp<S1 extends DataShape = DataShape, S2 extends DataShape = DataShape> extends BaseOp<'float64', HighestDataShape<[S1, S2]>> {
    readonly kind = 'div' as const
    constructor(readonly left: IOp<DataType, S1>, readonly right: IOp<DataType, S2>) { super('float64', highestDataShape(left.dshape, right.dshape) as HighestDataShape<[S1, S2]>) }
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
    constructor(readonly operand: IOp<'string', S>) { super('string', operand.dshape) }
}

export class LowerOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'lower' as const
    constructor(readonly operand: IOp<'string', S>) { super('string', operand.dshape) }
}

export class ContainsOp<S1 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'contains' as const
    constructor(readonly operand: IOp<'string', S1>, readonly pattern: StringLiteralOp) { super('boolean', highestDataShape(operand.dshape, pattern.dshape) as HighestDataShape<[S1, 'scalar']>) }
}

export class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<'boolean', HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IOp<'string', S1>, readonly prefix: StringLiteralOp) { super('boolean', highestDataShape(operand.dshape, prefix.dshape) as HighestDataShape<[S1, 'scalar']>) }
}

// ---------------------------------------------------------------------------
// Date ops
// ---------------------------------------------------------------------------

type TemporalDataType = 'date' | 'time' | 'datetime'

export class TemporalToStringOp<S extends DataShape = DataShape> extends BaseOp<'string', S> {
    readonly kind = 'temporal_to_string' as const
    constructor(readonly operand: IOp<TemporalDataType, S>, readonly format: string) { super('string', operand.dshape) }
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