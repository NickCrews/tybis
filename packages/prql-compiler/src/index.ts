import { Relation } from 'tybis'
import { PrqlCompiler } from './prql-compiler.js'
export {
    PrqlCompiler,
    type SupportedPrqlVops,
    type SupportedPrqlROps,
} from './prql-compiler.js'

/** Compile a {@link Relation} to a PRQL query string. */
export function toPrql(relation: Relation): string {
    const compiler = new PrqlCompiler()
    return compiler.compileROp(relation._op)
}