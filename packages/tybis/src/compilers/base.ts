import type { BuiltinROp } from '../relation/index.js'

export interface Compiler<Result = string> {
    compileROp(op: BuiltinROp): Result
}
