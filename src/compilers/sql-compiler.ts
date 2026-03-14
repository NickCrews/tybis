import { compile, CompileOptions } from 'prqlc'
import type { Compiler } from './base.js'
import type { BuiltinOp } from '../value/ops.js'
import type { IRNode } from '../ir.js'
import { PrqlCompiler } from './prql-compiler.js'

export class SqlCompiler implements Compiler {
    private readonly prqlCompiler = new PrqlCompiler()

    compileOp(op: BuiltinOp): string {
        return this.prqlCompiler.compileOp(op)
    }

    compileIR(node: IRNode): string {
        const prqlText = this.prqlCompiler.compileIR(node)
        const opts = new CompileOptions()
        opts.target = 'sql.duckdb'
        opts.format = false
        opts.signature_comment = false
        let result: string | undefined
        try {
            result = compile(prqlText, opts)
        } catch (error) {
            throw new Error(`PRQL compilation failed for query:\n${prqlText}\nError: ${error}`)
        }
        if (result === undefined) {
            throw new Error(`PRQL compilation failed for query:\n${prqlText}`)
        }
        return result
    }
}
