import type { Schema, SchemaType } from './types.js'
import type { IRNode, ColNode, AggFuncNode } from './ir.js'

export abstract class Expr<T extends SchemaType = SchemaType, S extends Schema = Schema> {
    abstract toIR(): IRNode

    mean(): AggFunc<'number', S> {
        return new AggFunc('mean', this)
    }

    sum(): AggFunc<'number', S> {
        return new AggFunc('sum', this)
    }

    min(): AggFunc<T, S> {
        return new AggFunc('min', this)
    }

    max(): AggFunc<T, S> {
        return new AggFunc('max', this)
    }
}

export class Col<N extends string, T extends SchemaType, S extends Schema> extends Expr<T, S> {
    constructor(
        public readonly name: N,
        public readonly type: T,
        public readonly schema: S
    ) {
        super()
    }

    toIR(): ColNode {
        return {
            op: 'col',
            name: this.name,
            type: this.type
        }
    }
}

export class AggFunc<T extends SchemaType, S extends Schema = Schema> extends Expr<T, S> {
    constructor(
        public readonly func: 'count' | 'mean' | 'sum' | 'min' | 'max',
        public readonly arg?: Expr<SchemaType, S>
    ) {
        super()
    }

    toIR(): AggFuncNode {
        const node: AggFuncNode = {
            op: 'agg_func',
            func: this.func
        }
        if (this.arg) {
            node.arg = this.arg.toIR()
        }
        return node
    }
}

export function col<N extends string>(name: N): Col<N, any, any> {
    return new Col(name, 'string' as any, {} as any)
}

export function count(): AggFunc<'number', any> {
    return new AggFunc('count')
}
