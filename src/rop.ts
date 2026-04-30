import { type Schema } from './schema.js'
import { Relation } from './relation.js'
import { IROp, IsROpSymbol } from './irop.js'
import { IVOp } from './value/core.js'
import type { SortSpec } from './value/ops.js'
import { type DataType } from './datatype.js'

export abstract class BaseROp<S extends Schema = Schema, K extends string = string> implements IROp<S, K> {
    [IsROpSymbol] = true as const
    abstract readonly kind: K

    // We compute the schema once and store it.
    private _schema: S | undefined
    protected abstract computeSchema(): S

    schema(): S {
        if (!this._schema) {
            this._schema = this.computeSchema()
        }
        return this._schema
    }

    toRelation(): Relation<S, this> {
        return new Relation(this)
    }
}

export class FromOp<S extends Schema> extends BaseROp<S, 'from'> {
    readonly kind = 'from' as const
    constructor(readonly name: string, private readonly _initialSchema: S) {
        super()
    }
    protected computeSchema(): S {
        return this._initialSchema
    }
}

export class FilterOp<S extends Schema> extends BaseROp<S, 'filter'> {
    readonly kind = 'filter' as const
    constructor(readonly source: IROp<S>, readonly condition: IVOp<{ typecode: 'boolean' }>) {
        super()
    }
    protected computeSchema(): S {
        return this.source.schema()
    }
}

export class DeriveOp<S extends Schema, D extends Record<string, IVOp>> extends BaseROp<S & { [K in keyof D]: ReturnType<D[K]['dtype']> }, 'derive'> {
    readonly kind = 'derive' as const
    constructor(readonly source: IROp<S>, readonly derivations: [string, IVOp][]) {
        super()
    }
    protected computeSchema(): S & { [K in keyof D]: ReturnType<D[K]['dtype']> } {
        const s = { ...this.source.schema() } as any
        for (const [k, v] of this.derivations) {
            s[k] = v.dtype()
        }
        return s
    }
}

export class SelectOp<S extends Schema> extends BaseROp<S, 'select'> {
    readonly kind = 'select' as const
    constructor(readonly source: IROp<any>, readonly selections: [string, IVOp][]) {
        super()
    }
    protected computeSchema(): S {
        const s: any = {}
        for (const [k, v] of this.selections) {
            s[k] = v.dtype()
        }
        return s
    }
}

export class GroupOp<S extends Schema> extends BaseROp<S, 'group'> {
    readonly kind = 'group' as const
    constructor(readonly source: IROp<any>, readonly keys: string[], readonly aggregations: [string, IVOp][]) {
        super()
    }
    protected computeSchema(): S {
        const s: any = {}
        const sourceSchema = this.source.schema()
        for (const key of this.keys) {
            s[key] = sourceSchema[key]
        }
        for (const [k, v] of this.aggregations) {
            s[k] = v.dtype()
        }
        return s
    }
}

export class SortOp<S extends Schema> extends BaseROp<S, 'sort'> {
    readonly kind = 'sort' as const
    constructor(readonly source: IROp<S>, readonly keys: SortSpec[]) {
        super()
    }
    protected computeSchema(): S {
        return this.source.schema()
    }
}

export class TakeOp<S extends Schema> extends BaseROp<S, 'take'> {
    readonly kind = 'take' as const
    constructor(readonly source: IROp<S>, readonly n: number) {
        super()
    }
    protected computeSchema(): S {
        return this.source.schema()
    }
}

export type BuiltinROp =
    | FromOp<any>
    | FilterOp<any>
    | DeriveOp<any, any>
    | SelectOp<any>
    | GroupOp<any>
    | SortOp<any>
    | TakeOp<any>

