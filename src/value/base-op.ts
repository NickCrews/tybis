
import { type DataType } from '../datatype.js'
import { type DataShape } from '../datashape.js'
import { type IVOp, IsVOpSymbol } from './core.js'

let _vOpToVExpr: any

/** Internal use only: register the function that converts an Op to an Expr. */
export function registerVOpToVExpr(fn: any) {
    _vOpToVExpr = fn
}

export abstract class BaseOp<T extends DataType = DataType, S extends DataShape = DataShape> implements IVOp<T, S> {
    [IsVOpSymbol] = true as const
    abstract readonly kind: string
    private readonly _dtype: T
    private readonly _dshape: S
    constructor(dtype: T, dshape: S) {
        this._dtype = dtype
        this._dshape = dshape
    }
    dtype(): T { return this._dtype }
    dshape(): S { return this._dshape }
    getName(): string { return this.kind }
}