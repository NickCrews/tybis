import type { BuiltinOp } from '../ops.js'
import type { IRNode } from '../ir.js'
import { IOp } from '../core.js'
import type { DataType } from '../datatypes.js'

export interface Compiler<O extends IOp<any, any, any> = BuiltinOp> {
    compileOp(op: O): string
    compileIR(node: IRNode): string
}
