import { IVExpr, IVOp } from "./value/core"
import { InferrableJsType } from "./datatype"

export type DataShape = 'scalar' | 'columnar'

export type HighestDataShape<Shapes extends DataShape[]> =
    Shapes extends [] ? never :
    'columnar' extends Shapes[number] ? 'columnar' : 'scalar'

/** Return the highest data shape among the provided shapes.
*/
export function highestDataShape<First extends DataShape, Rest extends DataShape[]>(shape1: First, ...rest: Rest): HighestDataShape<[First, ...Rest]> {
    if (typeof shape1 === 'undefined') {
        throw new Error('At least one data shape must be provided')
    }
    if (shape1 === 'columnar') {
        return 'columnar' as HighestDataShape<[First, ...Rest]>
    }
    for (const shape of rest) {
        if (shape === 'columnar') {
            return 'columnar' as HighestDataShape<[First, ...Rest]>
        }
    }
    return 'scalar' as HighestDataShape<[First, ...Rest]>
}

export function isValidDataShape(obj: any): obj is DataShape {
    return obj === 'scalar' || obj === 'columnar'
}

export type IntoDataShape = DataShape | IVExpr<any, any> | IVOp<any, any> | InferrableJsType

export type InferDataShape<T extends IntoDataShape> =
    T extends DataShape ? T :
    T extends IVExpr<any, infer DS> ? DS :
    T extends IVOp<any, infer DS> ? DS :
    T extends InferrableJsType ? 'scalar' :
    never