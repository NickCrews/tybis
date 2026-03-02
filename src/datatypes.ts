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
