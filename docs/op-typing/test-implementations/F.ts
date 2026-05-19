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
//   A `Compiler<Supported, Target, Out>` is a handler dictionary, typed
//   by the kinds it claims and parameterized by the *target* (e.g. a
//   StringTarget with `precision`, or a SqlTarget with `dialect`) and
//   the output type. `extend()` returns a new compiler value whose
//   `Supported` widens to include the new kinds.
//
// EXTENSIBILITY
//   + 3rd-party ops: new class implementing IVOp<NewSpec>; augment
//     `KindMap` once via `interface KindMap { ... }`.
//   + 3rd-party targets: define `interface XxxTarget { ... }` and a
//     `new Compiler<..., XxxTarget, Out>(...)`.
//   + Teach an existing compiler about a new op: `c.extend({ ... })`
//     — produces a NEW compiler value, original untouched.
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

type DataType = 'string' | 'int' | 'float' | 'boolean' | 'datetime' | 'uuid'
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

type LitSpec<DT extends DataType> = {
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

class Lit<DT extends DataType> implements IVOp<LitSpec<DT>> {
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
// `KindMap` is the open registry that connects a kind STRING to the
// concrete op CLASS for that kind. Handlers receive `KindMap[K]` so
// `op.value` / `op.left` / `op.right` are typed without casts (R18).
// 3rd-party packages augment this via interface declaration merging.

interface KindMap {
    lit: Lit<DataType>
    add: Add<OpSpec, OpSpec>
}

// All kinds used by a spec, including transitive descendants. We get
// this for free because `childSpecs` is the entire transitive list.
// One indexed access — no recursive conditional, no depth cap (R23).
type KindsOf<S extends OpSpec> =
    S['thisKind'] | S['childSpecs'][number]['thisKind']

type Recurse<Out> = (sub: IVOp) => Out

type Handler<K extends keyof KindMap, Target, Out> =
    (op: KindMap[K], target: Target, recurse: Recurse<Out>) => Out

// R20: template-literal error names the offending kind(s) in plain text.
type MissingError<Missing extends string> =
    `compiler is missing handler(s) for kind(s): ${Missing}`

class Compiler<Supported extends keyof KindMap, Target, Out> {
    constructor(readonly handlers: { [K in Supported]: Handler<K, Target, Out> }) { }

    compile<S extends OpSpec>(
        op: IVOp<S>,
        target: Target,
        ..._proof: [Exclude<KindsOf<S>, Supported>] extends [never]
            ? []
            : [missing: MissingError<Exclude<KindsOf<S>, Supported> & string>]
    ): Out {
        const handlers = this.handlers as unknown as Record<string, (op: IVOp, target: Target, recurse: Recurse<Out>) => Out>
        const rec: Recurse<Out> = (sub) => handlers[sub.spec.thisKind](sub, target, rec)
        return rec(op as IVOp)
    }

    // R1 + R14: extend produces a NEW compiler value. The handler dict
    // accepts overrides for existing kinds (last-write-wins via spread),
    // so 3rd parties can either ADD new kinds or REPLACE core emits.
    extend<New extends keyof KindMap>(
        more: { [K in New]: Handler<K, Target, Out> },
    ): Compiler<Supported | New, Target, Out> {
        return new Compiler({ ...this.handlers, ...more } as { [K in Supported | New]: Handler<K, Target, Out> })
    }

    // R22: runtime introspection mirror of the static `Supported` union.
    supports(kind: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.handlers, kind)
    }
}

// R22 (type side).
type KindsHandledBy<C> = C extends Compiler<infer S, infer _T, infer _O> ? S : never

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

const stringCompiler = new Compiler<'lit' | 'add', StringTarget, string>({
    lit: (op, target) => {
        const { value, spec } = op
        if (spec.dataType === 'float' && target.precision !== undefined && typeof value === 'number') {
            return value.toFixed(target.precision)
        }
        if (spec.dataType === 'string') return JSON.stringify(value)
        return String(value)
    },
    add: (op, _target, rec) => `(${rec(op.left)} + ${rec(op.right)})`,
})

interface EvaluateTarget {
    // No options in this demo. Real impls would carry a row context,
    // a column-data map, etc. — same shape as StringTarget's precision.
}

const evaluateCompiler = new Compiler<'lit' | 'add', EvaluateTarget, unknown>({
    lit: (op) => op.value,
    add: (op, _t, rec) => {
        const l = rec(op.left) as number
        const r = rec(op.right) as number
        return l + r
    },
})

// --- 3RD-PARTY STATS PACKAGE -------------------------------------------------
//
// Provides a `Cov` op and teaches both core compilers how to handle it,
// WITHOUT modifying the core compiler values — `.extend()` returns new
// compiler values whose `Supported` union widens to include `'cov'`.

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

// The stats library augments `KindMap` so any compiler with a `cov`
// handler gets a typed `op.left` / `op.right` for free.
interface KindMap {
    cov: Cov<OpSpec, OpSpec>
}

// Compilers exported by the stats package: the core ones, taught about Cov.
const stringCompilerWithCov = stringCompiler.extend<'cov'>({
    cov: (op, _t, rec) => `cov(${rec(op.left)}, ${rec(op.right)})`,
})

const evaluateCompilerWithCov = evaluateCompiler.extend<'cov'>({
    cov: (op, _t, rec) => {
        const xs = rec(op.left) as number[]
        const ys = rec(op.right) as number[]
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
})

// --- 3RD-PARTY SQL PACKAGE ---------------------------------------------------
//
// Provides a `SqlTarget` with a `dialect` parameter and a compiler that
// handles the CORE ops. Does NOT know about Cov.
// sqlite has no datetime literal, so a datetime literal on sqlite is a
// runtime error.

type SqlDialect = 'postgres' | 'duckdb' | 'sqlite'

interface SqlTarget {
    dialect: SqlDialect
}

function sqlEscapeString(s: string): string {
    return `'${s.replace(/'/g, "''")}'`
}

const sqlCompiler = new Compiler<'lit' | 'add', SqlTarget, string>({
    lit: (op, target) => {
        const { value, spec } = op
        switch (spec.dataType) {
            case 'string':
            case 'uuid':
                return sqlEscapeString(String(value))
            case 'boolean':
                return value ? 'TRUE' : 'FALSE'
            case 'datetime': {
                if (target.dialect === 'sqlite') {
                    throw new Error(`sqlite has no datetime literal; got value ${String(value)}`)
                }
                const lit = sqlEscapeString(String(value))
                return target.dialect === 'postgres'
                    ? `${lit}::timestamptz`
                    : `CAST(${lit} AS TIMESTAMP)`
            }
            case 'int':
            case 'float':
                return String(value)
        }
    },
    add: (op, _t, rec) => `(${rec(op.left)} + ${rec(op.right)})`,
})

// --- END-USER GLUE -----------------------------------------------------------
//
// The user wants Cov compiled to SQL. They didn't write Cov (stats lib did)
// and they didn't write the SQL compiler (sql lib did) — but `extend()`
// lets them combine the two in their own application code, without
// touching either library's source.

const fullSqlCompiler = sqlCompiler.extend<'cov'>({
    cov: (op, target, rec) => {
        const l = rec(op.left)
        const r = rec(op.right)
        if (target.dialect === 'sqlite') {
            // sqlite has no covar_pop — emit the math directly.
            return `(AVG(${l}*${r}) - AVG(${l})*AVG(${r}))`
        }
        return `covar_pop(${l}, ${r})`
    },
})

// =============================================================================
// DEMO
// =============================================================================

const log = (label: string, value: unknown) => console.log(label.padEnd(48), value)
const section = (title: string) => console.log(`\n── ${title} ${'─'.repeat(Math.max(1, 60 - title.length))}`)

// Core ops, core compilers --------------------------------------------------
section('Core ops, core compilers')
const five = new Lit(5, 'int')
const ten = new Lit(10, 'int')
const sum = new Add(five, ten)

log('stringCompiler.compile(5 + 10)', stringCompiler.compile(sum, {}))
log('evaluateCompiler.compile(5 + 10)', evaluateCompiler.compile(sum, {}))

// StringTarget option: precision applies to float literals.
const pi = new Lit(3.14159, 'float')
const piPlus = new Add(pi, new Lit(1, 'int'))
log('stringCompiler.compile(pi + 1) precision=2', stringCompiler.compile(piPlus, { precision: 2 }))
log('stringCompiler.compile(pi + 1) no precision', stringCompiler.compile(piPlus, {}))

// Core ops, stats library compilers (also work on core-only trees) ----------
section('Stats lib compilers also handle core ops')
log('stringCompilerWithCov.compile(5 + 10)', stringCompilerWithCov.compile(sum, {}))
log('evaluateCompilerWithCov.compile(5 + 10)', evaluateCompilerWithCov.compile(sum, {}))

// Stats op, stats compilers -------------------------------------------------
section('Stats op (Cov), stats compilers')
// String lits standing in for column references — fine for toString/toSql.
// Evaluate of cov needs actual numeric arrays, so a separate numeric Cov below.
const colX = new Lit('xs' as never, 'string')
const colY = new Lit('ys' as never, 'string')
const cov = new Cov(colX, colY)
log('stringCompilerWithCov.compile(cov(xs, ys))', stringCompilerWithCov.compile(cov, {}))

const numCov = new Cov(
    new Lit([1, 2, 3, 4] as never, 'float'),
    new Lit([2, 4, 6, 8] as never, 'float'),
)
log('evaluateCompilerWithCov.compile(cov([1..4],[2..8]))', evaluateCompilerWithCov.compile(numCov, {}))

// Stats op + core compiler — type error: core compilers don't know 'cov'.
// Wrapped in a never-called function so the @ts-expect-error lines are
// still type-checked but the (deliberately-broken) calls don't run.
function _typeErrorDemos() {
    // @ts-expect-error — compiler is missing handler(s) for kind(s): cov
    stringCompiler.compile(cov, {})
    // @ts-expect-error — compiler is missing handler(s) for kind(s): cov
    evaluateCompiler.compile(cov, {})
    // @ts-expect-error — sql compiler doesn't handle cov on its own
    sqlCompiler.compile(cov, { dialect: 'postgres' })
}
void _typeErrorDemos

// SQL package: core ops, SQL compiler ---------------------------------------
section('SQL compiler on core ops')
log('sqlCompiler.compile(5 + 10, postgres)', sqlCompiler.compile(sum, { dialect: 'postgres' }))
log('sqlCompiler.compile(5 + 10, sqlite)', sqlCompiler.compile(sum, { dialect: 'sqlite' }))

// Datetime literal: ok on postgres/duckdb, throws on sqlite.
const dt = new Lit('2026-01-01T00:00:00Z', 'datetime')
log('sqlCompiler.compile(datetime, postgres)', sqlCompiler.compile(dt, { dialect: 'postgres' }))
log('sqlCompiler.compile(datetime, duckdb)', sqlCompiler.compile(dt, { dialect: 'duckdb' }))
try {
    sqlCompiler.compile(dt, { dialect: 'sqlite' })
    throw new Error('expected throw')
} catch (e) {
    if (!(e instanceof Error) || !e.message.includes('sqlite has no datetime literal')) throw e
    log('sqlCompiler.compile(datetime, sqlite)', `throws: ${e.message}`)
}

// (Stats op + SQL compiler without user glue is a type error too —
// see `_typeErrorDemos` above.)

// End-user combo: Cov + SQL through the user's glue compiler. ---------------
section('End-user glue: Cov compiled to SQL')
log('fullSqlCompiler.compile(cov, postgres)', fullSqlCompiler.compile(cov, { dialect: 'postgres' }))
log('fullSqlCompiler.compile(cov, duckdb)', fullSqlCompiler.compile(cov, { dialect: 'duckdb' }))
log('fullSqlCompiler.compile(cov, sqlite)', fullSqlCompiler.compile(cov, { dialect: 'sqlite' }))

// Nested combination: Add(cov, lit) compiles end-to-end on the glue compiler.
const mixed = new Add(cov, new Lit(1, 'float'))
log('fullSqlCompiler.compile(cov + 1, duckdb)', fullSqlCompiler.compile(mixed, { dialect: 'duckdb' }))

// R22 introspection: types + runtime.
section('R22 introspection')
type FullKinds = KindsHandledBy<typeof fullSqlCompiler>
const fullKinds: FullKinds[] = ['lit', 'add', 'cov']
log('static  KindsHandledBy<typeof fullSqlCompiler>', fullKinds.join(' | '))
log("runtime fullSqlCompiler.supports('cov')", fullSqlCompiler.supports('cov'))
log("runtime fullSqlCompiler.supports('nope')", fullSqlCompiler.supports('nope'))

// =============================================================================
// HOW IT SCORES AGAINST THE PRD
//
// STRONG
//   + R1 expression-problem: both axes open. The stats package teaches
//     CORE compilers about Cov via `.extend()`; an end user combines
//     a 3rd-party op with a 3rd-party compiler the same way.
//   + R2 op-declares-self: ops carry their spec/kind; they say nothing
//     about which compilers handle them.
//   + R3 dialect-safety: `KindsOf<S>` enumerates every kind in the tree
//     (statically, via `childSpecs`), and `compile` requires that union
//     to be a subset of `Supported`. Missing kinds → typed error.
//   + R10 multi-target: Target is a generic, so the same op tree can be
//     compiled to string, evaluated, or emitted as SQL by different
//     compilers without touching the tree.
//   + R11/R22 static-introspection: `KindsOf<typeof tree>` is one
//     indexed access; `KindsHandledBy<typeof c>` projects the compiler.
//   + R14 fallback: `extend()` accepts overrides, so a downstream
//     compiler can re-emit a core kind differently.
//   + R15 type-composition: lives next to existing `DataType` /
//     `DataShape` rather than replacing them; same generic-threading
//     pattern as the rest of the codebase.
//   + R18 typed-handler-payload: `KindMap[K]` gives handlers the
//     concrete class, so `op.left` / `op.right` / `op.value` are typed.
//   + R19 exhaustiveness: `{ [K in Supported]: Handler<K, ...> }`
//     errors at compiler construction when a handler is missing.
//   + R20 error-clarity: template-literal error names the offending
//     kind in plain English: `compiler is missing handler(s) for kind(s): cov`.
//   + R23 check-time: no recursive conditional on the tree — the
//     transitive kind list is already a tuple in `childSpecs`. Should
//     scale better than D/E on deep trees.
//   + R24 tree-shaking: `extend()` produces new VALUES; no load-time
//     side effects mutating shared state.
//
// WEAK / OPEN
//   – R5 typed-deserialization: not addressed here. A `parseOp<Allowed>`
//     gate like B/E's would re-assert the spec phantom at the wire
//     boundary; left as future work.
//   – R6 wire-stability: ops carry `version` but there's no migration
//     story yet.
//   – R7 name-collision: kinds are bare strings. Scoped-kind convention
//     (`'@scope/pkg/name'`) would apply identically to this approach.
//   – R13 capability-axes: not modeled. Could add an `OpCapabilities`
//     registry à la E and require the compiler to accept an axis set.
//   – Op boilerplate (R17): each composite op threads child specs
//     through generics and writes a `make<Op>Spec` builder. Comparable
//     to B's phantom-threading cost. A `defineOp` helper could compress
//     this, but the spec-shape is fundamental to R23's win here.
//   – Runtime-only sqlite/datetime check: catching it at compile time
//     would require pushing the `dialect` into the type system (e.g.
//     `Compiler<..., SqlTarget<D>, ...>` and rejecting `dt: 'datetime'`
//     children when `D extends 'sqlite'`). Possible follow-up.
// =============================================================================
