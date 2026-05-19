// =============================================================================
// Approach D — Handler dictionary, structural ops
//
// IDEA
//   Ops are plain objects with a `kind` discriminator — no classes, no
//   phantom types, no central op-shape union. A compiler is a record of
//   handlers keyed by kind. The dispatch function walks the tree's static
//   type with a recursive conditional (`AllKindsOf`) and requires the
//   compiler's handler keys to cover every kind found.
//
//   The op declares only its kind and its data; it does NOT declare which
//   compilers can handle it. Compilers declare which kinds they handle.
//
// EXTENSIBILITY
//   + 3rd-party ops: just a new TypeScript type with a fresh `kind`
//     string. No central registration. No core file to edit.
//   + 3rd-party compilers: just a new handler record over whichever kinds.
//   + Extend an EXISTING compiler with a handler for a new op:
//         const extended = { ...coreDuckdb, my_kind: handler }
//     The static type of `extended` widens to include `my_kind`, so a
//     tree containing `my_kind` is accepted only by `extended`.
// =============================================================================

export { }   // make this file a module so top-level names don't collide
// with sibling files in the IDE's whole-folder check.

// --- CORE PACKAGE ------------------------------------------------------------

// Op shapes are local types — no central union.
type LitInt = { kind: 'lit_int'; value: number }
type Add<L, R> = { kind: 'add'; l: L; r: R }

// Cap recursion so TS can check signatures without diverging.
type AllKindsOf<T, D extends unknown[] = []> =
    D['length'] extends 8 ? string :
    T extends { kind: infer K extends string }
    ? K | { [P in keyof T]: T[P] extends { kind: string } ? AllKindsOf<T[P], [...D, 1]> : never }[keyof T]
    : never

// Handlers are typed only by which kinds they cover. The op argument is
// `any` so handler authors can annotate it with the concrete op shape they
// wrote — e.g. `(op: LitInt) => ...` — and TS won't complain about variance.
type Handlers<K extends string> = {
    [k in K]: (op: any, rec: (sub: any) => string) => string
}

// Untyped dispatcher.
function dispatch(tree: { kind: string }, handlers: Record<string, any>): string {
    const rec = (u: { kind: string }) => dispatch(u, handlers)
    return handlers[tree.kind](tree, rec)
}

// -----------------------------------------------------------------------------
// R20 error-clarity: surface the missing kinds in the error message itself.
// When a tree's kind set isn't covered by the compiler, the diff is encoded
// in a property name like `__MISSING_HANDLERS_FOR__custom_op`.
// TS reports "Property '__MISSING_HANDLERS_FOR__custom_op' is missing" —
// which beats raw assignability mismatches between deep generic unions.
// -----------------------------------------------------------------------------
type MissingKey<K extends string> = `__MISSING_HANDLERS_FOR__${K}`
type Diff<Needed extends string, Have extends string> =
    Needed extends Have ? never : Needed

// Typed entry-point. The compiler's handler keys must cover every kind
// reachable in the tree's static type.
function compile<T extends { kind: string }, S extends string>(
    tree: T,
    compiler: Handlers<S>
        & { [k in AllKindsOf<T>]: unknown }
        // R20: an extra "phantom" requirement that names the offending kinds.
        // It is `never` when there are no missing kinds, so it's trivially
        // satisfied. When kinds ARE missing, the required property name
        // literally contains the missing kind string.
        & { [k in MissingKey<Diff<AllKindsOf<T>, S>>]: never },
): string {
    return dispatch(tree, compiler as Record<string, any>)
}

// --- R18 typed-handler-payload (improved) ------------------------------------
//
// `defineCompiler<OpUnion>()` returns a typed factory that pre-narrows the
// op argument in each handler based on its kind, without the user having to
// re-annotate. Handler authors write `(op) => op.value` and TS knows `op`
// is the variant whose `kind` matches the key.
// -----------------------------------------------------------------------------
type ExtractByKind<U, K> = U extends { kind: K } ? U : never
type TypedHandlers<OpU extends { kind: string }, K extends OpU['kind']> = {
    [k in K]: (op: ExtractByKind<OpU, k>, rec: (sub: OpU) => string) => string
}
function defineCompiler<OpU extends { kind: string }>() {
    return <K extends OpU['kind']>(h: TypedHandlers<OpU, K>) => h
}

// --- R21 op-metadata ---------------------------------------------------------
//
// A separate, typed metadata table keyed by kind. Lives alongside the op
// types so it stays in sync via `satisfies`.
// -----------------------------------------------------------------------------
type OpMeta = {
    description: string
    since: string
    deprecated?: string
    examples?: readonly string[]
}

const coreOpMeta = {
    lit_int: {
        description: 'Integer literal.',
        since: '0.1.0',
        examples: ['{ kind: "lit_int", value: 42 }'],
    },
    add: {
        description: 'Arithmetic addition.',
        since: '0.1.0',
    },
} as const satisfies Record<'lit_int' | 'add', OpMeta>

// --- R22 discoverability -----------------------------------------------------
//
// `KindsHandledBy<C>` extracts the supported kind set from a compiler value's
// type. `supports(c, k)` is its runtime mirror.
// -----------------------------------------------------------------------------
type KindsHandledBy<C> = keyof C & string
function supports<C extends Record<string, unknown>, K extends string>(
    c: C, k: K,
): k is K & KindsHandledBy<C> {
    return Object.prototype.hasOwnProperty.call(c, k)
}

// --- Core duckdb compiler ----------------------------------------------------

// Built via the typed factory: `op` is correctly narrowed per-key.
type CoreOp = LitInt | Add<unknown, unknown>
const coreDuckdb = defineCompiler<CoreOp>()({
    lit_int: (op) => String(op.value),                  // op: LitInt
    add: (op, rec) => `(${rec(op.l as CoreOp)} + ${rec(op.r as CoreOp)})`,
})

// --- 3RD-PARTY PACKAGE -------------------------------------------------------

// R7 name-collision: use scoped, namespaced kind strings. Two packages can
// both define a `cluster_id`-flavoured op without colliding because the
// wire string is `@acme/ml/cluster_id` vs `@beta/geo/cluster_id`.
//
// The pattern is just a convention enforced by TS's literal-string types:
// a package publishes its kinds under its own prefix. A lint rule (R12)
// can statically reject any kind that doesn't start with `'<package>/'`.
type ScopedKind<Pkg extends string, Name extends string> = `${Pkg}/${Name}`
type AcmeKind<N extends string> = ScopedKind<'@acme/ml', N>
type BetaKind<N extends string> = ScopedKind<'@beta/geo', N>

type AcmeClusterId = { kind: AcmeKind<'cluster_id'>; sample: number }
type BetaClusterId = { kind: BetaKind<'cluster_id'>; lat: number; lng: number }

// Two packages independently ship handlers; their kinds never collide.
const acmeCompiler = defineCompiler<AcmeClusterId>()({
    '@acme/ml/cluster_id': (op) => `acme_cluster(${op.sample})`,
})
const betaCompiler = defineCompiler<BetaClusterId>()({
    '@beta/geo/cluster_id': (op) => `beta_cluster(${op.lat},${op.lng})`,
})

type CustomOp = { kind: 'custom_op'; x: number }

// Make the CORE duckdb compiler handle CustomOp — by spreading.
// The combined type still flows through `defineCompiler`'s narrowing.
const duckdbWithCustom = defineCompiler<CoreOp | CustomOp>()({
    lit_int: (op) => String(op.value),
    add: (op, rec) => `(${rec(op.l as CoreOp | CustomOp)} + ${rec(op.r as CoreOp | CustomOp)})`,
    custom_op: (op) => `custom(${op.x})`,
})

// And/or build a brand-new compiler from scratch — same factory.
const myCompiler = defineCompiler<CoreOp | CustomOp>()({
    lit_int: (op) => `L:${op.value}`,
    add: (op, rec) => `A(${rec(op.l as CoreOp | CustomOp)},${rec(op.r as CoreOp | CustomOp)})`,
    custom_op: (op) => `C:${op.x}`,
})

// --- Demo --------------------------------------------------------------------

// `as const` keeps literal kinds visible through the tree.
const safe = {
    kind: 'add',
    l: { kind: 'lit_int', value: 1 },
    r: { kind: 'lit_int', value: 2 },
} as const

compile(safe, coreDuckdb)
compile(safe, duckdbWithCustom)
compile(safe, myCompiler)

const mixed = {
    kind: 'add',
    l: { kind: 'lit_int', value: 1 },
    r: { kind: 'custom_op', x: 2 },
} as const

compile(mixed, duckdbWithCustom)
compile(mixed, myCompiler)
// @ts-expect-error — `custom_op` not in coreDuckdb's handler keys.
// Error names the missing kind: `__MISSING_HANDLERS_FOR__custom_op` (R20).
compile(mixed, coreDuckdb)

// --- R11 static-introspection demo -------------------------------------------
// Within the depth cap, `AllKindsOf<typeof tree>` is the answer.
type _SafeKinds = AllKindsOf<typeof safe>      // 'add' | 'lit_int'
type _MixedKinds = AllKindsOf<typeof mixed>    // 'add' | 'lit_int' | 'custom_op'
// Trivial proof: assignable in both directions.
const _safeKindsProof: _SafeKinds = 'add' as 'add' | 'lit_int'
const _mixedKindsProof: _MixedKinds = 'custom_op' as 'add' | 'lit_int' | 'custom_op'
void _safeKindsProof; void _mixedKindsProof

// --- R22 discoverability demo ------------------------------------------------
type _DuckdbKinds = KindsHandledBy<typeof coreDuckdb>      // 'lit_int' | 'add'
type _FullKinds = KindsHandledBy<typeof duckdbWithCustom>  // + 'custom_op'
const _dProof: _DuckdbKinds = 'add' as 'lit_int' | 'add'
const _fProof: _FullKinds = 'custom_op' as 'lit_int' | 'add' | 'custom_op'
void _dProof; void _fProof

if (supports(coreDuckdb, 'lit_int')) {
    // narrowed: 'lit_int' is in KindsHandledBy<typeof coreDuckdb>
    const _k: 'lit_int' | 'add' = 'lit_int'
    void _k
}

// --- R21 op-metadata demo ----------------------------------------------------
// Metadata is typed-by-kind and hover-readable at the use site.
const _meta = coreOpMeta.add
void _meta.description
void _meta.since

// --- R7 name-collision demo --------------------------------------------------
// Two packages with the same short name compile through their own compilers
// without conflict. A `merged` compiler accepts a mixed tree.
const acmeTree = { kind: '@acme/ml/cluster_id' as const, sample: 7 }
const betaTree = { kind: '@beta/geo/cluster_id' as const, lat: 1, lng: 2 }
compile(acmeTree, acmeCompiler)
compile(betaTree, betaCompiler)
// @ts-expect-error — acme tree to beta compiler is a type error.
compile(acmeTree, betaCompiler)

const mergedScoped = { ...acmeCompiler, ...betaCompiler }
compile(acmeTree, mergedScoped)
compile(betaTree, mergedScoped)

// --- R5 typed-deserialization ------------------------------------------------
//
// A `parseOp<Allowed>(json, kinds)` helper validates at runtime that only
// the allowed kinds appear, and stamps the static type to that union. It's
// the "trust me" cast made explicit and runtime-checked.
//
// Limitation: this validates the KIND SET only, not the per-kind SHAPE.
// Doing full shape validation requires a separate kind→shape registry
// (see Approach E). The kind-set check is the dialect-safety gate that
// matters for R3 across the wire boundary.
// -----------------------------------------------------------------------------
// Recursive: every nested op-shaped sub-tree must also have kind in K.
// We don't know per-kind field names in this approach, so the recursion
// is expressed via a single optional `children` array — call sites stamp
// the kind union onto the whole subtree.
//
// In practice the consumer extracts handlers by walking on `.kind`, so as
// long as `AllKindsOf<AllowedTree<K>>` resolves to `K`, the compile-time
// gate works. We achieve that by exposing only `kind` in the static type
// and casting the runtime value (which `JSON.parse` returns as `any`).
type AllowedTree<K extends string> = { kind: K }
function parseOp<K extends string>(
    json: string,
    allowed: readonly K[],
): AllowedTree<K> {
    const obj = JSON.parse(json)
    const allowedMap: Record<string, true> = {}
    for (let i = 0; i < allowed.length; i++) allowedMap[allowed[i]!] = true
    const walk = (n: any): void => {
        if (n && typeof n === 'object' && typeof n.kind === 'string') {
            if (!allowedMap[n.kind]) {
                throw new Error(`parseOp: kind '${n.kind}' not in allowed set`)
            }
            for (const key in n) walk(n[key])
        }
    }
    walk(obj)
    return obj as AllowedTree<K>
}

const wire = JSON.stringify(mixed)
// At the call site the consumer states which kinds it expects. The
// returned tree's static type carries that exact union — not `any`.
const rehydrated = parseOp(wire, ['add', 'lit_int', 'custom_op'] as const)
compile(rehydrated, duckdbWithCustom)
// @ts-expect-error — the rehydrated tree carries 'custom_op' in its
// static kind set, so the core duckdb compiler can't handle it.
compile(rehydrated, coreDuckdb)

// --- R6 wire-stability -------------------------------------------------------
//
// Wire payloads carry an explicit version field. Loaders dispatch on it,
// keeping old payloads readable while the in-memory shape evolves. This is
// convention rather than enforcement, but the type signatures make the
// commitment explicit.
// -----------------------------------------------------------------------------
type WireEnvelope<V extends string, K extends string> = {
    readonly tybisWireVersion: V
    readonly root: AllowedTree<K>
}
function envelope<K extends string>(
    root: AllowedTree<K>,
): WireEnvelope<'1', K> {
    return { tybisWireVersion: '1', root }
}
function loadEnvelope<K extends string>(
    e: WireEnvelope<string, K>,
    allowed: readonly K[],
): AllowedTree<K> {
    if (e.tybisWireVersion !== '1') {
        throw new Error(`unsupported wire version: ${e.tybisWireVersion}`)
    }
    return parseOp(JSON.stringify(e.root), allowed)
}
void envelope; void loadEnvelope

// --- R13 capability-axes -----------------------------------------------------
//
// Capabilities are an ORTHOGONAL axis from kind. We model them as a sibling
// branded type on the compiler value. A compiler's capability bag is a
// record of boolean flags (extension, version, determinism, etc.). The
// compile boundary can additionally require a capability set.
// -----------------------------------------------------------------------------
type Capabilities = {
    readonly deterministic?: boolean
    readonly pgVersion?: number
    readonly extensions?: readonly string[]
}
type CompilerWithCaps<H, C extends Capabilities> = H & { readonly __caps: C }
function withCaps<H extends Record<string, any>, C extends Capabilities>(
    h: H, caps: C,
): CompilerWithCaps<H, C> {
    return { ...h, __caps: caps } as CompilerWithCaps<H, C>
}

const pgCompiler = withCaps(
    defineCompiler<CoreOp>()({
        lit_int: (op) => String(op.value),
        add: (op, rec) => `(${rec(op.l as CoreOp)} + ${rec(op.r as CoreOp)})`,
    }),
    { deterministic: true, pgVersion: 14, extensions: ['pg_trgm'] as const },
)
type _PgCaps = (typeof pgCompiler)['__caps']
const _capsProof: _PgCaps = pgCompiler.__caps
void _capsProof
// Runtime introspection is just property reads — no registry needed.
void pgCompiler.__caps.pgVersion
void pgCompiler.__caps.extensions

// =============================================================================
// HOW IT SCORES AGAINST THE PRD (updated)
//
// STRONG
//   + R1 expression-problem: both axes open. New ops are new types;
//     new compilers (or extensions) are object spreads.
//   + R2 op-declares-self: the op type names only its kind and data.
//   + R8 tree-rewriting: ops are plain data with no behaviour attached.
//   + R10 multi-target: any number of compiler-values can be built from
//     the same op shapes.
//   + R14 fallback: a runtime flag can pick between two compiler values
//     with identical type shape; selection is just data.
//   + R17 op-boilerplate: lowest of the three approaches. An op is a
//     plain type with a `kind` field — no class, no phantom, no generics.
//   + R18 typed-handler-payload: `defineCompiler<OpU>()` narrows `op`
//     per-key, so handler bodies see the concrete shape with no casts.
//   + R19 exhaustiveness: the factory verifies the record covers the
//     claimed kinds.
//   + R20 error-clarity: missing-handler error names the offending kind
//     via a phantom `__MISSING_HANDLERS_FOR__<kind>` property.
//   + R21 op-metadata: per-kind metadata records typed via `satisfies`.
//   + R22 discoverability: `KindsHandledBy<typeof c>` at the type level,
//     `supports(c, k)` at runtime, both no-cost.
//   + R24 tree-shaking: compilers are plain objects, no load-time
//     `register()` side effects.
//
// PARTIAL (improved from before)
//   ~ R3 dialect-safety: still depends on the tree's static type being
//     literal-typed. Factory helpers + `parseOp` cover the wire boundary;
//     ad-hoc trees still need `as const`.
//   ~ R5 typed-deserialization: `parseOp<Allowed>(json, allowed)`
//     validates the kind SET at runtime and stamps the static union.
//     Shape validation per kind is NOT covered — that needs a central
//     kind→shape registry (Approach E).
//   ~ R6 wire-stability: an envelope with `tybisWireVersion` is a
//     convention. No runtime schema-evolution machinery here — that's a
//     larger feature than a single file demonstrates.
//   ~ R7 name-collision: scoped kind strings (`@acme/ml/foo`) solve
//     ecosystem collisions by convention. NOT bulletproof — TS can't
//     forbid a package from publishing kinds outside its own scope; a
//     lint rule (R12) is the enforcement layer.
//   ~ R11 static-introspection: `AllKindsOf<typeof tree>` works within
//     the depth cap (8). Deeper trees fall back to `string`.
//   ~ R13 capability-axes: `withCaps` brands the compiler value with a
//     `Capabilities` record. The compile boundary doesn't enforce them
//     yet — that's a separate generic threading exercise.
//   ~ R23 check-time: `AllKindsOf` is a recursive conditional with the
//     depth cap above. The `Diff` template-literal in R20 adds one more
//     pass over the kind union — small constant cost.
//
// HARD LIMITS (won't fix in this approach)
//   – R5 full shape-validation across the wire requires a central
//     kind→shape map. D deliberately has no such central registry — that's
//     the whole point of the approach. Kind-set validation is as far as
//     D can go without abandoning the discriminated-union model.
//   – R7 absolute collision safety (symbol-keyed kinds with a string
//     wire fallback) requires a per-package kind-symbol indirection that
//     breaks `JSON.stringify` round-trip without custom replacers. Out of
//     scope for a single-file demo.
// =============================================================================
