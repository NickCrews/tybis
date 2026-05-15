# Op-typing proposals

[`prd.md`](prd.md) defines the goals and constraints for tybis's op-typing
system: the expression problem (R1), op-declares-self (R2), dialect safety
(R3), serialization (R4–R7), tree rewriting and lowering (R8–R10), static
introspection (R11–R12), capability granularity (R13–R14), composition with
existing `DataType` / `DataShape` generics (R15–R16), authoring DX
(R17–R22), and performance (R23–R24).

Each `.ts` file in the `test-implementations/` directory is a single-file test bed exploring one
strategy for satisfying those constraints. Each is runnable through
`tsc --noEmit --strict` and contains a demo with `@ts-expect-error`
annotations on lines that should fail.

The hard requirement driving the design space is that **both axes are
open**: 3rd-party packages must be able to define new ops that existing
compilers can compile, AND define new compilers that compile existing ops.
This is the [expression problem](https://en.wikipedia.org/wiki/Expression_problem).
The Rust analog is the `impl Trait for Type` orphan-rule pattern; TS's
nearest equivalents are **declaration merging** (Approach E) and
**structural duck typing** (Approaches B, D, F).

## Approaches

| File | Where the kind set lives | How a 3rd party teaches an EXISTING compiler a new op | Best for |
|---|---|---|---|
| [B-kind-set.ts](B-kind-set.ts) | Phantom union on each op class, threaded through child generics | `coreCompiler.extend({ new_kind: handler })` — produces a NEW compiler value | Existing tybis op classes; closest fit to current `BuiltinVOp` generics |
| [D-handler-exhaustiveness.ts](D-handler-exhaustiveness.ts) | Computed at the dispatch boundary via `AllKindsOf<T>` | `{ ...coreCompiler, new_kind: handler }` — new value, same shape | Plain-discriminated-union ops with no class boilerplate |
| [E-open-registry.ts](E-open-registry.ts) | Central `OpRegistry` interface; `AllKindsOf<T>` at the boundary | `declare module 'core' { interface OpRegistry { ... } }` + `coreCompiler.register(...)` — same VALUE everywhere | "I really want the Rust orphan-rule experience" |
| [F-trait-methods.ts](F-trait-methods.ts) | The op object itself has a method per compiler (`toDuckdb()`) | `declare module 'core' { interface Foo extends NewTrait {} }` + `Foo.prototype.toX = ...` | Syntactically closest to Rust traits |

## How each approach fares against the constraints

- **B** is the smallest change to tybis: existing op classes already
  thread phantom generics for `DataType` and `DataShape` (R15), so adding
  a `Kinds` parameter that unions children's kinds is one more dimension
  of the same pattern. Compiler is a handler-dict; extension is `extend`,
  yielding a new compiler value rather than mutating a shared one. Strong
  on R1, R3, R11, R15, R19. Weaker on R5 (the phantom only exists if the
  tree was built in code) and R24 (extension produces new values, but the
  handler-dict closure still references all handlers).

- **D** doesn't touch the op classes — ops stay as plain discriminated
  unions. The check lives at the `compile` boundary via a recursive
  conditional type `AllKindsOf<T>`. Open extension is object spread; new
  compiler values, not global mutations. Light on R17 (no class
  boilerplate) but the boundary check is vacuous when the tree's static
  type widens (a known R3 weakness), and `AllKindsOf` is the kind of
  recursive conditional R23 warns about.

- **E** is the only approach where extending an EXISTING compiler VALUE
  (not building a new one) is possible. Uses TS declaration merging to
  augment a shared `OpRegistry` and per-compiler handler interfaces.
  Closest analog to Rust's `impl Trait for Type`. Best fit for the
  "import a package, the existing compiler now handles new ops"
  ergonomic. Cost: global ambient state, load-order sensitivity, and
  R24 (tree-shaking) friction from the side-effecting `register()` calls.

- **F** is Rust-traits-by-syntax: each op carries a method per compiler.
  Reads cleanly for primitive ops (R18 is trivial — `this` is the op).
  Falls down on composite ops because TS can't easily express "Add is
  compilable to `T` iff both children are" without dragging generic
  bounds through every composite — at which point you're back at B's
  generic-threading.

## Trade-off summary

If the goal is minimum disruption while keeping R3 dialect safety,
R15 type-composition, and R19 exhaustiveness: **B**. The op-class
generic-threading already exists for other axes (`DT`, `DS`); adding
`Kinds` is symmetric, and compilers become handler dictionaries with an
`extend()` operation. 3rd parties can ship their own ops and either
extend a core compiler inline or ship a wrapper that does so.

If the goal is *global* extension — a 3rd-party `import 'duckdb-custom-ops'`
that makes the existing `duckdbCompiler` value handle their ops without
the caller knowing — only **E** delivers that, at the price of declaration
merging discipline and R24 tree-shaking cost.

**D** and **F** are useful as comparison points but have weaker fits:
D's boundary check is vacuous when the tree's static type widens; F's
composite-op story collapses into B's generic-threading anyway.


## Requirement-vs-approach matrix

How the four approaches in this folder score against the
requirements above (✓ = supported well, ~ = partial, ✗ = broken).
Subjective; intended as a starting point for discussion.

| Requirement                | B-kind-set | D-handlers | E-registry | F-trait |
|----------------------------|:---:|:---:|:---:|:---:|
| R1 expression-problem      |  ✓  |  ✓  |  ✓  |  ~  |
| R2 op-declares-self        |  ✓  |  ✓  |  ✓  |  ✗  |
| R3 dialect-safety          |  ✓  |  ✓  |  ✓  |  ~  |
| R4 json-round-trip         |  ✓  |  ✓  |  ✓  |  ✗  |
| R5 typed-deserialization   |  ~  |  ✗  |  ~  |  ✗  |
| R6 wire-stability          |  ~  |  ~  |  ✓  |  ✗  |
| R7 name-collision          |  ✗  |  ✗  |  ✗  |  ~  |
| R8 tree-rewriting          |  ✓  |  ✓  |  ✓  |  ✗  |
| R9 lowering                |  ✓  |  ✓  |  ✓  |  ~  |
| R10 multi-target           |  ✓  |  ✓  |  ✓  |  ~  |
| R11 static-introspection   |  ✓  |  ~  |  ~  |  ✗  |
| R12 lint-rules             |  ✓  |  ~  |  ✓  |  ✗  |
| R13 capability-axes        |  ~  |  ~  |  ~  |  ✗  |
| R14 fallback               |  ~  |  ✓  |  ✓  |  ~  |
| R15 type-composition       |  ✓  |  ✓  |  ✓  |  ~  |
| R16 scope-composition      |  ✓  |  ✓  |  ✓  |  ~  |
| R17 op-boilerplate         |  ~  |  ✓  |  ✓  |  ~  |
| R18 typed-handler-payload  |  ~  |  ~  |  ✓  |  ✓  |
| R19 exhaustiveness         |  ✓  |  ✓  |  ✓  |  ~  |
| R20 error-clarity          |  ~  |  ~  |  ✓  |  ~  |
| R21 op-metadata            |  ~  |  ~  |  ✓  |  ✓  |
| R22 discoverability        |  ✓  |  ~  |  ✓  |  ✗  |
| R23 check-time             |  ✓  |  ~  |  ~  |  ✓  |
| R24 tree-shaking           |  ✓  |  ✓  |  ✗  |  ✓  |