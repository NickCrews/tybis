// =============================================================================
// Approach B — Phantom kind set on op classes
//
// IDEA
//   Each op class declares its kind via a phantom union parameter. Parent
//   ops (constructors that wrap children) thread the children's kinds into
//   their own. A tree's static type carries the exact set of kinds it
//   contains.
//
//   The op declares ITS OWN identity (its kind). It does NOT declare which
//   compilers can handle it — that knowledge lives on the compiler side.
//
//   Compilers are handler dictionaries typed by which kinds they handle.
//   Adding handlers is `{ ...existing, new_kind: handler }` and the new
//   compiler's static type widens to include the new kind.
//
// EXTENSIBILITY
//   + 3rd-party ops: define a new class with a literal `kind`. No central
//     registration needed.
//   + 3rd-party compilers: define a handler record over whichever kinds
//     they choose, including 3rd-party ones.
//   + Make an EXISTING (core) compiler handle a new op: spread its
//     handlers and add a key — produces a new compiler value whose static
//     type includes the new kind. The original compiler is unchanged.
// =============================================================================

// --- CORE PACKAGE ------------------------------------------------------------

interface IVOp<Kinds extends string = string> {
    readonly kind: string
    readonly __kinds?: Kinds   // phantom, never set at runtime
}

// R21 op-metadata: a structured metadata bag every op class can declare
// as a static. Lives next to the op definition, not in a side table.
interface OpMeta {
    readonly description?: string
    readonly since?: string
    readonly deprecated?: string  // explanation/replacement
    readonly examples?: readonly string[]
    readonly references?: readonly string[]
}

// R6 wire-stability: every op declaration knows its wire version, so
// migrations have something to dispatch on. Defaults to 1.
interface OpDef<K extends string> {
    readonly kind: K
    readonly wireVersion?: number
    readonly meta?: OpMeta
}

class LitInt implements IVOp<'lit_int'> {
    static readonly def = { kind: 'lit_int', wireVersion: 1, meta: {
        description: 'Integer literal',
        since: '0.1.0',
        examples: ['new LitInt(42)'],
    } } as const satisfies OpDef<'lit_int'>
    readonly kind = LitInt.def.kind
    declare readonly __kinds: 'lit_int'
    constructor(readonly value: number) { }
}

class Add<L extends string, R extends string> implements IVOp<'add' | L | R> {
    static readonly def = { kind: 'add', wireVersion: 1, meta: {
        description: 'Binary addition',
        since: '0.1.0',
    } } as const satisfies OpDef<'add'>
    readonly kind = Add.def.kind
    declare readonly __kinds: 'add' | L | R
    constructor(readonly l: IVOp<L>, readonly r: IVOp<R>) { }
}

// R18 typed-handler-payload: we want handler bodies to see the CONCRETE
// op class (so `op.value`, `op.l`, `op.r` are typed) without casts.
//
// Solution: keep a kind-string → class map as an INTERFACE (open to
// declaration merging from 3rd-party packages) and look up the concrete
// type inside the Handler signature.
//
// Each new op class adds a single `declare module` augmentation entry —
// see CustomOp below for the 3rd-party pattern.
interface KindMap {
    lit_int: LitInt
    // `Add` is generic — for the kind→class lookup we only need *some*
    // instance shape. Using `Add<string, string>` is enough; the
    // children's kind unions are inspected via `op.l.__kinds` etc. when
    // recursing, not through this map.
    add: Add<string, string>
}

// If a kind isn't registered in KindMap we still want a usable type,
// so fall back to the generic `IVOp<K>`.
type OpFor<K extends string> = K extends keyof KindMap ? KindMap[K] : IVOp<K>

type Handler<K extends string> = (op: OpFor<K>, rec: (sub: IVOp<any>) => string) => string

// R20 error-clarity: when a user passes a tree with kinds the compiler
// doesn't support, we want the error to *name the offending kind(s)*
// instead of an opaque `IVOp<never>` mismatch.
//
// We brand the offending kinds with a template literal type and require
// `K` to extend `Supported`. When it doesn't, the resulting parameter
// type becomes a `{ __error: ... }` object that is structurally
// unassignable from a real op — and the assignability error mentions
// the branded string, so the IDE shows the missing kind by name.
type MissingKindError<Missing extends string> = {
    readonly __tybis_error: `Compiler is missing handler(s) for kind(s): ${Missing}`
}
type CompileArg<K extends string, Supported extends string> =
    [K] extends [Supported] ? IVOp<K> : MissingKindError<Exclude<K, Supported>>

class Compiler<Supported extends string> {
    constructor(readonly handlers: { [K in Supported]: Handler<K> }) { }

    compile<K extends string>(op: CompileArg<K, Supported>): string {
        const o = op as unknown as IVOp<any>
        const rec = (sub: IVOp<any>) => (this.handlers as any)[(sub as any).kind](sub, rec)
        return (this.handlers as any)[(o as any).kind](o, rec)
    }

    // R22 discoverability (runtime side): does this compiler know `k`?
    supports(k: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.handlers, k)
    }

    // Open extension: returns a new compiler with extra handlers. The
    // static type widens to include the new kinds.
    //
    // R14 fallback: `extend` can also OVERRIDE an existing kind by
    // re-supplying it. The new value's handler dict wins.
    extend<New extends string>(
        more: { [K in New]: Handler<K> },
    ): Compiler<Supported | New> {
        return new Compiler({ ...this.handlers, ...more } as any)
    }
}

// R22 discoverability (type side): expose the compiler's supported kinds
// as a usable type alias.
type KindsHandledBy<C> = C extends Compiler<infer S> ? S : never

// Core ships a Duckdb compiler that handles core ops.
export const duckdb = new Compiler<'lit_int' | 'add'>({
    // R18: handler arg is now typed as the concrete class. `op.value`
    // and `op.l` / `op.r` are typed — no casts.
    lit_int: op => String(op.value),
    add: (op, rec) => `(${rec(op.l)} + ${rec(op.r)})`,
})

// --- R5: typed-deserialization ----------------------------------------------
//
// At the wire boundary, JSON has no phantom. The user tells us which
// kinds are allowed and we re-assert the phantom AFTER runtime validation.
// `parseOp<Allowed>(json)` therefore returns `IVOp<Allowed>` — the same
// shape a code-built tree would have — provided every kind in the JSON
// is in `Allowed`. Otherwise it throws.

interface WireOp {
    readonly kind: string
    readonly wireVersion?: number
    readonly [k: string]: unknown
}

function isWireOp(x: unknown): x is WireOp {
    return typeof x === 'object' && x !== null && typeof (x as any).kind === 'string'
}

function collectKinds(x: unknown, out: Record<string, true>): void {
    if (isWireOp(x)) {
        out[x.kind] = true
        for (const k in x) collectKinds((x as any)[k], out)
    } else if (Array.isArray(x)) {
        for (let i = 0; i < x.length; i++) collectKinds(x[i], out)
    }
}

function parseOp<Allowed extends string>(
    json: string,
    allowed: readonly Allowed[],
): IVOp<Allowed> {
    const parsed: unknown = JSON.parse(json)
    if (!isWireOp(parsed)) throw new Error('parseOp: not an op')
    const found: Record<string, true> = {}
    collectKinds(parsed, found)
    const allowedSet: Record<string, true> = {}
    for (let i = 0; i < allowed.length; i++) allowedSet[allowed[i]!] = true
    for (const k in found) {
        if (!allowedSet[k]) {
            throw new Error(`parseOp: kind '${k}' not in allowed set [${allowed.join(', ')}]`)
        }
    }
    return parsed as unknown as IVOp<Allowed>
}

// --- R6: wire-stability (migrations) ----------------------------------------
//
// Trees serialized at an older wire version can be migrated forward by
// kind. Migrations are open-ended (handler dict, same shape as compilers)
// so 3rd-party packages register migrations for their own kinds.
type Migration = (op: WireOp) => WireOp
function migrate(json: string, migrations: Record<string, Migration>): string {
    function walk(x: unknown): unknown {
        if (isWireOp(x)) {
            const m = migrations[x.kind]
            const next = m ? m(x) : x
            const out: any = { ...next }
            for (const k in out) out[k] = walk(out[k])
            return out
        }
        if (Array.isArray(x)) return x.map(walk)
        return x
    }
    return JSON.stringify(walk(JSON.parse(json)))
}

// --- 3RD-PARTY PACKAGE -------------------------------------------------------

// R7 name-collision: kinds are still global strings, BUT we can adopt
// a scoped-string convention (`'@scope/pkg/name'`) and the *type system*
// keeps the scopes separate. Two packages can both ship a logical
// `cluster_id` op without colliding at the value level OR at the type
// level.
//
// The convention is enforced by template-literal types: each package
// brands its kinds with a `@scope/pkg/...` prefix.
type Scoped<Scope extends string, Name extends string> = `@${Scope}/${Name}`

class CustomOp implements IVOp<Scoped<'me/custom', 'custom_op'>> {
    static readonly def = {
        kind: '@me/custom/custom_op',
        wireVersion: 1,
        meta: { description: 'Demo 3rd-party op', since: '0.1.0' },
    } as const satisfies OpDef<Scoped<'me/custom', 'custom_op'>>
    readonly kind = CustomOp.def.kind
    declare readonly __kinds: Scoped<'me/custom', 'custom_op'>
    constructor(readonly x: number) { }
}

// Demonstrate R7: a SECOND package picks the same short name
// `cluster_id` — no collision, because the scopes differ.
class AcmeClusterId implements IVOp<Scoped<'acme/ml', 'cluster_id'>> {
    static readonly def = {
        kind: '@acme/ml/cluster_id', wireVersion: 1,
        meta: { description: 'K-means cluster id', since: '1.0.0' },
    } as const satisfies OpDef<Scoped<'acme/ml', 'cluster_id'>>
    readonly kind = AcmeClusterId.def.kind
    declare readonly __kinds: Scoped<'acme/ml', 'cluster_id'>
    constructor(readonly point: IVOp<any>) { }
}

class BetaClusterId implements IVOp<Scoped<'beta/geo', 'cluster_id'>> {
    static readonly def = {
        kind: '@beta/geo/cluster_id', wireVersion: 1,
        meta: { description: 'Geo cluster id', since: '0.3.0' },
    } as const satisfies OpDef<Scoped<'beta/geo', 'cluster_id'>>
    readonly kind = BetaClusterId.def.kind
    declare readonly __kinds: Scoped<'beta/geo', 'cluster_id'>
    constructor(readonly point: IVOp<any>) { }
}

// R18: 3rd-party packages teach the KindMap about their op so handlers
// for those kinds get the concrete type. In real code this would live
// in a `declare module 'tybis-core'` block in the 3rd-party package; in
// this single-file demo we use interface merging directly.
interface KindMap {
    '@me/custom/custom_op': CustomOp
    '@acme/ml/cluster_id': AcmeClusterId
    '@beta/geo/cluster_id': BetaClusterId
}

// Make the CORE duckdb compiler handle CustomOp — without touching it.
// R18 in action: `op.x` is typed.
const duckdbWithCustom = duckdb.extend<'@me/custom/custom_op'>({
    '@me/custom/custom_op': op => `custom(${op.x})`,
})

// And/or define a brand-new compiler from scratch that handles core +
// custom ops.
const myCompiler = new Compiler<'lit_int' | 'add' | '@me/custom/custom_op'>({
    lit_int: op => `L:${op.value}`,
    add: (op, rec) => `A(${rec(op.l)},${rec(op.r)})`,
    '@me/custom/custom_op': op => `C:${op.x}`,
})

// R14 fallback: build a compiler whose `add` handler picks a different
// emit shape than core. `extend` lets us OVERRIDE an existing handler.
const duckdbVerboseAdd = duckdb.extend<'add'>({
    add: (op, rec) => `ADD[${rec(op.l)}, ${rec(op.r)}]`,
})

// --- Demo --------------------------------------------------------------------

const safe = new Add(new LitInt(1), new LitInt(2))
//    ^? Add<'lit_int', 'lit_int'>  ⇒ kinds = 'add' | 'lit_int'
duckdb.compile(safe)
duckdbWithCustom.compile(safe)
myCompiler.compile(safe)
duckdbVerboseAdd.compile(safe)

const mixed = new Add(new LitInt(1), new CustomOp(2))
//    ^? Add<'lit_int', '@me/custom/custom_op'>
duckdbWithCustom.compile(mixed)
myCompiler.compile(mixed)
// @ts-expect-error — '@me/custom/custom_op' is not in duckdb's Supported = 'lit_int' | 'add'
// The error message names the missing kind via MissingKindError (R20).
duckdb.compile(mixed)

// R7 demo: both `cluster_id` ops coexist; their kind strings and phantom
// unions are distinct, so a tree using one is statically distinct from
// a tree using the other.
const acme = new AcmeClusterId(new LitInt(0))
const beta = new BetaClusterId(new LitInt(0))
const acmeCompiler = duckdb.extend<'@acme/ml/cluster_id'>({
    '@acme/ml/cluster_id': (op, rec) => `acme_cluster(${rec(op.point)})`,
})
acmeCompiler.compile(acme)
// @ts-expect-error — different package's cluster_id is a different kind.
acmeCompiler.compile(beta)

// R5 demo: deserialize JSON with a declared allowed-kind set.
const wire = JSON.stringify({
    kind: 'add', wireVersion: 1,
    l: { kind: 'lit_int', wireVersion: 1, value: 1 },
    r: { kind: 'lit_int', wireVersion: 1, value: 2 },
})
const parsed = parseOp(wire, ['add', 'lit_int'] as const)
//    ^? IVOp<'add' | 'lit_int'>
duckdb.compile(parsed)
duckdbWithCustom.compile(parsed)  // also fine — kinds are a subset

// R5 in action: declaring a tighter allowed set means the static type
// rejects compiling against a compiler that doesn't cover it.
const tooNarrow = parseOp(wire, ['lit_int'] as const)
//    ^? IVOp<'lit_int'>
duckdb.compile(tooNarrow)
// Conversely, if the JSON contained an unexpected kind, parseOp throws
// at runtime — closing the wire-boundary hole that defeats R3.

// R6 demo: migrate an older wire payload before parsing.
const oldWire = JSON.stringify({ kind: 'add', wireVersion: 0, lhs: 1, rhs: 2 })
const migrated = migrate(oldWire, {
    add: op => ({ kind: 'add', wireVersion: 1, l: op.lhs, r: op.rhs }),
})
void migrated

// R21 demo: metadata is read off the class statically.
void LitInt.def.meta?.description
void CustomOp.def.meta?.since

// R22 demo: discover supported kinds at the type level and at runtime.
type DuckdbKinds = KindsHandledBy<typeof duckdb>
//    ^? 'lit_int' | 'add'
const _kinds: DuckdbKinds[] = ['lit_int', 'add']
void _kinds
void duckdb.supports('lit_int')   // true
void duckdb.supports('nope')      // false

// =============================================================================
// HOW IT SCORES AGAINST THE PRD (after this revision)
//
// STRONG
//   + R1 expression-problem: both axes open. New ops are new classes; new
//     compilers (or extensions of existing ones) are handler-dict
//     construction.
//   + R2 op-declares-self: each op class names its own kind via the
//     phantom; compilers are not named anywhere on the op.
//   + R3 dialect-safety: the tree's static type carries the exact kind
//     union; `Compiler<Supported>.compile<K extends Supported>(...)`
//     rejects a tree whose kinds escape `Supported`.
//   + R11 static-introspection: `tree.__kinds` is the answer — directly
//     readable on hover, no recursive conditional at the boundary.
//   + R15 type-composition: the `Kinds` parameter is symmetric with
//     the existing `DataType` / `DataShape` generics on every op.
//   + R19 exhaustiveness: `{ [K in Supported]: Handler<K> }` is a
//     mapped-type record; missing kinds error at compiler construction.
//   + R22 discoverability: `KindsHandledBy<typeof c>` for types,
//     `c.supports(k)` for runtime.
//   + R24 tree-shaking: `extend()` produces a new VALUE, no load-time
//     side effects. Unused compilers don't get pulled into the bundle.
//
// MOVED UP IN THIS REVISION
//   + R5  typed-deserialization (~ → ✓-ish): `parseOp<Allowed>(json, allowed)`
//         validates kinds at runtime and re-asserts the phantom at the
//         wire boundary. Type flows from the `allowed` literal tuple.
//   + R6  wire-stability (~ → ~+): every op carries `wireVersion`; the
//         `migrate()` helper applies per-kind upgrade functions before
//         parsing. Still no full version-skew story, but a foundation.
//   + R7  name-collision (✗ → ~): scoped kinds `@scope/pkg/name` via
//         template-literal types. Two packages' `cluster_id` ops are
//         statically distinct kinds; trees built with one don't typecheck
//         against compilers built for the other. Still global strings,
//         but with a structured convention.
//   + R14 fallback (~ → ✓-ish): `extend()` accepts overrides for an
//         existing kind; the new compiler value wins. (No automatic
//         "try-and-fall-back" yet — handlers are deterministic per
//         compiler.)
//   + R18 typed-handler-payload (~ → ✓): a `KindMap` interface maps
//         kind strings to concrete classes; `Handler<K>` looks the
//         concrete type up. Bodies say `op.value`, `op.l`, `op.x` with
//         no casts. 3rd-party packages augment `KindMap` via
//         `declare module`.
//   + R20 error-clarity (~ → ~+): `CompileArg<K, Supported>` resolves
//         to a `MissingKindError<...>` template-literal type when kinds
//         escape `Supported`. The TS error message includes the offending
//         kind name (e.g. `__tybis_error: "Compiler is missing
//         handler(s) for kind(s): '@me/custom/custom_op'"`).
//   + R21 op-metadata (~ → ✓): `OpDef` + `OpMeta` give every op class a
//         static `def` field with description / since / deprecated /
//         examples / references — colocated with the op definition,
//         hover-readable on the class.
//
// STILL WEAK / OPEN
//   – R17 op-boilerplate: every op class still needs the phantom dance
//     (`__kinds`, generics on each child threading the union, the
//     `static def`, the `declare module` augmentation of KindMap).
//     This is fundamental to the approach: the phantom IS the typing
//     mechanism. Could be smoothed by a `defineOp` helper but only
//     marginally; n-ary composites must still thread n generics for R3
//     to bite.
//   – Extending an existing compiler is local — `extend()` does not
//     retroactively teach the original `duckdb` value. Approach E is
//     the answer if you want global extension.
//   – Default `Kinds extends string = string` widens to all-of-string
//     if a generic is dropped — callers must keep types narrow
//     throughout, or the R3 check goes vacuous.
//   – R13 capability-axes: a second phantom (`Capabilities`) could be
//     threaded symmetrically with `Kinds`, but doing so doubles the
//     generic burden on every composite op. Deferred as a separate
//     orthogonal layer (see PRD open questions).
// =============================================================================
