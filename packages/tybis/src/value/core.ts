import { isValidDataType, type DataType } from '../datatype.js'
import { isValidDataShape, type DataShape } from '../datashape.js'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
// Users are free to use these symbols to mark their own custom ops and expressions.
export const IsVOpSymbol = Symbol('isVOp')
export const IsVExprSymbol = Symbol('isVExpr')
export const DependsOnSymbol = Symbol('dependsOn')

/**
 * An IVOp is an interface for a value-op, for example `add(5, relation.col('height_cm'))`.
 * 
 * An IVop represent either a scalar or columnar value with a known DataType.
 * An implementation of IVOp must have the following properties:
 * - has a `dtype()` method that returns a DataType
 * - has a `dshape()` method that returns a DataShape ('scalar' or 'columnar')
 * - has a `getName()` method that returns a string, often used to generate the column name.
 * 
 * For example, you might have an operation that converts a string column to uppercase. You could implement this as an IVOp like this:
 * 
 * ```ts
 * class StringUpperOp<S extends DataShape> implements IVOp<{ typecode: 'string' }, S> {
 *     readonly kind = 'upper' as const
 *     constructor(readonly operand: IVOp<{ typecode: 'string' }, S>) {}
 *     dtype() { return DT.string }
 *     dshape() { return this.operand.dshape() }
 *     getName() { return `${this.operand.getName()}_upper` }
 * }
 * ```
 * 
 * Note that this doesn't have the nice API of an IVExpr, such as the `.trim()` or `.length()` methods.
 * 
 * Note that this also does NOT implement the actual compilation logic,
 * eg there is nothing in there that says how to convert this to SQL or PRQL.
 * It is the responsibility of a Compiler to define this for a given computation backend.
 * This separation means that a `StringUpperOp` has shared semantics across all backends,
 * eg you could build it on the frontend and show a preview of the resulting data
 * with an in-memory compiler,
 * but then serialize the op to JSON, pass it to the backend, store it in a database,
 * and then the backend could deserialize it and compile it to SQL or PRQL or whatever,
 * then execute on the actual database, and the semantics of the operation would be preserved across all those steps.
 */
export interface IVOp<DT extends DataType = DataType, DS extends DataShape = DataShape, K extends string = string> {
    readonly kind: K
    /** The {@link DataType} of this expression. */
    dtype(): DT
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): DS
    getName(): string
    /** Optional symbol to mark this object as an Op. If not present, the object will be checked for the presence of 'kind', 'dtype', and 'dshape' properties. */
    [IsVOpSymbol]?: boolean
}

export interface IVExpr<DT extends DataType = DataType, DS extends DataShape = DataShape> {
    /** The {@link DataType} of this expression. */
    dtype(): DT
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): DS
    /** Convert this expression to its internal operation representation. */
    toOp(): IVOp<DT, DS>
    /** Optional symbol to mark this object as an Expr. If not present, the object will be checked for the presence of 'dtype' and 'dshape' properties. */
    [IsVExprSymbol]?: boolean
}

/**
 * Check if the given object satisfies the IVOp (Value Operation interface).
 * 
 * First checks for the presence of the IsVOpSymbol, then falls back to checking for all of the following properties:
 * - kind exists
 * - dtype() returns a valid DataType
 * - dshape() returns a valid DataShape
 */
export function isVOp(obj: any): obj is IVOp {
    // First check for the presence of the symbol property
    if (obj && typeof obj === 'object' && IsVOpSymbol in obj) {
        return obj[IsVOpSymbol]
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
 * Check if the given object satisfies IVExpr (Value Expression interface).
 * 
 * First checks for the presence of the IsVExprSymbol, then falls back to checking for all of the following properties:
 * - dtype() returns a valid DataType
 * - dshape() returns a valid DataShape
 * - toOp() exists
 */
export function isVExpr(obj: any): obj is IVExpr {
    // First check for the presence of the symbol property
    if (obj && typeof obj === 'object' && IsVExprSymbol in obj) {
        return obj[IsVExprSymbol]
    }
    // Fallback: check for the presence of 'dtype' and 'dshape' properties
    if (!obj || typeof obj !== 'object') {
        return false
    }
    const hasProperDtype = 'dtype' in obj && typeof obj.dtype === 'function' && isValidDataType(obj.dtype())
    const hasProperDshape = 'dshape' in obj && typeof obj.dshape === 'function' && isValidDataShape(obj.dshape())
    const hasToOp = 'toOp' in obj && typeof obj.toOp === 'function'
    return hasProperDtype && hasProperDshape && hasToOp
}

