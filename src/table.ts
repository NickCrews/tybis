import type { Schema, GroupBySchema, AggResult, MergeSchema, SchemaToJS } from './types.js'
import type { Expr } from './expr.js'
import type { IRNode, GroupByNode, AggNode, OrderByNode } from './ir.js'
import { Col } from './expr.js'

export class Table<S extends Schema = Schema> {
    constructor(
        public readonly schema: S,
        protected readonly ir: IRNode
    ) { }

    group_by<K extends (keyof S & string)[]>(
        ...cols: { [I in keyof K]: Col<K[I], S[K[I]], S> }
    ): GroupedTable<S, K> {
        return new GroupedTable(this.schema, this.ir, cols)
    }

    order_by(...cols: Expr[]): Table<S> {
        const orderByIR: OrderByNode = {
            op: 'order_by',
            table: this.ir,
            by: cols.map(c => c.toIR()),
            ascending: cols.map(() => true),
            schema: this.schema
        }
        return new Table(this.schema, orderByIR)
    }

    to_json(): string {
        return JSON.stringify(this.ir, null, 2)
    }

    async to_sql(): Promise<string> {
        const { compileToSQL } = await import('./backends/duckdb/compiler.js')
        return compileToSQL(this.ir)
    }

    async to_records(): Promise<SchemaToJS<S>[]> {
        const { compileToDuckDB } = await import('./backends/duckdb/compiler.js')
        const { executeQuery } = await import('./backends/duckdb/conn.js')
        const duckdbJSON = compileToDuckDB(this.ir)
        return executeQuery(duckdbJSON)
    }

    toString(): string {
        return this._formatIR(this.ir, 0)
    }

    private _formatIR(node: IRNode, indent: number): string {
        const pad = '  '.repeat(indent)

        switch (node.op) {
            case 'table':
                return `${pad}Table(${node.name})`
            case 'group_by':
                const groupNode = node as GroupByNode
                const byCols = groupNode.by.map(c => (c as any).name).join(', ')
                return `${pad}GroupBy(${byCols})\n${this._formatIR(groupNode.table, indent + 1)}`
            case 'aggregate':
                const aggNode = node as AggNode
                const aggs = Object.entries(aggNode.aggregates)
                    .map(([k, v]) => `${k}=${(v as any).func}`)
                    .join(', ')
                return `${pad}Aggregate(${aggs})\n${this._formatIR(aggNode.table, indent + 1)}`
            case 'order_by':
                const orderNode = node as OrderByNode
                const orderCols = orderNode.by.map(c => (c as any).name).join(', ')
                return `${pad}OrderBy(${orderCols})\n${this._formatIR(orderNode.table, indent + 1)}`
            default:
                return `${pad}${node.op}`
        }
    }
}

export class GroupedTable<S extends Schema, K extends (keyof S & string)[]> {
    constructor(
        private readonly schema: S,
        private readonly tableIR: IRNode,
        private readonly groupCols: Expr[]
    ) { }

    agg<A extends Record<string, Expr>>(
        aggregates: A
    ): Table<MergeSchema<GroupBySchema<S, K>, AggResult<A>>> {
        const groupByIR: GroupByNode = {
            op: 'group_by',
            table: this.tableIR,
            by: this.groupCols.map(c => c.toIR()),
            schema: this.schema
        }

        const aggIR: AggNode = {
            op: 'aggregate',
            table: groupByIR,
            aggregates: Object.fromEntries(
                Object.entries(aggregates).map(([k, v]) => [k, v.toIR()])
            ),
            schema: {} as any
        }

        const resultSchema = {} as any
        for (const col of this.groupCols) {
            const colNode = col.toIR() as any
            resultSchema[colNode.name] = this.schema[colNode.name]
        }
        for (const key of Object.keys(aggregates)) {
            resultSchema[key] = 'number'
        }

        aggIR.schema = resultSchema

        return new Table(resultSchema, aggIR)
    }
}
