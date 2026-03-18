import type { BuiltinOp } from '../value/ops.js'
import type { IRNode } from '../relation/ir.js'
import { IOp } from '../value/core.js'

export interface Compiler<O extends IOp<any, any, any> = BuiltinOp> {
    compileOp(op: O): string
    compileIR(node: IRNode): string
}
