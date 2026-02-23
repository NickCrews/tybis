import { DuckDBInstance } from '@duckdb/node-api'
import type { Schema, InferSchema } from '../types.js'
import { Table } from '../table.js'
import type { TableNode } from '../ir.js'
import type { DuckDBJSON } from '../compiler/duckdb.js'

let dbInstance: DuckDBInstance | null = null
let dbConnection: any | null = null

async function getDB(): Promise<DuckDBInstance> {
    if (!dbInstance) {
        dbInstance = await DuckDBInstance.create(':memory:')
    }
    return dbInstance
}

async function getConnection() {
    if (!dbConnection) {
        const db = await getDB()
        dbConnection = await db.connect()
    }
    return dbConnection
}

function inferSchemaFromData(data: readonly Record<string, unknown>[]): Schema {
    if (data.length === 0) {
        return {}
    }

    const schema: Schema = {}
    const first = data[0] as Record<string, unknown>

    for (const [key, value] of Object.entries(first)) {
        if (typeof value === 'string') {
            schema[key] = 'string'
        } else if (typeof value === 'number') {
            schema[key] = 'number'
        } else if (typeof value === 'boolean') {
            schema[key] = 'boolean'
        } else {
            schema[key] = 'null'
        }
    }

    return schema
}

let tableCounter = 0

export async function table<T extends readonly Record<string, unknown>[]>(
    data: T
): Promise<Table<InferSchema<T>>> {
    const schema = inferSchemaFromData(data) as InferSchema<T>
    const tableName = `__tybis_table_${tableCounter++}`

    const conn = await getConnection()

    const columns = Object.keys(schema)
    const columnDefs = columns.map(col => {
        const type = schema[col] as string
        let sqlType = 'VARCHAR'
        if (type === 'number') sqlType = 'DOUBLE'
        else if (type === 'boolean') sqlType = 'BOOLEAN'
        return `"${col}" ${sqlType}`
    })
    const createSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs.join(', ')})`

    await conn.run(createSQL)

    for (const row of data) {
        const values = columns.map(col => {
            const val = row[col]
            return typeof val === 'string' ? `'${String(val).replace(/'/g, "''")}'` : val
        })
        const insertSQL = `INSERT INTO ${tableName} VALUES (${values.join(', ')})`
        await conn.run(insertSQL)
    }

    const tableIR: TableNode = {
        op: 'table',
        name: tableName,
        schema
    }

    return new Table(schema, tableIR)
}

export async function executeQuery(duckdbJSON: DuckDBJSON): Promise<any[]> {
    const conn = await getConnection()

    const jsonStr = JSON.stringify(duckdbJSON)
    const sql = `CALL json_execute_serialized_sql('${jsonStr.replace(/'/g, "\''")}')`
    const reader = await conn.runAndReadAll(sql)
    const rows = reader.getRowObjectsJS()
    return rows
}

export async function executeToSQL(duckdbJSON: DuckDBJSON): Promise<string> {
    // DuckDB doesn't have a JSON → SQL function, only SQL → JSON
    // For now, we'll generate SQL from our IR manually
    // This is a simplified version that won't work for complex queries
    throw new Error('to_sql() not yet implemented - use to_records() to execute queries')
}
