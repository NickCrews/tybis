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
}

type Op<K extends keyof OpRegistry> = { kind: K } & OpRegistry[K]
type AnyOp = { [K in keyof OpRegistry]: Op<K> }[keyof OpRegistry]

// Recursively collect every `kind` appearing in T's static type.
type AllKindsOf<T, D extends unknown[] = []> =
    D['length'] extends 8 ? string :
    T extends { kind: infer K extends string }
        ? K | { [P in keyof T]: T[P] extends { kind: string } ? AllKindsOf<T[P], [...D, 1]> : never }[keyof T]
        : never

// A compiler is a runtime-mutable map of handlers. The runtime invariant
// (every registered kind has a real impl) is trusted; the boundary
// function below enforces that the TREE's kinds are a subset of what the
// interface CLAIMS to support.
class DuckdbCompiler {
    handlers: { [K in keyof DuckdbHandlers]?: DuckdbHandlers[K] } = {}
    register<K extends keyof DuckdbHandlers>(kind: K, h: DuckdbHandlers[K]): void {
        this.handlers[kind] = h
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
    ..._proof: [Exclude<AllKindsOf<T>, keyof DuckdbHandlers>] extends [never]
        ? []
        : [missing: `missing duckdb impl for: ${Exclude<AllKindsOf<T>, keyof DuckdbHandlers> & string}`]
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

// Simulate: what if a 3rd party adds an op kind but FORGETS to augment
// DuckdbHandlers? `compile` requires a string-typed "proof" argument
// whose type literally names the missing kinds.
declare const orphanTree: { kind: 'orphan_kind' } & Record<string, unknown>
// @ts-expect-error — `missing duckdb impl for: orphan_kind`
compile(orphanTree as any, duckdb)

// =============================================================================
// HOW IT SCORES AGAINST THE PRD
//
// STRONG
//   + R1 expression-problem: the ONLY approach here where 3rd-party
//     code can teach an EXISTING compiler VALUE to handle a new op.
//     Imports of `duckdb` from any downstream module pick up the
//     augmentation transparently. Closest TS analog to Rust's
//     `impl Trait for Type`.
//   + R2 op-declares-self: the registry entry names the op's shape;
//     compiler bindings live in separate `XxxHandlers` interfaces.
//   + R6 wire-stability: `OpRegistry` is a single named contract,
//     a natural place to hang version/since metadata.
//   + R17 op-boilerplate: adding (op + duckdb impl) is two `declare
//     global` blocks plus one `register()` call.
//   + R18 typed-handler-payload: handlers receive `Op<K>` —
//     `OpRegistry[K]` provides the concrete shape, no casts needed.
//   + R20 error-clarity: the boundary uses a template-literal error
//     parameter — `missing duckdb impl for: foo | bar` reads as
//     plain English instead of a deep assignability mismatch.
//   + R21 op-metadata: the registry entry has a natural place to
//     attach JSDoc, since-version, deprecation notes.
//   + R22 discoverability: `keyof OpRegistry` is the full kind set;
//     `keyof DuckdbHandlers` is what the duckdb compiler claims.
//
// WEAK / OPEN
//   – R24 tree-shaking: `register()` is a load-time side effect that
//     bundlers can't drop. Importing a package mutates a shared
//     compiler value. The Drizzle-style tree-shake story breaks here.
//   – R7 name-collision: augmentations are AMBIENT for the whole
//     compilation unit. Two packages claiming the same kind (or the
//     same `(compiler, kind)` pair) silently fight; load order
//     decides who wins.
//   – R23 check-time: `AllKindsOf` keeps the depth cap; deep trees
//     fall back to `string` and the R3 check loses precision.
//   – Declaration merging is TS-only and obscure. Refactors and
//     find-references work unevenly across augmentation sites.
//   – Type↔runtime drift: augmenting `DuckdbHandlers` without calling
//     `register()` type-checks but throws at runtime. The interface
//     claims and the runtime map are not enforced to agree.
//   – Cannot have two consumers in the same program with different
//     op sets — augmentations are global to the compilation unit.
// =============================================================================
