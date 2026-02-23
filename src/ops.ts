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

export interface TableOp<S extends Schema = Schema> extends Op {
    opcode: 'table'
    name: string
    schema: S
}

export interface GroupByOp<S extends Schema = Schema> extends Op {
    opcode: 'group_by'
    table: Op
    by: ValueOp[]
    schema: S
}

export interface AggregateOp<S extends Schema = Schema> extends Op {
    opcode: 'aggregate'
    table: Op
    aggregates: Record<string, ValueOp>
    schema: S
}

export interface OrderByKeyOp extends Op {
    opcode: 'order_by_key'
    arg: ValueOp
    ascending: boolean
}

export interface OrderByOp<S extends Schema = Schema> extends Op {
    opcode: 'order_by'
    table: Op
    keys: OrderByKeyOp[]
    schema: S
}

export type TybisOperation = TableOp | ColOp | AggFuncOp | GroupByOp | AggregateOp | OrderByOp
