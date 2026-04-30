import { IVOp } from './value/core.js';
import type { SortSpec } from './value/ops.js'

export type IRNode =
    | { kind: 'from'; name: string }
    | { kind: 'filter'; source: IRNode; condition: IVOp<{ typecode: 'boolean' }> }
    | { kind: 'derive'; source: IRNode; derivations: [string, IVOp][] }
    | { kind: 'select'; source: IRNode; selections: [string, IVOp][] }
    | { kind: 'group'; source: IRNode; keys: string[]; aggregations: [string, IVOp][] }
    | { kind: 'sort'; source: IRNode; keys: SortSpec[] }
    | { kind: 'take'; source: IRNode; n: number }
