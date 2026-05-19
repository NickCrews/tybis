// =============================================================================
// Approach F — Spec-carrying ops + registry compilers
//
// IDEA
//   Each op carries a structured `spec` containing its kind, dtype, dshape,
//   and the *full transitive list* of child specs. Because the spec already
//   enumerates the tree, "what kinds does this tree use?" is a single
//   indexed access — `S['thisKind'] | S['childSpecs'][number]['thisKind']`
//   — instead of a recursive conditional. That sidesteps the depth cap
//   that bites D's `AllKindsOf` and E's tree walks.
//
//   A `KindMap` interface (open via declaration merging) maps kind strings
//   to the concrete op class. Handlers receive the typed op, no casts.
//
//   A `CompilationRules<Supported, Target, Out>` is a plain handler
//   dictionary, typed by the kinds it claims and parameterized by the
//   *target* (e.g. a StringTarget with `precision`, or a SqlTarget with
//   `dialect`) and the output type. The rules are just data — exposed
//   as top-level readonly constants (`STRING_COMPILATION_RULES`, etc.)
//   so downstream packages can spread / override / inspect them freely.
//   Three top-level functions operate on rules: `compile`, `extend`,
//   `supports`.
//
// EXTENSIBILITY
//   + 3rd-party ops: new class implementing IVOp<NewSpec>; augment
//     `KindMap` once via `interface KindMap { ... }`.
//   + 3rd-party targets: define `interface XxxTarget { ... }` and a
//     `const XXX_COMPILATION_RULES: CompilationRules<..., XxxTarget, Out>`.
//   + Teach an existing rule set about a new op: spread it into a new
//     constant and add the missing handlers.
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
    readonly description?: string
    readonly version: number
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
    version: 1,
    description: string,
}
function makeLitSpec<DT extends DataType>(dataType: DT): LitSpec<DT> {
    return {
        thisKind: 'lit',
        dataType,
        dataShape: 'scalar',
        childSpecs: [],
        version: 1,
        description: `${dataType} literal`,
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
type HighestDataType<A extends DataType, B extends DataType> = 'float'
function highestDataType<A extends DataType, B extends DataType>(_a: A, _b: B): HighestDataType<A, B> {
    return 'float' // placeholder
}

type HighestDataShape<A extends DataShape, B extends DataShape> = 'columnar'
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
    version: 1,
    description: 'Binary addition',
}
function makeAddSpec<L extends OpSpec, R extends OpSpec>(left: L, right: R): AddSpec<L, R> {
    return {
        thisKind: 'add',
        dataType: highestDataType(left.dataType, right.dataType),
        dataShape: highestDataShape(left.dataShape, right.dataShape),
        childSpecs: combineSpecs(left, right),
        version: 1,
        description: 'Binary addition',
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArgs = any[]
type SpecsHandledBy<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { canHandle: (spec: OpSpec, ...rest: AnyArgs) => spec is infer S extends OpSpec }
    ? S
    : never
}[number] : never
type TargetOf<R> = R extends readonly unknown[] ? {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// R22: runtime introspection
type HasShouldHandle<Spec extends OpSpec, Target = unknown> = { canHandle: (spec: Partial<OpSpec>, target: Target) => spec is Spec }
function canHandle<T = unknown>(
    ruleOrRules: HasShouldHandle<OpSpec, T> | readonly HasShouldHandle<OpSpec, T>[],
    kindOrSpec: string | Partial<OpSpec>,
    target?: T
): boolean {
    const spec: Partial<OpSpec> = typeof kindOrSpec === 'string'
        ? { thisKind: kindOrSpec }
        : kindOrSpec
    if (Array.isArray(ruleOrRules)) {
        return ruleOrRules.some(r => r.canHandle(spec, target as T))
    }
    return (ruleOrRules as HasShouldHandle<OpSpec, T>).canHandle(spec, target as T)
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
    // No options in this demo. Real impls would carry a row context,
    // a column-data map, etc. — same shape as StringTarget's precision.
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
    thisKind: 'cov',
    dataType: HighestDataType<L['dataType'], R['dataType']>,
    dataShape: 'scalar',  // covariance over two columns is a scalar
    childSpecs: CombineSpecs<L, R>,
    version: 1,
    description: 'Covariance of two columnar expressions',
}
function makeCovSpec<L extends OpSpec, R extends OpSpec>(left: L, right: R): CovSpec<L, R> {
    return {
        thisKind: 'cov',
        dataType: highestDataType(left.dataType, right.dataType),
        dataShape: 'scalar',
        childSpecs: combineSpecs(left, right),
        version: 1,
        description: 'Covariance of two columnar expressions',
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
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('cov'),
        handle: (op: Cov<OpSpec, OpSpec>, _t: StringTarget, next: VisitNext<string, StringTarget>) => `cov(${next(op.left)}, ${next(op.right)})`,
    }
] as const satisfies StringCompilationRule[]

const covEvaluateCompilationRules = [
    ...EVALUATE_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('cov'),
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
            for (let i = 0; i < n; i++) s += (xs[i] - mx) * (ys[i] - my)
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
        name: 'cov',
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('cov'),
        handle: (op: Cov<OpSpec, OpSpec>, _t: SqlTarget<'postgres' | 'duckdb'>, next: VisitNext<string, SqlTarget<'postgres' | 'duckdb'>>) => `covar_pop(${next(op.left)}, ${next(op.right)})`,
    }
] as const satisfies SqlCompilationRule<'postgres' | 'duckdb'>[]

// SQLite variant: sqlite has no `covar_pop`, so emit the math directly.
// `Supported` excludes `LitSpec<'datetime'>` so the rules statically
// refuse to compile any tree containing a datetime literal.
const userSqliteCompilationRules = [
    ...SQL_SQLITE_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<CovSpec<OpSpec, OpSpec>>('cov'),
        handle: (op: Cov<OpSpec, OpSpec>, _t: SqlTarget<'sqlite'>, next: VisitNext<string, SqlTarget<'sqlite'>>) => {
            const l = next(op.left)
            const r = next(op.right)
            return `(AVG(${l}*${r}) - AVG(${l})*AVG(${r}))`
        },
    },
] as const satisfies SqlCompilationRule<'sqlite'>[]

// =============================================================================
// DEMO
// =============================================================================

const log = (label: string, value: unknown) => console.log(label.padEnd(48), value)
const section = (title: string) => console.log(`\n── ${title} ${'─'.repeat(Math.max(1, 60 - title.length))}`)

section('Core ops, core compilation rules')
const five = new Lit(5, 'int')
const ten = new Lit(10, 'int')
const sum = new Add(five, ten)

log('compile(STRING_COMPILATION_RULES, 5 + 10)', compile(STRING_COMPILATION_RULES, sum, {}))
log('compile(EVALUATE_COMPILATION_RULES, 5 + 10)', compile(EVALUATE_COMPILATION_RULES, sum, {}))

// StringTarget option: precision applies to float literals.
const pi = new Lit(3.14159, 'float')
const piPlus = new Add(pi, new Lit(1, 'int'))
log('compile(STRING_COMPILATION_RULES, pi + 1) precision=2', compile(STRING_COMPILATION_RULES, piPlus, { precision: 2 }))
log('compile(STRING_COMPILATION_RULES, pi + 1) no precision', compile(STRING_COMPILATION_RULES, piPlus, {}))

section('Stats lib compilation rules also handle core ops')
log('compile(covStringCompilationRules, 5 + 10)', compile(covStringCompilationRules, sum, {}))
log('compile(covEvaluateCompilationRules, 5 + 10)', compile(covEvaluateCompilationRules, sum, {}))

section('Stats op (Cov), stats compilation rules')
// String lits standing in for column references — fine for toString/toSql.
// Evaluate of cov needs actual numeric arrays, so a separate numeric Cov below.
const colX = new Lit('xs' as never, 'string')
const colY = new Lit('ys' as never, 'string')
const cov = new Cov(colX, colY)
log('compile(covStringCompilationRules, cov(xs, ys))', compile(covStringCompilationRules, cov, {}))

const numCov = new Cov(
    new Lit([1, 2, 3, 4] as never, 'float'),
    new Lit([2, 4, 6, 8] as never, 'float'),
)
log('compile(covEvaluateCompilationRules, cov(...))', compile(covEvaluateCompilationRules, numCov, {}))

// Wrapped in a never-called function so the @ts-expect-error lines are
// still type-checked but the (deliberately-broken) calls don't run.
function _typeErrorDemos() {
    // @ts-expect-error — compilation rules don't support spec(s): cov<...>
    compile(STRING_COMPILATION_RULES, cov, {})
    // @ts-expect-error — compilation rules don't support spec(s): cov<...>
    compile(EVALUATE_COMPILATION_RULES, cov, {})
    // @ts-expect-error — sql compilation rules don't handle cov on its own
    compile(SQL_COMPILATION_RULES, cov, { dialect: 'postgres' })
}
void _typeErrorDemos

section('SQL compilation rules on core ops')
log('compile(SQL_COMPILATION_RULES, 5 + 10, postgres)', compile(SQL_COMPILATION_RULES, sum, { dialect: 'postgres' }))
log('compile(SQL_SQLITE_COMPILATION_RULES, 5 + 10, sqlite)', compile(SQL_SQLITE_COMPILATION_RULES, sum, { dialect: 'sqlite' }))

// Datetime literal: ok on postgres/duckdb, statically rejected by sqlite rules.
const dt = new Lit('2026-01-01T00:00:00Z', 'datetime')
log('compile(SQL_COMPILATION_RULES, datetime, postgres)', compile(SQL_COMPILATION_RULES, dt, { dialect: 'postgres' }))
log('compile(SQL_COMPILATION_RULES, datetime, duckdb)', compile(SQL_COMPILATION_RULES, dt, { dialect: 'duckdb' }))

// The big payoff: sqlite + datetime is a COMPILE-TIME error, not a runtime
// throw. `Supported` for SQL_SQLITE_COMPILATION_RULES excludes
// `LitSpec<'datetime'>`, so feeding `dt` (or anything that transitively
// contains a datetime literal) trips the `MissingError` template.
function _sqliteDatetimeStaticError() {
    // @ts-expect-error — compilation rules don't support spec(s): lit<datetime, scalar>
    compile(SQL_SQLITE_COMPILATION_RULES, dt, { dialect: 'sqlite' })

    // Even nested: an Add over a datetime descendant is also rejected,
    // because SpecsOf<S> flattens the whole tree.
    const dtPlus = new Add(dt, new Lit(1, 'int'))
    // @ts-expect-error — compilation rules don't support spec(s): lit<datetime, scalar>
    compile(SQL_SQLITE_COMPILATION_RULES, dtPlus, { dialect: 'sqlite' })
}
void _sqliteDatetimeStaticError

section('End-user glue: Cov compiled to SQL')
log('compile(userCompilationRules, cov, postgres)', compile(userCompilationRules, cov, { dialect: 'postgres' }))
log('compile(userCompilationRules, cov, duckdb)', compile(userCompilationRules, cov, { dialect: 'duckdb' }))
log('compile(userSqliteCompilationRules, cov, sqlite)', compile(userSqliteCompilationRules, cov, { dialect: 'sqlite' }))
const mixed = new Add(cov, new Lit(1, 'float'))
log('compile(userCompilationRules, cov + 1, duckdb)', compile(userCompilationRules, mixed, { dialect: 'duckdb' }))

// R22 introspection: types + runtime.
section('R22 introspection')
type FullKinds = KindsHandledBy<typeof userCompilationRules>
const fullKinds: FullKinds[] = ['lit', 'add', 'cov']
log('static  KindsHandledBy<typeof userCompilationRules>', fullKinds.join(' | '))
log("runtime canHandle(userCompilationRules, 'cov')", canHandle(userCompilationRules, 'cov'))
log("runtime canHandle(userCompilationRules, 'nope')", canHandle(userCompilationRules, 'nope'))

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
//   – R6 wire-stability: ops carry `version` but there's no migration
//     story yet.
//   – R7 name-collision: kinds are bare strings. Scoped-kind convention
//     (`'@scope/pkg/name'`) would apply identically to this approach.
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
