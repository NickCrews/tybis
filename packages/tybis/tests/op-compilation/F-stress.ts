// =============================================================================
// F type-checker stress test.
//
// Run with:
// pnpm --filter tybis exec tsc -p tests/op-compilation/tsconfig.stress.json --noEmit --extendedDiagnostics
//
// Self-contained sibling of F.test.ts so the diagnostics measure the cost
// added by THIS file specifically. Infrastructure mirrors F.test.ts.
//
// MEASURED COST (vs a baseline tsc run of 1.91s on tests/op-compilation/):
//   - With this file at o5, no `compile`/`canHandle` calls:  +0.16s
//   - With this file at o5, 10 calls (current state):        +6.4s
//   - With this file at o6, 10 calls:                       +49.4s
//
// Two non-obvious findings the layout below is designed to reveal:
//
// 1. THE TREE ITSELF IS CHEAP. Even though `o5` represents 8^5 ≈ 32k value
//    nodes at runtime, its TYPE has heavy structural sharing — `Octo<T,T,T,
//    T,T,T,T,T>` is one type referenced 8 times. Building the tree adds
//    almost no check time. All the cost lives in per-`compile()`-call work.
//
// 2. THE DEPTH CAP IS NOT THE LIMIT. F's `UnhandledOps` recursion is capped
//    at depth 16 via `Decr`. The o5 tree has structural depth ~13 (5 Octo +
//    7 Add + 1 Lit), comfortably under the cap. The exponential blow-up
//    (~6× check time per added Octo level) comes from `UnhandledOps`'
//    interaction with `OpsHandledBy<R, T>` over a wide rule tuple and a
//    wide target union — not from hitting any recursion ceiling.
// =============================================================================

export { }

type DataType = 'string' | 'int' | 'float' | 'boolean' | 'datetime'
type DataShape = 'scalar' | 'columnar'

interface IVOp<Kind extends string = string> {
    readonly kind: Kind
    dtype(): DataType
    dshape(): DataShape
}

type ValueOf<DT extends DataType> =
    DT extends 'string' | 'datetime' ? string :
    DT extends 'boolean' ? boolean :
    number

class Lit<DT extends DataType = DataType> implements IVOp<'lit'> {
    readonly kind = 'lit' as const
    readonly #dt: DT
    constructor(readonly value: ValueOf<DT>, dt: DT) { this.#dt = dt }
    dtype(): DT { return this.#dt }
    dshape(): 'scalar' { return 'scalar' }
}

type HighestDataType<_A extends DataType, _B extends DataType> = 'float'
function highestDataType<A extends DataType, B extends DataType>(_a: A, _b: B): HighestDataType<A, B> {
    return 'float'
}
type HighestDataShape<_A extends DataShape, _B extends DataShape> = 'columnar'
function highestDataShape<A extends DataShape, B extends DataShape>(_a: A, _b: B): HighestDataShape<A, B> {
    return 'columnar'
}

class Add<L extends IVOp, R extends IVOp> implements IVOp<'add'> {
    readonly kind = 'add' as const
    constructor(readonly left: L, readonly right: R) { }
    dtype(): HighestDataType<ReturnType<L['dtype']>, ReturnType<R['dtype']>> {
        return highestDataType(this.left.dtype(), this.right.dtype()) as any
    }
    dshape(): HighestDataShape<ReturnType<L['dshape']>, ReturnType<R['dshape']>> {
        return highestDataShape(this.left.dshape(), this.right.dshape()) as any
    }
}

type DirectChildren<O extends IVOp> = {
    [K in keyof O]: O[K] extends IVOp ? O[K] : never
}[keyof O]

type VisitNext<Out, Target> = (sub: IVOp, target?: Target) => Out
type CanHandleChild = (child: IVOp) => boolean
type OpFor<S extends IVOp> = string extends S['kind'] ? never : S
type OpDesc<O extends IVOp> = O extends IVOp
    ? `${O['kind']}<${ReturnType<O['dtype']>}, ${ReturnType<O['dshape']>}>`
    : never
type MissingError<Missing extends IVOp> =
    `No compilation rule for op(s): ${OpDesc<Missing> & string}`

type CompilationRule<Target, Out, Supported extends IVOp = IVOp> = {
    name?: string
    canHandle: (op: IVOp, target: Target, canHandleChild: CanHandleChild) => op is Supported
    handle: (op: OpFor<Supported>, target: Target, visit: VisitNext<Out, Target>) => Out
}

type AnyArgs = any[]
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

type Decr = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
type UnhandledOps<R, O extends IVOp, T = never, Depth extends number = 16> =
    [Depth] extends [never] ? never
    : O extends IVOp
    ? O extends OpsHandledBy<R, T>
    ? UnhandledOps<R, DirectChildren<O>, T, Decr[Depth]>
    : O
    : never

function compile<O extends IVOp, R extends readonly unknown[], const T extends TargetOf<R>>(
    op: O, target: T, rules: R,
    ..._proof: [UnhandledOps<R, O, T>] extends [never]
        ? []
        : [missing: MissingError<UnhandledOps<R, O, T>>]
): OutOf<R> {
    void op; void target; void rules
    return null as OutOf<R>
}

type CanHandle<R, O extends IVOp, T = never> =
    [UnhandledOps<R, O, T>] extends [never] ? true : false

function canHandle<R extends readonly unknown[], O extends IVOp, const T extends TargetOf<R> = never>(
    rules: R, op: O, target?: T,
): CanHandle<R, O, T> {
    void rules; void op; void target
    return null as any
}

function makeIsKind<O extends IVOp>(
    kind: O['kind'],
    childrenOf?: (op: O) => readonly IVOp[],
): (op: IVOp, target: unknown, canHandleChild?: CanHandleChild) => op is O {
    return (op: IVOp, _t: unknown, canHandleChild: CanHandleChild = () => true): op is O =>
        op.kind === kind && (childrenOf === undefined || childrenOf(op as O).every(canHandleChild))
}

// =============================================================================
// AMPLIFIER 1: 8-child composite op. `DirectChildren<Octo<...>>` is a mapped
// type over 8 keys. When all 8 children share a type (as they do in the tree
// below), the resulting UNION deduplicates to 1-wide — but TS still does 8
// property lookups + 8 conditional `extends IVOp ? O[K] : never` checks per
// recursion step. That's the per-level work that compounds with depth.
// =============================================================================
class Octo<
    A extends IVOp, B extends IVOp, C extends IVOp, D extends IVOp,
    E extends IVOp, F extends IVOp, G extends IVOp, H extends IVOp,
> implements IVOp<'octo'> {
    readonly kind = 'octo' as const
    constructor(
        readonly a: A, readonly b: B, readonly c: C, readonly d: D,
        readonly e: E, readonly f: F, readonly g: G, readonly h: H,
    ) { }
    dtype(): HighestDataType<ReturnType<A['dtype']>, ReturnType<B['dtype']>> {
        return highestDataType(this.a.dtype(), this.b.dtype()) as any
    }
    dshape(): HighestDataShape<ReturnType<A['dshape']>, ReturnType<B['dshape']>> {
        return highestDataShape(this.a.dshape(), this.b.dshape()) as any
    }
}

// =============================================================================
// AMPLIFIER 2 + 3: wide target union (15 dialects) with one sibling rule per
// dialect — `OpsHandledBy` checks `[T] extends [RT]` for every rule × every
// recursion level.
// =============================================================================
type WideDialect =
    | 'pg14' | 'pg15' | 'pg16' | 'pg17'
    | 'duckdb09' | 'duckdb10' | 'duckdb11'
    | 'sqlite3' | 'mysql8' | 'clickhouse23'
    | 'snowflake' | 'bigquery' | 'redshift' | 'trino' | 'spark'

interface WideTarget<D extends WideDialect = WideDialect> {
    dialect: D
    version: number
    flags: { strict: boolean; ansi: boolean; experimental: boolean }
}

interface SqlOut { readonly sql: string; readonly params: readonly unknown[] }

const STRESS_RULES = [
    {
        canHandle: (op: IVOp, t: WideTarget<'pg14'>): op is Lit => op.kind === 'lit' && t.dialect === 'pg14',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'pg15'>): op is Lit => op.kind === 'lit' && t.dialect === 'pg15',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'pg16'>): op is Lit => op.kind === 'lit' && t.dialect === 'pg16',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'pg17'>): op is Lit => op.kind === 'lit' && t.dialect === 'pg17',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'duckdb09'>): op is Lit => op.kind === 'lit' && t.dialect === 'duckdb09',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'duckdb10'>): op is Lit => op.kind === 'lit' && t.dialect === 'duckdb10',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'duckdb11'>): op is Lit => op.kind === 'lit' && t.dialect === 'duckdb11',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'sqlite3'>): op is Lit<Exclude<DataType, 'datetime'>> =>
            op.kind === 'lit' && t.dialect === 'sqlite3' && op.dtype() !== 'datetime',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'mysql8'>): op is Lit => op.kind === 'lit' && t.dialect === 'mysql8',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'clickhouse23'>): op is Lit => op.kind === 'lit' && t.dialect === 'clickhouse23',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'snowflake'>): op is Lit => op.kind === 'lit' && t.dialect === 'snowflake',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'bigquery'>): op is Lit => op.kind === 'lit' && t.dialect === 'bigquery',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'redshift'>): op is Lit => op.kind === 'lit' && t.dialect === 'redshift',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'trino'>): op is Lit => op.kind === 'lit' && t.dialect === 'trino',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: (op: IVOp, t: WideTarget<'spark'>): op is Lit => op.kind === 'lit' && t.dialect === 'spark',
        handle: (op: Lit): SqlOut => ({ sql: '?', params: [op.value] })
    },
    {
        canHandle: makeIsKind<Add<IVOp, IVOp>>('add', op => [op.left, op.right]),
        handle: (_op: Add<IVOp, IVOp>, _t: WideTarget): SqlOut => ({ sql: '(? + ?)', params: [] })
    },
    {
        canHandle: makeIsKind<Octo<IVOp, IVOp, IVOp, IVOp, IVOp, IVOp, IVOp, IVOp>>(
            'octo', op => [op.a, op.b, op.c, op.d, op.e, op.f, op.g, op.h]),
        handle: (_op: Octo<IVOp, IVOp, IVOp, IVOp, IVOp, IVOp, IVOp, IVOp>): SqlOut =>
            ({ sql: 'octo(?,?,?,?,?,?,?,?)', params: [] })
    },
] as const satisfies readonly CompilationRule<any, SqlOut>[]

// =============================================================================
// AMPLIFIER 4: deeply nested tree. The TYPE is structurally shared
// (`Octo<typeof oN, ...×8>`), so building the tree is cheap. The expense
// shows up later when `compile()` recurses `UnhandledOps` through it.
// Empirically each added Octo level multiplies check time by ~6×.
//
// Structural depth at o5 is ~13 (5 Octo + 7 Add + 1 Lit), well under F's
// `Decr` cap of 16 — the cap is NOT what's bounding cost here.
// =============================================================================
const leaf = new Lit(1, 'int')
const o1 = new Octo(leaf, leaf, leaf, leaf, leaf, leaf, leaf, leaf)
const o2 = new Octo(o1, o1, o1, o1, o1, o1, o1, o1)
const o3 = new Octo(o2, o2, o2, o2, o2, o2, o2, o2)
const o4 = new Octo(o3, o3, o3, o3, o3, o3, o3, o3)
const o5 = new Octo(o4, o4, o4, o4, o4, o4, o4, o4)
// Bumping `o5` → `o6` jumps tsc check time from ~8s to ~50s in this file.
// The growth is exponential in octo depth but the instantiation count
// barely moves (+1,322 per level) — the work is structural-assignability
// cache churn from `UnhandledOps` × `OpsHandledBy` distribution, not new
// type instantiations.
const deep = new Add(new Add(new Add(new Add(new Add(new Add(o5, o5), o5), o5), o5), o5), o5)

// =============================================================================
// AMPLIFIER 5: many call sites. Each `compile` / `canHandle` call evaluates
// `UnhandledOps<R, O, T>` independently — there's no memoization across
// calls. Removing all 10 calls below drops the file's check-time overhead
// from +6.4s to +0.16s (measured on o5), so this is THE dominant cost.
// =============================================================================
compile(deep, { dialect: 'pg14', version: 14, flags: { strict: true, ansi: true, experimental: false } }, STRESS_RULES)
compile(deep, { dialect: 'pg15', version: 15, flags: { strict: true, ansi: true, experimental: false } }, STRESS_RULES)
compile(deep, { dialect: 'pg16', version: 16, flags: { strict: false, ansi: true, experimental: true } }, STRESS_RULES)
compile(deep, { dialect: 'pg17', version: 17, flags: { strict: true, ansi: false, experimental: true } }, STRESS_RULES)
compile(deep, { dialect: 'duckdb11', version: 11, flags: { strict: false, ansi: false, experimental: true } }, STRESS_RULES)
compile(deep, { dialect: 'clickhouse23', version: 23, flags: { strict: true, ansi: false, experimental: true } }, STRESS_RULES)

void canHandle(STRESS_RULES, deep, { dialect: 'pg14', version: 14, flags: { strict: true, ansi: true, experimental: false } })
void canHandle(STRESS_RULES, deep, { dialect: 'sqlite3', version: 3, flags: { strict: true, ansi: true, experimental: false } })
void canHandle(STRESS_RULES, deep, { dialect: 'mysql8', version: 8, flags: { strict: true, ansi: true, experimental: false } })
void canHandle(STRESS_RULES, deep, { dialect: 'spark', version: 3, flags: { strict: true, ansi: true, experimental: false } })

// =============================================================================
// AMPLIFIER 6: error path. A buried datetime on sqlite forces `UnhandledOps`
// to walk the tree, collect the offender(s), and format them into the
// `MissingError` template literal. Cost of this call in isolation was not
// measured separately; it's included in the +6.4s total for the 10 calls.
// =============================================================================
const dtLeaf = new Lit('2026-01-01T00:00:00Z', 'datetime')
const dtO1 = new Octo(leaf, leaf, leaf, leaf, leaf, leaf, leaf, dtLeaf)
const dtO2 = new Octo(o1, o1, o1, o1, o1, o1, o1, dtO1)
const dtDeep = new Add(new Add(new Add(o3, dtO2), o3), o3)
// @ts-expect-error — sqlite rejects datetime; MissingError names it
compile(dtDeep, { dialect: 'sqlite3', version: 3, flags: { strict: true, ansi: true, experimental: false } }, STRESS_RULES)
