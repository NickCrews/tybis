export { Table, GroupedTable } from './table.js'
export { Expr, Col, AggFunc, col, count } from './expr.js'
export type { Schema, SchemaType, InferSchema, SchemaToJS } from './types.js'
export type { TybisIR, IRNode, TableNode, ColNode, AggFuncNode, GroupByNode, AggNode, OrderByNode } from './ir.js'

import * as duckdbBackend from './backend/duckdb.js'

export const duckdb = {
    table: duckdbBackend.table
}
