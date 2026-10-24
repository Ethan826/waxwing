<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)"
            srcset="assets/branding/waxwing-logo-dark.png">
    <img src="assets/branding/waxwing-logo-white.png" alt="Waxwing bird logo"
         width="240">
  </picture>
</p>

# Waxwing

Waxwing is an experimental functional language for composing services and
typed failures. It currently compiles to Go; JavaScript is the intended
primary production target, followed by LLVM for native code. The compiler
is written in PureScript and is not yet self-hosted.

This is an early prototype: there are no modules, comments or standard
library yet. Int is signed 32-bit, and `+` is the only arithmetic operator.

## Why dependencies and errors should compose

A route calls Database, BalanceApi and Logger. Each service has its own
error types. A small error type is precise but awkward to combine with
others; an application-wide AppError can claim failures a particular route
cannot produce. Matt Parsons describes this problem in
[The Trouble with Typed Errors][errors].

Waxwing tracks the services and failure families in a function's effect
row. Today that row is handwritten:

```text
with Database + BalanceApi + Logger + Fail(DbError) + Fail(NetworkError)
```

A handler can supply Database or handle DbError while preserving the
other requirements. Planned inference would collect the row from the
operations a function calls, including failures from constructing services.
Adding a service or error family would no longer require copying its name
through every caller. Explicit signatures would still limit what a
function is allowed to do.

Two features support this approach:

- [Algebraic effects][effects] track dependencies and typed failures.
  A function calls the operations it needs; handlers supply implementations.
- [Row-polymorphic records][rows] specify required fields without fixing
  the whole record. A function can accept a larger record and preserve
  its extra fields, including functions implementing an interface.

The hypothesis is that these features can make dependencies and errors
compose without a new environment type, error union or transformer stack
for every combination.

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

This prints `40`. The extra `label` field is preserved in the record but is
not required by `sumPrices`. This interface uses ordinary record construction
and function application. The [dictionary design][c001] follows the same
approach, with [Jones's evidence passing][qualified-types] as its foundation.

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
  unequal component decides the result. Labels are ASCII identifiers and
  sort lexicographically by ASCII value. Text compares lexicographically
  by Unicode code point.
- **Printing (`Console.print`, `show`)** formats each field using its
  type's printer. A record is printable only if every field is printable;
  ADTs follow the same rule. Nested Text is quoted and escaped.

For example, comparing two `{ age: Int, name: Text }` records uses the Int
comparison for `age`; if those values are equal, it uses the Text comparison for
`name`. Nested records and ADTs compose in the same way. Functions and handlers
are not comparable or printable. Comparison also requires a ground type: one
with no remaining type or row variables.

The planned [first dictionary core][c001] keeps structural printing and
comparison separate from explicitly supplied `Show`, `Eq` and `Ord`
dictionaries. A selected renderer can format a value that structural
printing refuses. An explicit dictionary argument supplies that operation;
it does not register an implicit instance or change the existing operators.
Automatic derivation and operator-selection sugar remain later work.

Int is signed 32-bit, addition wraps, and `+` is the only arithmetic operator so
far.

## Type system at a glance

Waxwing has rank-1 generic functions, parameterized algebraic data types
(ADTs), closures, structural record rows, algebraic effects and typed
failure families. Named functions have explicit signatures; local bindings
are not generalized. The [language specification](docs/language.md)
records the implemented rules and restrictions.

Most individual features use established techniques. The work specific to
Waxwing concerns disjoint record composition and its interaction with
inference, effects and specialization. A published foundation supplies
rules to follow; its theorems apply to Waxwing only where the required
correspondence has been established.

| Implemented capability | Foundation | Evidence and remaining limits |
|---|---|---|
| Rank-1 polymorphism | Hindley-Milner-style instantiation and occurs-checked unification; [Typing Haskell in Haskell][thih] is a semantic reference. | Tests cover rigid signature variables, fresh instantiation and recursive specialization restrictions. This is not inference of whole function signatures. |
| ADTs and exhaustive patterns | ML/Haskell/PureScript data types; [Maranget's usefulness algorithm][maranget] for pattern coverage. | Missing-case and redundancy checks are compared with an independent brute-force oracle, including types with no possible values. |
| Functions, closures and partial application | Typed functions and closure conversion; [ADR 008](docs/adr/008-functions.md) specifies strict evaluation and application stages. | Compiler/interpreter tests cover captures and application. New generic abstractions must preserve stage effects and captured dictionary values. |
| Structural record rows | Extensible rows and lacks constraints, with PureScript as an implementation reference; [Gaster and Jones][gaster-jones] supply a published account. | Field access, update, single-spread extension, removal and record patterns work. [ADR 013](docs/adr/013-records.md) records the unique-label rules. General composition is incomplete. |
| Effect rows and handlers | [Koka's effect types][koka-paper] and [row-typed handlers][koka-handlers]. | Effects, handlers and typed failures exist. Waxwing's failure-family keys, cleanup marks and handler restrictions are local adaptations, outside the record proofs. |

### Planned capabilities and their foundations

| Capability | Established approach | What remains for Waxwing |
|---|---|---|
| Transparent type aliases | ML/Haskell type synonyms with terminating expansion. | Implementation needs parameter substitution, terminating expansion and explicit effect-variable scope. Aliases add no type identity. |
| Higher-kinded types (HKTs) | Haskell/PureScript constructor polymorphism and [kind inference][kind-inference]. | Constructor variables, partial type application, kinds and kind-preserving substitution remain to implement. The intended fragment needs no type families or higher-order unification. |
| Explicit dictionaries | [Jones's qualified types and evidence passing][qualified-types]; ordinary records of functions, as in `fp-ts`. | The [first dictionary core][c001] selects implementations explicitly. It adds no instance search; its library definitions, aliases and assurance checks remain to deliver. |
| Generic Functor, Applicative, Monad and Bifunctor APIs | [Jones's constructor classes][constructor-classes] and Haskell/PureScript abstractions. | HKTs plus a representation for generic methods. Generic methods need their own quantification over element types; today's monomorphic dictionary fields do not provide it. |
| Modules and abstract types | ML signatures, exports and representation hiding. | The module design must settle type identity and exported schemes. Collections governed by a chosen equality or ordering need hidden representations and rules for combining policies. |
| Local polymorphism | ML generalization disciplines; Koka supplies an effect-aware alternative. | Decide which local bindings generalize, which constraints they retain, and how effects and future state remain scoped. |
| Inferred service and error contracts | [HM(X)][hmx] (Odersky, Sulzmann and Wehr), presented by [Pottier and Rémy][emlti], separates constraint generation from solving. | Inference must retain callback, service and error relationships in exported types. The [correspondence with Waxwing's row model][o24] is proposed, not proved. |
| Automatic selection and derivation | Haskell/PureScript class resolution and deriving mechanisms. | Deferred beyond explicit dictionaries. Scope, ambiguity, overlap, coherence and termination need a selected design before implementation. |

Two dictionaries at the same type can intentionally behave differently,
such as addition and multiplication for Int. Specialization must retain
them as distinct runtime values. A well-typed dictionary does not prove
associativity, ordering laws or any other algebraic law; those are separate
contracts and test obligations.

HKTs let a function abstract over a constructor such as List. They do not
by themselves let a record field contain a function polymorphic in its own
arguments. The generic-library design must choose an established encoding,
constructor-class machinery or explicitly polymorphic methods. Higher-rank
annotations have [published inference techniques][higher-rank], but remain
outside the first dictionary core.

GADTs, type families and dependent types are deferred or unselected. Idris
and Agda provide useful examples of explicit evidence and invariants; their
full dependent type systems are not required for the present roadmap.
Rust informs practical API choices; ownership and borrowing are unselected.
The [source index][cs-sources] records sources and local departures, and the
[assurance register][assurance] assigns evidence obligations by feature.

## Record composition: prior art and checked results

The research asks whether record pieces can compose with disjoint fields,
independent field types, useful inference and checked generic signatures.
For example, if `r` and `s` combine to `{ admin: Bool }` and `s` lacks
`admin`, the field must belong to `r`. Separately extending one input with
`a: Int` and with `a: Bool` must not equate those result types.

### Prior art

[Wand's Type Inference for Record Concatenation and Multiple Inheritance][wand]
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

The Lean project checks the following statements for its research
models. These are Waxwing-specific adaptations and constructions; their
historical novelty is not claimed.

- Disjoint per-field constraints describe disjoint record union exactly.
  Forced field presence and the field's type are separate proved claims.
- The call-site decider tries finitely many patterns of field presence,
  with a separate field-type unknown for each row and label. Its unifier
  and search terminate and answer correctly in both directions
  (`decideCall_correct`). Worst-case search is exponential.
- An initial method represents an unknown row remainder by one symbolic
  label. Its computable certificate checker is proved sound over finite
  rows, and every signature admitted by its semantic rule has a finite
  table the checker accepts. This method, called P9s in the dossier, is
  incomplete: some valid signatures have no accepted certificate.
- The open-world model requires a generic signature to stay valid when
  unrelated opaque types are added. Validity is characterized by solutions
  at suitable symbolic instances. The [existence and characterization
  proofs][open-characterization] cover well-scoped problems over finite
  values with an infinite label supply. The construction uses classical
  choice and supplies no executable inference procedure.
- A later checker can divide unknown remainders by which input rows hold
  their labels. Its [soundness][cell-soundness], region queries and several
  scenario families are proved. A [counterexample][cell-limitation] shows
  its certificate format is incomplete: it cannot express some divisions
  of explicitly named fields according to whether another row holds them.

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

The record model covers base types, functions and nested records. Its
proofs do not establish source-level constraint generation, effect typing,
local generalization, principal inferred types or backend correctness.
A replacement record checker is being integrated; the current compiler
still uses the existing checker. Effect fidelity and validation remain
required before the new checker can supply typed code to lowering.

Four guarantees need separate evidence:

| Guarantee | What it establishes | Current limit |
|---|---|---|
| Model soundness | An accepted certificate establishes validity in the stated formal model. | Lean results have explicit fragments and premises. |
| Implementation correspondence | The compiler's implementation computes what that model describes. | A model theorem does not cover a handwritten port. Differential tests provide bounded evidence; they do not prove correspondence. |
| Typed-code construction | The code builder uses the bindings that were checked, preserving types and effects. | Witness coupling, full effect information and source obligations need their own checks and arguments. |
| Lowering preservation | Split selection, specialization and erasure preserve the intended behavior. | Record-validity proofs do not establish these transformations. |

The remaining work includes certificates that express conditional
divisions of named fields and refer to fields' types. Compilation also
needs a justified rule for choosing among valid divisions. The current
policy requires the division to be forced by constraints or written
explicitly until another choice is justified. Recursive admissibility and
specialization limits are separate constraints.

A diagnostic reporting a contradiction needs evidence: no permitted
solution for a concrete call, or a permitted caller type assignment for
which a generic signature's body has no solution. An unresolved result
means the checker could not decide. The initial signature method's limits
have not been adopted as the final language boundary.
The compiler as a whole is not formally verified.
[ADR 014](docs/adr/014-composition-not-invention.md) requires stated
justification and approval for departures from published mechanisms.

## Inferred dependencies and errors

[Effect (the TypeScript library)][effect-library] and `ZIO` are references
for this design: providing services changes the dependencies and errors
that remain. Waxwing aims to express that composition through rows and
handlers, without a separate layer abstraction. The proposed behavior is:

- A route calls Database, BalanceApi, and Logger. The compiler infers all
  three dependencies and the error families raised by those calls. Errors
  raised in the route's own branches or helper functions join the result.
- Installing a BalanceApi implementation that calls HttpClient replaces
  the BalanceApi requirement with HttpClient. Installing a fake that
  returns fixed results introduces no HttpClient requirement. The route
  stays unchanged.
- Constructing Database can raise ConnectionError; constructing BalanceApi
  can raise ConfigurationError. Calling them later can raise DbError or
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

The [backlog](BACKLOG.md) and [inference assessment][inference-assessment]
track the remaining work. The remaining type-system tasks are:

1. Finish the replacement record checker's source obligations, effect
   validation and construction of faithful typed code before switching it
   live. Extend composition coverage, justify choices among valid field
   divisions, and check recursive admissibility against the acceptance
   programs.
2. Deliver aliases and explicit dictionary libraries, then kinds/HKTs and
   modules. Resolve the generic-method representation before claiming
   generic Functor or Monad support; automatic selection and derivation
   follow the explicit core.
3. Design public requirement/error inference and local generalization,
   including exported constraints, ambiguity and unknown-type policy.
4. Validate combinations in source programs that compile and run,
   including services, dictionaries and callbacks, with practical search
   and specialization costs.

Application development also needs more numeric types and operators,
collections and a standard library. Lists currently have to be defined as
ADTs. Typed FFI bindings and service adapters prioritize JavaScript
libraries; Go bindings remain target-specific work. Local state,
concurrency, general resumable handlers and less restrictive callback and
cleanup rules need separate designs. Tooling work includes type-aware
editing, executable documentation, property tests and schema-driven
parsing.

Higher-ranked types and GADTs are deferred; type families, dependent types,
laziness, ownership and borrowing are not selected for the current release.
Callback and handler row restrictions can reject a function that performs
fewer effects than its caller permits. Those restrictions and other limits
are in the [language specification](docs/language.md).

## Compilation targets

JavaScript is the first-priority production backend to develop, with LLVM
next for native compilation. The JS target should make common libraries easy
to use through typed FFI bindings and Waxwing service adapters. WebAssembly
remains an optional alternative web target.

Only the Go target exists today. It remains a convenience for compiler
development and bootstrapping. Whether to retain it once the preferred
backends meet their needs is a future decision; no retirement is scheduled.
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
the [installation backlog](BACKLOG.md). Cache setup for offline builds is in
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

An existing file at the destination is overwritten. The compiler runs on
Node; Go builds the
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
- [Type-system assurance register][assurance] and
  [inference foundations][inference-assessment]
- [Explicit dictionary core][c001]
- [Self-hosting roadmap](docs/bootstrap.md)

[inf001]: docs/plans/2026-10-11-requirement-and-error-inference-milestone.md
[direction]: docs/plans/2026-10-08-language-direction.md

[adts]: https://book.purescript.org/chapter4.html#algebraic-data-types
[rows]: https://book.purescript.org/chapter4.html
[effects]: https://koka-lang.github.io/koka/doc/book.html
[nominal]: https://en.wikipedia.org/wiki/Nominal_type_system
[classes]: https://www.haskell.org/tutorial/classes.html
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

[gaster-jones]: https://web.cecs.pdx.edu/~mpj/pubs/96-3.pdf
[kind-inference]:https://www.haskell.org/onlinereport/haskell2010/haskellch4.html
[qualified-types]:https://web.cecs.pdx.edu/~mpj/pubs/rev-qual-types.pdf
[constructor-classes]: https://web.cecs.pdx.edu/~mpj/pubs/fpca93.html
[emlti]: https://cambium.inria.fr/~fpottier/publis/emlti-final.pdf
[koka-handlers]:https://www.microsoft.com/en-us/research/publication/type-directed-compilation-row-typed-algebraic-effects/
[higher-rank]:https://www.microsoft.com/en-us/research/publication/practical-type-inference-for-arbitrary-rank-types/
[c001]: docs/plans/2026-10-21-c001-explicit/README.md
[assurance]: docs/plans/2026-10-21-type-system-assurance-register.md
[inference-assessment]:docs/plans/2026-10-22-inference-foundations-assessment.md
[o24]: docs/plans/2026-10-22-o24-emlti-correspondence.md

[hmx]:https://onlinelibrary.wiley.com/doi/10.1002/%28SICI%291096-9942%28199901/03%295%3A1%3C35%3A%3AAID-TAPO4%3E3.0.CO%3B2-4
[effect-library]: https://effect.website/
[open-characterization]:research/composition-proofs/Composition/Typed/Bridge/ProofInstantiateSound.lean
[cell-soundness]:research/composition-proofs/Composition/Typed/Cell/Proofs/Main.lean
[cell-limitation]:research/composition-proofs/Composition/Typed/Cell/Proofs/W7/Divide5.lean
