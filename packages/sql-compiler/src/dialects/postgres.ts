import type { BuiltinVOp } from 'tybis'
import {
    type ROpPlanHandlers,
    type VOpHandlers,
    SqlCompiler,
} from '../compiler.js'
import { ANSI_R_HANDLERS, ANSI_V_HANDLERS } from '../ansi-handlers.js'
import { f, param } from '../types.js'

export class PostgresSqlCompiler extends SqlCompiler {
    readonly vHandlers: VOpHandlers<SqlCompiler> = {
        ...ANSI_V_HANDLERS,
        contains(op) {
            return f`strpos(${this.compileVOp(op.operand as BuiltinVOp)}, ${this.compileVOp(op.pattern as BuiltinVOp)}) > 0`
        },
        starts_with(op) {
            return f`starts_with(${this.compileVOp(op.operand as BuiltinVOp)}, ${this.compileVOp(op.prefix as BuiltinVOp)})`
        },
        temporal_to_string(op) {
            return f`to_char(${this.compileVOp(op.operand as BuiltinVOp)}, ${[param(op.format)]})`
        },
    }
    readonly rHandlers: ROpPlanHandlers<SqlCompiler> = ANSI_R_HANDLERS
}
