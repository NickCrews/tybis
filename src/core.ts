import { isValidDataType, type DataType } from './datatypes.js'
import { isValidDataShape, type DataShape } from './datashape.js'
import { Expr } from './expr.js'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
// Users are free to use these symbols to mark their own custom ops and expressions.
export const IsOpSymbol = Symbol('isOp')
export const IsExprSymbol = Symbol('isExpr')
export const DependsOnSymbol = Symbol('dependsOn')

/**
 * An IOp is the **internal** representation of an operation. It does not have the pleasant
 * user-facing API of an IExpr. For example, you might have
 * 
 * ```ts
 * class StringUpperOp<S extends DataShape> implements IOp<{ typecode: 'string' }, S> {
 *     readonly kind = 'upper' as const
 *     constructor(readonly operand: IOp<{ typecode: 'string' }, S>) {}
 *     dtype() { return DT.string }
 *     dshape() { return this.operand.dshape() }
 *     toExpr() { return new StringExpr(this) }
 * }
 * ```
 * 
 * Note that this doesn't have the nice API of an IExpr, such as the `.trim()` or `.length()` methods.
 */
export interface IOp<T extends DataType = DataType, S extends DataShape = DataShape, K extends any = any> {
    readonly kind: K
    /** The {@link DataType} of this expression. */
    dtype(): T
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): S
    toExpr(): Expr<T, S>
    getName(): string
    /** Optional symbol to mark this object as an Op. If not present, the object will be checked for the presence of 'kind', 'dtype', and 'dshape' properties. */
    [IsOpSymbol]?: boolean
}

export interface IExpr<T extends DataType = DataType, S extends DataShape = DataShape, N extends string = string> {
    /** The {@link DataType} of this expression. */
    dtype(): T
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): S
    /** Convert this expression to its internal operation representation. */
    toOp(): IOp<T, S>
    /** Optional symbol to mark this object as an Expr. If not present, the object will be checked for the presence of 'dtype' and 'dshape' properties. */
    [IsExprSymbol]?: boolean
}

/**
 * Check if the given object is an IOp. First checks for the presence of the IsOpSymbol, then falls back to checking for 'kind', 'dtype', and 'dshape' properties.
 */
export function isOp(obj: any): obj is IOp {
    // First check for the presence of the symbol property
    if (obj && typeof obj === 'object' && IsOpSymbol in obj) {
        return obj[IsOpSymbol]
    }
    // Fallback: check for the presence of 'kind', 'dtype', and 'dshape' properties
    if (!obj || typeof obj !== 'object') {
        return false
    }
    const hasKind = 'kind' in obj
    const hasProperDtype = 'dtype' in obj && typeof obj.dtype === 'function' && isValidDataType(obj.dtype())
    const hasProperDshape = 'dshape' in obj && typeof obj.dshape === 'function' && isValidDataShape(obj.dshape())
    return hasKind && hasProperDtype && hasProperDshape
}

/**
 * Check if the given object is an IExpr. First checks for the presence of the IsExprSymbol, then falls back to checking for 'dtype' and 'dshape' properties.
 */
export function isExpr(obj: any): obj is IExpr {
    // First check for the presence of the symbol property
    if (obj && typeof obj === 'object' && IsExprSymbol in obj) {
        return obj[IsExprSymbol]
    }
    // Fallback: check for the presence of 'dtype' and 'dshape' properties
    if (!obj || typeof obj !== 'object') {
        return false
    }
    const hasProperDtype = 'dtype' in obj && typeof obj.dtype === 'function' && isValidDataType(obj.dtype())
    const hasProperDshape = 'dshape' in obj && typeof obj.dshape === 'function' && isValidDataShape(obj.dshape())
    return hasProperDtype && hasProperDshape
}

