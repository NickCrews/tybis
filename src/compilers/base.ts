import type { BuiltinOp } from '../ops.js'
import type { IRNode } from '../ir.js'
import { IOp } from '../core.js'

export interface Compiler<O extends IOp = BuiltinOp> {
    compileOp(op: O): string
    compileIR(node: IRNode): string
}
