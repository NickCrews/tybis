import type { BuiltinOp } from '../value/ops.js'
import type { BuiltinROp } from '../rop.js'
import { IVOp } from '../value/core.js'

export interface Compiler<O extends IVOp<any, any, any> = BuiltinOp, R = BuiltinROp> {
    compileOp(op: O): string
    compileROp(node: R): string
}
