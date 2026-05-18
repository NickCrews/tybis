
import { type DataType } from '../datatype.js'
import { type DataShape } from '../datashape.js'
import { type IVOp, IsVOpSymbol } from './core.js'

let _vOpToVExpr: any

/** Internal use only: register the function that converts a VOp to an Expr. */
export function registerVOpToVExpr(fn: any) {
    _vOpToVExpr = fn
}

/** A base class that you can use as a utility for defining custom {@link IVOp}s.
 * 
 * Note that you don't NEED to extend this class to create a custom IVOp,
 * this class is just sometimes a useful shortcut.
 * For example, the builtin string `StartsWithOp` is currently implemented as follows:
 * 
 * ```ts
 * export class StartsWithOp<
 *     DS1 extends DataShape = DataShape,
 *     DS2 extends DataShape = DataShape
 * > extends BaseVOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
 *     readonly kind = 'starts_with' as const
 *     constructor(readonly operand: IVOp<dt.DTString, DS1>, readonly prefix: IVOp<dt.DTString, DS2>) {
 *        super(dt.DTBoolean(), highestDataShape(operand.dshape(), prefix.dshape()))
 *     }
 * }
 * 
 * // usage: new StartsWithOp(lit('hello').toOp(), mytable.col('mycol').toOp())
 * ```
 * 
 * But it could also have been implemented without extending `BaseVOp`, like this:
 * 
 * ```ts
 * export function startsWith<DS1 extends DataShape = DataShape, DS2 extends DataShape = DataShape>(
 *     operand: IVOp<dt.DTString, DS1>,
 *     prefix: IVOp<dt.DTString, DS2>
 * ): IVOp<dt.DTBoolean, HighestDataShape<[DS1, DS2]>> {
 *     return {
 *         [IsVOpSymbol]: true as const,
 *         kind: 'starts_with' as const,
 *         operand,
 *         prefix,
 *         dtype() { return dt.DTBoolean() },
 *         dshape() { return highestDataShape(operand.dshape(), prefix.dshape()) },
 *         getName() { return this.kind }
 *     }
 * }
 * 
 * // usage: startsWith(lit('hello').toOp(), mytable.col('mycol').toOp())
 * ```
*/
export abstract class BaseVOp<DT extends DataType = DataType, DS extends DataShape = DataShape> implements IVOp<DT, DS> {
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