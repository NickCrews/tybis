import type { IOp, BuiltinOp } from '../ops.js'
import type { IRNode } from '../ir.js'

export interface Compiler<O extends IOp = BuiltinOp> {
    compileOp(op: O): string
    compileIR(node: IRNode): string
}
