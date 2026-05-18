import { Relation, Schema } from 'tybis'
import { PrqlCompiler, SupportedPrqlROps } from './prql-compiler.js'
export {
    PrqlCompiler,
    type SupportedPrqlVops,
    type SupportedPrqlROps,
} from './prql-compiler.js'

/** Compile a {@link Relation} to a PRQL query string. */
export function toPrql(relation: Relation<Schema, SupportedPrqlROps>): string {
    const compiler = new PrqlCompiler()
    return compiler.compileROp(relation._op)
}