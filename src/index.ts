export { Table, GroupedTable } from './table.js'
export { Expr, ValueExpr, Col, AggFunc, count } from './expr.js'
export type { Schema, DataType as SchemaType, InferSchema, SchemaToJS } from './datatypes.js'
export type { TybisOperation, Op as Operation, ValueOp, TableOp, ColOp, AggFuncOp, GroupByOp, AggregateOp, OrderByOp } from './ops.js'

import * as duckdbConn from './backends/duckdb/conn.js'

export const duckdb = {
    table: duckdbConn.table
}
