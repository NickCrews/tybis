import type { Compiler } from './base.js'
import type { IRNode } from '../ir.js'
import {
    BaseExpr, ColRef, NumberLiteral, StringLiteral, BooleanLiteral, NullLiteral,
    Eq, Gt, Gte, Lt, Lte, IsNotNull, And, Or,
    Div, Upper, Lower, Contains, StartsWith,
    Mean, Sum, Min, Max, Count, RawSql, AggExpr,
    StringCol, NumericCol, BooleanCol,
    type SortExpr,
} from '../expr.js'

export class PrqlCompiler implements Compiler {
    compileExpr(expr: BaseExpr): string {
        // Column references
        if (expr instanceof StringCol || expr instanceof NumericCol || expr instanceof BooleanCol || expr instanceof ColRef) {
            return (expr as { name: string }).name
        }

        // Literals
        if (expr instanceof NumberLiteral) return String(expr.value)
        if (expr instanceof StringLiteral) return `"${expr.value}"`
        if (expr instanceof BooleanLiteral) return String(expr.value)
        if (expr instanceof NullLiteral) return 'null'

        // Comparisons
        if (expr instanceof Eq) return `${this.compileExpr(expr.left)} == ${this.compileExpr(expr.right)}`
        if (expr instanceof Gt) return `${this.compileExpr(expr.left)} > ${this.compileExpr(expr.right)}`
        if (expr instanceof Gte) return `${this.compileExpr(expr.left)} >= ${this.compileExpr(expr.right)}`
        if (expr instanceof Lt) return `${this.compileExpr(expr.left)} < ${this.compileExpr(expr.right)}`
        if (expr instanceof Lte) return `${this.compileExpr(expr.left)} <= ${this.compileExpr(expr.right)}`
        if (expr instanceof IsNotNull) return `${this.compileExpr(expr.operand)} != null`

        // Boolean logic
        if (expr instanceof And) return `(${this.compileExpr(expr.left)}) && (${this.compileExpr(expr.right)})`
        if (expr instanceof Or) return `(${this.compileExpr(expr.left)}) || (${this.compileExpr(expr.right)})`

        // Arithmetic
        if (expr instanceof Div) return `${this.compileExpr(expr.left)} / ${this.compileExpr(expr.right)}`

        // String operations
        if (expr instanceof Upper) return `upper ${this.compileExpr(expr.operand)}`
        if (expr instanceof Lower) return `lower ${this.compileExpr(expr.operand)}`
        if (expr instanceof Contains) return `contains ${this.compileExpr(expr.operand)} ${this.compileExpr(expr.pattern)}`
        if (expr instanceof StartsWith) return `starts_with ${this.compileExpr(expr.operand)} ${this.compileExpr(expr.prefix)}`

        // Aggregations
        if (expr instanceof AggExpr) return this.compileExpr(expr.inner)
        if (expr instanceof Mean) return `average ${this.compileExpr(expr.operand)}`
        if (expr instanceof Sum) return `sum ${this.compileExpr(expr.operand)}`
        if (expr instanceof Min) return `min ${this.compileExpr(expr.operand)}`
        if (expr instanceof Max) return `max ${this.compileExpr(expr.operand)}`
        if (expr instanceof Count) return 'count this'

        // Raw SQL
        if (expr instanceof RawSql) return `s"${expr.rawSql}"`

        throw new Error(`Unknown expression kind: ${expr.kind}`)
    }

    compileSortKey(sortExpr: SortExpr): string {
        const inner = this.compileExpr(sortExpr.expr)
        return sortExpr.direction === 'desc' ? `-${inner}` : inner
    }

    compileIR(node: IRNode): string {
        switch (node.kind) {
            case 'from':
                return `from ${node.name}`
            case 'filter':
                return `${this.compileIR(node.source)}\nfilter ${this.compileExpr(node.condition)}`
            case 'derive': {
                const dervs = node.derivations.map(([k, v]) => `  ${k} = ${this.compileExpr(v)}`).join(',\n')
                return `${this.compileIR(node.source)}\nderive {\n${dervs}\n}`
            }
            case 'group': {
                const keys = node.keys.join(', ')
                const aggs = node.aggregations.map(([k, v]) => `    ${k} = ${this.compileExpr(v)}`).join(',\n')
                return `${this.compileIR(node.source)}\ngroup {${keys}} (\n  aggregate {\n${aggs}\n  }\n)`
            }
            case 'sort': {
                const keys = node.keys.map(k => this.compileSortKey(k)).join(', ')
                return `${this.compileIR(node.source)}\nsort {${keys}}`
            }
            case 'take':
                return `${this.compileIR(node.source)}\ntake ${node.n}`
        }
    }
}
