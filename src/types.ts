export type Schema = Record<string, SchemaType>

export type SchemaType = 'string' | 'number' | 'boolean' | 'null'

export type InferSchema<T extends readonly unknown[]> =
    T extends readonly [infer First, ...infer Rest]
    ? First extends Record<string, unknown>
    ? {
        [K in keyof First]: First[K] extends string
        ? 'string'
        : First[K] extends number
        ? 'number'
        : First[K] extends boolean
        ? 'boolean'
        : 'null'
    }
    : never
    : never

export type GroupBySchema<S extends Schema, GroupCols extends (keyof S)[]> = {
    [K in GroupCols[number]]: S[K]
}

export type AggResult<Agg extends Record<string, unknown>> = {
    [K in keyof Agg]: 'number'
}

export type MergeSchema<S1 extends Schema, S2 extends Schema> = S1 & S2

export type ExtractType<S extends Schema, K extends keyof S> = S[K]

export type JSType<T extends SchemaType> =
    T extends 'string' ? string
    : T extends 'number' ? number
    : T extends 'boolean' ? boolean
    : null

export type SchemaToJS<S extends Schema> = {
    [K in keyof S]: JSType<S[K]>
}
