import type { Compiler } from './base.js'
import type { IRNode } from '../ir.js'
import {
    type BuiltinOp, type SortSpec,
} from '../value/ops.js'

export class PrqlCompiler implements Compiler {
    compileOp(op: BuiltinOp): string {
        const kind = op.kind
        switch (kind) {
            case 'col_ref': return op.name
            case 'int_literal': return String(op.value)
            case 'float_literal': return String(op.value)
            case 'string_literal': return `"${op.value}"`
            case 'boolean_literal': return String(op.value)
            case 'null_literal': return 'null'
            case 'datetime_literal': return `@${op.value.toISOString()}`
            case 'date_literal': return `@${op.value.toISOString().split('T')[0]}`
            case 'time_literal': return `@${op.value.toISOString().split('T')[1]}`

            case 'eq': return `${this.compileOp(op.left as BuiltinOp)} == ${this.compileOp(op.right as BuiltinOp)}`
            case 'gt': return `${this.compileOp(op.left as BuiltinOp)} > ${this.compileOp(op.right as BuiltinOp)}`
            case 'gte': return `${this.compileOp(op.left as BuiltinOp)} >= ${this.compileOp(op.right as BuiltinOp)}`
            case 'lt': return `${this.compileOp(op.left as BuiltinOp)} < ${this.compileOp(op.right as BuiltinOp)}`
            case 'lte': return `${this.compileOp(op.left as BuiltinOp)} <= ${this.compileOp(op.right as BuiltinOp)}`
            case 'is_not_null': return `${this.compileOp(op.operand as BuiltinOp)} != null`

            case 'not': return `!(${this.compileOp(op.operand as BuiltinOp)})`
            case 'and': return `(${this.compileOp(op.left as BuiltinOp)}) && (${this.compileOp(op.right as BuiltinOp)})`
            case 'or': return `(${this.compileOp(op.left as BuiltinOp)}) || (${this.compileOp(op.right as BuiltinOp)})`

            case 'add': return `${this.compileOp(op.left as BuiltinOp)} + ${this.compileOp(op.right as BuiltinOp)}`
            case 'sub': return `${this.compileOp(op.left as BuiltinOp)} - ${this.compileOp(op.right as BuiltinOp)}`
            case 'mul': return `${this.compileOp(op.left as BuiltinOp)} * ${this.compileOp(op.right as BuiltinOp)}`
            case 'div': return `${this.compileOp(op.left as BuiltinOp)} / ${this.compileOp(op.right as BuiltinOp)}`

            case 'upper': return `upper ${this.compileOp(op.operand as BuiltinOp)}`
            case 'lower': return `lower ${this.compileOp(op.operand as BuiltinOp)}`
            case 'contains': return `contains ${this.compileOp(op.operand as BuiltinOp)} ${this.compileOp(op.pattern)}`
            case 'starts_with': return `starts_with ${this.compileOp(op.operand as BuiltinOp)} ${this.compileOp(op.prefix)}`

            // invoice_date | date.to_text "%d/%m/%Y"
            case 'temporal_to_string': return `date.to_text "${op.format}" ${this.compileOp(op.operand as BuiltinOp)}`

            case 'mean': return `average ${this.compileOp(op.operand as BuiltinOp)}`
            case 'sum': return `sum ${this.compileOp(op.operand as BuiltinOp)}`
            case 'min': return `min ${this.compileOp(op.operand as BuiltinOp)}`
            case 'max': return `max ${this.compileOp(op.operand as BuiltinOp)}`
            case 'count': return 'count this'
            case 'raw_sql': return `s"${op.rawSql}"`
            default: {
                throw new Error(`Unhandled op: ${(kind satisfies never)}`)
            }
        }
    }

    compileSortKey(spec: SortSpec): string {
        const inner = this.compileOp(spec.op as BuiltinOp)
        return spec.direction === 'desc' ? `-${inner}` : inner
    }

    compileIR(node: IRNode): string {
        switch (node.kind) {
            case 'from':
                return `from ${node.name}`
            case 'filter':
                return `${this.compileIR(node.source)}\nfilter ${this.compileOp(node.condition as BuiltinOp)}`
            case 'derive': {
                const dervs = node.derivations.map(([k, v]) => `  ${k} = ${this.compileOp(v as BuiltinOp)}`).join(',\n')
                return `${this.compileIR(node.source)}\nderive {\n${dervs}\n}`
            }
            case 'group': {
                const keys = node.keys.join(', ')
                const aggs = node.aggregations.map(([k, v]) => `    ${k} = ${this.compileOp(v as BuiltinOp)}`).join(',\n')
                return `${this.compileIR(node.source)}\ngroup {${keys}} (\n  aggregate {\n${aggs}\n  }\n)`
            }
            case 'sort': {
                const keys = node.keys.map(k => this.compileSortKey(k)).join(', ')
                return `${this.compileIR(node.source)}\nsort {${keys}}`
            }
            case 'take':
                return `${this.compileIR(node.source)}\ntake ${node.n}`
            default: throw new Error(`Unhandled IR node: ${(node satisfies never) as any}`)
        }
    }
}
