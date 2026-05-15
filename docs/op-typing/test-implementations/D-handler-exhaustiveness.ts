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

// Typed entry-point. The compiler's handler keys must cover every kind
// reachable in the tree's static type.
function compile<T extends { kind: string }, S extends string>(
    tree: T,
    compiler: Handlers<S> & { [k in AllKindsOf<T>]: unknown },
): string {
    return dispatch(tree, compiler as Record<string, any>)
}

// Core ships a duckdb compiler covering core ops.
const coreDuckdb = {
    lit_int: (op: LitInt) => String(op.value),
    add: (op: Add<any, any>, rec) => `(${rec(op.l)} + ${rec(op.r)})`,
} satisfies Handlers<'lit_int' | 'add'>

// --- 3RD-PARTY PACKAGE -------------------------------------------------------

type CustomOp = { kind: 'custom_op'; x: number }

// Make the CORE duckdb compiler handle CustomOp — by spreading.
const duckdbWithCustom = {
    ...coreDuckdb,
    custom_op: (op: CustomOp) => `custom(${op.x})`,
} satisfies Handlers<'lit_int' | 'add' | 'custom_op'>

// And/or build a brand-new compiler from scratch.
const myCompiler = {
    lit_int: (op: LitInt) => `L:${op.value}`,
    add: (op: Add<any, any>, rec) => `A(${rec(op.l)},${rec(op.r)})`,
    custom_op: (op: CustomOp) => `C:${op.x}`,
} satisfies Handlers<'lit_int' | 'add' | 'custom_op'>

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
// @ts-expect-error — `custom_op` not in coreDuckdb's handler keys
compile(mixed, coreDuckdb)

// =============================================================================
// HOW IT SCORES AGAINST THE PRD
//
// STRONG
//   + R17 op-boilerplate: lowest of the four approaches. An op is a
//     plain type with a `kind` field — no class, no phantom, no generics.
//   + R1 expression-problem: both axes open. New ops are new types;
//     new compilers (or extensions of existing ones) are object spreads.
//   + R2 op-declares-self: the op type names only its kind and data.
//   + R8 tree-rewriting: ops are plain data with no behaviour attached,
//     so a rewriter can construct/destructure them freely.
//   + R10 multi-target: any number of compiler-values can be built from
//     the same op shapes.
//   + R14 fallback: a runtime flag can pick between two compiler values
//     with identical type shape; selection is just data.
//   + R19 exhaustiveness: `satisfies Handlers<...>` verifies the record
//     covers the claimed kinds.
//   + R24 tree-shaking: compilers are plain objects, no load-time
//     `register()` side effects.
//
// WEAK / OPEN
//   – R3 dialect-safety: the boundary check is only as good as the
//     tree's static type. A variable typed as a wide op union collapses
//     `AllKindsOf` to "any string" and the check goes vacuous. Trees
//     built ad-hoc need `as const` or factory helpers that preserve
//     literal kinds.
//   – R23 check-time: `AllKindsOf` is a recursive conditional with a
//     depth cap (8 here). Deeper trees silently fall back to `string`
//     and the R3/R11 checks lose precision.
//   – R11 static-introspection: technically `AllKindsOf<typeof tree>`
//     is the answer, but the depth cap means it's not reliable for
//     deep trees.
//   – R18 typed-handler-payload: handler bodies need to annotate the
//     op argument (`(op: LitInt) => ...`) — the handler-dict key only
//     carries the kind string, not the shape. A registry (E) connects
//     kind ↔ shape.
//   – R5 typed-deserialization: hard without a central kind ↔ shape
//     mapping. A `parseOp<Allowed>(json)` helper has to re-stamp the
//     literal kinds at the wire boundary.
//   – R7 name-collision: kinds are still bare global strings.
//   – Extending an existing compiler by spread creates a new VALUE;
//     existing imports of the original see only the original kinds.
//     (Approach E is the answer for global extension.)
// =============================================================================
