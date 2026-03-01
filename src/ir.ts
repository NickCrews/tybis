import type { BooleanExpr, Expr, SortExpr } from './expr.js'

/** Internal IR nodes representing relation operations. */
export type IRNode =
    | { kind: 'from'; name: string }
    | { kind: 'filter'; source: IRNode; condition: BooleanExpr }
    | { kind: 'derive'; source: IRNode; derivations: [string, Expr][] }
    | { kind: 'group'; source: IRNode; keys: string[]; aggregations: [string, Expr][] }
    | { kind: 'sort'; source: IRNode; keys: SortExpr[] }
    | { kind: 'take'; source: IRNode; n: number }
