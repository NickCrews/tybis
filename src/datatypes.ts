import { type IExpr, type IOp } from "./core"

export type DataType =
    | 'string'
    | 'int32'
    | 'int64'
    | 'float32'
    | 'float64'
    | 'boolean'
    | 'date'
    | 'time'
    | 'datetime'
    | 'interval'
    | 'uuid'

/**
 * Check if a value is a valid DataType, eg 'string', 'int32', etc.
 */
export function isValidDataType(datatype: any): datatype is DataType {
    const validTypes = [
        'string',
        'int32',
        'int64',
        'float32',
        'float64',
        'boolean',
        'date',
        'time',
        'datetime',
        'interval',
        'uuid',
    ]
    return typeof datatype === 'string' && validTypes.includes(datatype)
}

export type Schema = Record<string, DataType>

export type JSType<T extends DataType> =
    T extends 'string' ? string
    : T extends 'int32' | 'int64' | 'float32' | 'float64' ? number
    : T extends 'boolean' ? boolean
    : T extends 'date' | 'time' | 'datetime' ? Date
    : T extends 'interval' | 'uuid' ? string
    : never

export type SchemaToJS<S extends Schema> = {
    [K in keyof S]: JSType<S[K]>
}

export type JsType = string | number | boolean | Date

export type InferDtype<T extends JsType | IExpr | IOp> =
    T extends IExpr<infer D, any> ? D :
    T extends IOp<infer D, any> ? D :
    T extends JsType ? InferDtypeFromJsType<T> :
    never

export type InferDtypeFromJsType<JS extends JsType> =
    JS extends string ? 'string'
    : JS extends number ? 'float64'
    : JS extends boolean ? 'boolean'
    : JS extends Date ? 'datetime'
    : never

export function inferDtype<JS extends JsType>(value: JS): InferDtype<JS> {
    if (typeof value === 'string') return 'string' as InferDtype<JS>
    if (typeof value === 'boolean') return 'boolean' as InferDtype<JS>
    if (typeof value === 'number') return 'float64' as InferDtype<JS>
    if (value instanceof Date) return 'datetime' as InferDtype<JS>
    throw new Error(`Cannot infer dtype for value: ${value}`)
}