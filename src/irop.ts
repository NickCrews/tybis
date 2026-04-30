import type { Schema } from './schema.js'
import type { Relation } from './relation.js'

export const IsROpSymbol = Symbol('isROp')

/**
 * An IROp is an interface for a relational operation, representing a step in a query such as a `filter` or a `group` or a `select`.
 * 
 * An IROp represents tabular data with a known Schema.
 * An implementation of IROp must have the following properties:
 * - has a `schema()` method that returns a Schema
 * - has a `toRelation()` method that converts it to a Relation, which is the public-facing API for query building in Tybis.
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
    /** Convert this operation to its public-facing {@link Relation}. */
    toRelation(): Relation<S, this>
    /** Optional symbol to mark this object as an ROp. If not present, the object will be checked for the presence of 'kind', 'schema', and 'toRelation' properties. */
    [IsROpSymbol]?: boolean
}

/**
 * Check if the given object satisfies the IROp (Relational Operation interface).
 * 
 * First checks for the presence of the IsROpSymbol, then falls back to checking for all of the following properties:
 * - kind exists
 * - schema() exists
 * - toRelation() exists
 */
export function isROp(obj: any): obj is IROp {
    if (obj && typeof obj === 'object' && IsROpSymbol in obj) {
        return obj[IsROpSymbol]
    }
    if (!obj || typeof obj !== 'object') {
        return false
    }
    return 'kind' in obj && 'schema' in obj && typeof obj.schema === 'function' && 'toRelation' in obj && typeof obj.toRelation === 'function'
}
