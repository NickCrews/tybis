// =============================================================================
// Approach F — Trait methods on ops (Rust-style, via duck typing)
//
// IDEA
//   Each compiler defines a structural "trait": an interface with a
//   single method name, e.g. `DuckdbCompilable { toDuckdb(): string }`.
//   An op "implements" the trait simply by having that method. The
//   compiler is a thin wrapper that walks the tree and calls the method.
//
//   Constraint enforcement is achieved by TypeScript's natural variance:
//   the compiler's argument type is the trait, so anything passed in
//   must structurally have the method. Composite ops require their
//   children to also implement the trait, which is expressed by
//   generic bounds.
//
//   3rd parties extend along both axes:
//     * Add an op:        write a class that implements the trait method.
//     * Add a compiler:   write a new trait interface + a wrapper.
//     * Make an EXISTING op work with a NEW compiler:
//         (a) Subclass and add the method, or
//         (b) Declaration-merge the method onto the class and patch
//             the prototype at module load (`Foo.prototype.toX = ...`).
//
//   This is the most direct TS analog to Rust's `impl Trait for Type`
//   at the syntax level. The trade-off is that the OP, not the compiler,
//   carries the implementation methods.
// =============================================================================

export { }

// --- CORE PACKAGE ------------------------------------------------------------

// Each compiler defines a trait. Ops opt in by having the method.
interface DuckdbCompilable {
    toDuckdb(): string
}

class LitInt implements DuckdbCompilable {
    constructor(readonly value: number) { }
    toDuckdb() { return String(this.value) }
}

// `Add` requires its children to implement the trait too — exactly like
// Rust's `impl DuckdbCompilable for Add<L, R> where L: DuckdbCompilable,
// R: DuckdbCompilable`.
class Add<L extends DuckdbCompilable, R extends DuckdbCompilable>
    implements DuckdbCompilable {
    constructor(readonly l: L, readonly r: R) { }
    toDuckdb() { return `(${this.l.toDuckdb()} + ${this.r.toDuckdb()})` }
}

class DuckdbCompiler {
    compile<T extends DuckdbCompilable>(op: T): string { return op.toDuckdb() }
}

// --- 3RD-PARTY PACKAGE #1 — new op, existing compiler -----------------------

class CustomOp implements DuckdbCompilable {
    constructor(readonly x: number) { }
    toDuckdb() { return `custom(${this.x})` }
}

// CustomOp is usable in the existing DuckdbCompiler because it
// structurally implements the trait.

// --- 3RD-PARTY PACKAGE #2 — new compiler, existing ops ----------------------

interface PostgresCompilable {
    toPostgres(): string
}

// To make core ops `LitInt` and `Add` usable with Postgres, the 3rd
// party declaration-merges the method onto the class AND patches the
// prototype at module load. This is the TS analog to Rust's
// `impl PostgresCompilable for LitInt`. (In a real multi-module setup
// these would be wrapped in `declare module 'core' { ... }`. Within a
// single file the bare interface declarations merge directly.)
interface LitInt extends PostgresCompilable { }
interface Add<L, R> extends PostgresCompilable { }

// Runtime patch — without this, calls would type-check but throw.
// In a real codebase, this lives next to the `declare module` block in
// the 3rd-party package and runs as a side-effect import.
;
    (LitInt.prototype as any).toPostgres = function (this: LitInt) {
        return String(this.value)
    }
    ; (Add.prototype as any).toPostgres = function <L extends PostgresCompilable, R extends PostgresCompilable>(this: Add<any, any>) {
        return `(${(this.l as L).toPostgres()} + ${(this.r as R).toPostgres()})`
    }

// CustomOp does NOT implement PostgresCompilable. A 3rd party either
// declaration-merges + patches it, or accepts that postgres trees can't
// contain CustomOp.

class PostgresCompiler {
    compile<T extends PostgresCompilable>(op: T): string { return op.toPostgres() }
}

// --- Demo --------------------------------------------------------------------

const duckdb = new DuckdbCompiler()
const pg = new PostgresCompiler()

const safe = new Add(new LitInt(1), new LitInt(2))
duckdb.compile(safe)
pg.compile(safe)

const mixedDuck = new Add(new LitInt(1), new CustomOp(2))
duckdb.compile(mixedDuck)

// Passing a bare `CustomOp` to the Postgres compiler is rejected:
// @ts-expect-error — `CustomOp` has no `toPostgres` method
pg.compile(new CustomOp(2))

// HOWEVER — and this is the central weakness of this approach — wrapping
// the `CustomOp` inside an `Add` LAUNDERS it past the check, because
// the merged `interface Add<L, R> extends PostgresCompilable {}` claims
// every Add is PostgresCompilable regardless of its children. The call
// below type-checks but will throw at runtime when toPostgres recurses
// into the CustomOp child.
pg.compile(mixedDuck)   // ⚠️ runtime-only failure

// To catch composite mismatches statically, `Add` would need to thread
// trait bounds through its generics (`Add<L extends T, R extends T>`),
// at which point the approach collapses to Approach B's per-child
// generic-threading pattern.

// =============================================================================
// HOW IT SCORES AGAINST THE PRD
//
// STRONG
//   + R18 typed-handler-payload: trivially typed — `this` IS the op,
//     no cast or registry lookup needed.
//   + R17 op-boilerplate: for simple ops (no children), defining an op
//     is `class Foo implements Trait { ...; toX() {...} }` — short.
//   + R23 check-time: structural-interface checks are cheap; no
//     recursive conditional types involved.
//   + Reads almost identically to Rust traits. The "trait" is an
//     interface; "impl Trait for Type" is `class Foo implements Trait`.
//
// WEAK / OPEN
//   – R2 op-declares-self: VIOLATED. The op carries a method named
//     after each compiler that handles it (`toDuckdb`, `toPostgres`).
//     Adding a new compiler forces edits to every op (or `declare
//     module` + prototype patch at every consumer).
//   – R3 dialect-safety: composite ops launder mismatches at runtime.
//     `Add<L, R> implements PostgresCompilable` claims every Add is
//     compilable regardless of children. To fix it statically, trait
//     bounds must thread through every composite's generics — at
//     which point the approach has collapsed to Approach B.
//   – R8 tree-rewriting: behaviour lives on the op via methods, so a
//     rewriter that produces a new tree has to know which class to
//     instantiate, not just what shape to produce.
//   – R4 json-round-trip: methods don't serialize. A JSON-rehydrated
//     plain object has no `toX()` and won't compile.
//   – R5 typed-deserialization: same — the wire format loses the
//     trait implementations entirely.
//   – R11 static-introspection: the type carries "satisfies trait",
//     not "uses these kinds". Cannot answer "which kinds appear in
//     this tree?" from the type alone.
//   – R22 discoverability: no way to enumerate which ops a compiler
//     supports — the trait is structural, not a registry.
//   – R7 name-collision: method names are the namespace. Two packages
//     wanting a `toDuckdb` collide on the op class.
//   – R10 multi-target: each new target means a new method on every
//     op. A 10-compiler ecosystem means 10 methods on every op.
//   – R14 fallback: per-op methods make it hard to pick between
//     versioned implementations without writing dispatcher methods
//     by hand.
//   – R20 error-clarity: failure looks like "Property 'toX' is
//     missing on type 'Foo'" — readable for primitives, opaque once
//     generic bounds get involved.
//   – R21 op-metadata: docstrings can live on the op class, but each
//     compiler-impl docstring is buried on a method.
//   – Tightly couples ops to compiler NAMES. Renaming a compiler
//     means renaming a method on every op.
// =============================================================================
