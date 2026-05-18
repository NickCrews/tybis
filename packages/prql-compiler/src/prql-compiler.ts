import type { Compiler, BuiltinROp, BuiltinVOp, IROp } from 'tybis'
import { type RawSqlOp } from 'tybis-sql-compiler/ops'


export type SupportedPrqlVops =
    | Exclude<BuiltinVOp, { kind: 'interval_literal' }> // PRQL doesn't support interval literals (at least for now)
    | RawSqlOp
export type SupportedPrqlROps = BuiltinROp
export class PrqlCompiler implements Compiler<string, string, SupportedPrqlVops, IROp> {
    compileVOp(op: SupportedPrqlVops): string {
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
            case 'uuid_literal': return `s"${op.value}"`

            case 'eq': return `${this.compileVOp(op.left as SupportedPrqlVops)} == ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'gt': return `${this.compileVOp(op.left as SupportedPrqlVops)} > ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'ge': return `${this.compileVOp(op.left as SupportedPrqlVops)} >= ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'lt': return `${this.compileVOp(op.left as SupportedPrqlVops)} < ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'le': return `${this.compileVOp(op.left as SupportedPrqlVops)} <= ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'is_not_null': return `${this.compileVOp(op.operand as SupportedPrqlVops)} != null`
            case 'is_null': return `${this.compileVOp(op.operand as SupportedPrqlVops)} == null`

            case 'not': return `!(${this.compileVOp(op.operand as SupportedPrqlVops)})`
            case 'and': return `(${this.compileVOp(op.left as SupportedPrqlVops)}) && (${this.compileVOp(op.right as SupportedPrqlVops)})`
            case 'or': return `(${this.compileVOp(op.left as SupportedPrqlVops)}) || (${this.compileVOp(op.right as SupportedPrqlVops)})`

            case 'add': return `${this.compileVOp(op.left as SupportedPrqlVops)} + ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'sub': return `${this.compileVOp(op.left as SupportedPrqlVops)} - ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'mul': return `${this.compileVOp(op.left as SupportedPrqlVops)} * ${this.compileVOp(op.right as SupportedPrqlVops)}`
            case 'div': return `${this.compileVOp(op.left as SupportedPrqlVops)} / ${this.compileVOp(op.right as SupportedPrqlVops)}`

            case 'upper': return `upper ${this.compileVOp(op.operand as SupportedPrqlVops)}`
            case 'lower': return `lower ${this.compileVOp(op.operand as SupportedPrqlVops)}`
            case 'contains': return `contains ${this.compileVOp(op.operand as SupportedPrqlVops)} ${this.compileVOp(op.pattern as SupportedPrqlVops)}`
            case 'starts_with': return `starts_with ${this.compileVOp(op.operand as SupportedPrqlVops)} ${this.compileVOp(op.prefix as SupportedPrqlVops)}`

            // invoice_date | date.to_text "%d/%m/%Y"
            case 'temporal_to_string': return `date.to_text "${op.format}" ${this.compileVOp(op.operand as SupportedPrqlVops)}`

            case 'mean': return `average ${this.compileVOp(op.operand as SupportedPrqlVops)}`
            case 'sum': return `sum ${this.compileVOp(op.operand as SupportedPrqlVops)}`
            case 'min': return `min ${this.compileVOp(op.operand as SupportedPrqlVops)}`
            case 'max': return `max ${this.compileVOp(op.operand as SupportedPrqlVops)}`
            case 'count': return 'count this'
            case 'raw_sql': return `s"${op.rawSql}"`
            default: {
                throw new Error(`Unhandled op: ${(kind satisfies never)}`)
            }
        }
    }

    compileSortKey(spec: { op: SupportedPrqlVops, direction: 'asc' | 'desc', nulls?: 'first' | 'last' }): string {
        if (spec.nulls !== undefined) {
            throw new Error(`PRQL does not support NULLS FIRST/LAST in sort keys`)
        }
        const inner = this.compileVOp(spec.op)
        return spec.direction === 'desc' ? `-${inner}` : inner
    }

    compileROp(op: IROp): string {
        const node = op as SupportedPrqlROps
        switch (node.kind) {
            case 'from':
                return `from ${node.name}`
            case 'filter':
                return `${this.compileROp(node.source as SupportedPrqlROps)}\nfilter ${this.compileVOp(node.condition as SupportedPrqlVops)}`
            case 'derive': {
                const dervs = node.derivations.map(([k, v]) => `  ${k} = ${this.compileVOp(v as SupportedPrqlVops)}`).join(',\n')
                return `${this.compileROp(node.source as SupportedPrqlROps)}\nderive {\n${dervs}\n}`
            }
            case 'select': {
                const sels = node.selections.map(([k, v]) => `  ${k} = ${this.compileVOp(v as SupportedPrqlVops)}`).join(',\n')
                return `${this.compileROp(node.source as SupportedPrqlROps)}\nselect {\n${sels}\n}`
            }
            case 'group': {
                const keys = node.keys.map(([k, v]) => {
                    const compiled = this.compileVOp(v as SupportedPrqlVops)
                    return compiled === k ? k : `${k} = ${compiled}`
                }).join(', ')
                const aggs = node.aggregations.map(([k, v]) => `    ${k} = ${this.compileVOp(v as SupportedPrqlVops)}`).join(',\n')
                return `${this.compileROp(node.source as SupportedPrqlROps)}\ngroup {${keys}} (\n  aggregate {\n${aggs}\n  }\n)`
            }
            case 'sort': {
                const keys = node.keys.map(k => this.compileSortKey(
                    k.nulls !== undefined
                        ? { op: k.op as SupportedPrqlVops, direction: k.direction, nulls: k.nulls }
                        : { op: k.op as SupportedPrqlVops, direction: k.direction }
                )).join(', ')
                return `${this.compileROp(node.source as SupportedPrqlROps)}\nsort {${keys}}`
            }
            case 'take':
                return `${this.compileROp(node.source as SupportedPrqlROps)}\ntake ${node.n}`
            default: throw new Error(`Unhandled IR node: ${(node satisfies never) as any}`)
        }
    }
}
