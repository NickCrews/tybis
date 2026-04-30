import { inferDtypeFromJs, type DataType, type InferDtype, type InferrableJsType } from '../datatype.js'
import * as dt from '../datatype'
import type { DataShape, HighestDataShape, InferDataShape } from '../datashape.js'
import { highestDataShape } from '../datashape.js'
import { IVExpr, IVOp, isVExpr, isVOp, IsVOpSymbol } from './core.js'
import { VExpr, vOpToVExpr } from './expr.js'

// ---------------------------------------------------------------------------
// Base Op class
// ---------------------------------------------------------------------------

export abstract class BaseOp<T extends DataType = DataType, S extends DataShape = DataShape> implements IVOp<T, S> {
    [IsVOpSymbol] = true as const
    abstract readonly kind: string
    private readonly _dtype: T
    private readonly _dshape: S
    constructor(dtype: T, dshape: S) {
        this._dtype = dtype
        this._dshape = dshape
    }
    dtype(): T { return this._dtype }
    dshape(): S { return this._dshape }
    toExpr(): VExpr<T, S> { return vOpToVExpr(this) }
    getName(): string { return this.kind }
}

type DT<T extends InferrableJsType | dt.IntoDtype> = T extends InferrableJsType ? dt.InferDtypeFromJs<T> : T extends dt.IntoDtype ? InferDtype<T> : never
/** Convert an expression, op, or JS value to an Op. */
export function toOpValue<T extends IVExpr | IVOp | InferrableJsType>(exprOrJs: T): IVOp<DT<T>, InferDataShape<T>> {
    if (isVOp(exprOrJs)) {
        return exprOrJs as any
    } else if (isVExpr(exprOrJs)) {
        return exprOrJs.toOp() as any
    } else {
        return litOp(exprOrJs as InferrableJsType) as any
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

type IntoIntLiteralValue = number | `${number}`
function ensureIntLiteralValue(value: IntoIntLiteralValue): number {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value
    } else if (typeof value === 'string') {
        const parsed = parseInt(value, 10)
        if (!isNaN(parsed)) {
            return parsed
        }
    }
    throw new Error(`Cannot convert ${typeof value} '${value}' to int literal`)
}
export class IntLiteralOp<T extends dt.DTInt = dt.DTInt> extends BaseOp<T, 'scalar'> {
    readonly kind = 'int_literal' as const
    readonly value: number
    constructor(readonly raw: IntoIntLiteralValue, dtype: T = dt.DTInt(64) as T) {
        super(dtype, 'scalar')
        this.value = ensureIntLiteralValue(raw)
    }
}

type IntoFloatLiteralValue = number | `${number}` | 'NAN' | 'nan' | 'NaN'
function ensureFloatLiteralValue(value: IntoFloatLiteralValue): number {
    if (typeof value === 'number') {
        return value
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'nan') {
            return NaN
        } else {
            const parsed = parseFloat(value)
            if (!isNaN(parsed)) {
                return parsed
            }
        }
    }
    throw new Error(`Cannot convert ${typeof value} '${value}' to float literal`)
}
export class FloatLiteralOp<T extends dt.DTFloat = dt.DTFloat> extends BaseOp<T, 'scalar'> {
    readonly kind = 'float_literal' as const
    readonly value: number
    constructor(readonly raw: IntoFloatLiteralValue, dtype: T = dt.DTFloat(64) as T) {
        super(dtype, 'scalar')
        this.value = ensureFloatLiteralValue(raw)
    }
}

type IntoStringLiteralValue = string | boolean | number | null | Date
function ensureStringLiteralValue(value: IntoStringLiteralValue): string {
    if (typeof value === 'string') {
        return value
    } else if (typeof value === 'boolean' || typeof value === 'number') {
        return String(value)
    } else if (value === null) {
        return 'null'
    } else if (value instanceof Date) {
        return value.toISOString()
    } else {
        throw new Error(`Cannot convert ${typeof value} ${value} to string literal`)
    }
}
export class StringLiteralOp extends BaseOp<dt.DTString, 'scalar'> {
    readonly kind = 'string_literal' as const
    readonly value: string
    constructor(readonly raw: IntoStringLiteralValue) {
        super(dt.DTString(), 'scalar')
        this.value = ensureStringLiteralValue(raw)
    }
}

type IntoBooleanLiteralValue = boolean | number | null | 'true' | 'false'
function ensureBooleanLiteralValue(value: IntoBooleanLiteralValue): boolean {
    if (typeof value === 'boolean') {
        return value
    } else if (typeof value === 'number') {
        return value !== 0
    } else if (value === 'true') {
        return true
    } else if (value === 'false') {
        return false
    } else if (value === null) {
        return false
    } else {
        throw new Error(`Cannot convert ${typeof value} '${value}' to boolean literal`)
    }
}
export class BooleanLiteralOp extends BaseOp<dt.DTBoolean, 'scalar'> {
    readonly kind = 'boolean_literal' as const
    readonly value: boolean
    constructor(readonly raw: IntoBooleanLiteralValue) {
        super(dt.DTBoolean(), 'scalar')
        this.value = ensureBooleanLiteralValue(raw)
    }
}

export class NullLiteralOp extends BaseOp<dt.DTNull, 'scalar'> {
    readonly kind = 'null_literal' as const
    constructor() { super(dt.DTNull(), 'scalar') }
}

type IntoDatetimeLiteralValue = Date | string
function ensureDatetimeLiteralValue(value: IntoDatetimeLiteralValue): Date {
    if (value instanceof Date) {
        return value
    } else if (typeof value === 'string') {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date string: ${value}`)
        }
        return date
    } else {
        throw new Error(`Cannot convert ${typeof value} '${value}' to datetime literal`)
    }
}
export class DatetimeLiteralOp extends BaseOp<dt.DTDateTime, 'scalar'> {
    readonly kind = 'datetime_literal' as const
    readonly value: Date
    constructor(readonly raw: IntoDatetimeLiteralValue) {
        super(dt.DTDateTime(), 'scalar')
        this.value = ensureDatetimeLiteralValue(raw)
    }
}

type IntoDateLiteralValue = Date | string
function ensureDateLiteralValue(value: IntoDateLiteralValue): Date {
    if (value instanceof Date) {
        return value
    } else if (typeof value === 'string') {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date string: ${value}`)
        }
        return date
    } else {
        throw new Error(`Cannot convert ${typeof value} '${value}' to date literal`)
    }
}
export class DateLiteralOp extends BaseOp<dt.DTDate, 'scalar'> {
    readonly kind = 'date_literal' as const
    readonly value: Date
    constructor(readonly raw: IntoDateLiteralValue) {
        super(dt.DTDate(), 'scalar')
        this.value = ensureDateLiteralValue(raw)
    }
}

type IntoTimeLiteralValue = Date | string
function ensureTimeLiteralValue(value: IntoTimeLiteralValue): Date {
    if (value instanceof Date) {
        return value
    } else if (typeof value === 'string') {
        const date = new Date(`1970-01-01T${value}Z`)
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid time string: ${value}`)
        }
        return date
    } else {
        throw new Error(`Cannot convert ${typeof value} '${value}' to time literal`)
    }
}
export class TimeLiteralOp extends BaseOp<dt.DTTime, 'scalar'> {
    readonly kind = 'time_literal' as const
    readonly value: Date
    constructor(readonly raw: IntoTimeLiteralValue) {
        super(dt.DTTime(), 'scalar')
        this.value = ensureTimeLiteralValue(raw)
    }
}

type IntoIntervalLiteralValue = number
function ensureIntervalLiteralValue(value: IntoIntervalLiteralValue): number {
    if (typeof value === 'number') {
        return value
    }
    throw new Error(`Cannot convert ${typeof value} '${value}' to interval literal`)
}
export class IntervalLiteralOp extends BaseOp<dt.DTInterval, 'scalar'> {
    readonly kind = 'interval_literal' as const
    readonly value: number
    constructor(readonly raw: IntoIntervalLiteralValue) {
        super(dt.DTInterval(), 'scalar')
        this.value = ensureIntervalLiteralValue(raw)
    }
}

type IntoUuidLiteralValue = string
function ensureUuidLiteralValue(value: IntoUuidLiteralValue): string {
    if (typeof value === 'string') {
        // Simple regex check for UUID format (not fully RFC compliant, but good enough for basic validation)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(value)) {
            return value
        } else {
            throw new Error(`Invalid UUID string: ${value}`)
        }
    }
    throw new Error(`Cannot convert ${typeof value} '${value}' to UUID literal`)
}
export class UuidLiteralOp extends BaseOp<dt.DTUUID, 'scalar'> {
    readonly kind = 'uuid_literal' as const
    readonly value: string
    constructor(readonly raw: IntoUuidLiteralValue) {
        super(dt.DTUUID(), 'scalar')
        this.value = ensureUuidLiteralValue(raw)
    }
}

export type LiteralValueCoercibleTo<T extends DataType> =
    T extends dt.DTInt ? IntoIntLiteralValue :
    T extends dt.DTFloat ? IntoFloatLiteralValue :
    T extends dt.DTString ? IntoStringLiteralValue :
    T extends dt.DTBoolean ? IntoBooleanLiteralValue :
    T extends dt.DTDateTime ? IntoDatetimeLiteralValue :
    T extends dt.DTDate ? IntoDateLiteralValue :
    T extends dt.DTTime ? IntoTimeLiteralValue :
    T extends dt.DTInterval ? IntoIntervalLiteralValue :
    T extends dt.DTUUID ? IntoUuidLiteralValue :
    never

export type AcceptableJsVal<DT extends dt.IntoDtype | undefined = undefined> = DT extends dt.IntoDtype ? LiteralValueCoercibleTo<dt.InferDtype<DT>> : InferrableJsType
export type ExplicitOrInferredDtype<JS extends InferrableJsType, DT extends dt.IntoDtype | undefined> = DT extends dt.IntoDtype ? dt.InferDtype<DT> : dt.InferDtypeFromJs<JS>

/** Create a literal Op from a JS value. */
export function litOp<JS extends AcceptableJsVal<DT>, DT extends dt.IntoDtype | undefined = undefined>(value: JS, dtype?: DT): IVOp<ExplicitOrInferredDtype<JS, DT>, 'scalar'> {
    const finalDtype = dtype ? dt.dtype(dtype) : inferDtypeFromJs(value)
    type R = IVOp<ExplicitOrInferredDtype<JS, DT>, 'scalar'>
    const tc = finalDtype.typecode
    switch (tc) {
        case 'null':
            return new NullLiteralOp() as unknown as R
        case 'string':
            return new StringLiteralOp(value as IntoStringLiteralValue) as unknown as R
        case 'boolean':
            return new BooleanLiteralOp(value as IntoBooleanLiteralValue) as unknown as R
        case 'int':
            return new IntLiteralOp(value as IntoIntLiteralValue, finalDtype) as unknown as R
        case 'float':
            return new FloatLiteralOp(value as IntoFloatLiteralValue, finalDtype) as unknown as R
        case 'datetime':
            return new DatetimeLiteralOp(value as IntoDatetimeLiteralValue) as unknown as R
        case 'date':
            return new DateLiteralOp(value as IntoDateLiteralValue) as unknown as R
        case 'time':
            return new TimeLiteralOp(value as IntoTimeLiteralValue) as unknown as R
        case 'interval':
            return new IntervalLiteralOp(value as IntoIntervalLiteralValue) as unknown as R
        case 'uuid':
            return new UuidLiteralOp(value as IntoUuidLiteralValue) as unknown as R
        default:
            throw new Error(`Unsupported JS value type: ${tc satisfies never}`)
    }
}



// ---------------------------------------------------------------------------
// Generic operations
// ---------------------------------------------------------------------------

export class IsNotNullOp<S extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, S> {
    readonly kind = 'is_not_null' as const
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
    constructor(readonly operand: IVOp<{ typecode: 'string' }, S1>, readonly pattern: StringLiteralOp) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), pattern.dshape()) as HighestDataShape<[S1, 'scalar']>) }
}

export class StartsWithOp<S1 extends DataShape = DataShape> extends BaseOp<dt.DTBoolean, HighestDataShape<[S1, 'scalar']>> {
    readonly kind = 'starts_with' as const
    constructor(readonly operand: IVOp<{ typecode: 'string' }, S1>, readonly prefix: StringLiteralOp) { super(dt.DTBoolean(), highestDataShape(operand.dshape(), prefix.dshape()) as HighestDataShape<[S1, 'scalar']>) }
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
