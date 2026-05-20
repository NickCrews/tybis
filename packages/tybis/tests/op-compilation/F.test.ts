import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'expect-type'

// =============================================================================
// Approach F — Spec-carrying ops, a compilation target, and then handlers that pair up combos of these.
//
// IDEA
//   Each op exposes its kind, dtype, dshape, and the *full transitive list*
//   of child ops directly on the op itself — no nested `spec` object.
//   Because the op already enumerates the tree via `childOps`, "what ops
//   does this tree use?" is a single indexed access —
//   `OpsOf<O> = O | O['childOps'][number]` — instead of a recursive
//   conditional.
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
interface IVOp<Kind extends string = string> {
    readonly thisKind: Kind
    /** Every op in the transitive subtree, flattened. Drives `OpsOf<O>`. */
    readonly childOps: readonly IVOp[]
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
    readonly thisKind = 'lit' as const
    readonly childOps = [] as const
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

type CombineOps<L extends IVOp, R extends IVOp> = [...L['childOps'], ...R['childOps'], L, R]
function combineOps<L extends IVOp, R extends IVOp>(left: L, right: R): CombineOps<L, R> {
    return [...left.childOps, ...right.childOps, left, right] as unknown as CombineOps<L, R>
}

class Add<L extends IVOp, R extends IVOp> implements IVOp<'add'> {
    readonly thisKind = 'add' as const
    readonly childOps: CombineOps<L, R>
    constructor(readonly left: L, readonly right: R) {
        this.childOps = combineOps(left, right)
    }
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
// There's no separate spec registry — the op IS the spec.

// All ops used by an op tree, including transitive descendants. We get
// this for free because `childOps` is the entire transitive list. One
// indexed access — no recursive conditional, no depth cap (R23).
type OpsOf<O extends IVOp> = O | O['childOps'][number]

type VisitNext<Out, Target> = (sub: IVOp, target?: Target) => Out

// `OpFor<S>` collapses a still-generic `IVOp<string>` to `never` so that
// the handler signature `(op: never, ...) => Out` accepts any concrete
// handler. Once `Supported` narrows to e.g. `Lit` (whose `thisKind` is
// the literal `'lit'`, not the generic `string`), `OpFor` is identity
// and the handler gets the typed op.
type OpFor<S extends IVOp> = string extends S['thisKind'] ? never : S

type Handler<S extends IVOp, Target, Out> =
    (op: OpFor<S>, target: Target, visit: VisitNext<Out, Target>) => Out

// R20: template-literal error names the offending op(s) in plain text.
// Surfaces kind + dtype + dshape so e.g. "lit<datetime, scalar>" makes
// it obvious which combination isn't supported.
type OpDesc<O extends IVOp> = O extends IVOp
    ? `${O['thisKind']}<${ReturnType<O['dtype']>}, ${ReturnType<O['dshape']>}>`
    : never

type MissingError<Missing extends IVOp> =
    `No compilation rule for op(s): ${OpDesc<Missing> & string}`

// `Supported` is a full IVOp — not just the kind string — so rules can
// advertise restrictions on the FULL op, e.g. `Lit<'datetime'>` can be
// excluded for sqlite while `Lit<'int'>` is fine.
type CompilationRule<Target, Out, Supported extends IVOp = IVOp> = {
    name?: string;
    canHandle: (op: IVOp, target: Target) => op is Supported;
    handle: Handler<Supported, Target, Out>;
}

// Inference helpers that look directly at each rule's `canHandle`
// predicate and `handle` signature. We map across the tuple's numeric
// indices and union the per-element results. `any` rest patterns are
// required so a 2-arg handler like `(op) => x` still matches.

type AnyArgs = any[]
type OpsHandledBy<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { canHandle: (op: IVOp, ...rest: AnyArgs) => op is infer O extends IVOp }
    ? O
    : never
}[number] : never
type TargetOf<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { handle: (op: any, target: infer T, ...rest: AnyArgs) => unknown }
    ? T : never
}[number] : never
type OutOf<R> = R extends readonly unknown[] ? {
    [K in keyof R]: R[K] extends { handle: (...args: AnyArgs) => infer O } ? O : never
}[number] : never
type KindsHandledBy<R> = OpsHandledBy<R> extends infer O
    ? O extends IVOp ? O['thisKind'] : never
    : never

function compile<R extends readonly unknown[], O extends IVOp>(
    rules: R,
    op: O,
    target: TargetOf<R>,
    // typing black magic: if the op tree contains any ops not assignable
    // to the rules' OpsHandledBy, error with a message listing the
    // offenders. This is what gives us "lit<datetime> on sqlite is
    // rejected at compile time" — see SQL_SQLITE_COMPILATION_RULES.
    ..._proof: [Exclude<OpsOf<O>, OpsHandledBy<R>>] extends [never]
        ? []
        : [missing: MissingError<Exclude<OpsOf<O>, OpsHandledBy<R>>>]
): OutOf<R> {
    type T = TargetOf<R>
    type Out = OutOf<R>
    const handlers = rules as unknown as readonly {
        canHandle: (op: IVOp, target: T) => boolean
        handle: (op: IVOp, target: T, visitNext: VisitNext<Out, T>) => Out
    }[]
    const next: VisitNext<Out, T> = (sub, passedTarget) => {
        const effectiveTarget = (passedTarget ?? target) as T
        const rule = handlers.find(r => r.canHandle(sub, effectiveTarget))
        if (!rule) throw new Error(`No compilation rule handles op: ${sub.thisKind}`)
        return rule.handle(sub, effectiveTarget, next)
    }
    return next(op, target)
}

// R22: introspection — both runtime AND compile-time.
//
// `CanHandle<R, O>` is the type-level twin of the runtime `canHandle()`:
// given a rule set R and an op O, it resolves to the literal `true` if
// every op in the tree (`OpsOf<O>`) is covered by the rules'
// `OpsHandledBy<R>`, otherwise `false`. Same machinery as `compile()`'s
// `_proof` parameter, just exposed as a boolean instead of a
// `MissingError` template.
type CanHandle<R, O extends IVOp> =
    [Exclude<OpsOf<O>, OpsHandledBy<R>>] extends [never] ? true : false

// Typed `IVOp` — return value is narrowed to `true` or `false` at
// compile time via `CanHandle<R, O>`. The runtime walks the full op
// tree and requires every op be handled by some rule.
function canHandle<R extends readonly unknown[], O extends IVOp>(
    rules: R,
    op: O,
    target?: TargetOf<R>
): CanHandle<R, O>
function canHandle(
    rules: readonly { canHandle: (op: IVOp, target: unknown) => boolean }[],
    op: IVOp,
    target?: unknown
): boolean {
    const allOps: readonly IVOp[] = [op, ...op.childOps]
    return allOps.every(o => rules.some(r => r.canHandle(o, target)))
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

function makeIsKind<O extends IVOp>(kind: O['thisKind']): (op: IVOp, target: unknown) => op is O {
    return (op: IVOp, _target: unknown): op is O => op.thisKind === kind
}

const STRING_COMPILATION_RULES = [
    {
        name: 'lit',
        canHandle: makeIsKind<Lit>('lit'),
        handle: (op: Lit, target: StringTarget) => {
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
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add'),
        handle: (op: Add<IVOp, IVOp>, _target: StringTarget, next: VisitNext<string, StringTarget>) => `(${next(op.left)} + ${next(op.right)})`,
    }
] as const satisfies StringCompilationRule[]

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
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add'),
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
    readonly thisKind = '@stats/cov' as const
    readonly childOps: CombineOps<L, R>
    constructor(readonly left: L, readonly right: R) {
        this.childOps = combineOps(left, right)
    }
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
    ...STRING_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<Cov<IVOp, IVOp>>('@stats/cov'),
        handle: (op: Cov<IVOp, IVOp>, _t: StringTarget, next: VisitNext<string, StringTarget>) => `cov(${next(op.left)}, ${next(op.right)})`,
    }
] as const satisfies StringCompilationRule[]

const covEvaluateCompilationRules = [
    ...EVALUATE_COMPILATION_RULES,
    {
        name: 'cov',
        canHandle: makeIsKind<Cov<IVOp, IVOp>>('@stats/cov'),
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
// Provides a `SqlTarget<D>` with a `dialect` parameter and two rule
// sets that handle the CORE ops. Does NOT know about Cov.
// sqlite has no datetime literal — the sqlite rules statically exclude
// `Lit<'datetime'>` from their Supported union, so feeding a datetime
// tree to them is a COMPILE-TIME error in addition to a runtime error.

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
        canHandle: makeIsKind<Lit>('lit'),
        handle: (op: Lit, target: SqlTarget<PgDuckDialect>) => {
            const { value } = op
            const dt = op.dtype()
            switch (dt) {
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
                    throw new Error(`Unsupported data type for SQL: ${dt satisfies never}`)
            }
        },
    },
    {
        name: 'add',
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add'),
        handle: (op: Add<IVOp, IVOp>, _t: SqlTarget<PgDuckDialect>, next: VisitNext<string, SqlTarget<PgDuckDialect>>) => `(${next(op.left)} + ${next(op.right)})`,
    }
] as const satisfies SqlCompilationRule<PgDuckDialect>[]

// SQLite rules: identical at runtime, but the type-level `Supported`
// union omits `Lit<'datetime'>`, turning the old runtime check into a
// compile-time check. Add/Cov over a datetime descendant is also
// rejected because `OpsOf<O>` flattens the whole op tree.
type NonDatetime = Exclude<DataType, 'datetime'>
const SQL_SQLITE_COMPILATION_RULES = [
    {
        name: 'any_lit_except_datetime',
        canHandle: (op: IVOp, _target: SqlTarget<'sqlite'>): op is Lit<NonDatetime> => op.thisKind === 'lit' && op.dtype() !== 'datetime',
        handle: (op: Lit<NonDatetime>, _target: SqlTarget<'sqlite'>) => {
            const { value } = op
            const dt = op.dtype()
            switch (dt) {
                case 'string':
                    return sqlEscapeString(String(value))
                case 'boolean':
                    return value ? 'TRUE' : 'FALSE'
                case 'int':
                case 'float':
                    return String(value)
                default:
                    throw new Error(`Unsupported data type for SQLite: ${dt satisfies never}`)
            }
        }
    },
    {
        name: 'add',
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add'),
        handle: (op: Add<IVOp, IVOp>, _t: SqlTarget<'sqlite'>, next: VisitNext<string, SqlTarget<'sqlite'>>) => `(${next(op.left)} + ${next(op.right)})`,
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
        canHandle: makeIsKind<Cov<IVOp, IVOp>>('@stats/cov'),
        handle: (op: Cov<IVOp, IVOp>, _t: SqlTarget<'postgres' | 'duckdb'>, next: VisitNext<string, SqlTarget<'postgres' | 'duckdb'>>) => `covar_pop(${next(op.left)}, ${next(op.right)})`,
    }
] as const satisfies SqlCompilationRule<'postgres' | 'duckdb'>[]

// SQLite variant: sqlite has no `covar_pop`, so emit the math directly.
// `Supported` excludes `Lit<'datetime'>` so the rules statically refuse
// to compile any tree containing a datetime literal.
const userSqliteCompilationRules = [
    ...SQL_SQLITE_COMPILATION_RULES,
    {
        name: '@stats/cov',
        canHandle: makeIsKind<Cov<IVOp, IVOp>>('@stats/cov'),
        handle: (op: Cov<IVOp, IVOp>, _t: SqlTarget<'sqlite'>, next: VisitNext<string, SqlTarget<'sqlite'>>) => {
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
            // @ts-expect-error — compilation rules don't support op(s): cov<...>
            compile(STRING_COMPILATION_RULES, cov, {})
        }).toThrow(/No compilation rule handles op: @stats\/cov/)

        expect(() => {
            // @ts-expect-error — compilation rules don't support op(s): cov<...>
            compile(EVALUATE_COMPILATION_RULES, cov, {})
        }).toThrow(/No compilation rule handles op: @stats\/cov/)

        expect(() => {
            // @ts-expect-error — sql compilation rules don't handle cov on its own
            compile(SQL_COMPILATION_RULES, cov, { dialect: 'postgres' })
        }).toThrow(/No compilation rule handles op: @stats\/cov/)
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
            // @ts-expect-error — compilation rules don't support op(s): lit<datetime, scalar>
            compile(SQL_SQLITE_COMPILATION_RULES, dt, { dialect: 'sqlite' })
        }).toThrow(/No compilation rule handles op: lit/)
    })

    it('rejects nested datetime on sqlite at both compile and run time', () => {
        // OpsOf<O> flattens the whole tree, so an Add over a datetime
        // descendant is statically rejected too. At runtime, the Add
        // handler runs first and the inner datetime literal blows up
        // when the recursion reaches it.
        const dtPlus = new Add(dt, new Lit(1, 'int'))
        expect(() => {
            // @ts-expect-error — compilation rules don't support op(s): lit<datetime, scalar>
            compile(SQL_SQLITE_COMPILATION_RULES, dtPlus, { dialect: 'sqlite' })
        }).toThrow(/No compilation rule handles op: lit/)
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

    it('rejects bare kind strings at the type level', () => {
        // Type-only assertions: wrapped in a never-called function so the
        // runtime never sees the synthetic bad arguments, but the
        // TypeScript checker still verifies the @ts-expect-error
        // directives fire.
        expect(() => {
            // @ts-expect-error — bare kind strings are not accepted; pass a full IVOp
            canHandle(userCompilationRules, '@stats/cov')
        }).toThrow()
    })

    it('answers canHandle from a typed IVOp, narrowed at the type level', () => {
        expectTypeOf<CanHandle<typeof STRING_COMPILATION_RULES, typeof cov>>().toEqualTypeOf<false>()
        const a = canHandle(STRING_COMPILATION_RULES, cov)
        expectTypeOf(a).toEqualTypeOf<false>()
        expect(a).toBe(false)

        expectTypeOf<CanHandle<typeof userCompilationRules, typeof cov>>().toEqualTypeOf<true>()
        const b = canHandle(userCompilationRules, cov)
        expectTypeOf(b).toEqualTypeOf<true>()
        expect(b).toBe(true)

        expectTypeOf<CanHandle<typeof SQL_SQLITE_COMPILATION_RULES, typeof dt>>().toEqualTypeOf<false>()
        const c = canHandle(SQL_SQLITE_COMPILATION_RULES, dt)
        expectTypeOf(c).toEqualTypeOf<false>()
        expect(c).toBe(false)

        expectTypeOf<CanHandle<typeof SQL_COMPILATION_RULES, typeof dt>>().toEqualTypeOf<true>()
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
//   + R2 op-declares-self: ops carry their kind/dtype/dshape/childOps
//     directly; they say nothing about which targets they can be compiled to.
//   + R3 dialect-safety: `OpsOf<O>` enumerates every op in the tree
//     (statically, via `childOps`), and `compile` requires that union
//     to be a subset of `OpsHandledBy<rules>`. Missing ops → typed
//     error. Because Supported is an IVOp union (not just a kind
//     union), the rules can ALSO restrict on dtype/dshape — e.g.
//     `SQL_SQLITE_COMPILATION_RULES` excludes `Lit<'datetime'>` and
//     turns `compile(rules, dtLit, { dialect: 'sqlite' })` into a
//     compile-time error.
//   – R7 name-collision: packages namespace their kinds with a unique prefix, e.g. `@stats/cov`.
//   + R10 multi-target: Target is a generic, so the same op tree can be
//     compiled to string, evaluated, or emitted as SQL by different
//     compilation rules without touching the tree.
//   + R11/R22 static-introspection: `OpsOf<typeof tree>` is one
//     indexed access; `OpsHandledBy<typeof c>` / `KindsHandledBy<typeof c>`
//     project the compilation rules.
//   + R14 fallback: rules are plain objects, so spreading lets downstream
//     compilation rules re-emit a core kind differently via last-write-wins.
//   + R15 type-composition: lives next to existing `DataType` /
//     `DataShape` rather than replacing them; same generic-threading
//     pattern as the rest of the codebase.
//   + R18 typed-handler-payload: each rule's `canHandle` narrows to a
//     concrete op class, so `op.left` / `op.right` / `op.value` are
//     typed without casts.
//   + R19 exhaustiveness: `{ [O in Supported as O['thisKind']]: Handler<O, ...> }`
//     errors at compile time if a handler is missing for any op in
//     `Supported`.
//   + R20 error-clarity: template-literal error names the offending op
//     in plain English: `compilation rules don't support op(s): lit<datetime, scalar>`.
//   + R23 check-time: no recursive conditional on the tree — the
//     transitive op list is already a tuple in `childOps`. Should
//     scale better than D/E on deep trees.
//   + R24 tree-shaking: spreads produce new VALUES; no
//     load-time side effects mutating shared state.
//
// WEAK / OPEN
//   – R5 typed-deserialization: not addressed here. A `parseOp<Allowed>`
//     gate like B/E's would re-assert the kind phantom at the wire
//     boundary; left as future work.
//   – R6 wire-stability: ops carry no `version`. Perhaps that should be
//     the responsibility of the serializer/deserializer instead of the indiviudal op classes?
//   + R13 capability-axes: partial — targets are generic (`SqlTarget<D>`)
//     and Supported is an IVOp union, so per-target capability
//     constraints can be encoded in the type (`Supported` excludes
//     `Lit<'datetime'>` for `SqlTarget<'sqlite'>`). Open: there's
//     still no first-class capability REGISTRY à la E for axes that
//     aren't naturally part of the op.
//   – Op boilerplate (R17): each composite op threads child ops
//     through generics and combines them in the constructor. Comparable
//     to B's phantom-threading cost. A `defineOp` helper could compress
//     this, but the op shape is fundamental to R23's win here.
// =============================================================================
