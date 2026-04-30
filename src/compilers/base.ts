import type { BuiltinVOp } from '../value/ops.js'
import type { BuiltinROp } from '../relation/index.js'
import { IVOp } from '../value/core.js'

export interface Compiler<O extends IVOp<any, any, string> = BuiltinVOp, R = BuiltinROp> {
    compileOp(op: O): string
    compileROp(node: R): string
}
