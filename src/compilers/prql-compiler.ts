import type { Compiler } from './base.js'
import type { BuiltinROp } from '../relation/index.js'
import {
    type BuiltinVOp, type SortSpec,
} from '../value/ops.js'

export class PrqlCompiler implements Compiler {
    compileOp(op: BuiltinVOp): string {
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

            case 'eq': return `${this.compileOp(op.left as BuiltinVOp)} == ${this.compileOp(op.right as BuiltinVOp)}`
            case 'gt': return `${this.compileOp(op.left as BuiltinVOp)} > ${this.compileOp(op.right as BuiltinVOp)}`
            case 'gte': return `${this.compileOp(op.left as BuiltinVOp)} >= ${this.compileOp(op.right as BuiltinVOp)}`
            case 'lt': return `${this.compileOp(op.left as BuiltinVOp)} < ${this.compileOp(op.right as BuiltinVOp)}`
            case 'lte': return `${this.compileOp(op.left as BuiltinVOp)} <= ${this.compileOp(op.right as BuiltinVOp)}`
            case 'is_not_null': return `${this.compileOp(op.operand as BuiltinVOp)} != null`

            case 'not': return `!(${this.compileOp(op.operand as BuiltinVOp)})`
            case 'and': return `(${this.compileOp(op.left as BuiltinVOp)}) && (${this.compileOp(op.right as BuiltinVOp)})`
            case 'or': return `(${this.compileOp(op.left as BuiltinVOp)}) || (${this.compileOp(op.right as BuiltinVOp)})`

            case 'add': return `${this.compileOp(op.left as BuiltinVOp)} + ${this.compileOp(op.right as BuiltinVOp)}`
            case 'sub': return `${this.compileOp(op.left as BuiltinVOp)} - ${this.compileOp(op.right as BuiltinVOp)}`
            case 'mul': return `${this.compileOp(op.left as BuiltinVOp)} * ${this.compileOp(op.right as BuiltinVOp)}`
            case 'div': return `${this.compileOp(op.left as BuiltinVOp)} / ${this.compileOp(op.right as BuiltinVOp)}`

            case 'upper': return `upper ${this.compileOp(op.operand as BuiltinVOp)}`
            case 'lower': return `lower ${this.compileOp(op.operand as BuiltinVOp)}`
            case 'contains': return `contains ${this.compileOp(op.operand as BuiltinVOp)} ${this.compileOp(op.pattern)}`
            case 'starts_with': return `starts_with ${this.compileOp(op.operand as BuiltinVOp)} ${this.compileOp(op.prefix)}`

            // invoice_date | date.to_text "%d/%m/%Y"
            case 'temporal_to_string': return `date.to_text "${op.format}" ${this.compileOp(op.operand as BuiltinVOp)}`

            case 'mean': return `average ${this.compileOp(op.operand as BuiltinVOp)}`
            case 'sum': return `sum ${this.compileOp(op.operand as BuiltinVOp)}`
            case 'min': return `min ${this.compileOp(op.operand as BuiltinVOp)}`
            case 'max': return `max ${this.compileOp(op.operand as BuiltinVOp)}`
            case 'count': return 'count this'
            case 'raw_sql': return `s"${op.rawSql}"`
            default: {
                throw new Error(`Unhandled op: ${(kind satisfies never)}`)
            }
        }
    }

    compileSortKey(spec: SortSpec): string {
        const inner = this.compileOp(spec.op as BuiltinVOp)
        return spec.direction === 'desc' ? `-${inner}` : inner
    }

    compileROp(node: BuiltinROp): string {
        switch (node.kind) {
            case 'from':
                return `from ${node.name}`
            case 'filter':
                return `${this.compileROp(node.source as BuiltinROp)}\nfilter ${this.compileOp(node.condition as BuiltinVOp)}`
            case 'derive': {
                const dervs = node.derivations.map(([k, v]) => `  ${k} = ${this.compileOp(v as BuiltinVOp)}`).join(',\n')
                return `${this.compileROp(node.source as BuiltinROp)}\nderive {\n${dervs}\n}`
            }
            case 'select': {
                const sels = node.selections.map(([k, v]) => `  ${k} = ${this.compileOp(v as BuiltinVOp)}`).join(',\n')
                return `${this.compileROp(node.source as BuiltinROp)}\nselect {\n${sels}\n}`
            }
            case 'group': {
                const keys = node.keys.map(([k, v]) => {
                    const compiled = this.compileOp(v as BuiltinVOp)
                    return compiled === k ? k : `${k} = ${compiled}`
                }).join(', ')
                const aggs = node.aggregations.map(([k, v]) => `    ${k} = ${this.compileOp(v as BuiltinVOp)}`).join(',\n')
                return `${this.compileROp(node.source as BuiltinROp)}\ngroup {${keys}} (\n  aggregate {\n${aggs}\n  }\n)`
            }
            case 'sort': {
                const keys = node.keys.map(k => this.compileSortKey(k)).join(', ')
                return `${this.compileROp(node.source as BuiltinROp)}\nsort {${keys}}`
            }
            case 'take':
                return `${this.compileROp(node.source as BuiltinROp)}\ntake ${node.n}`
            default: throw new Error(`Unhandled IR node: ${(node satisfies never) as any}`)
        }
    }
}
