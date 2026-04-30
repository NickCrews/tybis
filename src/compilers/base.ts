import type { BuiltinVOp } from '../value/ops.js'
import type { BuiltinROp } from '../relation/index.js'
import { IVOp } from '../value/core.js'

export interface Compiler<V extends IVOp<any, any, string> = BuiltinVOp, R = BuiltinROp> {
    compileVOp(op: V): string
    compileROp(op: R): string
}
