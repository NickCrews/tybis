import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'

// =============================================================================
// Approach F — Spec-carrying ops, a compilation target, and then handlers that pair up combos of these.
//
// IDEA
//   Each op carries a structured `spec` containing its kind, dtype, dshape,
//   and the *full transitive list* of child specs. Because the spec already
//   enumerates the tree, "what specs does this tree use?" is a single
//   indexed access — `SpecsOf<S> = S | S['childSpecs'][number]` — instead
//   of a recursive conditional.
//
//   A `SpecMap<S>` interface (open via declaration merging) maps a kind
//   string to the concrete op class for that spec, so handlers receive
//   the typed op with no casts.
//
//   A `CompilationRule<Target, Out, Supported>` is a single handler with
//   a `canHandle` type-guard predicate (narrowing to `Supported`) and a
//   `handle` function, parameterized by the *target* (e.g. a StringTarget
//   with `precision`, or a SqlTarget with `dialect`) and the output type.
//   Rule sets are plain tuples of these rules, declared with
//   `as const satisfies CompilationRule<...>[]` and exposed as top-level
//   readonly constants (`STRING_COMPILATION_RULES`, etc.) so downstream
//   packages can spread / override / inspect them freely. The exported
//   top-level functions are `compile` and `canHandle`.
//
// EXTENSIBILITY
//   + 3rd-party ops: new class implementing IVOp<NewSpec>; augment
//     `SpecMap` once via `interface SpecMap<S> { ... }`.
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
// - two core ops: a literal and an addition.
// - two core compilation targets: a StringTarget, eg "5 + 10", and an EvaluateTarget eg `15`
//
// Then we have two different 3rd party libraries:
// - a stats library that provides a covariance op, and defines how to compile that to the core targets, eg to the StringTarget and how to evaluate.
// - a sql target that defines how to compile the core ops to SQL, but they don't know about the covariance op, so they don't define how to compile that. The sql target should take a dialect parameter. But sqlite has no way to represent datetimes, so if it encounters a datetime literal, it should throw an error.
//
// Finally, a user wants to be able to COMBINE these,
// and define how to compile the covariance op to SQL without needing to modify the core library or the stats library.

// --- CORE PACKAGE ------------------------------------------------------------

type DataType = 'string' | 'int' | 'float' | 'boolean' | 'datetime'
type DataShape = 'scalar' | 'columnar'

// statically typed info that can be known at expression construction time,
// without needing to evaluate the expression eg against any data.
interface OpSpec {
    readonly thisKind: string
    readonly dataType: DataType
    readonly dataShape: DataShape
    readonly childSpecs: readonly OpSpec[]
}

interface IVOp<T extends OpSpec = OpSpec> {
    readonly spec: T
    /** The {@link DataType} of this expression. */
    dtype(): T['dataType']
    /** The {@link DataShape} of this expression, which can be 'scalar' or 'columnar'. */
    dshape(): T['dataShape']
}

// --- Core ops---
// Define two core ops: a literal and an addition:

type LitSpec<DT extends DataType = DataType> = {
    thisKind: 'lit',
    dataType: DT,
    dataShape: 'scalar',
    childSpecs: [],
}
function makeLitSpec<DT extends DataType>(dataType: DT): LitSpec<DT> {
    return {
        thisKind: 'lit',
        dataType,
        dataShape: 'scalar',
        childSpecs: [],
    }
}

// Map a DataType to the JS value used by Lit. Lets handlers see
// `op.value` as `string` for a string literal, `number` for an int, etc.
type ValueOf<DT extends DataType> =
    DT extends 'string' | 'datetime' | 'uuid' ? string :
    DT extends 'boolean' ? boolean :
    number

class Lit<DT extends DataType = DataType> implements IVOp<LitSpec<DT>> {
    readonly spec: LitSpec<DT>
    constructor(readonly value: ValueOf<DT>, dtype: DT) {
        this.spec = makeLitSpec(dtype)
    }
    dtype() { return this.spec.dataType }
    dshape() { return this.spec.dataShape }
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

type CombineSpecs<L extends OpSpec, R extends OpSpec> = [...L['childSpecs'], ...R['childSpecs'], L, R]
function combineSpecs<L extends OpSpec, R extends OpSpec>(left: L, right: R): CombineSpecs<L, R> {
    return [...left.childSpecs, ...right.childSpecs, left, right] as unknown as CombineSpecs<L, R>
}

type AddSpec<L extends OpSpec, R extends OpSpec> = {
    thisKind: 'add',
    dataType: HighestDataType<L['dataType'], R['dataType']>,
    dataShape: HighestDataShape<L['dataShape'], R['dataShape']>,
    childSpecs: CombineSpecs<L, R>,
}
function makeAddSpec<L extends OpSpec, R extends OpSpec>(left: L, right: R): AddSpec<L, R> {
    return {
        thisKind: 'add',
        dataType: highestDataType(left.dataType, right.dataType),
        dataShape: highestDataShape(left.dataShape, right.dataShape),
        childSpecs: combineSpecs(left, right),
    }
}

class Add<L extends OpSpec, R extends OpSpec> implements IVOp<AddSpec<L, R>> {
    readonly spec: AddSpec<L, R>
    constructor(readonly left: IVOp<L>, readonly right: IVOp<R>) {
        this.spec = makeAddSpec(left.spec, right.spec)
    }
    dtype() { return this.spec.dataType }
    dshape() { return this.spec.dataShape }
}

// ---- Registry / compiler machinery ----
//
// `SpecMap<S>` is the open registry connecting a kind STRING to the
// concrete op CLASS for that kind, *parameterized by the op's spec* so
// each handler sees the narrowest possible op type. Handlers receive
// `OpFor<S>`, so `op.value` / `op.left` / `op.right` are typed without
// casts (R18). 3rd-party packages augment this via interface
// declaration merging.

interface SpecMap<S extends OpSpec> {
    lit: S extends LitSpec<infer DT> ? Lit<DT> : never
    add: S extends AddSpec<infer L, infer R> ? Add<L, R> : never
}

type OpFor<S extends OpSpec> = S extends OpSpec
    ? S['thisKind'] extends keyof SpecMap<S>
    ? SpecMap<S>[S['thisKind']]
    : never
    : never

// All specs used by a spec tree, including transitive descendants. We
// get this for free because `childSpecs` is the entire transitive list.
// One indexed access — no recursive conditional, no depth cap (R23).
type SpecsOf<S extends OpSpec> = S | S['childSpecs'][number]

type VisitNext<Out, Target> = (sub: IVOp, target?: Target) => Out

type Handler<S extends OpSpec, Target, Out> =
    (op: OpFor<S>, target: Target, visit: VisitNext<Out, Target>) => Out

// R20: template-literal error names the offending spec(s) in plain
// text. Surfaces kind + dtype + dshape so e.g. "lit<datetime, scalar>"
// makes it obvious which combination isn't supported.
type SpecDesc<S extends OpSpec> = S extends OpSpec
    ? `${S['thisKind']}<${S['dataType']}, ${S['dataShape']}>`
    : never

type MissingError<Missing extends OpSpec> =
    `No compilation rule for spec(s): ${SpecDesc<Missing> & string}`

// `Supported` is a full OpSpec — not just the kind string — so rules
// can advertise restrictions on the FULL spec, e.g. `LitSpec<'datetime'>`
// can be excluded for sqlite while `LitSpec<'int'>` is fine.
type CompilationRule<Target, Out, Supported extends OpSpec = OpSpec> = {
    name?: string;
    canHandle: (spec: Partial<OpSpec>, target: Target) => spec is Supported;
    handle: Handler<Supported, Target, Out>;
}

// Inference helpers that look directly at each rule's `canHandle`
// predicate and `handle` signature. We map across the tuple's numeric
// indices and union the per-element results. `any` rest patterns are
// required so a 2-arg handler like `(op) => x` still matches.

type AnyArgs = any[]
type SpecsHandledBy<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { canHandle: (spec: OpSpec, ...rest: AnyArgs) => spec is infer S extends OpSpec }
    ? S
    : never
}[number] : never
type TargetOf<R> = R extends readonly unknown[] ? {

    [K in keyof R]: R[K] extends { handle: (op: any, target: infer T, ...rest: AnyArgs) => unknown }
    ? T : never
}[number] : never
type OutOf<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { handle: (...args: AnyArgs) => infer O } ? O : never
}[number] : never
type KindsHandledBy<R> = SpecsHandledBy<R> extends infer S
    ? S extends OpSpec ? S['thisKind'] : never
    : never

function compile<R extends readonly unknown[], S extends OpSpec>(
    rules: R,
    op: IVOp<S>,
    target: TargetOf<R>,
    // typing black magic: if the op's spec tree contains any specs not
    // assignable to the rules' SpecsHandledBy, error with a message
    // listing the offenders. This is what gives us "lit<datetime> on
    // sqlite is rejected at compile time" — see SQL_SQLITE_COMPILATION_RULES.
    ..._proof: [Exclude<SpecsOf<S>, SpecsHandledBy<R>>] extends [never]
        ? []
        : [missing: MissingError<Exclude<SpecsOf<S>, SpecsHandledBy<R>>>]
): OutOf<R> {
    type T = TargetOf<R>
    type O = OutOf<R>
    const handlers = rules as unknown as readonly {
        canHandle: (spec: OpSpec, target: T) => boolean
        handle: (op: IVOp, target: T, visitNext: VisitNext<O, T>) => O
    }[]
    const next: VisitNext<O, T> = (sub, passedTarget) => {
        const effectiveTarget = (passedTarget ?? target) as T
        const rule = handlers.find(r => r.canHandle(sub.spec, effectiveTarget))
        if (!rule) throw new Error(`No compilation rule handles spec: ${sub.spec.thisKind}`)
        return rule.handle(sub, effectiveTarget, next)
    }
    return next(op, target)
}

// R22: introspection — both runtime AND compile-time.
//
// `CanHandle<R, S>` is the type-level twin of the runtime `canHandle()`:
// given a rule set R and an op spec S, it resolves to the literal
// `true` if every spec in the tree (`SpecsOf<S>`) is covered by the
// rules' `SpecsHandledBy<R>`, otherwise `false`. Same machinery as
// `compile()`'s `_proof` parameter, just exposed as a boolean instead
// of a `MissingError` template.
type CanHandle<R, S extends OpSpec> =
    [Exclude<SpecsOf<S>, SpecsHandledBy<R>>] extends [never] ? true : false

type HasShouldHandle<Spec extends OpSpec, Target = unknown> = { canHandle: (spec: Partial<OpSpec>, target: Target) => spec is Spec }

// Overload 1: typed `IVOp<S>` — return value is narrowed to `true` or
// `false` at compile time via `CanHandle<R, S>`. The runtime walks the
// full spec tree to match.
function canHandle<R extends readonly unknown[], S extends OpSpec>(
    rules: R,
    op: IVOp<S>,
    target?: TargetOf<R>
): CanHandle<R, S>
// Overload 2: string kind or partial spec — runtime-only boolean,
// since a bare kind string carries no static tree info.
function canHandle<T = unknown>(
    ruleOrRules: HasShouldHandle<OpSpec, T> | readonly HasShouldHandle<OpSpec, T>[],
    kindOrSpec: string | Partial<OpSpec>,
    target?: T
): boolean
function canHandle(
    ruleOrRules: HasShouldHandle<OpSpec, unknown> | readonly HasShouldHandle<OpSpec, unknown>[],
    kindOrOp: string | Partial<OpSpec> | IVOp,
    target?: unknown
): boolean {
    const rules: readonly HasShouldHandle<OpSpec, unknown>[] =
        Array.isArray(ruleOrRules) ? ruleOrRules : [ruleOrRules as HasShouldHandle<OpSpec, unknown>]
    if (kindOrOp && typeof kindOrOp === 'object' && 'spec' in kindOrOp) {
        const op = kindOrOp as IVOp
        const allSpecs: readonly OpSpec[] = [op.spec, ...op.spec.childSpecs]
        return allSpecs.every(s => rules.some(r => r.canHandle(s, target)))
    }
    const spec: Partial<OpSpec> = typeof kindOrOp === 'string'
        ? { thisKind: kindOrOp }
        : kindOrOp
    return rules.some(r => r.canHandle(spec, target))
}

// ---- Core compilation targets ----
//
// Core ships two builtin compilers:
// - StringTarget produces a readable expression like "(5 + 10.00)".
//   It accepts a `precision` option that controls float formatting.
// - EvaluateTarget walks the tree and returns the computed JS value.

interface StringTarget {
    /** decimals to render for float literals; default: full precision */
    precision?: number
}
type StringCompilationRule = CompilationRule<StringTarget, string>

function makeIsKind<Spec extends Extract<OpSpec, { thisKind: string }>>(kind: Spec['thisKind']): (spec: Partial<OpSpec>, target: unknown) => spec is Spec {
    return (spec: Partial<OpSpec>, _target: unknown): spec is Spec => spec.thisKind === kind
}

const STRING_COMPILATION_RULES = [
    {
        name: 'lit',
        canHandle: makeIsKind<LitSpec>('lit'),
        handle: (op: Lit, target: StringTarget) => {
            const { value, spec } = op
            if (spec.dataType === 'float' && target.precision !== undefined && typeof value === 'number') {
                return value.toFixed(target.precision)
            }
            if (spec.dataType === 'string') return JSON.stringify(value)
            return String(value)
        },
    },
    {
        // add: (op, _target, rec) => `(${rec(op.left)} + ${rec(op.right)})`,
        name: 'add',
        canHandle: makeIsKind<AddSpec<OpSpec, OpSpec>>('add'),
        handle: (op: Add<OpSpec, OpSpec>, _target: StringTarget, next: VisitNext<string, StringTarget>) => `(${next(op.left)} + ${next(op.right)})`,

    }
] as const satisfies StringCompilationRule[]

interface EvaluateTarget {
    dummy_connection_url?: string
}

type EvaluateCompilationRule = CompilationRule<EvaluateTarget, unknown>

const EVALUATE_COMPILATION_RULES = [
    {
        name: 'lit',
        canHandle: makeIsKind<LitSpec>('lit'),
        handle: (op: Lit) => op.value,
    },
    {
        name: 'add',
        canHandle: makeIsKind<AddSpec<OpSpec, OpSpec>>('add'),
        handle: (op: Add<OpSpec, OpSpec>, _t: EvaluateTarget, next: VisitNext<unknown, EvaluateTarget>) => {
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

type CovSpec<L extends OpSpec, R extends OpSpec> = {
    thisKind: '@stats/cov',
    dataType: HighestDataType<L['dataType'], R['dataType']>,
    dataShape: 'scalar',  // covariance over two columns is a scalar
    childSpecs: CombineSpecs<L, R>,
}
function makeCovSpec<L extends OpSpec, R extends OpSpec>(left: L, right: R): CovSpec<L, R> {
    return {
        thisKind: '@stats/cov',
        dataType: highestDataType(left.dataType, right.dataType),
        dataShape: 'scalar',
        childSpecs: combineSpecs(left, right),
    }
}

class Cov<L extends OpSpec, R extends OpSpec> implements IVOp<CovSpec<L, R>> {
    readonly spec: CovSpec<L, R>
    constructor(readonly left: IVOp<L>, readonly right: IVOp<R>) {
        this.spec = makeCovSpec(left.spec, right.spec)
    }
    dtype() { return this.spec.dataType }
    dshape() { return this.spec.dataShape }
}

// The stats library augments `SpecMap` so any compilation rules with a `cov`
// handler gets a typed `op.left` / `op.right` for free.
interface SpecMap<S extends OpSpec> {
    cov: S extends CovSpec<infer L, infer R> ? Cov<L, R> : never
}

// Rules exported by the stats package: the core ones, taught about Cov.
// We spread the builtin rules directly to demonstrate that they're plain
// data — a 3rd party could just as easily override an existing kind.
const covStringCompilationRules = [
    ...STRING_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('@stats/cov'),
        handle: (op: Cov<OpSpec, OpSpec>, _t: StringTarget, next: VisitNext<string, StringTarget>) => `cov(${next(op.left)}, ${next(op.right)})`,
    }
] as const satisfies StringCompilationRule[]

const covEvaluateCompilationRules = [
    ...EVALUATE_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('@stats/cov'),
        handle: (op: Cov<OpSpec, OpSpec>, _t: EvaluateTarget, next: VisitNext<unknown, EvaluateTarget>) => {
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
// Provides a `SqlTarget<D>` with a `dialect` parameter and two rule
// sets that handle the CORE ops. Does NOT know about Cov.
// sqlite has no datetime literal — the sqlite rules statically exclude
// `LitSpec<'datetime'>` from their Supported union, so feeding a
// datetime tree to them is a COMPILE-TIME error in addition to a runtime error.

type SqlDialect = 'postgres' | 'duckdb' | 'sqlite'

interface SqlTarget<D extends SqlDialect = SqlDialect> {
    dialect: D
}

type SqlCompilationRule<D extends SqlDialect> = CompilationRule<SqlTarget<D>, string>

function sqlEscapeString(s: string): string {
    return `'${s.replace(/'/g, "''")}'`
}

// Postgres / DuckDB rules support every dtype, including datetime.
type PgDuckDialect = 'postgres' | 'duckdb'
const SQL_COMPILATION_RULES = [
    {
        name: 'lit',
        canHandle: makeIsKind<LitSpec>('lit'),
        handle: (op: Lit, target: SqlTarget<PgDuckDialect>) => {
            const { value, spec } = op
            switch (spec.dataType) {
                case 'string':
                    return sqlEscapeString(String(value))
                case 'boolean':
                    return value ? 'TRUE' : 'FALSE'
                case 'datetime': {
                    const lit = sqlEscapeString(String(value))
                    return target.dialect === 'postgres'
                        ? `${lit}::timestamptz`
                        : `CAST(${lit} AS TIMESTAMP)`
                }
                case 'int':
                case 'float':
                    return String(value)
                default:
                    throw new Error(`Unsupported data type for SQL: ${spec.dataType satisfies never}`)
            }
        },
    },
    {
        name: 'add',
        canHandle: makeIsKind<AddSpec<OpSpec, OpSpec>>('add'),
        handle: (op: Add<OpSpec, OpSpec>, _t: SqlTarget<PgDuckDialect>, next: VisitNext<string, SqlTarget<PgDuckDialect>>) => `(${next(op.left)} + ${next(op.right)})`,
    }
] as const satisfies SqlCompilationRule<PgDuckDialect>[]

// SQLite rules: identical at runtime, but the type-level `Supported`
// union omits `LitSpec<'datetime'>`, turning the old runtime check
// into a compile-time check. Add/Cov over a datetime descendant is
// also rejected because `SpecsOf<S>` flattens the whole spec tree.
type NonDatetime = Exclude<DataType, 'datetime'>
const SQL_SQLITE_COMPILATION_RULES = [
    {
        name: 'any_lit_except_datetime',
        canHandle: (spec: Partial<OpSpec>, _target: SqlTarget<'sqlite'>): spec is LitSpec<NonDatetime> => spec.thisKind === 'lit' && spec.dataType !== 'datetime',
        handle: (op: Lit<NonDatetime>, _target: SqlTarget<'sqlite'>) => {
            const { value, spec } = op
            switch (spec.dataType) {
                case 'string':
                    return sqlEscapeString(String(value))
                case 'boolean':
                    return value ? 'TRUE' : 'FALSE'
                case 'int':
                case 'float':
                    return String(value)
                default:
                    throw new Error(`Unsupported data type for SQLite: ${spec.dataType satisfies never}`)
            }
        }
    },
    {
        name: 'add',
        canHandle: makeIsKind<AddSpec<OpSpec, OpSpec>>('add'),
        handle: (op: Add<OpSpec, OpSpec>, _t: SqlTarget<'sqlite'>, next: VisitNext<string, SqlTarget<'sqlite'>>) => `(${next(op.left)} + ${next(op.right)})`,
    }
] as const satisfies SqlCompilationRule<'sqlite'>[]

// --- END-USER GLUE -----------------------------------------------------------
//
// The user wants Cov compiled to SQL. They didn't write Cov (stats lib did)
// and they didn't write the SQL compilation rules (sql lib did) — but the SQL rules
// are just data, so they can spread them into a new rule set in their own
// application code, without touching either library's source.

const userCompilationRules = [
    ...SQL_COMPILATION_RULES,
    {
        name: '@stats/cov',
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('@stats/cov'),
        handle: (op: Cov<OpSpec, OpSpec>, _t: SqlTarget<'postgres' | 'duckdb'>, next: VisitNext<string, SqlTarget<'postgres' | 'duckdb'>>) => `covar_pop(${next(op.left)}, ${next(op.right)})`,
    }
] as const satisfies SqlCompilationRule<'postgres' | 'duckdb'>[]

// SQLite variant: sqlite has no `covar_pop`, so emit the math directly.
// `Supported` excludes `LitSpec<'datetime'>` so the rules statically
// refuse to compile any tree containing a datetime literal.
const userSqliteCompilationRules = [
    ...SQL_SQLITE_COMPILATION_RULES,
    {
        name: '@stats/cov',
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('@stats/cov'),
        handle: (op: Cov<OpSpec, OpSpec>, _t: SqlTarget<'sqlite'>, next: VisitNext<string, SqlTarget<'sqlite'>>) => {
            const l = next(op.left)
            const r = next(op.right)
            return `(AVG(${l}*${r}) - AVG(${l})*AVG(${r}))`
        },
    },
] as const satisfies SqlCompilationRule<'sqlite'>[]

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
        expect(compile(STRING_COMPILATION_RULES, sum, {})).toBe('(5 + 10)')
    })

    it('evaluates an int+int sum', () => {
        expect(compile(EVALUATE_COMPILATION_RULES, sum, {})).toBe(15)
    })

    it('honors StringTarget precision for float literals', () => {
        expect(compile(STRING_COMPILATION_RULES, piPlus, { precision: 2 })).toBe('(3.14 + 1)')
    })

    it('falls back to full precision when no precision is set', () => {
        expect(compile(STRING_COMPILATION_RULES, piPlus, {})).toBe('(3.14159 + 1)')
    })
})

describe('stats lib compilation rules', () => {
    it('still handles core ops (string)', () => {
        expect(compile(covStringCompilationRules, sum, {})).toBe('(5 + 10)')
    })

    it('still handles core ops (evaluate)', () => {
        expect(compile(covEvaluateCompilationRules, sum, {})).toBe(15)
    })

    it('stringifies a cov call', () => {
        expect(compile(covStringCompilationRules, cov, {})).toBe('cov("xs", "ys")')
    })

    it('evaluates a numeric cov', () => {
        expect(compile(covEvaluateCompilationRules, numCov, {})).toBe(2.5)
    })

    it('rejects cov in core/SQL rules at both compile and run time', () => {
        expect(() => {
            // @ts-expect-error — compilation rules don't support spec(s): cov<...>
            compile(STRING_COMPILATION_RULES, cov, {})
        }).toThrow(/No compilation rule handles spec: @stats\/cov/)

        expect(() => {
            // @ts-expect-error — compilation rules don't support spec(s): cov<...>
            compile(EVALUATE_COMPILATION_RULES, cov, {})
        }).toThrow(/No compilation rule handles spec: @stats\/cov/)

        expect(() => {
            // @ts-expect-error — sql compilation rules don't handle cov on its own
            compile(SQL_COMPILATION_RULES, cov, { dialect: 'postgres' })
        }).toThrow(/No compilation rule handles spec: @stats\/cov/)
    })
})

describe('SQL compilation rules', () => {
    it('emits add on postgres', () => {
        expect(compile(SQL_COMPILATION_RULES, sum, { dialect: 'postgres' })).toBe('(5 + 10)')
    })

    it('emits add on sqlite', () => {
        expect(compile(SQL_SQLITE_COMPILATION_RULES, sum, { dialect: 'sqlite' })).toBe('(5 + 10)')
    })

    it('emits datetime literal on postgres', () => {
        expect(compile(SQL_COMPILATION_RULES, dt, { dialect: 'postgres' })).toBe(
            "'2026-01-01T00:00:00Z'::timestamptz",
        )
    })

    it('emits datetime literal on duckdb', () => {
        expect(compile(SQL_COMPILATION_RULES, dt, { dialect: 'duckdb' })).toBe(
            "CAST('2026-01-01T00:00:00Z' AS TIMESTAMP)",
        )
    })

    it('rejects datetime literal on sqlite at both compile and run time', () => {
        expect(() => {
            // @ts-expect-error — compilation rules don't support spec(s): lit<datetime, scalar>
            compile(SQL_SQLITE_COMPILATION_RULES, dt, { dialect: 'sqlite' })
        }).toThrow(/No compilation rule handles spec: lit/)
    })

    it('rejects nested datetime on sqlite at both compile and run time', () => {
        // SpecsOf<S> flattens the whole tree, so an Add over a datetime
        // descendant is statically rejected too. At runtime, the Add
        // handler runs first and the inner datetime literal blows up
        // when the recursion reaches it.
        const dtPlus = new Add(dt, new Lit(1, 'int'))
        expect(() => {
            // @ts-expect-error — compilation rules don't support spec(s): lit<datetime, scalar>
            compile(SQL_SQLITE_COMPILATION_RULES, dtPlus, { dialect: 'sqlite' })
        }).toThrow(/No compilation rule handles spec: lit/)
    })
})

describe('end-user glue: cov compiled to SQL', () => {
    it('emits covar_pop on postgres', () => {
        expect(compile(userCompilationRules, cov, { dialect: 'postgres' })).toBe(
            "covar_pop('xs', 'ys')",
        )
    })

    it('emits covar_pop on duckdb', () => {
        expect(compile(userCompilationRules, cov, { dialect: 'duckdb' })).toBe(
            "covar_pop('xs', 'ys')",
        )
    })

    it('emits the manual covariance math on sqlite', () => {
        expect(compile(userSqliteCompilationRules, cov, { dialect: 'sqlite' })).toBe(
            "(AVG('xs'*'ys') - AVG('xs')*AVG('ys'))",
        )
    })

    it('composes cov inside an add', () => {
        const mixed = new Add(cov, new Lit(1, 'float'))
        expect(compile(userCompilationRules, mixed, { dialect: 'duckdb' })).toBe(
            "(covar_pop('xs', 'ys') + 1)",
        )
    })
})

describe('R22 introspection', () => {
    it('exposes KindsHandledBy as a literal-string union at the type level', () => {
        type FullKinds = KindsHandledBy<typeof userCompilationRules>
        expectTypeOf<FullKinds>().toEqualTypeOf<'lit' | 'add' | '@stats/cov'>()
    })

    it('answers canHandle from a kind string, but can\'t infer the type', () => {
        const cov = canHandle(userCompilationRules, '@stats/cov')
        expect(cov).toBe(true)
        expectTypeOf(cov).toEqualTypeOf<boolean>()

        const nope = canHandle(userCompilationRules, 'nope')
        expect(nope).toBe(false)
        expectTypeOf(nope).toEqualTypeOf<boolean>()
    })

    it('answers CanHandle at the type level', () => {
        expectTypeOf<CanHandle<typeof STRING_COMPILATION_RULES, typeof cov.spec>>().toEqualTypeOf<false>()
        expectTypeOf<CanHandle<typeof userCompilationRules, typeof cov.spec>>().toEqualTypeOf<true>()
        expectTypeOf<CanHandle<typeof SQL_SQLITE_COMPILATION_RULES, typeof dt.spec>>().toEqualTypeOf<false>()
        expectTypeOf<CanHandle<typeof SQL_COMPILATION_RULES, typeof dt.spec>>().toEqualTypeOf<true>()
    })

    it('answers canHandle from a typed IVOp, narrowed at the type level', () => {
        const a = canHandle(STRING_COMPILATION_RULES, cov)
        expectTypeOf(a).toEqualTypeOf<false>()
        expect(a).toBe(false)

        const b = canHandle(userCompilationRules, cov)
        expectTypeOf(b).toEqualTypeOf<true>()
        expect(b).toBe(true)

        const c = canHandle(SQL_SQLITE_COMPILATION_RULES, dt)
        expectTypeOf(c).toEqualTypeOf<false>()
        expect(c).toBe(false)

        const d = canHandle(SQL_COMPILATION_RULES, dt)
        expectTypeOf(d).toEqualTypeOf<true>()
        expect(d).toBe(true)
    })
})

// =============================================================================
// HOW IT SCORES AGAINST THE PRD
//
// STRONG
//   + R1 expression-problem: both axes open. The stats package teaches
//     CORE rules about Cov by spreading them into a new constant; an
//     end user combines a 3rd-party op with 3rd-party compilation rules the
//     same way.
//   + R2 op-declares-self: ops carry their spec/kind; they say nothing
//     about which targets they can be compiled to.
//   + R3 dialect-safety: `SpecsOf<S>` enumerates every spec in the tree
//     (statically, via `childSpecs`), and `compile` requires that union
//     to be a subset of `SpecsHandledBy<rules>`. Missing specs → typed
//     error. Because Supported is an OpSpec union (not just a kind
//     union), the rules can ALSO restrict on dtype/dshape — e.g.
//     `SQL_SQLITE_COMPILATION_RULES` excludes `LitSpec<'datetime'>` and
//     turns `compile(rules, dtLit, { dialect: 'sqlite' })` into a
//     compile-time error.
//   – R7 name-collision: packages namespace their kinds with a unique prefix, e.g. `@stats/cov`.
//   + R10 multi-target: Target is a generic, so the same op tree can be
//     compiled to string, evaluated, or emitted as SQL by different
//     compilation rules without touching the tree.
//   + R11/R22 static-introspection: `SpecsOf<typeof tree>` is one
//     indexed access; `SpecsHandledBy<typeof c>` / `KindsHandledBy<typeof c>`
//     project the compilation rules.
//   + R14 fallback: rules are plain objects, so spreading lets downstream
//     compilation rules re-emit a core kind differently via last-write-wins.
//   + R15 type-composition: lives next to existing `DataType` /
//     `DataShape` rather than replacing them; same generic-threading
//     pattern as the rest of the codebase.
//   + R18 typed-handler-payload: `SpecMap<S>[K]` gives handlers the
//     concrete class narrowed by the spec, so `op.left` / `op.right` /
//     `op.value` are typed without casts.
//   + R19 exhaustiveness: `{ [S in Supported as S['thisKind']]: Handler<S, ...> }`
//     errors at compile time if a handler is missing for any spec in
//     `Supported`.
//   + R20 error-clarity: template-literal error names the offending
//     spec in plain English: `compilation rules don't support spec(s): lit<datetime, scalar>`.
//   + R23 check-time: no recursive conditional on the tree — the
//     transitive kind list is already a tuple in `childSpecs`. Should
//     scale better than D/E on deep trees.
//   + R24 tree-shaking: spreads produce new VALUES; no
//     load-time side effects mutating shared state.
//
// WEAK / OPEN
//   – R5 typed-deserialization: not addressed here. A `parseOp<Allowed>`
//     gate like B/E's would re-assert the spec phantom at the wire
//     boundary; left as future work.
//   – R6 wire-stability: ops carry no `version`. Perhaps that should be
//     the responsibility of the serializer/deserializer instead of the indiviudal op classes?
//   + R13 capability-axes: partial — targets are generic (`SqlTarget<D>`)
//     and Supported is an OpSpec union, so per-target capability
//     constraints can be encoded in the type (`Supported` excludes
//     `LitSpec<'datetime'>` for `SqlTarget<'sqlite'>`). Open: there's
//     still no first-class capability REGISTRY à la E for axes that
//     aren't naturally part of the spec.
//   – Op boilerplate (R17): each composite op threads child specs
//     through generics and writes a `make<Op>Spec` builder. Comparable
//     to B's phantom-threading cost. A `defineOp` helper could compress
//     this, but the spec-shape is fundamental to R23's win here.
// =============================================================================
