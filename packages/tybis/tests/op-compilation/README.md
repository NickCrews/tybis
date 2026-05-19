# Op-compilation experiments

The [`prd.md`](../../../../docs/op-compilation/prd.md) defines the goals and constraints for tybis's
Op compilation system: the expression problem (R1), op-declares-self (R2), dialect safety
(R3), serialization (R4–R7), tree rewriting and lowering (R8–R10), static
introspection (R11–R12), capability granularity (R13–R14), composition with
existing `DataType` / `DataShape` generics (R15–R16), authoring DX
(R17–R22), and performance (R23–R24).

Each `.ts` file is a single-file test bed exploring one
strategy for satisfying those constraints.
To run: `pnpm --filter tybis exec vitest --run tests/op-compilation`.
`B`/`D`/`E` are demo files with `@ts-expect-error` annotations on lines that should fail, validated at typecheck time.

The hard requirement driving the design space is that **both axes are
open**: 3rd-party packages must be able to define new ops that existing
compilers can compile, define new compilers that compile existing ops,
and a end user must be able to define how to compile a 3rd party Op on a
different 3rd party Compiler.
This is the [expression problem](https://en.wikipedia.org/wiki/Expression_problem).
The Rust analog is the `impl Trait for Type` orphan-rule pattern.