import type { Schema, DataType } from './datatypes.js'

export interface Op {
    opcode: string
    [key: string]: unknown
}

export interface ValueOp<T extends DataType = DataType> extends Op {
    opcode: string
}

export interface ColOp<T extends DataType = DataType> extends ValueOp<T> {
    opcode: 'col'
    name: string
    dtype: T
}

export interface AggFuncOp<T extends DataType = DataType> extends ValueOp<T> {
    opcode: 'agg_func'
    func: 'count' | 'mean' | 'sum' | 'min' | 'max'
    arg?: ValueOp
}

export interface TableOp extends Op {
    opcode: 'table'
    name: string
    schema: Schema
}

export interface GroupByOp extends Op {
    opcode: 'group_by'
    table: Op
    by: ValueOp[]
    schema: Schema
}

export interface AggregateOp extends Op {
    opcode: 'aggregate'
    table: Op
    aggregates: Record<string, ValueOp>
    schema: Schema
}

export interface OrderByKeyOp extends Op {
    opcode: 'order_by_key'
    arg: ValueOp
    ascending: boolean
}

export interface OrderByOp extends Op {
    opcode: 'order_by'
    table: Op
    keys: OrderByKeyOp[]
    schema: Schema
}

export type TybisOperation = TableOp | ColOp | AggFuncOp | GroupByOp | AggregateOp | OrderByOp
