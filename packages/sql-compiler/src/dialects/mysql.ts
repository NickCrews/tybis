import {
    type ROpPlanHandlers,
    type SqlVOp,
    type VOpHandlers,
    SqlCompiler,
} from '../compiler.js'
import { ANSI_R_HANDLERS, ANSI_V_HANDLERS } from '../ansi-handlers.js'
import { f, param } from '../types.js'

export class MySqlSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler> = {
        ...ANSI_V_HANDLERS,
        contains(op) {
            return f`LOCATE(${this.compileVOp(op.pattern as SqlVOp)}, ${this.compileVOp(op.operand as SqlVOp)}) > 0`
        },
        starts_with(op) {
            const operand = this.compileVOp(op.operand as SqlVOp)
            const prefix = this.compileVOp(op.prefix as SqlVOp)
            return f`LEFT(${operand}, CHAR_LENGTH(${prefix})) = ${prefix}`
        },
        temporal_to_string(op) {
            return f`DATE_FORMAT(${this.compileVOp(op.operand as SqlVOp)}, ${[param(op.format)]})`
        },
    }
    readonly rHandlers: ROpPlanHandlers<SqlCompiler> = ANSI_R_HANDLERS

    protected override placeholder(_n: number): string {
        return `?`
    }
    protected override quoteIdent(name: string): string {
        return `\`${name.replace(/`/g, '``')}\``
    }
}
