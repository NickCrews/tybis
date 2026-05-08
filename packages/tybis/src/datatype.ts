import { type IVExpr, type IVOp, isVExpr, isVOp } from "./value/core"

export interface DTNull { typecode: 'null', nullable: boolean }
export function DTNull(opts?: { nullable?: boolean }): DTNull { return { typecode: 'null', nullable: opts?.nullable ?? true } }
export interface DTString { typecode: 'string', nullable: boolean }
export function DTString(opts?: { nullable?: boolean }): DTString { return { typecode: 'string', nullable: opts?.nullable ?? true } }
export interface DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> { typecode: 'int', size: S, nullable: boolean }
export function DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S, opts?: { nullable?: boolean }): DTInt<S> { return { typecode: 'int', size, nullable: opts?.nullable ?? true } }
export interface DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> { typecode: 'float', size: S, nullable: boolean }
export function DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S, opts?: { nullable?: boolean }): DTFloat<S> { return { typecode: 'float', size, nullable: opts?.nullable ?? true } }
export interface DTBoolean { typecode: 'boolean', nullable: boolean }
export function DTBoolean(opts?: { nullable?: boolean }): DTBoolean { return { typecode: 'boolean', nullable: opts?.nullable ?? true } }
export interface DTDate { typecode: 'date', nullable: boolean }
export function DTDate(opts?: { nullable?: boolean }): DTDate { return { typecode: 'date', nullable: opts?.nullable ?? true } }
export interface DTTime { typecode: 'time', nullable: boolean }
export function DTTime(opts?: { nullable?: boolean }): DTTime { return { typecode: 'time', nullable: opts?.nullable ?? true } }
export interface DTDateTime { typecode: 'datetime', nullable: boolean }
export function DTDateTime(opts?: { nullable?: boolean }): DTDateTime { return { typecode: 'datetime', nullable: opts?.nullable ?? true } }
export interface DTInterval { typecode: 'interval', nullable: boolean }
export function DTInterval(opts?: { nullable?: boolean }): DTInterval { return { typecode: 'interval', nullable: opts?.nullable ?? true } }
export interface DTUUID { typecode: 'uuid', nullable: boolean }
export function DTUUID(opts?: { nullable?: boolean }): DTUUID { return { typecode: 'uuid', nullable: opts?.nullable ?? true } }
export interface DTCustom { typecode: 'custom', meta: unknown, nullable: boolean }
export function DTCustom(meta: unknown, opts?: { nullable?: boolean }): DTCustom { return { typecode: 'custom', meta, nullable: opts?.nullable ?? true } }

export type NumericDataType = DTInt | DTFloat

export type DataType =
    | DTNull
    | DTString
    | DTInt
    | DTFloat
    | DTBoolean
    | DTDate
    | DTTime
    | DTDateTime
    | DTInterval
    | DTUUID
    | DTCustom

type DTypeShorthands =
    | Exclude<DataType['typecode'], 'custom'>
    | 'int8' | 'int16' | 'int32' | 'int64'
    | 'float8' | 'float16' | 'float32' | 'float64'

/**
 * Check if a value is a valid DataType, eg {typecode: 'string'}, {typecode: 'int', size: 32}, etc.
 */
export function isValidDataType(datatype: any): datatype is DataType {
    if (!datatype || typeof datatype !== 'object' || typeof datatype.typecode !== 'string') {
        return false
    }
    const typecode = datatype.typecode as DataType['typecode']
    switch (typecode) {
        case 'null':
        case 'string':
        case 'boolean':
        case 'date':
        case 'time':
        case 'datetime':
        case 'interval':
        case 'uuid':
            return true
        case 'int':
            return datatype.size === 8 || datatype.size === 16 || datatype.size === 32 || datatype.size === 64
        case 'float':
            return datatype.size === 8 || datatype.size === 16 || datatype.size === 32 || datatype.size === 64
        case 'custom':
            return 'meta' in datatype
        default: {
            const _exhaustiveCheck = typecode satisfies never
            return false
        }
    }
}


type InferDtypeFromShorthand<S extends DTypeShorthands> =
    S extends 'null' ? DTNull
    : S extends 'string' ? DTString
    : S extends 'int' ? DTInt<64>
    : S extends 'int8' ? DTInt<8>
    : S extends 'int16' ? DTInt<16>
    : S extends 'int32' ? DTInt<32>
    : S extends 'int64' ? DTInt<64>
    : S extends 'float' ? DTFloat<64>
    : S extends 'float8' ? DTFloat<8>
    : S extends 'float16' ? DTFloat<16>
    : S extends 'float32' ? DTFloat<32>
    : S extends 'float64' ? DTFloat<64>
    : S extends 'boolean' ? DTBoolean
    : S extends 'date' ? DTDate
    : S extends 'time' ? DTTime
    : S extends 'datetime' ? DTDateTime
    : S extends 'interval' ? DTInterval
    : S extends 'uuid' ? DTUUID
    : never

function dtypeFromShorthand<T extends DTypeShorthands>(typecode: T): InferDtypeFromShorthand<T> {
    switch (typecode) {
        case 'int': return { typecode: 'int', size: 64, nullable: true } as InferDtypeFromShorthand<T>
        case 'int8': return { typecode: 'int', size: 8, nullable: true } as InferDtypeFromShorthand<T>
        case 'int16': return { typecode: 'int', size: 16, nullable: true } as InferDtypeFromShorthand<T>
        case 'int32': return { typecode: 'int', size: 32, nullable: true } as InferDtypeFromShorthand<T>
        case 'int64': return { typecode: 'int', size: 64, nullable: true } as InferDtypeFromShorthand<T>

        case 'float': return { typecode: 'float', size: 64, nullable: true } as InferDtypeFromShorthand<T>
        case 'float8': return { typecode: 'float', size: 8, nullable: true } as InferDtypeFromShorthand<T>
        case 'float16': return { typecode: 'float', size: 16, nullable: true } as InferDtypeFromShorthand<T>
        case 'float32': return { typecode: 'float', size: 32, nullable: true } as InferDtypeFromShorthand<T>
        case 'float64': return { typecode: 'float', size: 64, nullable: true } as InferDtypeFromShorthand<T>

        case 'null': return { typecode: 'null', nullable: true } as InferDtypeFromShorthand<T>
        case 'string': return { typecode: 'string', nullable: true } as InferDtypeFromShorthand<T>
        case 'boolean': return { typecode: 'boolean', nullable: true } as InferDtypeFromShorthand<T>
        case 'date': return { typecode: 'date', nullable: true } as InferDtypeFromShorthand<T>
        case 'time': return { typecode: 'time', nullable: true } as InferDtypeFromShorthand<T>
        case 'datetime': return { typecode: 'datetime', nullable: true } as InferDtypeFromShorthand<T>
        case 'interval': return { typecode: 'interval', nullable: true } as InferDtypeFromShorthand<T>
        case 'uuid': return { typecode: 'uuid', nullable: true } as InferDtypeFromShorthand<T>
        default:
            throw new Error(`Unsupported typecode in dtypeFromShorthand: ${typecode satisfies never}`)
    }
}

export type JSTypeFromDtype<DT extends DataType> =
    DT extends { nullable: false }
    ? NonNullableJSTypeFromDtype<DT>
    : NonNullableJSTypeFromDtype<DT> | null

type NonNullableJSTypeFromDtype<DT extends DataType> =
    DT extends DTString ? string
    : DT extends DTInt ? number
    : DT extends DTFloat ? number
    : DT extends DTBoolean ? boolean
    : DT extends DTDate ? Date
    : DT extends DTTime ? Date
    : DT extends DTDateTime ? Date
    : DT extends DTInterval ? string
    : DT extends DTUUID ? string
    : DT extends DTNull ? null
    : DT extends DTCustom ? unknown
    : never

export type InferrableJsType = string | number | boolean | Date | null

/** Given a JS type, what DataType will be inferred? */
export type InferDtypeFromJs<JS extends InferrableJsType> =
    JS extends string ? DTString
    : JS extends number ? DTFloat<64>
    : JS extends boolean ? DTBoolean
    : JS extends Date ? DTDateTime
    : JS extends null ? DTNull
    : never

/** Given a JS value, infer the DataType of it */
export function inferDtypeFromJs<JS extends InferrableJsType>(value: JS): InferDtypeFromJs<JS> {
    if (value === null) return { typecode: 'null', nullable: true } as InferDtypeFromJs<JS>
    if (typeof value === 'string') return { typecode: 'string', nullable: true } as InferDtypeFromJs<JS>
    if (typeof value === 'boolean') return { typecode: 'boolean', nullable: true } as InferDtypeFromJs<JS>
    if (typeof value === 'number') return { typecode: 'float', size: 64, nullable: true } as InferDtypeFromJs<JS>
    if (value instanceof Date) return { typecode: 'datetime', nullable: true } as InferDtypeFromJs<JS>
    throw new Error(`Cannot infer dtype for value: ${value}`)
}

export type IntoDtype = DataType | DTypeShorthands | IVExpr<DataType, any> | IVOp<DataType, any, any>
export type InferDtype<DT extends IntoDtype> =
    DT extends DataType ? DT :
    DT extends DTypeShorthands ? InferDtypeFromShorthand<DT> :
    DT extends IVExpr<infer D, any> ? D :
    DT extends IVOp<infer D, any, any> ? D :
    never

export function dtype<T extends IntoDtype>(thing: T): InferDtype<T> {
    if (isValidDataType(thing)) {
        if ('nullable' in thing) return thing as InferDtype<T>
        return Object.assign({}, thing as object, { nullable: true }) as InferDtype<T>
    }
    if (typeof thing === 'string') return dtypeFromShorthand(thing as DTypeShorthands) as InferDtype<T>
    if (typeof thing === 'object' && thing !== null) {
        if (isVExpr(thing)) return thing.dtype() as InferDtype<T>
        if (isVOp(thing)) return thing.dtype() as InferDtype<T>
    }
    throw new Error(`Cannot determine dtype of: ${thing}`)
}


export type HighestDataType<DTs extends DataType[]> =
    DTs extends [] ? never :
    DTFloat<64> extends DTs[number] ? DTFloat<64> :
    DTFloat<32> extends DTs[number] ? DTFloat<32> :
    DTFloat<16> extends DTs[number] ? DTFloat<16> :
    DTFloat<8> extends DTs[number] ? DTFloat<8> :
    DTInt<64> extends DTs[number] ? DTInt<64> :
    DTInt<32> extends DTs[number] ? DTInt<32> :
    DTInt<16> extends DTs[number] ? DTInt<16> :
    DTInt<8> extends DTs[number] ? DTInt<8> :
    never

export function highestDataType<First extends DataType, Rest extends DataType[]>(dtype1: First, ...rest: Rest): HighestDataType<[First, ...Rest]> {
    if (rest.length === 0) {
        if (isValidDataType(dtype1)) {
            return dtype1 as HighestDataType<[First, ...Rest]>
        } else {
            throw new Error(`Invalid DataType: ${dtype1}`)
        }
    }
    const nonNumeric = [dtype1, ...rest].filter(dt => dt.typecode !== 'int' && dt.typecode !== 'float')
    if (nonNumeric.length > 0) {
        throw new Error(`Cannot determine highest type for non-numeric types: ${nonNumeric.map(dt => JSON.stringify(dt)).join(', ')}`)
    }
    const floats = [dtype1, ...rest].filter(dt => dt.typecode === 'float') as Extract<DataType, { typecode: 'float' }>[]
    const ints = [dtype1, ...rest].filter(dt => dt.typecode === 'int') as Extract<DataType, { typecode: 'int' }>[]
    const highestFloatSize = floats.reduce((max, dt) => Math.max(max, dt.size), 0)
    const highestIntSize = ints.reduce((max, dt) => Math.max(max, dt.size), 0)
    const floatsPresent = floats.length > 0
    const intsPresent = ints.length > 0

    if (floatsPresent) {
        return DTFloat(highestFloatSize as 8 | 16 | 32 | 64) as HighestDataType<[First, ...Rest]>
    }
    if (intsPresent) {
        return DTInt(highestIntSize as 8 | 16 | 32 | 64) as HighestDataType<[First, ...Rest]>
    }

    throw new Error(`Cannot determine highest type for non-numeric types`)
}

export function eq(a: DataType, b: DataType): boolean {
    if (a.typecode !== b.typecode) {
        return false
    }
    if (a.typecode === 'int' && b.typecode === 'int') {
        return a.size === b.size
    }
    if (a.typecode === 'float' && b.typecode === 'float') {
        return a.size === b.size
    }
    return true
}
