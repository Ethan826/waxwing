<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)"
            srcset="assets/branding/waxwing-logo-dark.png">
    <img src="assets/branding/waxwing-logo-white.png" alt="Waxwing bird logo"
         width="240">
  </picture>
</p>

# Waxwing

Waxwing is an experimental functional language that compiles to Go. The aim is a
stable release that people can use for real applications. The compiler is
written in PureScript and is not yet self-hosted.

The language is built around two ideas:

- **[Algebraic effects][effects] track dependencies and typed failures.**
  A function calls the operations it needs; handlers supply implementations.
  Its effect row records the dependencies and error families the caller
  must account for.
- **[Row-polymorphic records][rows] specify required fields without fixing
  the whole record.** A function can accept a larger record and preserve
  its extra fields. Those fields can hold data or functions implementing
  an interface.

The hypothesis is that these two features can make dependencies and errors
compose without requiring programmers to assemble an environment type, error
union, or transformer stack for every combination.

Today a named function has to list its effects and error families. Calling
another service can mean updating that list in every caller. Planned inference
would do that bookkeeping, including errors from constructing services as well
as calling them. Programmers could still write signatures to limit what a
function is allowed to do.

## Type system at a glance

Implemented features include rank-1 generic functions and ADTs, structural
record rows, algebraic effects, handlers and typed failure families. Named
functions have explicit signatures; local bindings are not generalized.
Higher-kinded types (HKTs), type classes and inferred signatures for named
functions remain planned. The [language specification](docs/language.md)
records the exact rules and current restrictions.

| Capability | What it gives you | Foundation and current evidence |
|---|---|---|
| Rank-1 polymorphism | A definition works for every type its signature permits; each use is checked independently. | Hindley–Milner-style unification; Jones's [Typing Haskell in Haskell][thih] is a semantic reference. Compiler tests cover instantiation, occurs checks and specialization restrictions. |
| Closed ADTs and exhaustive patterns | Parameterized data, nested matches, missing-case witnesses and redundant-arm errors. | [Maranget's usefulness algorithm][maranget], extended to account for types with no possible values; checked against an independent brute-force oracle. |
| Structural record rows | Ask for a few fields, preserve the rest, add fresh fields and remove named fields. | PureScript-style rows and lacks constraints; [ADR 013](docs/adr/013-records.md) records Waxwing's unique-label rules and adaptations. Compiler tests and interpreter/Go comparisons cover implemented operations. |
| Effect rows and handlers | Dependencies and typed failures appear in function types; handlers discharge them. | [Koka's row-polymorphic effects][koka-paper] and scoped-label matching. Waxwing's failure-family keys, cleanup marks and handler restrictions are local design; they are tested, not covered by the record proofs below. |
| Disjoint record composition | Combine independent pieces without silent overwrites; infer a field's location when the constraints force it. | Foundation research: a Lean-checked constraint decider and signature soundness result, described below. The replacement foundation is not integrated into the compiler. |
| Explicit instance selection | Choose or construct different lawful operations for the same type without mandatory newtype wrappers. | Planned class/module design, informed by `fp-ts` dictionaries and Haskell/PureScript; [direction note](docs/plans/2026-10-10-modules-and-instance-selection-direction.md). Ordinary records of functions already work. |

Rust informs practical language and API choices; ownership, borrowing and
Rust's trait system are outside the current design. The
[source index][cs-sources] distinguishes published rules,
reference-compiler behavior, local adaptations and unresolved obligations.

## Dependencies as effects

An effect declares operations. A function names the effects it uses, and a
handler supplies their implementations:

```rust
effect Prices { fn price(id: Int): Int; };

fn total(first: Int, second: Int): Int with Prices =
  Prices.price(first) + Prices.price(second);

fn fixedPrices(amount: Int): Handler(Prices with pure) =
  handler Prices { price(id) => amount };

fn main(): Unit with Console =
  with fixedPrices(20) {
    Console.print(total(1, 2))
  };
```

This prints `40`. Replacing `fixedPrices(20)` changes the implementation used by
`total`. The Prices requirement is in its signature; supplying the handler at
the call site avoids passing it through `total`'s arguments.

`main` may leave only Console unhandled. Removing `with fixedPrices(20)` and
leaving its body produces `Unhandled Prices in main`, with source locations
tracing the requirement back to `Prices.price`.

Operations have qualified names: two effects can both declare `get`. A signature
can import an operation for its body, as in `with Prices { price }`, or alias
its effect with `with Prices as P`. Parameters and local bindings shadow
imports; imports shadow global functions. Resolution does not try an outer
binding when the inner one has an incompatible type.

The [services example](examples/services.wxw) combines a database, clock, and
logger, with fakes installed by the tests. Those handlers return fixed values.
Connecting them to external services needs planned typed FFI bindings.
The intended adapter model lets a Waxwing service contract be fulfilled by
host libraries or fakes. A Logger could use Pino, Winston, or a browser
implementation without changing application code that uses Logger. The
binding and service-assembly rules still need design.

## Records

```rust
fn older(p: { age: Int, ...r }): { age: Int, ...r } =
  p { age = p.age + 1 };

fn label(p: { name: Text, ...r }): Text = "${p.name}!";

fn main(): Unit with Console = {
  let ada = { name: "Ada", age: 36, id: 7 };
  Console.print(older(ada));
  Console.print(label(ada))
};
```

This prints:

```text
{ age: 37, id: 7, name: "Ada" }
Ada!
```

`...r` is the [row-polymorphic][rows] part of the type: `r` stands for the other
fields, whatever they are. `older` accepts any record with an Int `age`. Since
its result contains the same `...r`, it preserves those other fields and their
types. `label` needs only `name`, so both functions can accept `ada` without
converting it to a different record type.

That gives a function a narrow requirement while letting callers supply wider
records. It does not discard fields or cast a value to a smaller type. An update
cannot add fields or change their types. Extension uses a spread such as
`{ ...p, reviewed: true }`, with `where r lacks { reviewed }` when `p`
has type `{ ...r }`. Removal uses `p without { name, age }`; record patterns
can bind the remainder with `{ name, ...rest }`. These operations and
written lacks constraints are implemented. Overlapping fields are errors.

Merging several open rows is under active foundation work. The current
implementation is incomplete; the [acceptance programs][composition-programs]
state the intended behavior. The Lean research model establishes the
constraint results described under "Record composition" below.

Records retain checked field types, but they do not have the distinct identity
of [nominal types][nominal]. Two records with the same labels and field types
are the same type, regardless of label order. When two values with the same
representation must remain different types, use an ADT wrapper.

### Records of functions

A record of functions is a small explicit interface. Code calls the functions in
the record; constructing a different record supplies a different implementation:

```rust
fn sumPrices(prices: { price: Int -> Int with pure, ...r },
    first: Int, second: Int): Int with pure =
  prices.price(first) + prices.price(second);

fn main(): Int = {
  let prices = { price: fn(id: Int) => 20, label: "fixed" };
  sumPrices(prices, 1, 2)
};
```

This prints `40`. The extra `label` field is preserved in the record but is not
required by `sumPrices`. The functions are called directly; there is no instance
search or encoded program for an interpreter to execute. Haskell's
[records-of-functions approach][function-records] uses this kind of explicit
interface. It is useful on its own, before reaching for type classes or
free/freer monads.

Waxwing also has handlers, which supply operations through an effect row instead
of an explicit record argument. The conventions for using both in service
environments still need design.

## Typed failures and cleanup

```rust
type Error = NotFound(Int) | Forbidden;

effect Accounts { fn balance(id: Int): Int; };

fn checked(id: Int): Int with Accounts + Fail(Error) =
  if id < 0 then Fail.fail(Forbidden) else Accounts.balance(id);

fn total(a: Int, b: Int): Int with Accounts + Fail(Error) =
  checked(a) + checked(b);

fn main(): Unit with Console = {
  let accounts = handler Accounts { balance(id) => id + 100 };
  with accounts {
    Console.print(handle total(1, 2) { fail(error: Error) => -1 });
    Console.print(handle total(1, -2) { fail(error: Error) => -1 })
  }
};
```

This prints `203`, then `-1`. `handle` catches the Error family, so callers of
this handled computation no longer need to account for `Fail(Error)`. It narrows
the remaining error requirements: other families stay in the row, along with
effects and failures introduced by recovery code. The `Error` data type itself
is unchanged. If recovery raises Error again, `Fail(Error)` remains a
requirement.

`defer` registers cleanup on normal return, typed failure, and recoverable
defects. Effect operations used in cleanup must be known not to raise typed
failures: `defer Log.log(id)` requires `nofail Log` in the signature.
`crash(value)` raises a defect and unwinds pending cleanup before reporting it
on stderr and exiting 1. Diverging cleanup and Go fatal errors can prevent
unwinding from completing.

## Data, functions, and Text

[Algebraic data types][adts] (ADTs) define alternatives such as `Nothing`
or `Just(value)`. Matches must cover every alternative, and patterns can nest.
Generic type variables are implicit in signatures. Here is a list and a function
returning its last element:

```rust
type List(a) = Nil | Cons(a, List(a));
type Maybe(a) = Nothing | Just(a);

fn last(xs: List(a)): Maybe(a) = match xs {
  Nil => Nothing,
  Cons(x, Nil) => Just(x),
  Cons(_, rest) => last(rest),
};
```

Functions are values, with lambdas, closures, and partial application. The `|>`
operator passes its left operand to the function on the right. This excerpt uses
helpers from [examples/functions.wxw](examples/functions.wxw):

```rust
fn compose(f: b -> c, g: a -> b): a -> c = fn(x) => f(g(x));

fn main(): Int =
  upTo(5)
    |> filter(fn(x) => x > 2)
    |> map(compose(add(1), double))
    |> foldLeft(add, 0);
```

`add(1)` supplies the first argument and returns a function awaiting the second.
Function application order is specified in
[ADR 008](docs/adr/008-functions.md).

Text supports Unicode literals, interpolation, concatenation with `++`, raw
delimiters, and multiline blocks:

```rust
fn letter(name: Text, id: Int): Text = """
    Dear ${name},
      your id is ${show(id)}.
    """;

fn main(): Unit with Console = {
  Console.print(letter("Ada", 1));
  Console.print(#"C:\users\${name}\notes"#)
};
```

This prints:

```text
Dear Ada,
  your id is 1.
C:\users\${name}\notes
```

Interpolation accepts Text; `show` formats other printable values as Text.
`show` adds no newline. Console.print adds one. Text prints raw on its own and
quoted and escaped inside an ADT or record. The full
[text example](examples/text.wxw) also shows concatenation and comparison.

### Equality, ordering, and printing

Waxwing currently provides these operations in the compiler. There are no
[type classes][classes] or user-defined instances yet:

- **Equality (`==`, `!=`)** compares corresponding values recursively.
  Records must have equal values in every field. ADTs must have the same
  constructor and equal fields. A record or ADT is comparable only if all
  of its component types are comparable.
- **Ordering (`<`, `<=`, `>`, `>=`)** uses that same recursive structure.
  ADTs compare constructor positions first, then fields from left to
  right. Records compare field values in sorted label order. The first
  unequal component decides the result. Text compares lexicographically
  by Unicode code point.
- **Printing (`Console.print`, `show`)** formats each field using its
  type's printer. A record is printable only if every field is printable;
  ADTs follow the same rule. Nested Text is quoted and escaped.

For example, comparing two `{ age: Int, name: Text }` records uses the Int
comparison for `age`; if those values are equal, it uses the Text comparison for
`name`. Nested records and ADTs compose in the same way. Functions and handlers
are not comparable or printable. Comparison also requires a ground type: one
with no remaining type or row variables.

The planned class system would express these component requirements as
`Eq`, `Ord`, and `Show` constraints. A generic equality function could
require `Eq(a)` instead
of needing to know a concrete `a` when its body is checked. That constraint
syntax is illustrative; it has not been designed. Derived record instances would
use the instance selected independently for each field. Two Text fields could
therefore use different selected comparison instances. Selection rules and the
relationship between the selected `Eq` and `Ord` instances still need design.

Int is signed 32-bit, addition wraps, and `+` is the only arithmetic operator so
far.

## Record composition: prior art and checked results

The research asks whether record pieces can compose with disjoint fields,
independent field types, useful inference and checked generic signatures.
For example, if `r` and `s` combine to `{ admin: Bool }` and `s` lacks
`admin`, the field must belong to `r`. Separately extending one input with
`a: Int` and with `a: Bool` must not equate those result types.

### Prior art

[Wand's record-concatenation work][wand]
(LICS 1989; expanded in 1991) supplies per-field alternatives and a decision
procedure. [Sulzmann's thesis][sulzmann] (2000, section 5.1.2) explicitly
states the backward deduction from a result field and the other part's
absence. Their biased concatenation allows overwrites; Waxwing requires
disjoint composition. Robinson's unification and the Martelli–Montanari
formulation supply the closed-type solving method. The
[assessment][assessment]
records the sources, executable probes, mismatches and implementation bugs.
Each adaptation needs its own justification beyond the cited framework.

### What we have proved

The Lean project checks these adaptations and constructions developed for
Waxwing. Their novelty relative to the wider literature is not established.

- Disjoint per-field constraints describe disjoint record union exactly.
  Forced field presence and its type are separate proved claims.
- To decide whether a call's record requirements can be satisfied, the
  algorithm tries finitely many patterns of which fields each row holds.
  It keeps a separate field-type unknown for each row and label. A
  computable unifier and pattern search terminate and answer correctly in
  both directions: acceptance means a solution exists, and every solvable
  problem is accepted (`decideCall_correct`). Worst-case pattern search is
  exponential.
- The candidate signature method P9s represents an unknown remainder by a
  symbolic rest label, then interprets it as the caller's actual remainder.
  A certificate is an assignment of symbolic types and rows that meets
  the method's conditions. We proved that such certificates establish a
  signature for every permitted caller, over arbitrary rows (`s1`) and
  finite rows at every depth (`s1_fin`). P9s is incomplete: some valid
  signatures have no accepted certificate.

### Checking the proofs

The [Lean project][composition-proofs] uses Lean 4.35.0 without Mathlib.
Lean checks the proofs; executable examples, bounded oracles, adversarial
counterexamples and mutation checks supplement them. The recorded theorem
dependencies are Lean's standard `propext`, `Quot.sound` and
`Classical.choice`; there are no admitted proofs or custom axioms. Classical
choice is used in the semantic model and proofs; the call-site decider is
computable. Reproduce the build separately from compiler verification:

```sh
cd research/composition-proofs
lake build
lake env lean Composition/Axioms.lean
```

### Scope and unfinished work

The model covers base types, functions and nested records. These proofs do
not cover source-to-constraint translation, effects, local generalization
or user-defined type constructors. A search may find several ways to divide
fields between rows. The current policy requires a forced or explicitly
written split unless we establish that the choice cannot affect behavior.

The executable certificate checker is specified in the
[dossier, section 15][composition-dossier], but is not yet implemented or
proved. It is intended to check certificates found by untrusted search.
Full signature completeness and whether split choices can be ignored remain
open. A Contradiction verdict needs evidence of impossibility or a refuted
signature instance; Unresolved reports that the checker could not establish
the result.

P9s has not been adopted, and the replacement record foundation is not
integrated into the compiler. The compiler as a whole is not formally
verified. [ADR 014](docs/adr/014-composition-not-invention.md) requires us to
identify and justify local machinery and obtain the author's approval.

## Inferred dependencies and errors

This is planned work. Today named functions must declare their own effects and
failures. A function that calls Database, BalanceApi, and Logger may need to
write:

```text
with Database + BalanceApi + Logger + Fail(DbError) + Fail(NetworkError)
```

Adding an operation with a new error family can require edits to callers' rows.
The inference goal is to let named functions compose without those lists, while
keeping explicit contracts available.

Effect and `ZIO` are references for this design: providing services changes the
dependencies and errors that remain. Waxwing aims to express that composition
through rows and handlers, without a separate layer abstraction. The proposed
behavior is:

- A route calls Database, BalanceApi, and Logger. The compiler infers all
  three dependencies and the error families raised by those calls. Errors
  raised in the route's own branches or helper functions join the result.
- Installing a BalanceApi implementation that calls HttpClient replaces
  the BalanceApi requirement with HttpClient. Installing a fake that
  returns fixed results introduces no HttpClient requirement. The route
  stays unchanged.
- Constructing Database may raise ConnectionError. Constructing BalanceApi
  may raise ConfigurationError. Calling them later may raise DbError or
  NetworkError. Construction errors belong to the construction step, not
  to every operation on an already constructed service. Assembly must
  account for both setup and execution failures without a hand-written
  combined error type.
- Handling NetworkError narrows the computation's outstanding error
  requirements. Callers no longer need to handle it unless recovery raises
  it again. Recovery's own service requirements and error families join
  the result. Handling setup failures separately leaves execution failures
  visible.
- Removing a service implementation or an error handler leaves a specific
  requirement unhandled. The compiler reports it at the boundary where it
  must be supplied or handled, with locations showing where it originated.

These combinations should not require an application-wide error union,
conversion wrappers between unrelated error families, or manual row widening in
each caller. Programmers would still choose implementations, resource lifetimes,
and recovery behavior.

Matt Parsons describes the error-composition problem in
[The Trouble with Typed Errors][errors]. Small error types are
precise but awkward to combine; a shared AppError is easier to pass around but
claims failures a particular function cannot produce. Catching one case often
leaves the same broad error type for the caller.

Waxwing addresses this at the level of failure families. A computation with
`Fail(DbError) + Fail(ParseError)` can handle DbError and leave only ParseError
for its caller, provided recovery introduces no new requirements. It does not
need to wrap both payloads in a new combined ADT. Inference would also assemble
these rows automatically. A handler handles a whole family, not one constructor
of an error ADT; handling NotFound alone does not narrow `Error = NotFound(Int)
| Forbidden` to Forbidden. First-class extensible error values and incompatible
payloads within one family need separate design.

The [inference requirements][inf001] have been reviewed; syntax and type rules
are still to be designed. The design must explain recursive inference, exported
module interfaces, and relationships between callbacks' requirements and their
callers'. It must also settle which error payloads belong to the same failure
family. Nested handlers can distinguish repeated effects, so inference must
preserve those occurrences. Shared resource acquisition, cancellation,
concurrency, and general continuation control are separate work.

## Further language work

The class design also calls for multiple instances for one type without newtype
wrappers. Records of functions offer a possible representation for those
instance dictionaries, although the user-facing class and module rules have not
been designed.

The [backlog](BACKLOG.md) tracks the remaining work:

- Complete open-row merge checking and lowering; integrate an approved
  composition foundation. Record patterns, single-spread extension,
  removal and written lacks constraints are already implemented.
- Higher-kinded types and kind checking; type classes with `Eq`/`Ord`/`Show` and
  derived instances; modules and packages.
- Local let-polymorphism, including helpers that capture local values,
  with established rules for effects and residual constraints.
- More numeric types and operators, built-in collections, and a standard
  library. Lists currently have to be defined as ADTs.
- Typed FFI bindings and service adapters, prioritizing JavaScript libraries
  for the planned JS backend; Go bindings remain target-specific work.
- Local state, concurrency, general resumable handlers, and less
  restrictive callback and cleanup rules.
- Type-aware editor tooling, executable documentation, property-based tests,
  and schema-driven parsing.

Higher-ranked types, GADTs, type families, laziness, ownership, and borrowing
are outside the current design. There are no comments, modules, or standard
library yet. Callback and handler row restrictions can reject a function that
performs fewer effects than its caller permits. Those restrictions and other
limits are in the [language specification](docs/language.md).

## Compilation targets

JavaScript is the first-priority production backend to develop, with LLVM
next for native compilation. The JS target should make common libraries easy
to use through typed FFI bindings and Waxwing service adapters. WebAssembly
remains an optional alternative web target.

Only the Go target exists today. Go made a practical first target because
it is the author's day-job language; it remains a convenience for compiler
development and bootstrapping. It may later become disfavored or deprecated
once the preferred backends meet their needs. No retirement is scheduled.
The [backend decision](docs/adr/015-backend-priorities-and-service-bindings.md)
records the priorities and the implementation work still to design.

## Generated Go and compiler checks

Generic functions are specialized for their concrete type arguments; repeated
uses with the same arguments share a copy. Record layouts become Go structs.
Specialization produces concrete data and function types. More distinct type
arguments can mean more code; a fixed specialization limit bounds it.

Effect rows are erased. Handler dispatch still uses a runtime context, `any`,
and type assertions. Typed failures use panic/recover. Programs without effects
omit the handler machinery. Generated examples are checked into
[bootstrap/](bootstrap/) for inspection.

The compiler is organized as lexing, parsing, name resolution, checking,
specialization, and Go emission, with separate syntax and IR types. Tests check
diagnostics and locations, snapshot generated Go, and execute programs. An
independent interpreter is compared with Go on generated programs. Mutation
checks restore individual past defects in isolated compiler copies and require
their tests to detect the expected symptom.

`npm run verify` runs the build, formatting and module-boundary checks, and
these tests. A separate differential command compares compiler phases with a
previous build. Commands and test coverage are in
[engineering](docs/engineering.md).

## Build and run

Install Node >=22.5.0, PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, and Go
on PATH. The tested Go version is 1.26.4.

```sh
npm install -g purescript@0.15.16 spago@1.0.4 purs-tidy@0.11.1
```

Install Go separately. There are no local npm dependencies; the first build
needs network access to download the pinned PureScript packages. Fresh online
prerequisite installation and cross-platform builds remain unverified; see
[F001](BACKLOG.md). Cache setup for offline builds is in
[findings](docs/findings.md).

```sh
npm run build
node scripts/waxwing.mjs run examples/answer.wxw
node scripts/waxwing.mjs run examples/services.wxw
node scripts/waxwing.mjs run examples/records.wxw
npm run verify
```

The answer example prints `42`. `main` must return a concrete, printable type. A
Unit result is silent; other results are printed with a newline.

To write Go source or build a binary at an explicit destination:

```sh
node scripts/waxwing.mjs emit examples/answer.wxw .build/answer.go
node scripts/waxwing.mjs build examples/answer.wxw .build/answer
.build/answer
```

Destinations may be overwritten. The compiler runs on Node; Go builds the
emitted source. Diagnostics are JSON on stderr with error codes, spans, and
related locations. Source rejection exits 1; incorrect CLI usage exits 2. File
and tool errors use E_IO and E_TOOL.

## Documentation

- [Language specification](docs/language.md)
- [Language direction][direction] and [backlog](BACKLOG.md)
- [Architecture](docs/architecture.md) and [decisions](docs/adr/)
- [Progress](docs/progress.md) and [next-session handoff](docs/next-session.md)
- [CS source traceability][cs-sources] and
  [reference provenance](docs/provenance.md)
- [Composition acceptance programs][composition-programs],
  [foundation assessment][assessment] and
  [proof dossier][composition-dossier]
- [Lean proofs and reproduction instructions][composition-proofs]
- [Self-hosting roadmap](docs/bootstrap.md)

[inf001]: docs/plans/2026-10-11-requirement-and-error-inference-milestone.md
[direction]: docs/plans/2026-10-08-language-direction.md

[adts]: https://book.purescript.org/chapter4.html#algebraic-data-types
[rows]: https://book.purescript.org/chapter4.html
[effects]: https://koka-lang.github.io/koka/doc/book.html
[nominal]: https://en.wikipedia.org/wiki/Nominal_type_system
[classes]: https://www.haskell.org/tutorial/classes.html
[function-records]: https://discourse.haskell.org/t/747
[errors]: https://www.parsonsmatt.org/2018/11/03/trouble_with_typed_errors.html

[thih]: https://web.cecs.pdx.edu/~mpj/thih/TypingHaskellInHaskell.html
[maranget]: https://pauillac.inria.fr/~maranget/papers/warn/index.html
[koka-paper]:https://www.microsoft.com/en-us/research/publication/koka-programming-with-row-polymorphic-effect-types/
[wand]:https://www.cs.tufts.edu/comp/150FP/archive/mitch-wand/types-simple-objects.pdf
[sulzmann]:https://www.researchgate.net/publication/213884919_A_General_Framework_for_HindleyMilner_Type_Systems_with_Constraints
[cs-sources]: docs/plans/2026-10-20-cs-source-traceability.md
[composition-programs]: docs/plans/2026-10-20-composition-acceptance-programs.md
[assessment]: docs/plans/2026-10-20-composition-foundation-assessment.md
[composition-dossier]: docs/plans/2026-10-20-record-composition-dossier.md
[composition-proofs]: research/composition-proofs/README.md
