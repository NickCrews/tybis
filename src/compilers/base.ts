import type { BuiltinOp } from '../value/ops.js'
import type { IRNode } from '../ir.js'
import { IOp } from '../value/core.js'
import type { DataType } from '../datatype.js'

export interface Compiler<O extends IOp<any, any, any> = BuiltinOp> {
    compileOp(op: O): string
    compileIR(node: IRNode): string
}
