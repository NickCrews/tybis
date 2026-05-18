import {
    BaseVOp,
    type DataType,
    type DataShape,
} from 'tybis'

/**
 * Op for a raw SQL fragment. The `dtype` / `dshape` are caller-provided
 * type hints used during expression building and have no runtime effect —
 * passing the wrong values can produce code that type-checks but fails or
 * returns wrong results at compile time.
 */
export class RawSqlOp<DT extends DataType = DataType, DS extends DataShape = DataShape> extends BaseVOp<DT, DS> {
    readonly kind = 'raw_sql' as const
    constructor(readonly rawSql: string, dtype: DT, dshape: DS) { super(dtype, dshape) }
}
