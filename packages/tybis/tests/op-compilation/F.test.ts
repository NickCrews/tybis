import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'

// =============================================================================
// Approach F — Spec-carrying ops, a compilation target, and then handlers that pair up combos of these.
//
// IDEA
//   Each op exposes its kind, dtype, dshape, and optionally its other params and child ops
//   (e.g. Add's `left`/`right`).
//
//   Then, orthogonally, you define a compilation target with optional config,
//   eg a sql target such { dialect: 'postgres' | 'sqlite', client: 'node' | 'browser' }.
//
//   Finally, you (or ANYONE) writes out a set of CompilationRule<Target, Out, Supported>
//   objects that for a given (op, target) pair, say
//   - "yes, I can handle this" or "no, I can't" in the `canHandle` predicate
//   - if yes, here's how to compile it in the `handle` function.
//
//   Rule sets are plain tuples of these rules, declared with
//   `as const satisfies CompilationRule<...>[]` and exposed as top-level
//   readonly constants (`REPR_COMPILATION_RULES`, etc.) so downstream
//   packages can spread / override / inspect them freely. The exported
//   top-level functions are `compile` and `canHandle`.
//
//   Then, you pass an op, a target, and a rule set to `compile` and it finds the first
//   rule whose `canHandle` accepts the op, and calls its `handle` with the op, target,
//   and a `visitNext` callback for recursing into children.
//
// EXTENSIBILITY
//   + 3rd-party ops: new class implementing IVOp<'kindString'>.
//   + 3rd-party targets: define `interface XxxTarget { ... }` and a
//     `const XXX_COMPILATION_RULES` typed as `CompilationRule<XxxTarget, Out>[]`.
//   + Teach an existing rule set about a new op: spread it into a new
//     constant and add the missing rule(s).
// =============================================================================

// This file is an exploration of how to solve the "expression problem" for tybis.
//
// We work through a toy example:
//
//      \ target | Evaluate | Stringify|     toSql    |
//    op \       |  (core)  |  (core)  |(SaaS service)|
// --------------+----------+----------+--------------+
//               |          |          |              |
//    Literal    |    ✓     |    ✓     |   from SaaS  |
//     (core)    |          |          |              |
// --------------+----------+----------+--------------+
//               |          |          |              |
//      Add      |    ✓     |    ✓     |   from SaaS  |
//     (core)    |          |          |              |
// --------------+----------+----------+--------------+
//               |          |          |
//      Cov      |  from    |  from    |   end user
//(stats package)|  stats   |  stats   |
// --------------+----------+----------+
//
// We say that core tybis provides
// - two core ops: a literal and an addition. eg `new Add(new Lit(5, 'int'), new Lit(10, 'int'))`.
// - two core compilation targets: a ReprTarget, eg "5 + 10", and an EvaluateTarget eg `15`
//
// Then we have two different 3rd party libraries:
// - a stats library that provides a covariance op, and defines how to compile that to the core targets, eg to the ReprTarget and how to evaluate.
// - a sql target that defines how to compile the core ops to SQL, but they don't know about the covariance op, so they don't define how to compile that. The sql target should take a dialect parameter. But sqlite has no way to represent datetimes, so if it encounters a datetime literal, it should throw an error.
//
// Finally, a user wants to be able to COMBINE these,
// and define how to compile the covariance op to SQL without needing to modify the core library or the stats library.

// --- CORE PACKAGE ------------------------------------------------------------

type DataType = 'string' | 'int' | 'float' | 'boolean' | 'datetime'
type DataShape = 'scalar' | 'columnar'

// statically typed info that can be known at expression construction time,
// without needing to evaluate the expression eg against any data.
interface IVOp<Kind extends string = string> {
    readonly kind: Kind
    /** The {@link DataType} of this expression. */
    dtype(): DataType
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): DataShape
}

// --- Core ops---
// Define two core ops: a literal and an addition:

// Map a DataType to the JS value used by Lit. Lets handlers see
// `op.value` as `string` for a string literal, `number` for an int, etc.
type ValueOf<DT extends DataType> =
    DT extends 'string' | 'datetime' | 'uuid' ? string :
    DT extends 'boolean' ? boolean :
    number

class Lit<DT extends DataType = DataType> implements IVOp<'lit'> {
    readonly kind = 'lit' as const
    readonly #dataType: DT
    constructor(readonly value: ValueOf<DT>, dataType: DT) {
        this.#dataType = dataType
    }
    dtype(): DT { return this.#dataType }
    dshape(): 'scalar' { return 'scalar' }
}

// dummy implementation for now
type HighestDataType<_A extends DataType, _B extends DataType> = 'float'
function highestDataType<A extends DataType, B extends DataType>(_a: A, _b: B): HighestDataType<A, B> {
    return 'float' // placeholder
}

type HighestDataShape<_A extends DataShape, _B extends DataShape> = 'columnar'
function highestDataShape<A extends DataShape, B extends DataShape>(_a: A, _b: B): HighestDataShape<A, B> {
    return 'columnar' // placeholder
}

class Add<L extends IVOp, R extends IVOp> implements IVOp<'add'> {
    readonly kind = 'add' as const
    constructor(readonly left: L, readonly right: R) { }
    dtype(): HighestDataType<ReturnType<L['dtype']>, ReturnType<R['dtype']>> {
        return highestDataType(this.left.dtype(), this.right.dtype()) as HighestDataType<ReturnType<L['dtype']>, ReturnType<R['dtype']>>
    }
    dshape(): HighestDataShape<ReturnType<L['dshape']>, ReturnType<R['dshape']>> {
        return highestDataShape(this.left.dshape(), this.right.dshape()) as HighestDataShape<ReturnType<L['dshape']>, ReturnType<R['dshape']>>
    }
}

// ---- Registry / compiler machinery ----
//
// Each rule's `canHandle` is a type predicate over `IVOp` itself, so
// `handle` receives the typed op (e.g. `Lit<'datetime'>`) with no casts.

// Direct child ops of `O`: every property whose type is itself an IVOp
// (e.g. Add's `left` and `right`). Derives the tree structure from the
// op's own fields, so there's no separate stored child list to keep in
// sync — a leaf like `Lit` simply has no IVOp-typed properties, so this
// is `never`.
type DirectChildren<O extends IVOp> = {
    [K in keyof O]: O[K] extends IVOp ? O[K] : never
}[keyof O]

type VisitNext<Out, Target> = (sub: IVOp, target?: Target) => Out

// Recursion callback threaded into each rule's `canHandle`. A composite-op
// rule calls it on each direct child to verify the child is itself handleable
// (and may add its own parent-imposed cross-child constraints). Leaf rules
// ignore it.
type CanHandleChild = (child: IVOp) => boolean

// `OpFor<S>` collapses a still-generic `IVOp<string>` to `never` so that
// the handler signature `(op: never, ...) => Out` accepts any concrete
// handler. Once `Supported` narrows to e.g. `Lit` (whose `thisKind` is
// the literal `'lit'`, not the generic `string`), `OpFor` is identity
// and the handler gets the typed op.
type OpFor<S extends IVOp> = string extends S['kind'] ? never : S

// R20: template-literal error names the offending op(s) in plain text.
// Surfaces kind + dtype + dshape so e.g. "lit<datetime, scalar>" makes
// it obvious which combination isn't supported.
type OpDesc<O extends IVOp> = O extends IVOp
    ? `${O['kind']}<${ReturnType<O['dtype']>}, ${ReturnType<O['dshape']>}>`
    : never

type MissingError<Missing extends IVOp> =
    `No compilation rule for op(s): ${OpDesc<Missing> & string}`

// `Supported` is a full IVOp — not just the kind string — so rules can
// advertise restrictions on the FULL op, e.g. `Lit<'datetime'>` can be
// excluded for sqlite while `Lit<'int'>` is fine.
type CompilationRule<Target, Out, Supported extends IVOp = IVOp> = {
    name?: string;
    canHandle: (op: IVOp, target: Target, canHandleChild: CanHandleChild) => op is Supported;
    handle: (op: OpFor<Supported>, target: Target, visit: VisitNext<Out, Target>) => Out
}

// Inference helpers that look directly at each rule's `canHandle`
// predicate and `handle` signature. We map across the tuple's numeric
// indices and union the per-element results. `any` rest patterns are
// required so a 2-arg handler like `(op) => x` still matches.

type AnyArgs = any[]
// Ops handled by `R` FOR A GIVEN TARGET `T`. A rule contributes its
// `Supported` ops only when `T` is assignable to the target type its
// `canHandle` accepts. This is what lets dialect-specific siblings coexist
// in one list: the postgres/duckdb `lit` rule accepts `SqlTarget<'postgres'
// | 'duckdb'>`, so it drops out when `T` is `SqlTarget<'sqlite'>`, while the
// sqlite `lit` rule (which excludes `Lit<'datetime'>`) is the only one left.
// Rules built with `makeIsKind` accept `unknown`, so they apply to every
// target. The default `T = never` reproduces the old target-agnostic union
// (`never` is assignable to every target), so callers that don't care about
// the target still see every rule.
type OpsHandledBy<R, T = never> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { canHandle: (op: IVOp, target: infer RT, ...rest: AnyArgs) => op is infer O extends IVOp }
    ? [T] extends [RT] ? O : never
    : never
}[number] : never
type TargetOf<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { handle: (op: any, target: infer T, ...rest: AnyArgs) => unknown }
    ? T : never
}[number] : never
type OutOf<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { handle: (...args: AnyArgs) => infer O } ? O : never
}[number] : never

// The type-level twin of the runtime `canHandle` walk, and the single
// source of truth for "is this tree handleable?". An op is handleable
// when some rule's `Supported` accepts it AT ITS OWN LEVEL — kind, dtype,
// dshape, plus any parent-imposed child constraints baked into `Supported`
// (e.g. `Add<ScalarOp, ScalarOp>`) — AND every direct child is itself
// handleable. This collects the ops that fail that test, recursing
// through `DirectChildren` exactly as the runtime recurses via
// `canHandleChild`: a node whose own kind/dtype/dshape no rule matches is
// returned immediately, without descending into its children — same as the
// runtime, where a failing parent rule never calls `canHandleChild`. Both
// `compile`'s `_proof` and `CanHandle` consume it, so the static and
// runtime answers can't drift.
//
// `T` is the compilation target: only rules that accept it count as handlers
// (see `OpsHandledBy`), so `lit<datetime>` is handleable when `T` is a
// postgres target but not when it's a sqlite one — even though both `lit`
// rules live in the same list.
//
// `Depth` bounds the structural recursion so the type checker can see it terminates.
type Decr = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
type UnhandledOps<R, O extends IVOp, T = never, Depth extends number = 16> =
    [Depth] extends [never] ? never
    : O extends IVOp
    ? O extends OpsHandledBy<R, T>
    ? UnhandledOps<R, DirectChildren<O>, T, Decr[Depth]>
    : O
    : never

// `T` captures the ACTUAL target passed at the call site (e.g.
// `SqlTarget<'sqlite'>`, not the rule set's full `SqlTarget<SqlDialect>`),
// so the `_proof` check below filters the rules to just those that apply to
// this target. That's what makes `compile(dt, { dialect: 'sqlite' }, RULES)`
// a compile-time error even though `RULES` also contains a postgres `lit`
// rule that would happily handle the datetime.
function compile<O extends IVOp, R extends readonly unknown[], const T extends TargetOf<R>>(
    op: O,
    target: T,
    rules: R,
    // typing black magic: if the op tree contains any op that no rule can
    // handle FOR THIS TARGET (the same rule-driven recursion as `canHandle`),
    // error with a message listing the offenders. This is what gives us
    // "lit<datetime> on sqlite is rejected at compile time".
    ..._proof: [UnhandledOps<R, O, T>] extends [never]
        ? []
        : [missing: MissingError<UnhandledOps<R, O, T>>]
): OutOf<R> {
    type Tgt = TargetOf<R>
    type Out = OutOf<R>
    const handlers = rules as unknown as readonly {
        canHandle: (op: IVOp, target: Tgt, canHandleChild: CanHandleChild) => boolean
        handle: (op: IVOp, target: Tgt, visitNext: VisitNext<Out, Tgt>) => Out
    }[]
    // A composite rule only matches when its children are handleable, so
    // dispatch needs a target-bound recursion callback for the rule lookup.
    // (This re-verifies subtrees during dispatch — minor redundancy, fine
    // for this exploration file.)
    const makeCanHandleChild = (t: Tgt): CanHandleChild => {
        const fn: CanHandleChild = (child) => handlers.some(r => r.canHandle(child, t, fn))
        return fn
    }
    const next: VisitNext<Out, Tgt> = (sub, passedTarget) => {
        const effectiveTarget = (passedTarget ?? target) as Tgt
        const rule = handlers.find(r => r.canHandle(sub, effectiveTarget, makeCanHandleChild(effectiveTarget)))
        if (!rule) throw new Error(`No compilation rule handles op: ${sub.kind}`)
        return rule.handle(sub, effectiveTarget, next)
    }
    return next(op, target)
}

// R22: introspection — both runtime AND compile-time.
//
// `CanHandle<R, O, T>` is the type-level twin of the runtime `canHandle()`:
// given a rule set R, an op O, and a target T, it resolves to the literal
// `true` if every op in the tree is handleable by the rules FOR THAT TARGET,
// otherwise `false`. Same `UnhandledOps` machinery as `compile()`'s `_proof`
// parameter, just exposed as a boolean instead of a `MissingError` template.
// `T` defaults to `never`, which considers every rule regardless of target.
type CanHandle<R, O extends IVOp, T = never> =
    [UnhandledOps<R, O, T>] extends [never] ? true : false

// Typed `IVOp` — return value is narrowed to `true` or `false` at compile
// time via `CanHandle<R, O, T>`, where `T` is the type of the `target`
// argument. The runtime walks the full op tree and requires every op be
// handled by some rule for that target.
function canHandle<R extends readonly unknown[], O extends IVOp, const T extends TargetOf<R> = never>(
    rules: R,
    op: O,
    target?: T
): CanHandle<R, O, T>
function canHandle(
    rules: readonly { canHandle: (op: IVOp, target: unknown, canHandleChild: CanHandleChild) => boolean }[],
    op: IVOp,
    target?: unknown
): boolean {
    const canHandleChild: CanHandleChild = (child) =>
        rules.some(r => r.canHandle(child, target, canHandleChild))
    return canHandleChild(op)
}

// ---- Core compilation targets ----
//
// Core ships two builtin compilers:
// - ReprTarget produces a readable expression like "(5 + 10.00)".
//   It accepts a `precision` option that controls float formatting.
// - EvaluateTarget walks the tree and returns the computed JS value.

interface ReprTarget {
    /** decimals to render for float literals; default: full precision */
    precision?: number
}
type ReprCompilationRule = CompilationRule<ReprTarget, string>

function makeIsKind<O extends IVOp>(
    kind: O['kind'],
    childrenOf?: (op: O) => readonly IVOp[],
): (op: IVOp, target: unknown, canHandleChild?: CanHandleChild) => op is O {
    return (op: IVOp, _target: unknown, canHandleChild: CanHandleChild = () => true): op is O =>
        op.kind === kind && (childrenOf === undefined || childrenOf(op as O).every(canHandleChild))
}

const REPR_COMPILATION_RULES = [
    {
        name: 'lit',
        canHandle: makeIsKind<Lit>('lit'),
        handle: (op: Lit, target: ReprTarget) => {
            const { value } = op
            const dt = op.dtype()
            if (dt === 'float' && target.precision !== undefined && typeof value === 'number') {
                return value.toFixed(target.precision)
            }
            if (dt === 'string') return JSON.stringify(value)
            return String(value)
        },
    },
    {
        name: 'add',
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add', op => [op.left, op.right]),
        handle: (op: Add<IVOp, IVOp>, _target: ReprTarget, next: VisitNext<string, ReprTarget>) => `(${next(op.left)} + ${next(op.right)})`,
    }
] as const satisfies ReprCompilationRule[]

interface EvaluateTarget {
    dummy_connection_url?: string
}

type EvaluateCompilationRule = CompilationRule<EvaluateTarget, unknown>

const EVALUATE_COMPILATION_RULES = [
    {
        name: 'lit',
        canHandle: makeIsKind<Lit>('lit'),
        handle: (op: Lit) => op.value,
    },
    {
        name: 'add',
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add', op => [op.left, op.right]),
        handle: (op: Add<IVOp, IVOp>, _t: EvaluateTarget, next: VisitNext<unknown, EvaluateTarget>) => {
            const l = next(op.left) as number
            const r = next(op.right) as number
            return l + r
        },
    },
] as const satisfies EvaluateCompilationRule[]

// --- 3RD-PARTY STATS PACKAGE -------------------------------------------------
//
// Provides a `Cov` op and provides compilation rules to handle it,
// WITHOUT modifying the core compilation rules

class Cov<L extends IVOp, R extends IVOp> implements IVOp<'@stats/cov'> {
    readonly kind = '@stats/cov' as const
    constructor(readonly left: L, readonly right: R) { }
    dtype(): HighestDataType<ReturnType<L['dtype']>, ReturnType<R['dtype']>> {
        return highestDataType(this.left.dtype(), this.right.dtype()) as HighestDataType<ReturnType<L['dtype']>, ReturnType<R['dtype']>>
    }
    // covariance over two columns is a scalar
    dshape(): 'scalar' { return 'scalar' }
}

// Rules exported by the stats package: the core ones, taught about Cov.
// We spread the builtin rules directly to demonstrate that they're plain
// data — a 3rd party could just as easily override an existing kind.
const covStringCompilationRules = [
    ...REPR_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<Cov<IVOp, IVOp>>('@stats/cov', op => [op.left, op.right]),
        handle: (op: Cov<IVOp, IVOp>, _t: ReprTarget, next: VisitNext<string, ReprTarget>) => `cov(${next(op.left)}, ${next(op.right)})`,
    }
] as const satisfies ReprCompilationRule[]

const covEvaluateCompilationRules = [
    ...EVALUATE_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<Cov<IVOp, IVOp>>('@stats/cov', op => [op.left, op.right]),
        handle: (op: Cov<IVOp, IVOp>, _t: EvaluateTarget, next: VisitNext<unknown, EvaluateTarget>) => {
            const xs = next(op.left) as number[]
            const ys = next(op.right) as number[]
            if (xs.length !== ys.length || xs.length === 0) {
                throw new Error('cov: inputs must be same-length non-empty arrays')
            }
            const n = xs.length
            const mx = xs.reduce((a, b) => a + b, 0) / n
            const my = ys.reduce((a, b) => a + b, 0) / n
            let s = 0
            for (let i = 0; i < n; i++) s += (xs[i]! - mx) * (ys[i]! - my)
            return s / n
        },
    },
] as const satisfies EvaluateCompilationRule[]

// --- 3RD-PARTY SQL PACKAGE ---------------------------------------------------
//
// Provides a `SqlTarget<D>` with a `dialect` parameter and ONE rule set that
// handles the CORE ops across every dialect. Does NOT know about Cov.
//
// Unlike the Repr and Evaluate targets, SQL emits a COMPOSITE result —
// `{ sql, params }` — so every literal becomes a `?` placeholder and its value
// is pushed into the params list. Every non-leaf handler has to merge both
// pieces of each child by hand: concat the sql fragments and spread the params
// in matching order. This is the cost of having no shared mutable context
// threaded through the visit; it's visible at every Add/Cov handler below.
//
// The literal compiler comes in two SIBLING rules that live side by side in
// the same list and discriminate on `target.dialect`:
//   - one for postgres/duckdb, which supports every dtype including datetime;
//   - one for sqlite, which excludes `Lit<'datetime'>` because sqlite has no
//     datetime literal.
// At runtime, `compile` picks the matching sibling via each rule's dialect
// check. At compile time, the target type flows through `UnhandledOps`, so a
// datetime literal is rejected on sqlite (the postgres rule's target type
// doesn't accept a sqlite target, so it drops out of the handler set) while
// still compiling fine on postgres/duckdb — a COMPILE-TIME error in addition
// to a runtime one.

type SqlDialect = 'postgres' | 'duckdb' | 'sqlite'

interface SqlTarget<D extends SqlDialect = SqlDialect> {
    dialect: D
}

interface SqlOut {
    readonly sql: string
    readonly params: readonly unknown[]
}

type NonDatetime = Exclude<DataType, 'datetime'>

// One combined list. Each rule annotates its `canHandle`/`handle` target with
// the dialects it serves; that annotation is the discriminator the type
// machinery reads (via `OpsHandledBy`). Because the per-rule targets differ,
// the list can't carry a single uniform `satisfies CompilationRule<...>[]`
// (target params are contravariant) — the explicit signatures on each rule
// do the shape-checking instead.
const SQL_COMPILATION_RULES = [
    // Postgres / DuckDB literal — every dtype becomes a `?` placeholder and its
    // value is pushed into params. Datetime additionally wraps the placeholder
    // in a dialect-specific cast.
    {
        name: 'lit (postgres/duckdb)',
        canHandle: (op: IVOp, target: SqlTarget<'postgres' | 'duckdb'>): op is Lit =>
            op.kind === 'lit' && (target.dialect === 'postgres' || target.dialect === 'duckdb'),
        handle: (op: Lit, target: SqlTarget<'postgres' | 'duckdb'>): SqlOut => {
            const { value } = op
            const dt = op.dtype()
            switch (dt) {
                case 'string':
                case 'boolean':
                case 'int':
                case 'float':
                    return { sql: '?', params: [value] }
                case 'datetime':
                    return target.dialect === 'postgres'
                        ? { sql: '?::timestamptz', params: [value] }
                        : { sql: 'CAST(? AS TIMESTAMP)', params: [value] }
                default:
                    throw new Error(`Unsupported data type for SQL: ${dt satisfies never}`)
            }
        },
    },
    // SQLite literal — sibling of the rule above, selected when the dialect is
    // sqlite. Its `Supported` union omits `Lit<'datetime'>`, so a datetime
    // literal anywhere in the tree is rejected at compile time on sqlite.
    {
        name: 'lit (sqlite)',
        canHandle: (op: IVOp, target: SqlTarget<'sqlite'>): op is Lit<NonDatetime> =>
            op.kind === 'lit' && target.dialect === 'sqlite' && op.dtype() !== 'datetime',
        handle: (op: Lit<NonDatetime>, _target: SqlTarget<'sqlite'>): SqlOut => {
            const { value } = op
            const dt = op.dtype()
            switch (dt) {
                case 'string':
                case 'boolean':
                case 'int':
                case 'float':
                    return { sql: '?', params: [value] }
                default:
                    throw new Error(`Unsupported data type for SQLite: ${dt satisfies never}`)
            }
        },
    },
    // Addition — identical across dialects, so a single rule serves them all.
    // Each composite handler has to merge both halves of the child SqlOuts.
    {
        name: 'add',
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add', op => [op.left, op.right]),
        handle: (op: Add<IVOp, IVOp>, _t: SqlTarget, next: VisitNext<SqlOut, SqlTarget>): SqlOut => {
            const l = next(op.left)
            const r = next(op.right)
            return { sql: `(${l.sql} + ${r.sql})`, params: [...l.params, ...r.params] }
        },
    },
] as const

// --- END-USER GLUE -----------------------------------------------------------
//
// The user wants Cov compiled to SQL. They didn't write Cov (stats lib did)
// and they didn't write the SQL compilation rules (sql lib did) — but the SQL
// rules are just data, so they spread them into ONE combined rule set in their
// own application code, without touching either library's source.
//
// As with the literal compiler, the cov compiler is two dialect-discriminated
// siblings in the same list: postgres/duckdb emit `covar_pop`, while sqlite —
// which has no `covar_pop` — emits the math directly. `compile` selects the
// right one from `target.dialect`.

// A dialect-gated `canHandle` for Cov. The narrow `SqlTarget<D>` annotation
// is what the type machinery reads to keep the siblings apart (a postgres cov
// rule drops out under a sqlite target); the runtime `target.dialect` check
// does the actual selection. Like `makeIsKind`, it recurses into children so
// the rule only matches when both operands are themselves handleable.
const isCovFor = <Ds extends SqlDialect[]>(dialects: Ds) =>
    (op: IVOp, target: SqlTarget<Ds[number]>, canHandleChild: CanHandleChild): op is Cov<IVOp, IVOp> => {
        if (op.kind !== '@stats/cov' || !dialects.includes(target.dialect)) return false
        const cov = op as Cov<IVOp, IVOp>
        return canHandleChild(cov.left) && canHandleChild(cov.right)
    }

const userCompilationRules = [
    ...SQL_COMPILATION_RULES,
    {
        name: '@stats/cov (postgres + duckdb)',
        canHandle: isCovFor(['postgres', 'duckdb']),
        handle: (op: Cov<IVOp, IVOp>, _t: SqlTarget<'postgres' | 'duckdb'>, next: VisitNext<SqlOut, SqlTarget<'postgres' | 'duckdb'>>): SqlOut => {
            const l = next(op.left)
            const r = next(op.right)
            return { sql: `covar_pop(${l.sql}, ${r.sql})`, params: [...l.params, ...r.params] }
        },
    },
    {
        name: '@stats/cov (sqlite)',
        canHandle: isCovFor(['sqlite']),
        handle: (op: Cov<IVOp, IVOp>, _t: SqlTarget<'sqlite'>, next: VisitNext<SqlOut, SqlTarget<'sqlite'>>): SqlOut => {
            const l = next(op.left)
            const r = next(op.right)
            // Each child is referenced twice in the math, so its params have to
            // be spread twice as well to stay aligned with the `?` placeholders.
            // This is the kind of bookkeeping a shared mutable context would
            // eliminate — leaving it inline so the cost is visible.
            return {
                sql: `(AVG(${l.sql}*${r.sql}) - AVG(${l.sql})*AVG(${r.sql}))`,
                params: [...l.params, ...r.params, ...l.params, ...r.params],
            }
        },
    },
] as const

// =============================================================================
// TESTS
// =============================================================================

const five = new Lit(5, 'int')
const ten = new Lit(10, 'int')
const sum = new Add(five, ten)

const pi = new Lit(3.14159, 'float')
const piPlus = new Add(pi, new Lit(1, 'int'))

// String lits standing in for column references — fine for toString/toSql.
// Evaluate of cov needs actual numeric arrays, so a separate numeric Cov below.
const colX = new Lit('xs' as never, 'string')
const colY = new Lit('ys' as never, 'string')
const cov = new Cov(colX, colY)

const numCov = new Cov(
    new Lit([1, 2, 3, 4] as never, 'float'),
    new Lit([2, 4, 6, 8] as never, 'float'),
)

const dt = new Lit('2026-01-01T00:00:00Z', 'datetime')

describe('core ops, core compilation rules', () => {
    it('stringifies an int+int sum', () => {
        expect(compile(sum, {}, REPR_COMPILATION_RULES)).toBe('(5 + 10)')
    })

    it('evaluates an int+int sum', () => {
        expect(compile(sum, {}, EVALUATE_COMPILATION_RULES)).toBe(15)
    })

    it('honors ReprTarget precision for float literals', () => {
        expect(compile(piPlus, { precision: 2 }, REPR_COMPILATION_RULES)).toBe('(3.14 + 1)')
    })

    it('falls back to full precision when no precision is set', () => {
        expect(compile(piPlus, {}, REPR_COMPILATION_RULES)).toBe('(3.14159 + 1)')
    })
})

describe('stats lib compilation rules', () => {
    it('still handles core ops (string)', () => {
        expect(compile(sum, {}, covStringCompilationRules)).toBe('(5 + 10)')
    })

    it('still handles core ops (evaluate)', () => {
        expect(compile(sum, {}, covEvaluateCompilationRules)).toBe(15)
    })

    it('stringifies a cov call', () => {
        expect(compile(cov, {}, covStringCompilationRules)).toBe('cov("xs", "ys")')
    })

    it('evaluates a numeric cov', () => {
        expect(compile(numCov, {}, covEvaluateCompilationRules)).toBe(2.5)
    })

    it('rejects cov in core/SQL rules at both compile and run time', () => {
        expect(() => {
            // @ts-expect-error — compilation rules don't support op(s): cov<...>
            compile(cov, {}, REPR_COMPILATION_RULES)
        }).toThrow(/No compilation rule handles op: @stats\/cov/)

        expect(() => {
            // @ts-expect-error — compilation rules don't support op(s): cov<...>
            compile(cov, {}, EVALUATE_COMPILATION_RULES)
        }).toThrow(/No compilation rule handles op: @stats\/cov/)

        expect(() => {
            // @ts-expect-error — sql compilation rules don't handle cov on its own
            compile(cov, { dialect: 'postgres' }, SQL_COMPILATION_RULES)
        }).toThrow(/No compilation rule handles op: @stats\/cov/)
    })
})

describe('SQL compilation rules', () => {
    it('emits add on postgres', () => {
        expect(compile(sum, { dialect: 'postgres' }, SQL_COMPILATION_RULES)).toEqual({
            sql: '(? + ?)',
            params: [5, 10],
        })
    })

    it('emits add on sqlite', () => {
        expect(compile(sum, { dialect: 'sqlite' }, SQL_COMPILATION_RULES)).toEqual({
            sql: '(? + ?)',
            params: [5, 10],
        })
    })

    it('emits datetime literal on postgres', () => {
        expect(compile(dt, { dialect: 'postgres' }, SQL_COMPILATION_RULES)).toEqual({
            sql: '?::timestamptz',
            params: ['2026-01-01T00:00:00Z'],
        })
    })

    it('emits datetime literal on duckdb', () => {
        expect(compile(dt, { dialect: 'duckdb' }, SQL_COMPILATION_RULES)).toEqual({
            sql: 'CAST(? AS TIMESTAMP)',
            params: ['2026-01-01T00:00:00Z'],
        })
    })

    it('rejects datetime literal on sqlite at both compile and run time', () => {
        // Same combined list as postgres/duckdb above — but the sqlite target
        // drops the postgres `lit` rule from the handler set, leaving only the
        // sqlite `lit` rule, which excludes datetime. So this is rejected.
        expect(() => {
            // @ts-expect-error — compilation rules don't support op(s): lit<datetime, scalar>
            compile(dt, { dialect: 'sqlite' }, SQL_COMPILATION_RULES)
        }).toThrow(/No compilation rule handles op: lit/)
    })

    it('rejects nested datetime on sqlite at both compile and run time', () => {
        // The static check recurses the whole tree (via `DirectChildren`),
        // so an Add over a datetime descendant is statically rejected too —
        // the compile-time error still names `lit<datetime, scalar>`. At
        // runtime, dispatch recurses via `canHandleChild`: the `add` rule
        // refuses as soon as
        // a child (the datetime lit) is unhandleable, so no rule matches
        // the `add` and the throw names the subtree root.
        const dtPlus = new Add(dt, new Lit(1, 'int'))
        expect(() => {
            // @ts-expect-error — compilation rules don't support op(s): lit<datetime, scalar>
            compile(dtPlus, { dialect: 'sqlite' }, SQL_COMPILATION_RULES)
        }).toThrow(/No compilation rule handles op: add/)
    })
})

describe('end-user glue: cov compiled to SQL', () => {
    it('emits covar_pop on postgres', () => {
        expect(compile(cov, { dialect: 'postgres' }, userCompilationRules)).toEqual({
            sql: 'covar_pop(?, ?)',
            params: ['xs', 'ys'],
        })
    })

    it('emits covar_pop on duckdb', () => {
        expect(compile(cov, { dialect: 'duckdb' }, userCompilationRules)).toEqual({
            sql: 'covar_pop(?, ?)',
            params: ['xs', 'ys'],
        })
    })

    it('emits the manual covariance math on sqlite', () => {
        expect(compile(cov, { dialect: 'sqlite' }, userCompilationRules)).toEqual({
            sql: '(AVG(?*?) - AVG(?)*AVG(?))',
            params: ['xs', 'ys', 'xs', 'ys'],
        })
    })

    it('composes cov inside an add', () => {
        const mixed = new Add(cov, new Lit(1, 'float'))
        expect(compile(mixed, { dialect: 'duckdb' }, userCompilationRules)).toEqual({
            sql: '(covar_pop(?, ?) + ?)',
            params: ['xs', 'ys', 1],
        })
    })
})

describe('R22 introspection', () => {
    it('rejects bare kind strings at the type level', () => {
        // The real assertion is the @ts-expect-error: a bare kind string is
        // not an IVOp, so the type checker rejects it. At runtime the string
        // matches no rule's `canHandle`, so the recursive walk simply returns
        // false.
        // @ts-expect-error — bare kind strings are not accepted; pass a full IVOp
        expect(canHandle(userCompilationRules, '@stats/cov')).toBe(false)
    })

    it('answers canHandle from a typed IVOp, narrowed at the type level', () => {
        expectTypeOf<CanHandle<typeof REPR_COMPILATION_RULES, typeof cov>>().toEqualTypeOf<false>()
        const a = canHandle(REPR_COMPILATION_RULES, cov)
        expectTypeOf(a).toEqualTypeOf<false>()
        expect(a).toBe(false)

        expectTypeOf<CanHandle<typeof userCompilationRules, typeof cov>>().toEqualTypeOf<true>()
        const b = canHandle(userCompilationRules, cov, { dialect: 'postgres' })
        expectTypeOf(b).toEqualTypeOf<true>()
        expect(b).toBe(true)

        // Same combined SQL list, asked about the same datetime literal, but a
        // different target flips the answer: handleable on postgres, not on
        // sqlite. The target type drives both the static and runtime answers.
        expectTypeOf<CanHandle<typeof SQL_COMPILATION_RULES, typeof dt, SqlTarget<'sqlite'>>>().toEqualTypeOf<false>()
        const c = canHandle(SQL_COMPILATION_RULES, dt, { dialect: 'sqlite' })
        expectTypeOf(c).toEqualTypeOf<false>()
        expect(c).toBe(false)

        expectTypeOf<CanHandle<typeof SQL_COMPILATION_RULES, typeof dt, SqlTarget<'postgres'>>>().toEqualTypeOf<true>()
        const d = canHandle(SQL_COMPILATION_RULES, dt, { dialect: 'postgres' })
        expectTypeOf(d).toEqualTypeOf<true>()
        expect(d).toBe(true)

        // Nested: an Add over a datetime child is unhandleable on sqlite. The
        // `add` rule recurses into its children via canHandleChild, so it
        // refuses the moment the datetime lit is rejected — the runtime walk
        // and the recursive type-level check agree.
        const dtPlus = new Add(dt, new Lit(1, 'int'))
        expectTypeOf<CanHandle<typeof SQL_COMPILATION_RULES, typeof dtPlus, SqlTarget<'sqlite'>>>().toEqualTypeOf<false>()
        const e = canHandle(SQL_COMPILATION_RULES, dtPlus, { dialect: 'sqlite' })
        expectTypeOf(e).toEqualTypeOf<false>()
        expect(e).toBe(false)

        // ...but an all-int Add is handled.
        expectTypeOf<CanHandle<typeof SQL_COMPILATION_RULES, typeof sum, SqlTarget<'sqlite'>>>().toEqualTypeOf<true>()
        const f = canHandle(SQL_COMPILATION_RULES, sum, { dialect: 'sqlite' })
        expectTypeOf(f).toEqualTypeOf<true>()
        expect(f).toBe(true)
    })

    it('enforces a parent-imposed constraint, at compile time AND runtime', () => {
        // A rule that only handles `add` when BOTH children are scalar. The
        // kind-only flatten check could never reject the columnar case (every
        // op is supported by kind), but encoding the constraint in the rule's
        // `Supported` type — `Add<ScalarOp, ScalarOp>` — makes BOTH the
        // recursive runtime `canHandleChild` and the recursive type-level
        // `CanHandle` reject an `Add` whose child is itself a columnar `Add`.
        type ScalarOp = IVOp & { dshape(): 'scalar' }
        const rules = [
            {
                name: 'lit',
                canHandle: makeIsKind<Lit>('lit'),
                handle: (op: Lit) => op.value,
            },
            {
                name: 'scalar-only add',
                canHandle: (op: IVOp, _t: unknown, canHandleChild: CanHandleChild): op is Add<ScalarOp, ScalarOp> => {
                    if (op.kind !== 'add') return false
                    const add = op as Add<IVOp, IVOp>
                    return canHandleChild(add.left) && canHandleChild(add.right)
                        && add.left.dshape() === 'scalar' && add.right.dshape() === 'scalar'
                },
                handle: (op: Add<ScalarOp, ScalarOp>, _t: unknown, next: VisitNext<unknown, unknown>) =>
                    (next(op.left) as number) + (next(op.right) as number),
            },
        ] as const satisfies CompilationRule<unknown, unknown>[]

        // both children are scalar Lits → handled
        const a = canHandle(rules, sum)
        expect(a).toBe(true)
        expectTypeOf(a).toEqualTypeOf<true>()
        // left child is an Add (columnar) → refused, even though every
        // individual op is supported by kind
        const b = canHandle(rules, new Add(sum, new Lit(1, 'int')))
        expectTypeOf(b).toEqualTypeOf<false>()
        expect(b).toBe(false)
    })
})