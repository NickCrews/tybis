import type { BuiltinOp } from '../value/ops.js'
import type { ITableOp } from '../ir.js'
import { IOp } from '../value/core.js'

export interface Compiler<O extends IOp<any, any, any> = BuiltinOp> {
    compileOp(op: O): string
    compileIR(node: ITableOp): string
}
