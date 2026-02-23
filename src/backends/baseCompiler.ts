
import { Op } from '../ops.js'
import { DuckDBCompiler } from './duckdb/compiler.js'

export interface SqlCompiler {
    toSql(op: Op): string
}

export function getDefaultSqlCompiler(): SqlCompiler {
    return new DuckDBCompiler()
}

export function getSqlCompiler(op: Op, dialect?: 'duckdb'): SqlCompiler {
    if (dialect === 'duckdb') {
        return new DuckDBCompiler()
    } else if (typeof dialect === 'undefined') {
        return getDefaultSqlCompiler()
    } else {
        throw new Error(`Unsupported SQL dialect: ${dialect satisfies never}`)
    }
}