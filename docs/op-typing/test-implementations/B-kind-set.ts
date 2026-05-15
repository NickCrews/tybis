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

class LitInt implements IVOp<'lit_int'> {
    readonly kind = 'lit_int' as const
    declare readonly __kinds: 'lit_int'
    constructor(readonly value: number) { }
}

class Add<L extends string, R extends string> implements IVOp<'add' | L | R> {
    readonly kind = 'add' as const
    declare readonly __kinds: 'add' | L | R
    constructor(readonly l: IVOp<L>, readonly r: IVOp<R>) { }
}

type Handler<K extends string> = (op: IVOp<K>, rec: (sub: IVOp<any>) => string) => string

class Compiler<Supported extends string> {
    constructor(readonly handlers: { [K in Supported]: Handler<K> }) { }

    compile<K extends Supported>(op: IVOp<K>): string {
        const rec = (sub: IVOp<any>) => (this.handlers as any)[(sub as any).kind](sub, rec)
        return (this.handlers as any)[(op as any).kind](op, rec)
    }

    // Open extension: returns a new compiler with extra handlers. The
    // static type widens to include the new kinds.
    extend<New extends string>(
        more: { [K in New]: Handler<K> },
    ): Compiler<Supported | New> {
        return new Compiler({ ...this.handlers, ...more } as any)
    }
}

// Core ships a Duckdb compiler that handles core ops.
export const duckdb = new Compiler<'lit_int' | 'add'>({
    lit_int: op => String((op as unknown as LitInt).value),
    add: (op, rec) => `(${rec((op as unknown as Add<any, any>).l)} + ${rec((op as unknown as Add<any, any>).r)})`,
})

// --- 3RD-PARTY PACKAGE -------------------------------------------------------

class CustomOp implements IVOp<'custom_op'> {
    readonly kind = 'custom_op' as const
    declare readonly __kinds: 'custom_op'
    constructor(readonly x: number) { }
}

// Make the CORE duckdb compiler handle CustomOp — without touching it.
const duckdbWithCustom = duckdb.extend<'custom_op'>({
    custom_op: op => `custom(${(op as unknown as CustomOp).x})`,
})

// And/or define a brand-new compiler from scratch that handles core +
// custom ops.
const myCompiler = new Compiler<'lit_int' | 'add' | 'custom_op'>({
    lit_int: op => `L:${(op as unknown as LitInt).value}`,
    add: (op, rec) => `A(${rec((op as unknown as Add<any, any>).l)},${rec((op as unknown as Add<any, any>).r)})`,
    custom_op: op => `C:${(op as unknown as CustomOp).x}`,
})

// --- Demo --------------------------------------------------------------------

const safe = new Add(new LitInt(1), new LitInt(2))
//    ^? Add<'lit_int', 'lit_int'>  ⇒ kinds = 'add' | 'lit_int'
duckdb.compile(safe)
duckdbWithCustom.compile(safe)
myCompiler.compile(safe)

const mixed = new Add(new LitInt(1), new CustomOp(2))
//    ^? Add<'lit_int', 'custom_op'>  ⇒ kinds = 'add' | 'lit_int' | 'custom_op'
duckdbWithCustom.compile(mixed)
myCompiler.compile(mixed)
// @ts-expect-error — 'custom_op' is not in duckdb's Supported = 'lit_int' | 'add'
duckdb.compile(mixed)

// =============================================================================
// HOW IT SCORES AGAINST THE PRD
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
//   + R15 type-composition: the new `Kinds` parameter is symmetric with
//     the existing `DataType` / `DataShape` generics on every op. One
//     more dimension of the same pattern.
//   + R19 exhaustiveness: `{ [K in Supported]: Handler<K> }` is a
//     mapped-type record; missing kinds error at compiler construction.
//   + R24 tree-shaking: `extend()` produces a new VALUE, no load-time
//     side effects. Unused compilers don't get pulled into the bundle.
//
// WEAK / OPEN
//   – R17 op-boilerplate: every op class needs the phantom dance
//     (`__kinds`, generics on each child threading the union). For
//     n-ary composite ops, n generic parameters.
//   – R18 typed-handler-payload: handler argument is `IVOp<K>`; the
//     phantom carries only the kind string, not the op's shape. Bodies
//     need a cast to the concrete class. Pair with a registry (E) or
//     discriminated union (D) to recover this.
//   – R5 typed-deserialization: the phantom exists only when the tree
//     is built in code. Deserialized JSON loses the precise `Kinds`
//     union unless `parseOp<Allowed>(...)` re-asserts it at the wire
//     boundary.
//   – R7 name-collision: op kinds are still global strings. Two
//     packages picking `'cluster_id'` collide.
//   – R6 wire-stability: no built-in versioning; kind strings are
//     the only contract.
//   – Extending an existing compiler is local — `extend()` does not
//     retroactively teach the original `duckdb` value. Code that
//     imports `duckdb` directly sees only the original kinds.
//     (Approach E is the answer if you want global extension.)
//   – Default `Kinds extends string = string` widens to all-of-string
//     if a generic is dropped — callers must keep types narrow
//     throughout, or the R3 check goes vacuous.
// =============================================================================
