export { Table, GroupedTable } from './table.js'
export { Expr, ValueExpr, Col, AggFunc, count } from './expr.js'
export type { Schema, DataType as SchemaType, InferSchema, SchemaToJS } from './datatypes.js'
export type { TybisOperation, Op as Operation, ValueOp, TableOp, ColOp, AggFuncOp, GroupByOp, AggregateOp, OrderByOp } from './ops.js'

import * as duckdbConn from './backends/duckdb/conn.js'

// TODO: can I have a top level await?
const _duckdbDefaultConn = await duckdbConn.defaultConn()

export const duckdb = {
    defaultConn: _duckdbDefaultConn,
    table: _duckdbDefaultConn.table.bind(_duckdbDefaultConn),
}
