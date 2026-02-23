import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api'
import { type Schema, type InferSchema, type SchemaToJS, inferSchemaFromRecords } from '../../datatypes.js'
import { Table } from '../../table.js'
import type { Op, TableOp } from '../../ops.js'
import { type DuckDBJSON, compileToDuckDB } from './compiler.js'

export class DuckDBConn {
    private duckdbInstance: DuckDBInstance
    private duckdbConnection: DuckDBConnection
    private tableCounter: number = 0

    constructor(instance: DuckDBInstance, connection: DuckDBConnection) {
        this.duckdbInstance = instance
        this.duckdbConnection = connection
    }

    static async create(): Promise<DuckDBConn> {
        const instance = await DuckDBInstance.create(':memory:')
        const connection = await instance.connect()
        return new DuckDBConn(instance, connection)
    }

    async table<T extends readonly Record<string, unknown>[]>(
        data: T
    ): Promise<Table<InferSchema<T>>> {
        const schema = inferSchemaFromRecords(data) as InferSchema<T>
        const tableName = `__tybis_table_${this.tableCounter++}`

        const columns = Object.keys(schema)
        const columnDefs = columns.map(col => {
            const dtype = schema[col] as string
            let sqlType = 'VARCHAR'
            if (dtype === 'number') sqlType = 'DOUBLE'
            else if (dtype === 'boolean') sqlType = 'BOOLEAN'
            return `"${col}" ${sqlType}`
        })
        const createSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs.join(', ')})`

        await this.duckdbConnection.run(createSQL)

        for (const row of data) {
            const values = columns.map(col => {
                const val = row[col]
                return typeof val === 'string' ? `'${String(val).replace(/'/g, "''")}'` : val
            })
            const insertSQL = `INSERT INTO ${tableName} VALUES (${values.join(', ')})`
            await this.duckdbConnection.run(insertSQL)
        }

        const tableOp: TableOp<InferSchema<T>> = {
            opcode: 'table',
            name: tableName,
            schema
        }

        return new Table(schema, tableOp)
    }

    async to_records(op: Op): Promise<SchemaToJS<any>[]> {
        const duckdbJSON = compileToDuckDB(op)
        return await this.executeQuery(duckdbJSON)
    }



    async executeQuery(duckdbJSON: DuckDBJSON): Promise<any[]> {
        const jsonStr = JSON.stringify(duckdbJSON)
        const sql = `CALL json_execute_serialized_sql('${jsonStr.replace(/'/g, "\''")}')`
        const reader = await this.duckdbConnection.runAndReadAll(sql)
        const rows = reader.getRowObjectsJS()
        const normalizeValue = (value: unknown): unknown => {
            if (typeof value === 'bigint') {
                return Number(value)
            }
            if (Array.isArray(value)) {
                return value.map(normalizeValue)
            }
            if (value && typeof value === 'object') {
                return Object.fromEntries(
                    Object.entries(value).map(([key, val]) => [key, normalizeValue(val)])
                )
            }
            return value
        }

        return rows.map(row => normalizeValue(row) as Record<string, unknown>)
    }

    async executeToSQL(duckdbJSON: DuckDBJSON): Promise<string> {
        const jsonStr = JSON.stringify(duckdbJSON)
        const sql = `SELECT json_deserialize_sql('${jsonStr.replace(/'/g, "\''")}') as foo`
        const reader = await this.duckdbConnection.runAndReadAll(sql)
        const rows = reader.getRowObjectsJS()
        // @ts-expect-error - DuckDB's type inference doesn't know the shape of the result here
        return rows[0].foo
    }
}

let _defaultConn: DuckDBConn | null = null

export async function defaultConn(): Promise<DuckDBConn> {
    if (_defaultConn) {
        return _defaultConn
    }
    const conn = await DuckDBConn.create()
    _defaultConn = conn
    return conn
}
