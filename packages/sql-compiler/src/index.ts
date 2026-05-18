import { BuiltinROp, Relation, Schema } from 'tybis'
import { DuckDbSqlCompiler } from './dialects/duckdb.js'
import { MySqlSqlCompiler } from './dialects/mysql.js'
import { PostgresSqlCompiler } from './dialects/postgres.js'
import { SqliteSqlCompiler } from './dialects/sqlite.js'
import { CompiledQuery } from './types.js'

export {
    type Param,
    type SqlFragment,
    type Sql,
    type CompiledQuery,
    f,
    param,
} from './types.js'

export {
    type SqlVOp,
    type VOpHandlers,
    type ROpPlanHandlers,
    type PlannerCtx,
    type QueryLevel,
    SqlCompiler,
    closeLevel,
} from './compiler.js'

export { ANSI_V_HANDLERS, ANSI_R_HANDLERS } from './ansi-handlers.js'

export { DuckDbSqlCompiler } from './dialects/duckdb.js'
export { PostgresSqlCompiler } from './dialects/postgres.js'
export { MySqlSqlCompiler } from './dialects/mysql.js'
export { SqliteSqlCompiler } from './dialects/sqlite.js'
export { sql } from './vexpr.js'

export const DIALECT_TO_COMPILER_CLASS = {
    duckdb: DuckDbSqlCompiler,
    postgres: PostgresSqlCompiler,
    mysql: MySqlSqlCompiler,
    sqlite: SqliteSqlCompiler,
} as const
export const DIALECTS = Object.keys(DIALECT_TO_COMPILER_CLASS) as (keyof typeof DIALECT_TO_COMPILER_CLASS)[]
export type Dialect = typeof DIALECTS[number]

/** Compile a {@link Relation} to a SQL string and params. */
export function toSql(relation: Relation<Schema, BuiltinROp>, dialect: Dialect = "duckdb"): CompiledQuery {
    const compiler = new DIALECT_TO_COMPILER_CLASS[dialect]()
    return compiler.compileROp(relation._op)
}