import type { Schema, GroupBySchema, AggResult, MergeSchema, SchemaToJS } from './datatypes.js'
import type { Expr } from './expr.js'
import type { Op, GroupByOp, AggregateOp, OrderByOp, TableOp } from './ops.js'
import { Col } from './expr.js'
import { getSqlCompiler } from './backends/baseCompiler.js'
import { getConn } from './backends/baseConn.js'

class SchemaTable<S extends Schema> {
    constructor(private schema: S) { }

    col<K extends keyof S & string>(name: K): Col<K, S[K], S> {
        return new Col(name, this.schema[name] as S[K], this.schema)
    }
}

export class Table<S extends Schema = Schema> {
    constructor(
        public readonly schema: S,
        protected readonly _arg: Op
    ) { }

    op(): Op {
        return this._arg
    }

    group_by(
        cols: (t: SchemaTable<S>) => Col<any, any, S> | Col<any, any, S>[]
    ): GroupedTable<S, (keyof S & string)[]> {
        const table = new SchemaTable(this.schema)
        const colsArray = cols(table)
        const colsList = Array.isArray(colsArray) ? colsArray : [colsArray]
        return new GroupedTable(this.schema, this._arg, colsList)
    }

    order_by(cols: (t: SchemaTable<S>) => Expr | Expr[]): Table<S> {
        const table = new SchemaTable(this.schema)
        const colsArray = cols(table)
        const colsList = Array.isArray(colsArray) ? colsArray : [colsArray]

        const orderByOp: OrderByOp<S> = {
            opcode: 'order_by',
            table: this._arg,
            keys: colsList.map(c => ({
                opcode: 'order_by_key',
                arg: c.op(),
                ascending: true
            })),
            schema: this.schema
        }
        return new Table(this.schema, orderByOp)
    }

    to_json(): string {
        return JSON.stringify(this._arg, null, 2)
    }

    async to_sql(): Promise<string> {
        const compiler = getSqlCompiler(this._arg)
        return compiler.toSql(this._arg)
    }

    async to_records(): Promise<SchemaToJS<S>[]> {
        const conn = await getConn(this._arg)
        return conn.to_records(this._arg as Op & { schema: S })
    }

    toString(): string {
        return this._formatOp(this._arg, 0)
    }

    private _formatOp(node: Op, indent: number): string {
        const pad = '  '.repeat(indent)

        switch (node.opcode) {
            case 'table':
                return `${pad}Table(${node.name})`
            case 'group_by':
                const groupNode = node as GroupByOp
                const byCols = groupNode.by.map(c => (c as any).name).join(', ')
                return `${pad}GroupBy(${byCols})\n${this._formatOp(groupNode.table, indent + 1)}`
            case 'aggregate':
                const aggNode = node as AggregateOp
                const aggs = Object.entries(aggNode.aggregates)
                    .map(([k, v]) => `${k}=${(v as any).func}`)
                    .join(', ')
                return `${pad}Aggregate(${aggs})\n${this._formatOp(aggNode.table, indent + 1)}`
            case 'order_by':
                const orderNode = node as OrderByOp
                const orderCols = orderNode.keys.map(c => (c.arg as any).name).join(', ')
                return `${pad}OrderBy(${orderCols})\n${this._formatOp(orderNode.table, indent + 1)}`
            default:
                return `${pad}${node.opcode}`
        }
    }
}

export class GroupedTable<S extends Schema, K extends (keyof S & string)[]> {
    constructor(
        private readonly schema: S,
        private readonly tableOp: Op,
        private readonly groupCols: Expr[]
    ) { }

    agg<A extends Record<string, Expr>>(
        aggregates: (t: SchemaTable<S>) => A
    ): Table<MergeSchema<GroupBySchema<S, K>, AggResult<A>>> {
        const table = new SchemaTable(this.schema)
        const aggregatesObj = aggregates(table)

        const groupByOp: GroupByOp<S> = {
            opcode: 'group_by',
            table: this.tableOp,
            by: this.groupCols.map(c => c.op()),
            schema: this.schema
        }

        const aggOp: AggregateOp<S> = {
            opcode: 'aggregate',
            table: groupByOp,
            aggregates: Object.fromEntries(
                Object.entries(aggregatesObj).map(([k, v]) => [k, v.op()])
            ),
            schema: {} as any
        }

        const resultSchema = {} as any
        for (const col of this.groupCols) {
            const colNode = col.op() as any
            resultSchema[colNode.name] = this.schema[colNode.name]
        }
        for (const key of Object.keys(aggregatesObj)) {
            resultSchema[key] = 'number'
        }

        aggOp.schema = resultSchema

        return new Table(resultSchema, aggOp)
    }
}
