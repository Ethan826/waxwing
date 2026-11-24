# Waxwing charter

Approved by the author, 2026-10-24. This charter guides language, library,
runtime and tooling decisions. It changes no specific language rule and
authorizes no implementation or proof. The companion [adoption record][adoption]
contains concrete decision examples and records how the charter is used.

## Purpose and audience

Waxwing aims to bring Effect's practical business programming and its
use of functional theory into a language with the expressive joy of
Haskell and PureScript. Requirements and failures should compose through
ordinary language constructs. Application programmers should be able to
write the business operation directly, without generator ceremony or
assembling a different layer of wrappers for each combination of
dependencies.

An experienced TypeScript/Effect programmer should be able to become
productive without first becoming a Haskell expert. Experienced functional
programmers should find coherent abstractions, including the ability to
write useful libraries of their own. Library authors may accept more
ceremony to keep application code direct and the language small.
Rust-like pragmatics include typed results, exhaustive matching, useful
diagnostics and dependable tooling, with approachable Algol-like syntax.

## Lineage

Effect is the practical center of gravity: services, typed failures,
resource management and an integrated application platform. Its
[Layers][layers] and [Platform][platform] are precedents for separating
requirements from the implementations supplied at application assembly.
Waxwing seeks that experience with native support for effects, nominal
types and higher-kinded abstraction, reducing the need for library
encodings of those facilities in TypeScript.
This is a design ambition, not a claim that Waxwing already matches Effect.

Haskell, PureScript and libraries such as `fp-ts` supply another kind of
pleasure: ordinary functions, algebraic data types, `traverse`, `Reader`
and reusable abstractions. Native support should let programmers use
these ideas without having to encode higher-kinded polymorphism through
module augmentation or simulate every domain identity with a brand.

Row polymorphism is a bridge between that functional style and the
structural flexibility the author values in TypeScript. A function can
require part of a record while preserving the rest, and requirements can
compose without a new nominal environment for every combination. Record
rows and effect rows have different meanings and need separate rules.
The design must establish their interaction and inference properties;
row polymorphism alone does not establish structural subtyping.

[Koka][koka], [Unison][unison] and [Effekt][effekt] extend this lineage with
language-level effects and handlers. They inform the ambition to describe
behavior more precisely than a catch-all `IO`: dependencies, expected
failure, external interaction, state and divergence raise different
questions. Their meanings and guarantees differ. Waxwing must define its
own promises, including what `pure` excludes, before claiming them.
Borrowing a mechanism does not transfer another language's theorems.

## Principles

### C1. Let code follow the business problem

A business operation should read in terms of the capabilities it needs,
the values it transforms and the failures it can produce. Routine
composition should preserve those facts. Keep database representation,
host-library setup and transport-specific error codes at their respective
boundaries.

### C2. Make dependencies and failures compose

Follow Effect's construction/use distinction. A provider such as
`DatabaseLive` may need `Config` and `Logger` to be constructed. Its
consumers require `Database`; they do not inherit those private
construction requirements. Construction requirements and failures belong
to construction, not to each operation. Operation failures belong to the
operations that can produce them.

Requirements percolate upward until a composition boundary supplies them.
An application's lower-level components cannot name the higher-level
components that assemble them. A handler's own failures remain visible
until handled in turn. Supplying a capability does not establish that its
implementation has no effects.

### C3. Keep the language small and libraries capable

Prefer general language primitives and ordinary libraries. Accept some
library ceremony when it preserves the guarantees and avoids a special
language feature. Deeper compiler or plugin support needs a demonstrated
limitation of library code, a specification of the addition's guarantees,
evidence appropriate to its scope (C8), and an explanation of why a more
general primitive would not suffice. This selects no extension API.

A theoretically grounded saga library may be useful. Its mathematical
foundation alone does not justify special saga syntax or a built-in
workflow engine. Libraries carry convenient application features.

Built-ins follow the same syntax and naming rules as user declarations,
as recorded in the [effect-namespaces design][builtins]. Any temporary
departure needs its own explicit approval and recorded follow-up; this
charter supplies no general exemption.

### C4. Give libraries a platform they can compose against

Provide an officially supported platform of capability contracts and
composition conventions, with replaceable implementations. Effect
Platform and OpenTelemetry's separation of [API and SDK][otel] are useful
precedents. Application assembly chooses providers; dependencies should
not select concrete providers for their consumers behind their backs.

A foreign-library wrapper can fulfill a platform contract by implementing
its interface. Direct foreign integration remains available. Interface
checking establishes conformance to declared types. Behavioral laws and
the correctness of a foreign implementation remain separate obligations.
The platform is not a library approval system. Distinguish compiler
targets from host capabilities, and report unsupported combinations.

### C5. Put runtime concerns at the runtime boundary

The runtime implements execution context, task relationships and scope
according to language-defined semantics. Expose supported facilities for
propagation and instrumentation so libraries can build on them.
Replaceable providers can supply logging, tracing and metrics, with
OpenTelemetry a candidate default.

Make configuration and provider selection inspectable. Imports or naming
conventions should not silently install runtime providers or interceptors.
Context propagation should avoid passing tracing identifiers through
every application call. Whether propagated context is visible in effect
rows remains a separate design question.

### C6. Reuse structure while preserving meaning

Schemas should support parsing into domain values and useful additional
interpretations, such as valid test data. The same structure should be
available to ordinary libraries. Schemata-TS's Schemable approach is an
influence; the [schema direction][schema] keeps its representation open.

Construct values so their representation preserves the intended invariant,
as described in [Types as axioms][axioms]. Keep wire, domain and storage
meanings distinct when they differ. Mechanical casing conversions can be
convenient; timezone meaning, information loss and domain failure
translation require explicit choices.

### C7. Make trust boundaries inspectable

Allow safe interfaces over explicitly marked unchecked implementations,
following [Rust's approach][rust]. The marking mechanism needs a separate
design. A library can discharge an obligation internally; any obligation
it leaves to the caller remains part of the caller's contract. Unchecked
assertions must not silently erase guarantees.

Make implementation trust assumptions discoverable without forcing every
caller to repeat the wrapper's machinery. Distinguish enforced guarantees,
unchecked implementation obligations and behavioral laws. Interface
checking establishes conformance to declared types. State when compiler
correctness relies on a behavioral law. Future audit tooling could show
which dependencies introduce unchecked boundaries. An audit cannot certify
their correctness or detect every dishonest foreign declaration.

### C8. Use theory to solve concrete programming problems

Start with a recurring problem and seek published foundations. State what
composition preserves, which assumptions it needs and what an
implementation must do. Departures from published sources follow
[ADR 014][novelty]: demonstrate the need, offer the textbook alternative
and its cost, provide a clear argument and reproducible evidence, and
obtain the author's explicit approval. New correctness claims need
reviewed statements and evidence appropriate to their scope.

Transactions, sagas and durable workflows are related research subjects.
Atomic commitment, compensation and crash recovery are different
contracts. An exactly-once claim must name what happens once and across
which boundary. Library implementations remain the default; stronger
integration needs the justification in C3.

Label what is proved, argued, tested, proposed or unresolved. A theorem
about a research model does not establish source inference, the shipped
checker or backend correctness. Explain the assumptions and limits of
whatever evidence supports a guarantee.

## Scope and existing decisions

This charter describes the intended experience. Existing limitations
remain visible in the [README][readme] and milestone records. It does not
adopt a design for strict purity, unchecked boundaries, concurrency,
schema derivation, workflows or audit tooling. Each needs its own scoped
decisions.

[ADR 015][backends] retains JavaScript as the first-priority production
backend, LLVM next, and Go as a development convenience. An implementation
choice in a backend must not quietly determine language semantics.

The charter guides future designs. The author's latest
explicit answers govern within their stated scope; record which earlier
direction they supersede. If applying a newer answer would substantially
unsettle guarantees, compatibility or architecture, explain the consequence
and seek a ruling before making that change. Otherwise, preserve existing
specifications where the author has not changed them. A statement of
intent does not authorize implementation or proof work.

[adoption]: plans/2026-10-24-charter-adoption.md
[layers]: https://effect.website/docs/v4/requirements-management/layers
[platform]: https://effect.website/docs/v4/platform/introduction
[koka]: https://koka-lang.github.io/koka/doc/book.html
[unison]: https://www.unison-lang.org/docs/fundamentals/abilities/
[effekt]: https://se.cs.uni-tuebingen.de/publications/brachthaeuser20effekt.pdf
[otel]: https://opentelemetry.io/docs/concepts/components/
[axioms]:
  https://lexi-lambda.github.io/blog/2020/08/13/types-as-axioms-or-playing-god-with-static-types/
[rust]: https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html
[backends]: adr/015-backend-priorities-and-service-bindings.md
[readme]: ../README.md
[schema]: plans/2026-10-10-schema-direction.md
[novelty]: adr/014-composition-not-invention.md
[builtins]: plans/2026-10-13-effect-namespaces-design.md
