import type { BuiltinVOp } from 'tybis'
import {
    type ROpPlanHandlers,
    type VOpHandlers,
    SqlCompiler,
} from '../compiler.js'
import { ANSI_R_HANDLERS, ANSI_V_HANDLERS } from '../ansi-handlers.js'
import { f, param } from '../types.js'

export class SqliteSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler> = {
        ...ANSI_V_HANDLERS,
        contains(op) {
            return f`instr(${this.compileVOp(op.operand as BuiltinVOp)}, ${this.compileVOp(op.pattern as BuiltinVOp)}) > 0`
        },
        starts_with(op) {
            const operand = this.compileVOp(op.operand as BuiltinVOp)
            const prefix = this.compileVOp(op.prefix as BuiltinVOp)
            return f`substr(${operand}, 1, length(${prefix})) = ${prefix}`
        },
        temporal_to_string(op) {
            return f`strftime(${[param(op.format)]}, ${this.compileVOp(op.operand as BuiltinVOp)})`
        },
    }
    readonly rHandlers: ROpPlanHandlers<SqlCompiler> = ANSI_R_HANDLERS

    protected override placeholder(_n: number): string {
        return `?`
    }
}
