import type { Schema, SchemaType } from './types.js'

export interface IRNode {
    op: string
    [key: string]: unknown
}

export interface TableNode extends IRNode {
    op: 'table'
    name: string
    schema: Schema
}

export interface ColNode extends IRNode {
    op: 'col'
    name: string
    type: SchemaType
}

export interface AggFuncNode extends IRNode {
    op: 'agg_func'
    func: 'count' | 'mean' | 'sum' | 'min' | 'max'
    arg?: IRNode
}

export interface GroupByNode extends IRNode {
    op: 'group_by'
    table: IRNode
    by: IRNode[]
    schema: Schema
}

export interface AggNode extends IRNode {
    op: 'aggregate'
    table: IRNode
    aggregates: Record<string, IRNode>
    schema: Schema
}

export interface OrderByNode extends IRNode {
    op: 'order_by'
    table: IRNode
    by: IRNode[]
    ascending: boolean[]
    schema: Schema
}

export type TybisIR = TableNode | ColNode | AggFuncNode | GroupByNode | AggNode | OrderByNode
