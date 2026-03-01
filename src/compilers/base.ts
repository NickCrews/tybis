import type { Expr } from '../expr.js'
import type { IRNode } from '../ir.js'

/** Interface for compiling expression trees and IR nodes into query strings. */
export interface Compiler {
    /** Compile an expression node to a string. */
    compileExpr(expr: Expr): string

    /** Compile a full IR tree to a query string. */
    compileIR(node: IRNode): string
}
