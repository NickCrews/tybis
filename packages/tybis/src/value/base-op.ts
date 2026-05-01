
import { type DataType } from '../datatype.js'
import { type DataShape } from '../datashape.js'
import { type IVOp, IsVOpSymbol } from './core.js'

let _vOpToVExpr: any

/** Internal use only: register the function that converts an Op to an Expr. */
export function registerVOpToVExpr(fn: any) {
    _vOpToVExpr = fn
}

export abstract class BaseOp<DT extends DataType = DataType, DS extends DataShape = DataShape> implements IVOp<DT, DS> {
    [IsVOpSymbol] = true as const
    abstract readonly kind: string
    private readonly _dtype: DT
    private readonly _dshape: DS
    constructor(dtype: DT, dshape: DS) {
        this._dtype = dtype
        this._dshape = dshape
    }
    dtype() { return this._dtype }
    dshape() { return this._dshape }
    getName() { return this.kind }
}