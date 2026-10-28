# Self-hosting roadmap and reproducible seed

The PureScript compiler is the bootstrap seed. A self-hosted compiler
will be written in Waxwing and built using that seed. This roadmap keeps
the existing Go route and adds readiness criteria from the
[2026-10-27 source survey](plans/2026-10-27-self-hosting-readiness.md).
The new criteria are proposed for review; they authorize no implementation
and change no current R0 milestone or budget.

## Backend and bootstrap stages

The existing Go backend can support self-hosting. LLVM and a Waxwing
JavaScript backend are not prerequisites. This preserves
[ADR 015](adr/015-backend-priorities-and-service-bindings.md): JavaScript
is the first production-backend priority, LLVM follows, and Go remains
available for development and bootstrapping.

The implementation language, execution host and output target are
separate choices. PureScript compiles the seed compiler to JavaScript,
which Node runs. That compiler emits Go for the Waxwing-written compiler.
The Go toolchain builds the emitted source into a native executable.
Standard Go builds do not require LLVM; the Go runtime supplies execution
services rather than serving as a compiler intermediate representation.

- Stage 0: the current PureScript compiler emits Go from Waxwing source.
- Stage 1: Stage 0 compiles the Waxwing-written compiler into Go; the
  Go toolchain builds it into a native executable.
- Stage 2: Stage 1 compiles that same Waxwing compiler source into Go.
- Stage 3: Stage 2 compiles the same source again.

Each stage that emits a compiler must also be built before it can run as the
next stage. The self-hosted compiler may keep emitting Go under ADR 015 while
additional backends are developed. Any Go retirement needs a separate decision
that addresses the reproducible bootstrap route and retained seeds. A
replacement seed before retirement is proposed for the author to decide. The
compiler need not compile Go into LLVM.

## Readiness for the port

Parity covers the facilities the compiler relies on, their behavior and
static protections. Equivalent syntax is sufficient where it preserves
those contracts. Each library dependency needs an API-level inventory;
a feature being expressible does not establish that its library exists.

The survey maps observed use to existing work: P001/FN001 and records;
K001/C001 for generic abstractions; M001 for modules and abstract types;
R008 for aliases; D001/STD001 for collections and text; I001 for the host
boundary; and AS001 for assurance. Its candidate findings also cover
higher-rank scope isolation and stack-safe traversal. The survey records
open choices; it does not adopt them by linking to this roadmap.

Before the full compiler port, demonstrate small representative slices:

- ADTs, generic functions, records, aliases, closures and recursive
  helpers with the inference needed by the chosen port.
- Modules and opaque constructors, including the compiler's trusted
  construction and import/export restrictions.
- The scope-safe generation interface: rigid scope parameters, escape
  checking and protection against scope-changing coercion, preserving
  the existing distinction between applicative reads and monadic writes.
- Collections, ordered iteration and text operations at realistic sizes,
  preserving source offset, Unicode and arithmetic conventions.
- Stack-safe parser/type walks and higher-order traversal. Define and
  test the chosen tail-call guarantee, including effects and cleanup.
- Arguments, source-file reading, output, exit status and subprocess
  build/run through explicit host capabilities with typed failures.

Select a stable compiler path to port. The survey includes legacy and
shadow paths; it does not require maintaining two Waxwing ports. Any
change to an existing assurance boundary needs its own justification.

## Libraries and performance

Use published structures and algorithms. Rust's collection APIs and
iterator adapters, and Clojure's persistent collections and transient
builders, are precedents to evaluate. They do not select an implementation
or import another language's ownership, mutation or evaluation semantics.
Keep collection representation, traversal, builder lifetime and callback
effects separate in their specifications. Name complexity expectations
and measure time, allocation and stack behavior on supported backends.

Higher-rank polymorphism can express the existing rank-2 seal interface;
it does not supply constructor privacy, coercion safety, ownership,
iterator fusion or effect soundness. Proper tail calls cover tail calls;
non-tail traversals still need stack-safe implementations. Preserve
pending cleanup and handler behavior in any tail-call lowering. Go
does not promise tail-call elimination; JavaScript engines differ. A
Waxwing guarantee must come from its lowering on each supported backend,
using loops, trampolines or another justified mechanism with measured
costs. This selects no lowering mechanism.

## Stage comparison and retained seeds

Compare canonical generated-Go bytes for Stage 1 -> Stage 2 -> Stage 3
with identical inputs, options, ABI and specialization ordering. Run the
same positive executable suite, diagnostic/rejection suite,
property/reference suite and regression witnesses against every stage.
Record compiler/input hashes and toolchain versions. Equal Go is useful
convergence evidence; it is not proof of correctness or independence of
shared defects.

Preserve Stage 0 sources, locks, grammar, tests and reproducible build
instructions permanently. bootstrap/answer.go is a checked example
snapshot, not a compiler bootstrap snapshot. Once Stage 1 exists, preserve
its canonical compiler-generated Go, checksums and Go build instructions
as a second seed. Rebuilding that snapshot must not require an existing
Waxwing binary.

Port small scanner/parser components before the full compiler and compare
them with Stage 0. Keep Stage 0 as a behavioral/rejection reference while
the new implementation grows. Port the architecture checks and test
adapters alongside the compiler; JavaScript constructor-shape tests do
not transfer unchanged to a native executable.

The existing Lean results retain their stated model and assumptions.
Self-hosting and stage convergence establish no new refinement or
compiler-correctness theorem.
