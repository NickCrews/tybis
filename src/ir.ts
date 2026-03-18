import { IOp } from './value/core.js';
import type { SortSpec } from './value/ops.js'
import type { Schema } from './schema.js'
import type { DataType } from './datatype.js'

// ---------------------------------------------------------------------------
// ITableOp interface — extensible interface for table-valued operations
// ---------------------------------------------------------------------------

export const IsTableOpSymbol = Symbol('isTableOp')

/**
 * An ITableOp is the **internal** representation of a table-valued operation.
 * It forms a tree of operations that can be compiled or executed by a backend.
 *
 * Similar to how {@link IOp} is the interface for value operations, ITableOp
 * is the interface for table operations. Anyone can implement this interface
 * to create custom table-valued operations and pair them with a backend that
 * knows how to compile or execute them.
 *
 * @example
 * ```ts
 * class SampleOp implements ITableOp {
 *     readonly kind = 'sample' as const
 *     constructor(readonly source: ITableOp, readonly n: number) {}
 *     schema() { return this.source.schema() }
 * }
 * ```
 */
export interface ITableOp {
    readonly kind: string
    /** The output schema of this operation. */
    schema(): Schema
    /** Optional symbol to mark this object as an ITableOp. */
    [IsTableOpSymbol]?: boolean
}

/**
 * Check if the given object is an ITableOp.
 */
export function isTableOp(obj: any): obj is ITableOp {
    if (obj && typeof obj === 'object' && IsTableOpSymbol in obj) {
        return obj[IsTableOpSymbol]
    }
    if (!obj || typeof obj !== 'object') {
        return false
    }
    return (
        'kind' in obj && typeof obj.kind === 'string' &&
        'schema' in obj && typeof obj.schema === 'function'
    )
}

// ---------------------------------------------------------------------------
// Built-in ITableOp implementations
// ---------------------------------------------------------------------------

export class FromOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'from' as const
    constructor(readonly name: string, private readonly _schema: Schema) {}
    schema(): Schema { return this._schema }
}

export class FilterOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'filter' as const
    constructor(readonly source: ITableOp, readonly condition: IOp<{ typecode: 'boolean' }>) {}
    schema(): Schema { return this.source.schema() }
}

export class DeriveOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'derive' as const
    private readonly _schema: Schema
    constructor(readonly source: ITableOp, readonly derivations: [string, IOp][]) {
        const s: Record<string, DataType> = { ...source.schema() }
        for (const [k, v] of derivations) {
            s[k] = v.dtype()
        }
        this._schema = s
    }
    schema(): Schema { return this._schema }
}

export class GroupOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'group' as const
    private readonly _schema: Schema
    constructor(
        readonly source: ITableOp,
        readonly keys: string[],
        readonly aggregations: [string, IOp][],
        resultSchema: Schema,
    ) {
        this._schema = resultSchema
    }
    schema(): Schema { return this._schema }
}

export class SortOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'sort' as const
    constructor(readonly source: ITableOp, readonly keys: SortSpec[]) {}
    schema(): Schema { return this.source.schema() }
}

export class TakeOp implements ITableOp {
    [IsTableOpSymbol] = true as const
    readonly kind = 'take' as const
    constructor(readonly source: ITableOp, readonly n: number) {}
    schema(): Schema { return this.source.schema() }
}

// ---------------------------------------------------------------------------
// BuiltinTableOp — discriminated union for exhaustive compiler type-checking
// ---------------------------------------------------------------------------

export type BuiltinTableOp =
    | FromOp
    | FilterOp
    | DeriveOp
    | GroupOp
    | SortOp
    | TakeOp

/**
 * @deprecated Use {@link ITableOp} instead.
 */
export type IRNode = ITableOp
