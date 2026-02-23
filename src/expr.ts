import type { Schema, DataType } from './datatypes.js'
import type { Op, ValueOp, ColOp, AggFuncOp } from './ops.js'

export abstract class Expr<T extends DataType = DataType, S extends Schema = Schema> {
    constructor(protected readonly _arg: Op) { }

    op(): Op {
        return this._arg
    }
}

export abstract class ValueExpr<T extends DataType = DataType, S extends Schema = Schema> extends Expr<T, S> {
    constructor(protected readonly _valueOp: ValueOp<T>) {
        super(_valueOp)
    }

    override op(): ValueOp<T> {
        return this._valueOp
    }
}

export abstract class NumericValueExpr<T extends DataType = DataType, S extends Schema = Schema> extends ValueExpr<T, S> {
    mean(): AggFunc<'number', S> {
        return new AggFunc<'number', S>('mean', this as any)
    }

    sum(): AggFunc<'number', S> {
        return new AggFunc<'number', S>('sum', this as any)
    }

    min(): AggFunc<T, S> {
        return new AggFunc<T, S>('min', this as any)
    }

    max(): AggFunc<T, S> {
        return new AggFunc<T, S>('max', this as any)
    }
}

export class Col<N extends string, T extends DataType, S extends Schema> extends NumericValueExpr<T, S> {
    constructor(
        public readonly name: N,
        public readonly dtype: T,
        public readonly schema: S
    ) {
        const op: ColOp<T> = {
            opcode: 'col',
            name,
            dtype,
        }
        super(op)
    }
}

export class AggFunc<T extends DataType, S extends Schema = Schema> extends ValueExpr<T, S> {
    private _func: 'count' | 'mean' | 'sum' | 'min' | 'max'
    private _dtype: T

    constructor(
        funcOrArg?: 'count' | 'mean' | 'sum' | 'min' | 'max' | Expr<DataType, S>,
        argIfFunc?: Expr<DataType, S>
    ) {
        let func: 'count' | 'mean' | 'sum' | 'min' | 'max'
        let arg: Expr<DataType, S> | undefined

        if (typeof funcOrArg === 'string') {
            func = funcOrArg
            arg = argIfFunc
        } else {
            func = 'count'
            arg = funcOrArg
        }

        const op: AggFuncOp<T> = {
            opcode: 'agg_func',
            func
        }
        if (arg) {
            op.arg = arg.op() as ValueOp
        }
        super(op)
        this._func = func
        this._dtype = 'number' as any as T
    }

    get func(): 'count' | 'mean' | 'sum' | 'min' | 'max' {
        return this._func
    }

    get dtype(): T {
        return this._dtype
    }
}

export function createColFactory<S extends Schema>(schema: S) {
    return <K extends keyof S & string>(name: K): Col<K, S[K], S> => {
        return new Col(name, schema[name] as S[K], schema)
    }
}

/** The number of rows in the current relation. */
export function count(): AggFunc<'number', any> {
    return new AggFunc<'number', any>('count')
}
