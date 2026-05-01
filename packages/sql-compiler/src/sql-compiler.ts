import { compile, CompileOptions } from 'prqlc'
import {
    PrqlCompiler,
    type BuiltinROp,
    type BuiltinVOp,
    type Compiler,
} from 'tybis'

export class SqlCompiler implements Compiler {
    private readonly prqlCompiler = new PrqlCompiler()

    compileVOp(op: BuiltinVOp): string {
        return this.prqlCompiler.compileVOp(op)
    }

    compileROp(node: BuiltinROp): string {
        const prqlText = this.prqlCompiler.compileROp(node)
        const opts = new CompileOptions()
        opts.target = 'sql.duckdb'
        opts.format = false
        opts.signature_comment = false
        let result: string | undefined
        try {
            result = compile(prqlText, opts)
        } catch (error) {
            throw new Error(`PRQL compilation failed for query:\n${prqlText}\nError: ${error}`, { cause: error })
        }
        if (result === undefined) {
            throw new Error(`PRQL compilation failed for query:\n${prqlText}`)
        }
        return result
    }
}
