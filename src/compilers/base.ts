import type { BuiltinOp } from '../value/ops.js'
import type { IRNode } from '../ir.js'
import { IVOp } from '../value/core.js'
import type { DataType } from '../datatype.js'

export interface Compiler<O extends IVOp<any, any, any> = BuiltinOp> {
    compileOp(op: O): string
    compileIR(node: IRNode): string
}
