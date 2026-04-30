
import { inferDtypeFromJs, type DataType, type InferrableJsType } from '../datatype.js'
import * as dt from '../datatype.js'
import { type IVOp } from './core.js'
import { BaseOp } from './ops.js'
import { VExpr } from './expr.js'

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

/**
 * Create a scalar value expression that represents a single literal value, eg `ty.lit(42)` or `ty.lit("hello")`.
 * 
 * The dtype can be inferred from the value, or explicitly provided if needed.
 * 
 * Note how `ty.lit("name")` represents a string literal value, which is different from `myrelation.col("name")`, which represents a reference to a column named "name".
 * 
 * @param value The literal value to use.
 * @param dtype The optional data type of the literal. If not provided, it will be inferred from the value.
 * @returns A VExpr representing the literal value.
 */
export function lit<JS extends AcceptableJsVal<DT>, DT extends dt.IntoDtype | undefined = undefined>(value: JS, dtype?: DT): VExpr<ExplicitOrInferredDtype<JS, DT>, 'scalar'> {
    return litOp(value, dtype).toExpr()
}