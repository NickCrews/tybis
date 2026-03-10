import { type IExpr, type IOp, isExpr, isOp } from "./core"

export interface DTNull { typecode: 'null' }
export function DTNull(): DTNull { return { typecode: 'null' } }
export interface DTString { typecode: 'string' }
export function DTString(): DTString { return { typecode: 'string' } }
export interface DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> { typecode: 'int', size: S }
export function DTInt<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S): DTInt<S> { return { typecode: 'int', size } }
export interface DTInt8 { typecode: 'int', size: 8 }
export function DTInt8(): DTInt8 { return { typecode: 'int', size: 8 } }
export interface DTInt16 { typecode: 'int', size: 16 }
export function DTInt16(): DTInt16 { return { typecode: 'int', size: 16 } }
export interface DTInt32 { typecode: 'int', size: 32 }
export function DTInt32(): DTInt32 { return { typecode: 'int', size: 32 } }
export interface DTInt64 { typecode: 'int', size: 64 }
export function DTInt64(): DTInt64 { return { typecode: 'int', size: 64 } }
export interface DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64> { typecode: 'float', size: S }
export function DTFloat<S extends 8 | 16 | 32 | 64 = 8 | 16 | 32 | 64>(size: S): DTFloat<S> { return { typecode: 'float', size } }
export interface DTFloat8 { typecode: 'float', size: 8 }
export function DTFloat8(): DTFloat8 { return { typecode: 'float', size: 8 } }
export interface DTFloat16 { typecode: 'float', size: 16 }
export function DTFloat16(): DTFloat16 { return { typecode: 'float', size: 16 } }
export interface DTFloat32 { typecode: 'float', size: 32 }
export function DTFloat32(): DTFloat32 { return { typecode: 'float', size: 32 } }
export interface DTFloat64 { typecode: 'float', size: 64 }
export function DTFloat64(): DTFloat64 { return { typecode: 'float', size: 64 } }
export interface DTBoolean { typecode: 'boolean' }
export function DTBoolean(): DTBoolean { return { typecode: 'boolean' } }
export interface DTDate { typecode: 'date' }
export function DTDate(): DTDate { return { typecode: 'date' } }
export interface DTTime { typecode: 'time' }
export function DTTime(): DTTime { return { typecode: 'time' } }
export interface DTDateTime { typecode: 'datetime' }
export function DTDateTime(): DTDateTime { return { typecode: 'datetime' } }
export interface DTInterval { typecode: 'interval' }
export function DTInterval(): DTInterval { return { typecode: 'interval' } }
export interface DTUUID { typecode: 'uuid' }
export function DTUUID(): DTUUID { return { typecode: 'uuid' } }

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

type DTypeShorthands =
    | DataType['typecode']
    | 'int8' | 'int16' | 'int32' | 'int64'
    | 'float8' | 'float16' | 'float32' | 'float64'

/**
 * Check if a value is a valid DataType, eg {typecode: 'string'}, {typecode: 'int', size: 32}, etc.
 */
export function isValidDataType(datatype: any): datatype is DataType {
    let typecode: DataType['typecode']
    if (!datatype || typeof datatype !== 'object' || typeof datatype.typecode !== 'string') {
        return false
    }
    typecode = datatype.typecode as DataType['typecode']
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
        default:
            const _exhaustiveCheck = typecode satisfies never
            return false
    }
}


export type InferDtypeFromShorthand<S extends DTypeShorthands> =
    S extends 'null' ? DTNull
    : S extends 'string' ? DTString
    : S extends 'int' ? { typecode: 'int', size: 64 }
    : S extends 'int8' ? { typecode: 'int', size: 8 }
    : S extends 'int16' ? { typecode: 'int', size: 16 }
    : S extends 'int32' ? { typecode: 'int', size: 32 }
    : S extends 'int64' ? { typecode: 'int', size: 64 }
    : S extends 'float' ? { typecode: 'float', size: 64 }
    : S extends 'float8' ? { typecode: 'float', size: 8 }
    : S extends 'float16' ? { typecode: 'float', size: 16 }
    : S extends 'float32' ? { typecode: 'float', size: 32 }
    : S extends 'float64' ? { typecode: 'float', size: 64 }
    : S extends 'boolean' ? DTBoolean
    : S extends 'date' ? DTDate
    : S extends 'time' ? DTTime
    : S extends 'datetime' ? DTDateTime
    : S extends 'interval' ? DTInterval
    : S extends 'uuid' ? DTUUID
    : never

export function dtypeFromShorthand<T extends DTypeShorthands>(typecode: T): InferDtypeFromShorthand<T> {
    switch (typecode) {
        case 'int': return { typecode: 'int', size: 64 } as InferDtypeFromShorthand<T>
        case 'int8': return { typecode: 'int', size: 8 } as InferDtypeFromShorthand<T>
        case 'int16': return { typecode: 'int', size: 16 } as InferDtypeFromShorthand<T>
        case 'int32': return { typecode: 'int', size: 32 } as InferDtypeFromShorthand<T>
        case 'int64': return { typecode: 'int', size: 64 } as InferDtypeFromShorthand<T>

        case 'float': return { typecode: 'float', size: 64 } as InferDtypeFromShorthand<T>
        case 'float8': return { typecode: 'float', size: 8 } as InferDtypeFromShorthand<T>
        case 'float16': return { typecode: 'float', size: 16 } as InferDtypeFromShorthand<T>
        case 'float32': return { typecode: 'float', size: 32 } as InferDtypeFromShorthand<T>
        case 'float64': return { typecode: 'float', size: 64 } as InferDtypeFromShorthand<T>

        case 'null': return { typecode: 'null' } as InferDtypeFromShorthand<T>
        case 'string': return { typecode: 'string' } as InferDtypeFromShorthand<T>
        case 'boolean': return { typecode: 'boolean' } as InferDtypeFromShorthand<T>
        case 'date': return { typecode: 'date' } as InferDtypeFromShorthand<T>
        case 'time': return { typecode: 'time' } as InferDtypeFromShorthand<T>
        case 'datetime': return { typecode: 'datetime' } as InferDtypeFromShorthand<T>
        case 'interval': return { typecode: 'interval' } as InferDtypeFromShorthand<T>
        case 'uuid': return { typecode: 'uuid' } as InferDtypeFromShorthand<T>
        default:
            throw new Error(`Unsupported typecode in dtypeFromShorthand: ${typecode satisfies never}`)
    }
}

export type JSTypeFromDtype<T extends DataType> =
    T extends DTString ? string
    : T extends DTInt ? number
    : T extends DTFloat ? number
    : T extends DTBoolean ? boolean
    : T extends DTDate ? Date
    : T extends DTTime ? Date
    : T extends DTDateTime ? Date
    : T extends DTInterval ? string
    : T extends DTUUID ? string
    : T extends DTNull ? null
    : never

export type InferrableJsType = string | number | boolean | Date | null | undefined

/** Given a JS type, what DataType will be inferred? */
export type InferDtypeFromJs<JS extends InferrableJsType> =
    JS extends string ? DTString
    : JS extends number ? DTFloat<64>
    : JS extends boolean ? DTBoolean
    : JS extends Date ? DTDateTime
    : JS extends null ? DTNull
    : JS extends undefined ? DTNull
    : never

/** Given a DataType, what JS types will be inferred to this? */
export type JSTypesInferredTo<T extends DataType> =
    T extends DTString ? string
    : T extends DTInt ? number
    : T extends DTFloat ? number
    : T extends DTBoolean ? boolean
    : T extends DTDate ? Date
    : T extends DTTime ? Date
    : T extends DTDateTime ? Date
    : T extends DTInterval ? never
    : T extends DTUUID ? never
    : T extends DTNull ? null
    : never

/** Given a JS value, infer the DataType of it */
export function inferDtypeFromJs<JS extends InferrableJsType>(value: JS): InferDtypeFromJs<JS> {
    if (value === null) return { typecode: 'null' } as InferDtypeFromJs<JS>
    if (value === undefined) return { typecode: 'null' } as InferDtypeFromJs<JS>
    if (typeof value === 'string') return { typecode: 'string' } as InferDtypeFromJs<JS>
    if (typeof value === 'boolean') return { typecode: 'boolean' } as InferDtypeFromJs<JS>
    if (typeof value === 'number') return { typecode: 'float', size: 64 } as InferDtypeFromJs<JS>
    if (value instanceof Date) return { typecode: 'datetime' } as InferDtypeFromJs<JS>
    throw new Error(`Cannot infer dtype for value: ${value}`)
}

export type IntoDtype = DataType | DTypeShorthands | IExpr | IOp
export type InferDtype<T extends IntoDtype> =
    T extends DataType ? T :
    T extends DTypeShorthands ? InferDtypeFromShorthand<T> :
    T extends IExpr<infer D, any> ? D :
    T extends IOp<infer D, any> ? D :
    never

export function dtype<T extends IntoDtype>(thing: T): InferDtype<T> {
    if (isValidDataType(thing)) return thing as InferDtype<T>
    if (typeof thing === 'string') return dtypeFromShorthand(thing as DTypeShorthands) as InferDtype<T>
    if (typeof thing === 'object' && thing !== null) {
        if (isExpr(thing)) return thing.dtype() as InferDtype<T>
        if (isOp(thing)) return thing.dtype() as InferDtype<T>
    }
    throw new Error(`Cannot determine dtype of: ${thing}`)
}


export type Schema = Record<string, DataType>
export type SchemaToJS<S extends Schema> = {
    [K in keyof S]: JSTypeFromDtype<S[K]>
}
export type IntoSchema = Schema | Record<string, IntoDtype>
export type InferSchema<T extends IntoSchema> =
    T extends Schema ? T :
    T extends Record<string, IntoDtype> ? { [K in keyof T]: InferDtype<T[K]> } :
    never

export function schema<T extends IntoSchema>(s: T): InferSchema<T> {
    const result: Record<string, DataType> = {}
    for (const key in s) {
        result[key] = dtype(s[key]!)
    }
    return result as InferSchema<T>
}

export type HighestDataType<Types extends DataType[]> =
    Types extends [] ? never :
    Types[number] extends DTFloat64 ? DTFloat64 :
    Types[number] extends DTFloat32 ? DTFloat32 :
    Types[number] extends DTFloat16 ? DTFloat16 :
    Types[number] extends DTFloat8 ? DTFloat8 :
    Types[number] extends DTInt64 ? DTInt64 :
    Types[number] extends DTInt32 ? DTInt32 :
    Types[number] extends DTInt16 ? DTInt16 :
    Types[number] extends DTInt8 ? DTInt8 :
    never

export function highestDataType<First extends DataType, Rest extends DataType[]>(dtype1: First, ...rest: Rest): HighestDataType<[First, ...Rest]> {
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

export type ComparableTo<T extends DataType> =
    T extends DTInt ? string | number | boolean
    : T extends DTFloat ? string | number | boolean
    : T extends DTString ? string
    : T extends DTBoolean ? boolean
    : T extends DTDate ? Date
    : T extends DTTime ? Date
    : T extends DTDateTime ? Date
    : T extends DTUUID ? string
    : never