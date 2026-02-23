
import { SchemaToJS } from '../datatypes.js'
import { Op } from '../ops.js'
import { DuckDBConn, defaultConn } from './duckdb/conn.js'

export interface Conn {
    to_records<T extends Op & { schema: any }>(op: T): Promise<SchemaToJS<T['schema']>[]>
}

export async function getDefaultConn(): Promise<Conn> {
    return defaultConn()
}

export async function getConn(op: Op, dialect?: 'duckdb'): Promise<Conn> {
    if (dialect === 'duckdb') {
        return await defaultConn()
    } else if (typeof dialect === 'undefined') {
        return getDefaultConn()
    } else {
        throw new Error(`Unsupported SQL dialect: ${dialect satisfies never}`)
    }
}