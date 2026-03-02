export type DataShape = 'scalar' | 'columnar'

export type HighestDataShape<Shapes extends DataShape[]> =
    Shapes extends [] ? never :
    'columnar' extends Shapes[number] ? 'columnar' : 'scalar'

/** Return the highest data shape among the provided shapes.
*/
export function highestDataShape<S extends DataShape[]>(shape1: DataShape, ...rest: S): HighestDataShape<[DataShape, ...S]> {
    if (typeof shape1 === 'undefined') {
        throw new Error('At least one data shape must be provided')
    }
    if (shape1 === 'columnar') {
        return 'columnar' as HighestDataShape<[DataShape, ...S]>
    }
    for (const shape of rest) {
        if (shape === 'columnar') {
            return 'columnar' as HighestDataShape<[DataShape, ...S]>
        }
    }
    return 'scalar' as HighestDataShape<[DataShape, ...S]>
}