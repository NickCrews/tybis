import { compile, CompileOptions } from 'prqlc'
import type { Compiler } from './base.js'
import type { Expr } from '../expr.js'
import type { IRNode } from '../ir.js'
import { PrqlCompiler } from './prql-compiler.js'

/**
 * Compiles expression trees and IR to SQL by first generating PRQL
 * and then using the prqlc compiler to produce SQL.
 */
export class SqlCompiler implements Compiler {
    private readonly prqlCompiler = new PrqlCompiler()

    compileExpr(expr: Expr): string {
        return this.prqlCompiler.compileExpr(expr)
    }

    compileIR(node: IRNode): string {
        const prqlText = this.prqlCompiler.compileIR(node)
        const opts = new CompileOptions()
        opts.format = false
        opts.signature_comment = false
        const result = compile(prqlText, opts)
        if (result === undefined) {
            throw new Error(`PRQL compilation failed for query:\n${prqlText}`)
        }
        return result
    }
}
