export type DataType =
    | 'string'
    | 'int32'
    | 'int64'
    | 'float32'
    | 'float64'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'interval'

export type DataShape = 'scalar' | 'columnar'

export type Schema = Record<string, DataType>

export type JSType<T extends DataType> =
    T extends 'string' ? string
    : T extends 'int32' | 'int64' | 'float32' | 'float64' ? number
    : T extends 'boolean' ? boolean
    : T extends 'date' | 'datetime' ? Date
    : T extends 'interval' ? string
    : never

export type SchemaToJS<S extends Schema> = {
    [K in keyof S]: JSType<S[K]>
}
