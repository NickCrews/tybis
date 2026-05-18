import {
    type ROpPlanHandlers,
    type SqlVOp,
    type VOpHandlers,
    SqlCompiler,
} from '../compiler.js'
import { ANSI_R_HANDLERS, ANSI_V_HANDLERS } from '../ansi-handlers.js'
import { f, param } from '../types.js'

export class PostgresSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler> = {
        ...ANSI_V_HANDLERS,
        contains(op) {
            return f`strpos(${this.compileVOp(op.operand as SqlVOp)}, ${this.compileVOp(op.pattern as SqlVOp)}) > 0`
        },
        starts_with(op) {
            return f`starts_with(${this.compileVOp(op.operand as SqlVOp)}, ${this.compileVOp(op.prefix as SqlVOp)})`
        },
        temporal_to_string(op) {
            return f`to_char(${this.compileVOp(op.operand as SqlVOp)}, ${[param(op.format)]})`
        },
    }
    readonly rHandlers: ROpPlanHandlers<SqlCompiler> = ANSI_R_HANDLERS
}
