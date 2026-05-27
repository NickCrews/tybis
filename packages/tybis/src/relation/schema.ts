import { DataType, dtype, InferDtype, IntoDtype, JSTypeFromDtype } from "../datatype.js"

// Forces TS to display a computed type as a flat object literal in IDE hovers,
// rather than the raw `InferSchema<...>` / mapped-type expression.
type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type Schema = Record<string, DataType>
export type SchemaToJS<S extends Schema> = Prettify<{
    [K in keyof S]: JSTypeFromDtype<S[K]>
}>
export type IntoSchema = Schema | Record<string, IntoDtype>
export type InferSchema<T extends IntoSchema> = Prettify<
    T extends Schema ? T :
    T extends Record<string, IntoDtype> ? { [K in keyof T]: InferDtype<T[K]> } :
    never
>

export function schema<T extends IntoSchema>(s: T): InferSchema<T> {
    const result: Record<string, DataType> = {}
    for (const key in s) {
        result[key] = dtype(s[key]!)
    }
    return result as InferSchema<T>
}