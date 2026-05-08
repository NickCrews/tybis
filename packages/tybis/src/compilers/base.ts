import { type IROp } from '../relation/index.js'
import { type IVOp } from '../value/core.js'

export interface VCompiler<Result, Accepts extends IVOp = IVOp> {
    compileVOp(op: Accepts): Result
}

export interface RCompiler<Result, Accepts extends IROp = IROp> {
    compileROp(op: Accepts): Result
}

export interface Compiler<
    VResult,
    RResult,
    VAccepts extends IVOp = IVOp,
    RAccepts extends IROp = IROp
> extends VCompiler<VResult, VAccepts>, RCompiler<RResult, RAccepts> { }
