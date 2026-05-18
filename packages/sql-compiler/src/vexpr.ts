import { DataShape, DataType, vOpToVExpr } from "tybis";
import { RawSqlOp } from "./ops";

/**
 * Creates a raw SQL expression. The caller must provide the raw SQL string, as well as the expected dtype and dshape of the result.
 * This is an escape hatch for when you need to use a function or expression that isn't natively supported by Tybis.
 *
 * The provided dtype and dshape will ONLY be used for type-checking and expression-building purposes,
 * and will have no effect at runtime.
 * So if you pass the wrong dtype/dshape, your code might type-check but then fail at runtime, or return incorrect results.
 * Use with caution!
 *
 * @param rawSql The raw SQL string to use.
 * @param dtype The expected data type of the result.
 * @param dshape The expected data shape of the result.
 * @returns A VExpr representing the raw SQL expression.
 */
export function sql<DT extends DataType, DS extends DataShape>(rawSql: string, dtype: DT, dshape: DS) {
    return vOpToVExpr(new RawSqlOp(rawSql, dtype, dshape))
}