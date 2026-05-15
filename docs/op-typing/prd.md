# PRD: tybis op-typing system

## Context

tybis represents expressions/queries as trees of typed ops (`IVOp` for value-level
operations, `IROp` for relational ones). Each op holds a
`DataType` and `DataShape` both statically *and* at runtime.
A `Compiler` walks an op tree and produces an output:
SQL text for `SqlCompiler` subclasses,
PRQL text for `PrqlCompiler`,
a new op tree for a `LiteralOptimizer`,
eventually in-memory data for an executor.

This document enumerates the constraints and desired properties such a
design must satisfy.
These serve as a north star and guiding document.
Tybis does not yet satisfy all of these properties,
but this serves as a checklist for when we are making changes
to tybis to see how the proposed implementation would align with our goals.

---

## Non-goals

- **Parsing SQL back into ops.** Bidirectional compilation is a
  separate problem; the system here only needs to *emit*.
- **Cross-language runtime.** Ops are TS objects compiled by TS
  compilers. Substrait-style language-agnostic IR is out of scope.
- **Query optimization.** Cost-based optimization and join reordering
  belong above this layer.
- **Schema inference at the SQL boundary.** Schema introspection is
  separate from how ops are typed.

---

## Requirements

Each requirement has a short canonical name (for use in commits,
issues, ADRs, file headers).

### Core extensibility

#### R1. expression-problem

**One-liner.** A 3rd-party package can define new ops AND new
compilers without modifying core, and the four combinations
{core, 3rd-party} × {core, 3rd-party} all compose.

**Examples.**
- An analytics company ships `@acme/tybis-ml` with a `KMeansOp`.
  @acme corp writes the code so that the duckb compiler knows how to compile this op.
  End users feed trees containing `KMeansOp` to the existing core
  `DuckdbCompiler` and it compiles them.
  (extension op, core compiler)
- A startup ships `@beta/tybis-clickhouse` with `ClickhouseCompiler`.
  They write the compile rules for how this compiler handles all the builtin ops.
  End users compile trees containing core `AddOp`/`UpperOp` plus the
  startup's own `ArrayJoinOp` through it.
  (core op, extension compiler)
- A 3rd party solo dev wants to combine both of these.
  They can write the implementation so that the `ClickhouseCompiler`
  knows how to compile the `KMeansOp`.
  (extension op, extension compiler)

**Why it matters.** tybis aims to be a foundation. If extending it
requires patching core, the ecosystem stays thin. The closed-world
op union (`BuiltinVOp`) currently exported is a forcing function — it
is the single biggest barrier to plugins today.

**Prior art.**
- **Ibis (Python)**: closed core op set; user-defined ops require
  registering compile rules in every backend, often via PRs.
- **SQLAlchemy**: the `@compiles(MyOp, 'postgresql')` decorator solves
  this elegantly — per-(op, dialect) registration is open in both
  directions. This is just at runtime though, no static type checking.
- **sqlglot**: dialect plugins add transformations but new op kinds
  generally land in core.
- **Drizzle ORM**: extension is via the `sql\`\`` escape hatch, which
  is untyped — works in practice but gives up the type benefits.

#### R2. op-declares-self

**One-liner.** An op declares *its own identity* (kind, semantics,
data shape). It does NOT declare which compilers can handle it.

**Examples.**
- `class UpperOp { kind = 'upper'; ... }` says what it is, never
  `supports = ['ansi', 'duckdb']`.
- A new `JsonExtractOp` doesn't list compilers in its definition;
  any compiler that wishes to handle it does so on its own side.

**Why it matters.** The op's identity is stable; the set of compilers
that handle it grows over time. If the op named its compilers, every
new compiler would force an edit to every op.

**Prior art.**
- **Ibis**, **SQLAlchemy**, **Calcite**: all agree on this direction.
  Ops are nouns; compilers/visitors are verbs.

#### R3. dialect-safety

**One-liner.** Passing an op tree to a compiler that cannot handle
some op in the tree is a *type* error (and a runtime error).

**Examples.**
- `sqliteCompiler.compile(tree)` where `tree` contains a
  `ArrayLengthOp` produces a TS compile-time error (sqlite doesn't have an array datatype).
- Lint and CI reject the code before it ships.

**Why it matters.** Similar to the core point of ibis, with datatype/schema tracking,
  we want catchable errors caught earlier. This is an even more nuanced sort of bug though:
  most developers know about types and how you can't `"hello" - "world"`.
  But knowing that some ops compile on some backends is a much less well known,
  and is a common issue seen on the ibis issue tracker.

**Prior art.**
- **Drizzle**, **Kysely**: per-driver typing means dialect-only
  features fail to type-check against the wrong driver. Strong.
- **Ibis**: validates only when compiling an op to a backend.
  [No support for introspection](https://github.com/ibis-project/ibis/discussions/11782) to see which ops a backend supports or which backends
  can handle an op, you have to just try compiling and see if you get an error.
  No typecheck time support either then of course.
- **PRQL**: target dialect is chosen at the compiler invocation, so
  dialect mixing is impossible by construction (no first-class op
  user-extension surface, though).

---

### Serialization & wire format

#### R4. json-round-trip

**One-liner.** Any op tree can be serialized to JSON and rehydrated
into an equivalent tree with the same static type guarantees.

**Examples.**
- Frontend constructs a tree with `col('age').gt(18)`,
  `JSON.stringify`s it, posts to backend; backend rehydrates and
  compiles to SQL.
- A saved query is written to a database column as JSONB and
  re-loaded weeks later by a different process.

**Why it matters.** For building and storing user-facing queries.

**Prior art.**
- **Substrait**: standardized JSON/protobuf representation of query
  plans, with explicit cross-engine portability as its raison d'être.
- **Ibis**: has IR pickling, less convenient JSON, no stability
  guarantee across versions.
- **SQLAlchemy**: not serializable at the expression level — methods
  on column objects make this hard.
- **PRQL**: source code IS the wire format.

#### R5. typed-deserialization

**One-liner.** Deserializing JSON should give a tree whose static
type carries the same kind set as if it had been constructed in code.
This is hard in general.

**Examples.**
- `const tree = parseOp(json)` should yield something with
  `tree.__kinds` (or equivalent) inferred as `'add' | 'lit_int'` —
  not `string`.
- A `parseOp<KnownSchema>(json)` helper can enforce the tree only
  contains kinds known to the consumer.

**Why it matters.** Without this, the wire boundary becomes a
type-system hole: every deserialized tree is effectively a
"trust me" cast, defeating R3 dialect safety the moment a tree
crosses a process boundary.

**Prior art.**
- **Zod** in the TS world parses to typed
  values but kind unions across the boundary are usually `any`.
- **Substrait** consumers in typed languages typically code-gen
  per-kind classes from the IDL.
- No system gets this fully right. Realistically tybis would need
  a `parse<Allowed>(json)` that *validates* at runtime against an
  expected kind union; type inference flows from the call site.

#### R6. wire-stability

**One-liner.** Op kinds + shapes form a public, versioned contract.
Breaking changes require a major version bump and a migration path.

**Examples.**
- A query stored as JSON last year still compiles this year, or
  fails with a precise "deprecated since v3.0" error.
- A 3rd-party op published in `@acme/tybis-ml v1.0.0` keeps the same
  wire shape through `v1.x`.

**Why it matters.** R4/R5 only deliver value if the wire shape is
stable. Without R6, stored queries become time bombs.

**Prior art.**
- **Substrait**: explicit version field, schema evolution rules.
- **Ibis**: no IR stability guarantee — pickled IR breaks between
  versions, and it's a known footgun.
- **gRPC / protobuf**: the canonical model — well-understood
  field-number reservation and additive change discipline.

#### R7. name-collision

**One-liner.** Two unrelated 3rd-party packages must be able to ship
without their op-kind strings colliding catastrophically.

**Examples.**
- `@acme/tybis-ml` defines `'cluster_id'`; `@beta/tybis-geo` also
  defines `'cluster_id'`. Both load in the same program.
- A package wants to publish an op for an experimental dialect
  without burning a global name.

**Why it matters.** Op kinds are strings in a global namespace today.
A naive ecosystem collapses to a coordination problem the first time
two libraries pick the same word.

**Prior art.**
- **Calcite**: ops are fully-qualified Java class names — no
  collisions by construction.
- **Ibis**, **sqlglot**: rely on convention; collisions happen and
  are resolved in PRs.
- **CSS-in-JS** ecosystems: classname hashing.
- Likely answer for tybis: scoped kinds like `'@acme/ml/cluster_id'`,
  or symbol-keyed kinds with a string fallback for the wire format.

---

### Beyond compilation

#### R8. tree-rewriting

**One-liner.** Code outside the compiler can take an op tree and
produce another op tree (not a string).

**Examples.**
- Constant folding: `Add(Lit(1), Lit(2))` → `Lit(3)` before any
  compilation.
- Predicate pushdown: `Filter(Filter(t, p1), p2)` → `Filter(t, And(p1, p2))`.
- Column pruning: drop unused columns from the leaf table.

**Why it matters.** Compilers should not be the only consumer of op
trees. Optimization passes, query analyzers, "explain plans",
visualization tools — all need to walk and rewrite trees. A design
that buries the op semantics inside compiler methods locks out these
consumers.

**Prior art.**
- **Calcite**: industrial-strength rewrite-rule engine (`RelOptRule`).
- **Ibis**: pattern-based rewriting via `replace` and `match`.
- **sqlglot**: AST-walker friendly, used for transpilation.
- **SQLAlchemy**: visitor pattern.

#### R9. lowering

**One-liner.** A pass can desugar dialect-specific ops into more
portable ones before a compiler sees them.

**Examples.**
- A `DuckdbListAggOp` is rewritten to `ArrayAgg` + a cast on
  compilers that don't natively support it.
- A `DateDiffOp` lowers to `Sub(Cast(...), Cast(...))` on backends
  that only have arithmetic on epoch seconds.

**Why it matters.** R3 (dialect safety) tells you when an op doesn't
fit. R9 is the escape hatch: rather than reject, *transform*. This
lets one logical query target many engines with one source of truth.

**Prior art.**
- **PRQL**: explicit normalization stage between parse and SQL emit.
- **Ibis**: backend-specific rewrite phases (`compiler.rewrites`).
- **Calcite**: lowering is the core idea of its planner.

#### R10. multi-target

**One-liner.** One op tree compiles to multiple output forms (SQL
dialects, PRQL, in-memory exec) via different compilers — without
modifying the tree.

**Examples.**
- Same `Relation` instance compiled to `duckdbCompiler` for execution
  and `prqlCompiler` for display in the playground.
- An in-browser executor runs the same tree against a tiny dataset
  for preview while the backend runs it against the real warehouse.

**Why it matters.** tybis already does this (SqlCompiler subclasses
+ PrqlCompiler). The op typing must not assume a single target;
"this tree is compatible with these targets" needs to be a
multi-valued type, not a single tag.

**Prior art.**
- **Ibis**: 20+ backends from one tree.
- **PRQL**: compiles to 8+ SQL dialects.
- **sqlglot**: transpiles between dialects.
- **Drizzle**: target chosen at db client; same query API.

#### R11. static-introspection

**One-liner.** "What kinds does this tree use?" is answerable from
the static type alone, without running anything.

**Examples.**
- `type UsedKinds = AllKindsOf<typeof tree>` is a usable, readable union.
- A custom lint rule reads tree types to enforce policy at PR review.

**Why it matters.** Enables governance (lint), refactoring tools,
documentation generation, and reasoning about which ops a query
depends on without executing.

**Prior art.**
- Most query systems: runtime walkers only.
- **Drizzle / Kysely**: rich return-type inference but the *contents*
  of a query are not enumerable at the type level.

#### R12. lint-rules

**One-liner.** Codebase-wide rules like "no dialect-specific ops in
shared modules" can be enforced statically.

**Examples.**
- A module annotated `/** @cross-dialect */` is allowed to use only
  the portable kind set.
- CI rejects `duckdb_*` ops appearing in code paths flagged for
  Postgres deployment.

**Why it matters.** Especially in mono-repos where one team picks
DuckDB for dev and another deploys to Postgres: catching the bug
once, at lint time, beats catching it ten times in runtime errors.

**Prior art.**
- **ESLint custom rules**: can check AST patterns, weak on
  type-level info.
- **Drizzle / Kysely**: rely on driver-specific types to enforce
  this — the only way to express it without a separate lint layer.

---

### Capability granularity

#### R13. capability-axes

**One-liner.** Compatibility is not just "dialect" — version,
extensions, determinism, cost, and ANSI conformance are separate
axes that the type system should be able to model.

**Examples.**
- `JsonbExtractOp` requires Postgres ≥ 12.
- `PgTrgmSimilarityOp` requires the `pg_trgm` extension loaded.
- `RandomOp` is non-deterministic — banned in materialized views.
- `RegexpOp` is expensive — flag for cost-based planning.

**Why it matters.** A one-dimensional dialect tag cannot express any
of these. Real-world SQL compatibility is multi-dimensional.

**Prior art.**
- **Ibis**: backend capability flags (`backend.supports('window')`).
- **sqlglot**: dialect feature flags.
- **Calcite**: rich `SqlFeature` enumeration.
- **DuckDB**: extension capability checks at runtime.

#### R14. fallback

**One-liner.** The same op can have multiple per-(dialect, version)
implementations; the compiler picks the best available.

**Examples.**
- `MedianOp` compiles to `median(x)` on DuckDB, but to a
  `percentile_cont(0.5)` window expression on Postgres, and to a
  manual `ROW_NUMBER` trick on engines without either.
- `StringConcatOp` chooses `||`, `concat()`, or `+` based on dialect.

**Why it matters.** Without fallback, every minor SQL-flavor
difference forces a new op kind, which blows up R1 (extensibility)
and forces consumers to know low-level dialect specifics.

**Prior art.**
- **Ibis**: per-backend overrides for shared ops (the whole point).
- **PRQL**: dialect-specific emit rules for common abstractions.
- **sqlglot**: transformations parameterized by dialect.

---

### Composition with existing tybis typing

#### R15. type-composition

**One-liner.** Op-kind tracking must coexist cleanly with the
existing `DataType` and `DataShape` generics on every op (which are
both static parameters and runtime fields).

**Examples.**
- `AddOp<DS1, DS2, DT1, DT2>` already threads four type params.
  Adding a fifth `Kinds` parameter cannot make signatures
  unmanageable.
- `Add(stringExpr, intExpr)` still fails at the `DataType` level,
  independent of dialect.

**Why it matters.** This system is being added to a codebase, not
designed in a vacuum. Approaches that demand a parallel hierarchy
double the surface area; approaches that thread one more generic
compose well with what is already there.

**Prior art.**
- **Drizzle / Kysely / Effect SQL**: deep phantom-generic stacking
  is the TS-ecosystem norm. The pain points (hover-readability,
  inference depth) are well-known.

#### R16. scope-composition

**One-liner.** Existing per-op scope constraints (aggregations only
in `group`, scalar-vs-columnar, schema visibility through derive
shadowing) must keep working.

**Examples.**
- `SumOp` is scalar-only; the planner already errors when used
  outside an aggregate context. Dialect typing should not break this.
- `col('x').sum()` retains its `dshape='scalar'` regardless of which
  compiler ultimately processes it.

**Why it matters.** R3 (dialect safety) is one constraint. There are
several more orthogonal ones already in the codebase. The new layer
must add, not replace.

**Prior art.**
- Same as R15.

---

### Authoring DX

#### R17. op-boilerplate

**One-liner.** Defining a new op stays cheap — single-digit lines for
a typical op, comparable to today.

**Examples.**
- Today: `class UpperOp extends BaseOp<DTString, DS> { kind = 'upper' as const; constructor(operand) {…} }` — ~3 meaningful lines.
- The new system should not push this past ~5 lines for the common case.

**Why it matters.** Friction at the op-definition site multiplies
across hundreds of ops. Approaches that demand a phantom parameter
per child generic start to bite here.

**Prior art.**
- **SQLAlchemy**: heavy (subclass + separate `@compiles`).
- **Ibis**: medium (rich type signatures).
- **Drizzle / Kysely escape hatches**: very light, untyped.
- The sweet spot is probably "Ibis-level".

#### R18. typed-handler-payload

**One-liner.** Handler bodies see the concrete op shape with no
casts: `op.value`, `op.left`, etc., are typed.

**Examples.**
- `lit_int: (op) => String(op.value)` — `op.value` is `number`, not
  `unknown`.
- `add: (op, rec) => f\`(${rec(op.left)} + ${rec(op.right)})\`` —
  `op.left` is a typed sub-op.

**Why it matters.** A compiler is a wall of handler bodies. Casts at
every entry are tedious and error-prone.

**Prior art.**
- **SQLAlchemy**: handler receives a typed expression node.
- **Ibis**: same.
- **Visitor patterns generally**: yes.

#### R19. exhaustiveness

**One-liner.** "You forgot a handler for kind `foo`" is a single,
clear error at the compiler's *definition*, not at the call site.

**Examples.**
- Removing `upper` from a `Compiler<Kinds>` produces an error on the
  handler-record literal: `Property 'upper' is missing`.
- Adding a new core op surfaces the gap in every dialect compiler
  via a single error per compiler.

**Why it matters.** Compiler authors get a checklist for free.
Adding an op to core becomes a one-line change that surfaces every
downstream compiler that hasn't updated.

**Prior art.**
- **Rust match-exhaustiveness on enums**: the gold standard.
- **TS discriminated unions**: works on closed unions. The
  difficulty here is keeping the union open (R1) while still
  delivering this.

#### R20. error-clarity

**One-liner.** When the type checker rejects a (tree, compiler)
pair, the message names the offending kind(s) in plain English.

**Examples.**
- Good: `Compiler 'PostgresCompiler' is missing handler(s) for: 'duckdb_hash'`.
- Bad: `Type 'IVOp<'duckdb_hash' | 'lit_int'>' is not assignable to parameter of type 'IVOp<never>'`.

**Why it matters.** TS error messages on deep generics are
notoriously unreadable. Designs that fail with helpful template-string
errors (e.g. `\`missing duckdb impl for: ${...}\``) are far better
ergonomically than ones that fail with raw assignability mismatches.

**Prior art.**
- **Drizzle / Kysely**: cited often as having opaque errors on
  complex queries.
- **Effect**: invests heavily in `@ts-message`-style error tags.

#### R21. op-metadata

**One-liner.** An op definition has a natural place to attach human-
or machine-readable metadata: description, since-version,
deprecation, examples, references.

**Examples.**
- Hover over `DuckdbHashOp` in the playground shows: "Added in
  duckdb-tybis v1.2. SHA-256 hash. See duckdb docs at …".
- A docs generator reads metadata to build the op reference.

**Why it matters.** A growing op ecosystem needs documentation
infrastructure. If metadata has to live in a separate place from the
op definition, it rots.

**Prior art.**
- **Ibis**: docstrings on op classes.
- **Calcite**: rich operator metadata.
- **GraphQL SDL**: directives on types/fields.

#### R22. discoverability

**One-liner.** "What ops does this compiler support?" is answerable
at both runtime (introspection) and at the type level.

**Examples.**
- `duckdbCompiler.supports('json_extract')` → `boolean`.
- A `KindsHandledBy<typeof duckdbCompiler>` type alias exposes the
  full set as a union.

**Why it matters.** Tooling (playground UI showing available
operations per backend, fallback selection for R14, lint rules for
R12) all want to ask this question.

**Prior art.**
- **Ibis**: `backend.supports(op_type)`.
- **sqlglot**: `dialect.has_feature(...)`.

---

### Performance

#### R23. check-time

**One-liner.** Type-checking realistic tybis queries stays under a
budget — a few hundred milliseconds for a non-trivial query, single-
digit seconds for whole-repo `tsc`.

**Examples.**
- A 50-deep op tree (joins of joins of derives) does not produce
  `Type instantiation is excessively deep and possibly infinite`.
- A monorepo importing tybis does not double its CI typecheck time.

**Why it matters.** Drizzle and Kysely are known to slow large
codebases substantially; tybis can avoid that fate by knowing about
it up front. Recursive conditional types like `AllKindsOf` have a
known TS depth cap and need to be designed within it.

**Prior art.**
- **Drizzle / Kysely**: cautionary tales.
- **Effect**: pays serious attention to type-check cost.

#### R24. tree-shaking

**One-liner.** Handlers and ops a consumer never uses do not ship
in the final bundle.

**Examples.**
- A web-only tybis user who never imports the Postgres compiler does
  not pay for its handlers in their bundle.
- A consumer using only 10 of 80 core ops can tree-shake the rest.

**Why it matters.** tybis is positioned to run on the frontend (the
playground exists, the docstrings promise it). Bundle size matters
there. Designs that wire everything together at module load via
`register()` side effects defeat tree-shaking.

**Prior art.**
- **Drizzle**: explicitly designed for ESM tree-shaking.
- **Kysely**: same.
- **Ibis**: irrelevant (Python).

---

## Open questions

- **Are R5 (typed-deserialization) and R7 (name-collision) hard
  enough to demand a kind-namespace mechanism (e.g. symbol-keyed kinds
  with a wire-format string fallback) before anything else is built?**
- **Does R13 (capability-axes) belong in this system, or as a
  separate orthogonal layer?** Modeling it inside the same kind union
  bloats the union; modeling it outside risks the two layers
  drifting.
- **What is the minimum-viable subset?** A staged delivery — R1, R2,
  R3, R4 first; R7, R9, R13 later — may be more pragmatic than
  designing for everything at once.
