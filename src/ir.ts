import { IOp } from './core.js';
import type { SortSpec } from './ops.js'

export type IRNode =
    | { kind: 'from'; name: string }
    | { kind: 'filter'; source: IRNode; condition: IOp<'boolean'> }
    | { kind: 'derive'; source: IRNode; derivations: [string, IOp][] }
    | { kind: 'group'; source: IRNode; keys: string[]; aggregations: [string, IOp][] }
    | { kind: 'sort'; source: IRNode; keys: SortSpec[] }
    | { kind: 'take'; source: IRNode; n: number }
