// =============================================================================
// Approach E — Open op-shape registry via declaration merging
//
// IDEA
//   Core defines a single `interface OpRegistry { ... }` mapping each op
//   `kind` to its data shape. The `Op` union is derived from this
//   registry. 3rd parties augment the interface via TS declaration
//   merging — `declare module 'core' { interface OpRegistry { ... } }` —
//   and the union widens automatically everywhere.
//
//   Each compiler also exposes an open `interface XxxHandlers { ... }`.
//   3rd parties augment it to claim "I provide this kind for this
//   compiler" and call `.register()` at module load to install the impl.
//
//   This is the canonical TypeScript answer to the expression problem
//   (add new variants AND new operations without modifying the centre),
//   and the closest TS analog to Rust's `impl Trait for Type` orphan
//   pattern — TS lets any module augment any interface, so it is even
//   more permissive than Rust.
//
// EXTENSIBILITY
//   + 3rd-party ops: augment `OpRegistry` from a downstream module.
//   + 3rd-party compilers: define a new handler-set interface; expose
//     a `register`/`compile` pair around it.
//   + Globally teach an EXISTING compiler VALUE about a new op: augment
//     its handler interface AND call `.register(kind, impl)` at module
//     load. All downstream imports of that compiler value pick it up.
// =============================================================================

export { }   // module — required for `declare global` to work

// --- CORE PACKAGE ------------------------------------------------------------

declare global {
    interface OpRegistry {
        lit_int: { value: number }
        add: { l: AnyOp; r: AnyOp }
    }
    interface DuckdbHandlers {
        lit_int: (op: Op<'lit_int'>, rec: (o: AnyOp) => string) => string
        add: (op: Op<'add'>, rec: (o: AnyOp) => string) => string
    }
    // R13 capability-axes (~ → ~+): open registry of orthogonal axes
    // beyond just "dialect". 3rd parties augment this to declare per-op
    // capability flags; compilers can require/forbid them at the boundary.
    // (Demo below: `deterministic` and `min_pg_version`.)
    interface OpCapabilities {
        // Keys are op kinds; values are arbitrary capability bags.
        // (Default — registry entry's bag is empty unless an aug supplies one.)
    }
    // R21 op-metadata: open metadata registry — JSDoc/since/deprecation
    // live next to the op shape, queryable by tools/docs generators.
    interface OpMetadata {
        // kind -> { description?: string; since?: string; deprecated?: string }
    }
}

type Op<K extends keyof OpRegistry> = { kind: K } & OpRegistry[K]
type AnyOp = { [K in keyof OpRegistry]: Op<K> }[keyof OpRegistry]

// R11/R12: public utility for static introspection. Tools and lint rules
// can extract a tree's full kind set straight from its static type.
//
// R23 check-time note: the depth cap of 8 is deliberate — without it,
// TS hits "Type instantiation is excessively deep". 8 is enough for
// realistic queries; deeper trees fall back to `string` (sound but
// imprecise, the same trade-off D makes).
type AllKindsOf<T, D extends unknown[] = []> =
    D['length'] extends 8 ? string :
    T extends { kind: infer K extends string }
        ? K | { [P in keyof T]: T[P] extends { kind: string } ? AllKindsOf<T[P], [...D, 1]> : never }[keyof T]
        : never

// R22 discoverability: "what does this compiler support?" as a type.
type KindsHandledBy<H> = keyof H & keyof OpRegistry

// R5 helper: a phantom marker stamped onto trees that have been
// validated at a runtime boundary (e.g. `parseOp`). It tells `compile`
// "this tree's kind set is exactly `K` — skip the structural
// `AllKindsOf` walk, which would blow past TS's depth cap on
// recursive `AnyOp` children." See R5/R23 notes below.
declare const _verifiedKinds: unique symbol
type Verified<K extends keyof OpRegistry> = { readonly [_verifiedKinds]?: K }
// Helper to pick whichever kind set is more precise.
type EffectiveKinds<T> = T extends Verified<infer V> ? V & string : AllKindsOf<T>

// A compiler is a runtime-mutable map of handlers. The runtime invariant
// (every registered kind has a real impl) is trusted; the boundary
// function below enforces that the TREE's kinds are a subset of what the
// interface CLAIMS to support.
class DuckdbCompiler {
    handlers: { [K in keyof DuckdbHandlers]?: DuckdbHandlers[K] } = {}
    register<K extends keyof DuckdbHandlers>(kind: K, h: DuckdbHandlers[K]): void {
        this.handlers[kind] = h
    }
    // R22 discoverability (runtime side): mirror of `keyof DuckdbHandlers`.
    supports(kind: string): kind is keyof DuckdbHandlers & string {
        return kind in this.handlers
    }
}

function dispatch(tree: AnyOp, c: DuckdbCompiler): string {
    const rec = (s: AnyOp) => dispatch(s, c)
    return (c.handlers as Record<string, any>)[tree.kind](tree, rec)
}

// Boundary entry-point: the tree's kinds must all be present in the
// (possibly-merged) `DuckdbHandlers` interface.
function compile<T extends AnyOp>(
    tree: T,
    compiler: DuckdbCompiler,
    ..._proof: [Exclude<EffectiveKinds<T>, keyof DuckdbHandlers>] extends [never]
        ? []
        : [missing: `missing duckdb impl for: ${Exclude<EffectiveKinds<T>, keyof DuckdbHandlers> & string}`]
): string {
    return dispatch(tree, compiler)
}

const duckdb = new DuckdbCompiler()
duckdb.register('lit_int', op => String(op.value))
duckdb.register('add', (op, rec) => `(${rec(op.l)} + ${rec(op.r)})`)

// --- 3RD-PARTY PACKAGE -------------------------------------------------------

declare global {
    interface OpRegistry {
        custom_op: { x: number }
    }
    interface DuckdbHandlers {
        custom_op: (op: Op<'custom_op'>, rec: (o: AnyOp) => string) => string
    }
}

// Side-effect at load time: teach the existing duckdb VALUE the new
// kind. After this import runs, ALL downstream `duckdb.compile(...)`
// calls accept trees containing `custom_op` — no new compiler value
// was constructed.
duckdb.register('custom_op', op => `custom(${op.x})`)

// --- R7 name-collision: SCOPED KINDS -----------------------------------------
//
// The kind string is just a key in `OpRegistry`. Nothing forces it to
// be a bare identifier, so 3rd parties SHOULD namespace their kinds
// like NPM package paths: `'@acme/ml/cluster_id'`. Two packages can
// then both ship a "cluster_id"-shaped op without colliding.
//
// This moves R7 from ✗ → ~: it eliminates *accidental* collision (the
// common case), but cannot prevent two packages from picking the same
// scope on purpose. Symbol-keyed kinds would close the remaining gap
// at the cost of breaking R4 json-round-trip — scoped strings are the
// pragmatic middle. We additionally validate the convention with a
// template-literal type constraint at the boundary (see `ScopedKind`).

type ScopedKind = `@${string}/${string}`

declare global {
    interface OpRegistry {
        '@acme/ml/cluster_id': { points: AnyOp; k: number }
        '@beta/geo/cluster_id': { points: AnyOp; radius: number }
    }
    interface DuckdbHandlers {
        '@acme/ml/cluster_id': (op: Op<'@acme/ml/cluster_id'>, rec: (o: AnyOp) => string) => string
        '@beta/geo/cluster_id': (op: Op<'@beta/geo/cluster_id'>, rec: (o: AnyOp) => string) => string
    }
}

duckdb.register('@acme/ml/cluster_id', (op, rec) => `kmeans(${rec(op.points)}, ${op.k})`)
duckdb.register('@beta/geo/cluster_id', (op, rec) => `dbscan(${rec(op.points)}, ${op.radius})`)

// Type-level sanity check: every non-core kind in the registry SHOULD
// match the `@scope/pkg/name` pattern. This is purely advisory — core
// kinds are exempt. (`random` is also "core" for demo purposes.)
type CoreKinds = 'lit_int' | 'add' | 'custom_op' | 'random'
type NonCoreKinds = Exclude<keyof OpRegistry, CoreKinds>
type UnscopedLeak = Exclude<NonCoreKinds, ScopedKind>
// If a future augmentation forgets the scope, this alias becomes non-`never`
// and downstream tooling can surface it. We assert it is `never` today:
const _noUnscopedLeak: UnscopedLeak extends never ? true : false = true
void _noUnscopedLeak

// --- R5 typed-deserialization ------------------------------------------------
//
// `parseOp<Allowed>(json)` walks the parsed JSON, validates every node's
// `kind` against the caller-supplied allowlist, and returns a value
// whose static type is `Op<Allowed>`-shaped. The wire boundary is now a
// typed gate, not a `trust me` cast — R5 moves from ~ → ~+.
//
// What it still can't do: synthesize kinds the consumer never named.
// The caller must pass the allowlist; we don't recover it from the raw
// JSON (no general way to). This matches the PRD's framing of R5.

class ParseError extends Error {
    constructor(public path: string, public reason: string) {
        super(`parseOp at ${path || '<root>'}: ${reason}`)
    }
}

function parseOp<Allowed extends keyof OpRegistry>(
    json: unknown,
    allowed: ReadonlyArray<Allowed>,
): AnyOp & Verified<Allowed> {
    const allow: Record<string, true> = {}
    for (let i = 0; i < allowed.length; i++) allow[allowed[i] as string] = true
    function walk(node: unknown, path: string): void {
        if (typeof node !== 'object' || node === null) throw new ParseError(path, 'not an object')
        const obj = node as Record<string, unknown>
        const kind = obj.kind
        if (typeof kind !== 'string') throw new ParseError(path, 'missing string `kind`')
        if (!allow[kind]) throw new ParseError(path, `kind '${kind}' not in allowlist`)
        // Recurse into children that look like ops.
        for (const k in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, k)) continue
            const v = obj[k]
            if (v && typeof v === 'object' && 'kind' in (v as object)) {
                walk(v, path ? `${path}.${k}` : k)
            }
        }
    }
    walk(json, '')
    return json as AnyOp & Verified<Allowed>
}

// --- R13 capability-axes ------------------------------------------------------
//
// Capabilities are an open registry, one entry per op kind. The boundary
// check folds them into a single "required capabilities" union and
// rejects trees whose ops demand axes the compiler hasn't opted into.
// Demo: `random` is non-deterministic; a "materialized view" compile
// path that opts out of non-determinism statically rejects it.

declare global {
    interface OpRegistry {
        random: {}
    }
    interface DuckdbHandlers {
        random: (op: Op<'random'>, rec: (o: AnyOp) => string) => string
    }
    interface OpCapabilities {
        random: { nondeterministic: true }
    }
}
duckdb.register('random', () => `random()`)

// Lookup with a sensible empty default for ops that don't declare caps.
type CapsOf<K extends keyof OpRegistry> =
    K extends keyof OpCapabilities ? OpCapabilities[K] : {}

// Union of all capability keys required by the tree.
type RequiredCaps<T> =
    EffectiveKinds<T> extends infer K
        ? K extends keyof OpRegistry ? keyof CapsOf<K> & string : never
        : never

// Compile with a capability allowlist. Caller declares which axes are
// acceptable; any required axis missing from `Allowed` is a typed error.
function compileWithCaps<T extends AnyOp, Allowed extends string>(
    tree: T,
    compiler: DuckdbCompiler,
    _allowedCaps: ReadonlyArray<Allowed>,
    ..._proof: [Exclude<RequiredCaps<T>, Allowed>] extends [never]
        ? [Exclude<EffectiveKinds<T>, keyof DuckdbHandlers>] extends [never]
            ? []
            : [missing: `missing duckdb impl for: ${Exclude<EffectiveKinds<T>, keyof DuckdbHandlers> & string}`]
        : [forbidden: `op requires forbidden capability: ${Exclude<RequiredCaps<T>, Allowed>}`]
): string {
    return dispatch(tree, compiler)
}

// --- Demo --------------------------------------------------------------------

const safe = {
    kind: 'add',
    l: { kind: 'lit_int', value: 1 },
    r: { kind: 'lit_int', value: 2 },
} as const

compile(safe, duckdb)

const mixed = {
    kind: 'add',
    l: { kind: 'lit_int', value: 1 },
    r: { kind: 'custom_op', x: 2 },
} as const

compile(mixed, duckdb)

// R7 demo: both scoped `cluster_id` ops coexist in one program.
const scoped = {
    kind: 'add',
    l: { kind: '@acme/ml/cluster_id', points: { kind: 'lit_int', value: 1 }, k: 3 },
    r: { kind: '@beta/geo/cluster_id', points: { kind: 'lit_int', value: 2 }, radius: 0.5 },
} as const
compile(scoped, duckdb)

// Simulate: what if a 3rd party adds an op kind but FORGETS to augment
// DuckdbHandlers? `compile` requires a string-typed "proof" argument
// whose type literally names the missing kinds.
declare const orphanTree: { kind: 'orphan_kind' } & Record<string, unknown>
// @ts-expect-error — `missing duckdb impl for: orphan_kind`
compile(orphanTree as any, duckdb)

// R22 discoverability: type-level set of duckdb's supported kinds.
type DuckdbKinds = KindsHandledBy<DuckdbHandlers>
const _kindsProbe: DuckdbKinds = 'add'
void _kindsProbe
// @ts-expect-error — 'not_a_kind' is not in `keyof DuckdbHandlers`
const _kindsBad: DuckdbKinds = 'not_a_kind'
void _kindsBad
// Runtime mirror.
if (duckdb.supports('add')) { /* narrowed */ }

// R5 demo: parse a wire payload with a typed allowlist. The `Verified`
// phantom flows into `compile`, which uses it instead of walking the
// recursive `AnyOp` children — making the post-parse boundary check
// precise rather than `string`-widened.
const wire: unknown = JSON.parse('{"kind":"add","l":{"kind":"lit_int","value":1},"r":{"kind":"lit_int","value":2}}')
const parsed = parseOp(wire, ['add', 'lit_int'] as const)
compile(parsed, duckdb)
// @ts-expect-error — `parseOp` itself rejects kinds not in `OpRegistry`.
const _parsedBad = parseOp(wire, ['add', 'lit_int', 'orphan_kind'] as const)
void _parsedBad

// Simulate a "rogue" verified tree: a 3rd-party parser hands us a tree
// claiming a kind that no compiler handles. The phantom flows in,
// `compile` rejects it with the same precise error as for in-code trees.
declare const rogue: AnyOp & Verified<'random'>
// (random IS handled by duckdb — this compiles)
compile(rogue, duckdb)

// R13 demo: a materialized-view compile path forbids nondeterminism.
const pure = { kind: 'add', l: { kind: 'lit_int', value: 1 }, r: { kind: 'lit_int', value: 2 } } as const
compileWithCaps(pure, duckdb, [] as const)

const impure = { kind: 'add', l: { kind: 'lit_int', value: 1 }, r: { kind: 'random' } } as const
// @ts-expect-error — `op requires forbidden capability: nondeterministic`
compileWithCaps(impure, duckdb, [] as const)
// Explicitly allowing the axis unblocks it.
compileWithCaps(impure, duckdb, ['nondeterministic'] as const)

// R21 demo: metadata-by-augmentation. A docs generator could iterate
// `keyof OpRegistry` and read `OpMetadata[K]` from the merged interface.
declare global {
    interface OpMetadata {
        add: { description: 'numeric addition'; since: '0.1.0' }
        random: { description: 'PRNG draw'; since: '0.4.0'; deprecated: 'use crypto_random' }
    }
}
type AddDoc = OpMetadata extends { add: infer D } ? D : never
const _addDoc: AddDoc = { description: 'numeric addition', since: '0.1.0' }
void _addDoc

// =============================================================================
// HOW IT SCORES AGAINST THE PRD (post-improvements)
//
// STRONG
//   + R1 expression-problem: the ONLY approach here where 3rd-party
//     code can teach an EXISTING compiler VALUE to handle a new op.
//     Imports of `duckdb` from any downstream module pick up the
//     augmentation transparently. Closest TS analog to Rust's
//     `impl Trait for Type`.
//   + R2 op-declares-self: the registry entry names the op's shape;
//     compiler bindings live in separate `XxxHandlers` interfaces.
//   + R5 typed-deserialization (~ → ~+): `parseOp<Allowed>(json, [...])`
//     gates the wire boundary on a caller-supplied kind allowlist and
//     returns a statically-narrowed tree. Still requires the caller to
//     name the kinds — TS can't synthesize them from raw JSON — but the
//     boundary is no longer a `trust me` cast.
//   + R6 wire-stability: `OpRegistry` is a single named contract,
//     a natural place to hang version/since metadata (see `OpMetadata`).
//   + R7 name-collision (✗ → ~): scoped kinds like `'@acme/ml/x'`
//     eliminate accidental collisions. Two packages can both ship a
//     `cluster_id` op (demo above) by namespacing. Cannot prevent
//     adversarial collisions without symbols (which would break R4).
//   + R11 static-introspection (~ → ~+): `AllKindsOf<T>` is exposed as
//     a public utility; `KindsHandledBy<H>` projects a compiler's claim.
//   + R13 capability-axes (~ → ~+): `OpCapabilities` is an open
//     registry; `compileWithCaps` enforces an allowlist at the boundary
//     with a template-literal error string.
//   + R17 op-boilerplate: adding (op + duckdb impl) is two `declare
//     global` blocks plus one `register()` call.
//   + R18 typed-handler-payload: handlers receive `Op<K>` —
//     `OpRegistry[K]` provides the concrete shape, no casts needed.
//   + R20 error-clarity: the boundary uses a template-literal error
//     parameter — `missing duckdb impl for: foo | bar` and `op requires
//     forbidden capability: nondeterministic` read as plain English.
//   + R21 op-metadata: `OpMetadata` is an open registry parallel to
//     `OpRegistry`; ops, capabilities, and docs all augment by kind.
//   + R22 discoverability: `keyof OpRegistry` is the full kind set;
//     `KindsHandledBy<DuckdbHandlers>` is the per-compiler claim;
//     `compiler.supports(kind)` is the runtime mirror.
//
// WEAK / OPEN
//   – R24 tree-shaking: FUNDAMENTAL TO E. `register()` is a load-time
//     side effect that bundlers can't drop. Importing a package mutates
//     a shared compiler value, so any extension a consumer touches
//     transitively drags in every other extension that registered
//     against the same compiler value. No fix without changing the
//     core approach (and that's what B/D are for).
//   – R23 check-time: `AllKindsOf` keeps the depth cap of 8; deep
//     trees fall back to `string` and the R3 check loses precision.
//     Same trade-off as D — recursive conditional types have a hard
//     TS ceiling.
//   – Declaration merging is TS-only and obscure. Refactors and
//     find-references work unevenly across augmentation sites.
//   – Type↔runtime drift: augmenting `DuckdbHandlers` without calling
//     `register()` type-checks but throws at runtime. The interface
//     claims and the runtime map are not enforced to agree.
//   – Cannot have two consumers in the same program with different
//     op sets — augmentations are global to the compilation unit.
// =============================================================================
