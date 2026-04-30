import type { Schema } from './schema.js'

export const IsROpSymbol = Symbol('isROp')

/**
 * An IROp is an interface for a relational operation, representing a step in a query such as a `filter` or a `group` or a `select`.
 * 
 * An IROp represents tabular data with a known Schema.
 * An implementation of IROp must have the following properties:
 * - has a `schema()` method that returns a Schema
 * 
 * For example, you might have an operation that samples rows. You could implement this as an IROp like this:
 * 
 * ```ts
 * class SampleOp<S extends Schema> extends BaseROp<S, 'sample'> {
 *     readonly kind = 'sample' as const
 *     constructor(readonly source: IROp<S>, readonly n: number) { super() }
 *     protected computeSchema(): S { return this.source.schema() }
 * }
 * ```
 * 
 * Note that this doesn't have the nice API of a Relation, such as the `.filter()` or `.select()` methods.
 * 
 * Note that this also does NOT implement the actual compilation logic,
 * eg there is nothing in there that says how to convert this to SQL or PRQL.
 * It is the responsibility of a Compiler to define this for a given computation backend.
 * This separation means that a `SampleOp` has shared semantics across all backends.
 */
export interface IROp<S extends Schema = Schema, K extends string = string> {
    readonly kind: K
    /** The structural {@link Schema} of the relation produced by this operation. */
    schema(): S
    /** Optional symbol to mark this object as an ROp. If not present, the object will be checked for the presence of 'kind' and 'schema' properties. */
    [IsROpSymbol]?: boolean
}

/**
 * Check if the given object satisfies the IROp (Relational Operation interface).
 * 
 * First checks for the presence of the IsROpSymbol, then falls back to checking for all of the following properties:
 * - kind exists
 * - schema() exists
 */
export function isROp(obj: any): obj is IROp {
    if (obj && typeof obj === 'object' && IsROpSymbol in obj) {
        return obj[IsROpSymbol]
    }
    if (!obj || typeof obj !== 'object') {
        return false
    }
    return 'kind' in obj && 'schema' in obj && typeof obj.schema === 'function'
}
