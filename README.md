<p align="center">
  <img src="assets/branding/waxwing-logo.png" alt="Waxwing bird logo"
       width="240">
</p>

# Waxwing

Waxwing is a functional programming language that compiles to ordinary,
readable Go. It aims for:

- the everyday rigor of Rust: typed errors, exhaustive matching, and
  diagnostics that explain themselves;
- the expressive core of PureScript: algebraic data types, parametric
  polymorphism, rows and effects;
- syntax that a Go, TypeScript or Rust programmer can read on first sight.

The central bet is that two row-based features carry most of what
application code needs:

1. **Algebraic effects tracked in rows.** These replace dependency
   injection frameworks, monad transformer stacks and hand-built
   "environment" types.
2. **Row-polymorphic records.** These replace nominal configuration and
   service types.

Together they should give the composability of Effect (TypeScript) and ZIO
(Scala) without the ceremony.

The compiler is written in PureScript and is early: it is a working
**Stage 0** that compiles a real but small language. This page shows what
exists today, then where the language is going. Planned features are
marked as such, and their syntax is illustrative until it has a design.

## A taste: services as effects

This is `examples/services.wxw`, which compiles and runs today. Services are
declared as **effects**, and functions name the effects they use. A
**handler** is an ordinary value that implements an effect. Each
implementation is constructed by a function and injected where `main`
installs it with `with`; program code never checks which one it got, and the
tests inject fakes into the same functions.

```rust
effect Database { fn query(id: Int): Int; };
effect Clock { fn now(): Int; };
effect Log { fn log(n: Int): Unit; };

fn closeLog(id: Int): Unit with nofail Log = Log.log(id + 1000);

fn fetch(id: Int): Int with Database + Log = {
  let row = Database.query(id);
  Log.log(row);
  row
};

fn stamp(id: Int): Int with Clock + Log = {
  let at = Clock.now();
  Log.log(at + id);
  at
};

fn audited(id: Int): Int with Database + Clock + nofail Log = {
  defer closeLog(id);
  defer Log.log(id);
  fetch(id) + stamp(id)
};

fn report(first: Int, second: Int): Int
    with Database + Clock + nofail Log =
  audited(first) + audited(second);

fn liveDatabase(): Handler(Database with pure) =
  handler Database { query(id) => id + id };

fn systemClock(): Handler(Clock with pure) =
  handler Clock { now() => 100 };

fn consoleLogger(): Handler(nofail Log with Console + ...e) =
  handler Log { log(n) => Console.print(n) };

fn main(): Unit with Console =
  with liveDatabase() {
    with systemClock() {
      with consoleLogger() {
        Console.print(report(1, 2));
        Console.print(report(3, 4))
      }
    }
  };
```

The program is checked end to end:

- **Effects compose.** `audited` uses `fetch` and `stamp`, so its row must
  cover theirs. A function cannot perform an effect its signature omits.
- **`main` must handle every effect** except Console. Drop the
  `with systemClock()` line and the compiler explains where the requirement
  came from. This is the JSON diagnostic, rendered:

  ```
  E_EFFECT  Unhandled Clock in main                   (at the call in main)
    through report                                    (main → report)
    through audited                                   (report → audited)
    Clock is performed here                           (now() in stamp)
    main may perform only Console                     (main's signature)
  ```

- **Cleanup is sound.** `nofail Log` promises that the Log handler cannot
  fail. Without that promise, `defer log(id)` is rejected, because a
  failing handler could abort a cleanup halfway.
- **Effects disappear at compile time.** Rows are erased before Go is
  generated, and handler values become ordinary Go structs passed down a
  context. A program that uses no effects emits plain Go functions.

## What works today

**Algebraic data types and exhaustive matching:**

```rust
type Shape = Dot | Square(Int) | Pair(Shape, Shape);

fn size(s: Shape): Int = match s {
  Dot => 1,
  Square(side) => side + side + side + side,
  Pair(left, right) => size(left) + size(right),
};
```

Matches are checked for exhaustiveness, and nested patterns are allowed.
Every value can be compared with `== != < <= > >=` in one structural order,
and printed as `Pair(Square(3), Dot)`.

**Generic types and functions**, with type variables implicit in
signatures:

```rust
type List(a) = Nil | Cons(a, List(a));
type Maybe(a) = Nothing | Just(a);

fn last(xs: List(a)): Maybe(a) = match xs {
  Nil => Nothing,
  Cons(x, Nil) => Just(x),
  Cons(_, rest) => last(rest),
};
```

Generics are compiled by specialization, so the Go has one concrete
function per use and no interfaces or boxing.

**First-class functions:** lambdas, closures, partial application and the
`|>` pipe.

```rust
fn compose(f: b -> c, g: a -> b): a -> c = fn(x) => f(g(x));

fn main(): Int =
  upTo(5)
    |> filter(fn(x) => x > 2)
    |> map(compose(add(1), double))
    |> foldLeft(add, 0);
```

`add(1)` is a partial application. Over-application and staging follow a
documented evaluation order (ADR 008).

**Text**, all of `examples/text.wxw`: Unicode literals, `${}` interpolation,
`++`, `"""` blocks that strip their indent, raw `#"…"#` literals, and
`show`, with the `Directory` effect injected by `with directory()` as in
the services example:

```rust
effect Directory { fn lookup(id: Int): Text; };

type Entry = Entry(Text, Int);

fn greeting(name: Text): Text = "Hello, ${name}!";

fn welcome(line: Text): Text = line ++ " Welcome aboard.";

fn letter(name: Text, id: Int): Text = """
    Dear ${name},
      your id is ${show(id)}.
    """;

fn rawPath(): Text = #"C:\users\${name}\notes"#;

fn entryFor(id: Int): Entry with Directory = Entry(Directory.lookup(id), id);

fn directory(): Handler(Directory with pure) =
  handler Directory {
    lookup(id) => if id == 1 then "Ada \"the first\"" else "Grace"
  };

fn main(): Unit with Console =
  with directory() {
    Console.print(
      Directory.lookup(2)
        |> greeting
        |> welcome
    );
    Console.print(letter(Directory.lookup(1), 1));
    Console.print(rawPath());
    Console.print(entryFor(1));
    Console.print("shown: ${show(entryFor(2))}");
    Console.print(show(Directory.lookup(1) < Directory.lookup(2)))
  };
```

It prints:

```
Hello, Grace! Welcome aboard.
Dear Ada "the first",
  your id is 1.
C:\users\${name}\notes
Entry("Ada \"the first\"", 1)
shown: Entry("Grace", 2)
true
```

Text values are Unicode, stored as UTF-8 and compared by code point. A
Text printed on its own is written raw, and inside data it is quoted and
escaped, so every printed value reads back as source. `show(x)` returns
what `print(x)` would write. Interpolation takes only Text, so other
values go through `show`. The Go keeps a plain `string` (ADR 011).

**Typed failures.** A failure is an effect with a payload, handled
precisely:

(Waxwing has no comments yet. The `//` notes on this page are annotations
for the reader, not part of the source.)

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
    Console.print(handle total(1, 2) { fail(error: Error) => -1 });    // 203
    Console.print(handle total(1, -2) { fail(error: Error) => -1 })    // -1
  }
};
```

`handle` removes exactly the failure family it handles. A defect
(`crash`), by contrast, runs every pending cleanup and exits with one
report.

**Diagnostics** are structured JSON with exact source spans. Effect errors
explain their origin, the boundary that refused them, and the path between
the two. Errors aim to say what to write. For example, when a callback's
effects don't cover its caller's:

```
q must allow every effect of a (L + M), but its row is L;
write q's row as `with L + M`; a callback's row must equal its caller's (FX017)
```

**Not yet supported:** records, type classes,
modules, multiplication and other numeric operators beyond `+`, comments,
text operations such as length and split, and anything resembling a
standard library. Today's programs compute with Int, Bool, Text, Unit,
user types and functions.

## Where it is going

The rest of this page is planned, not implemented. The status of each item
is in [BACKLOG.md](BACKLOG.md).

### Records, PureScript-style (next)

Records will be anonymous and structural, typed by rows, following
PureScript rather than Haskell. That means no generated selector
functions, no field-name clashes between types, and simple update syntax.
The syntax below is illustrative; the design comes next:

```rust
fn fullName(person: { first: Text, last: Text, ...rest }): Text =
  "${person.first} ${person.last}";

let ada = { first: "Ada", last: "Lovelace", born: 1815 };
fullName(ada);                   // fine: extra fields are allowed
let older = ada { born = 1816 }; // update returns a new record
```

`...rest` is row polymorphism: the function needs these fields and accepts
any record that has them. Records of functions also give an explicit,
first-class way to pass a group of operations around, alongside effects.

### Inferred requirements and errors: layers without the Layer

This is the milestone the language is built around (INF001,
[requirements][inf001]).
Today every function writes its full effect row, such as
`with Database + BalanceApi + Logger + Fail(DbError) + Fail(NetworkError)`.
INF001 makes the compiler infer both channels: the services a function
needs, and the errors it can raise. A business function then calls what
it needs and lets the compiler track the rest.

The experience aimed for is that of ZIO and Effect's *layers*, without
layer types:

- **Providing a service** (installing a handler) removes that requirement,
  and adds the handler's own requirements. For example, a real
  `BalanceApi` needs an `HttpClient`, but a fake one needs nothing.
- **Setup errors** (a database connection failing) and **operation
  errors** (a query failing) stay separate and precisely typed. Providing
  dependencies never makes a program look infallible.
- **Handling one error family** removes exactly that family. Recovery
  code's own requirements and errors join the result.
- **Removing a provision or a handler** gives a diagnostic at the boundary
  that now leaks, naming the missing service or error and where it came
  from.

You get no application-wide error union, no wrapper conversions, no
manual row widening, and no monad transformers. Explicit signatures
remain available and checkable. The surface syntax for opting into
inference is still to be designed.

### Later

- **Type classes** (C001), designed with records: Eq/Ord/Show with derived
  instances, and several instances per type without newtype wrappers.
  `show` and `print` are expected to become class-based then.
- **Modules and packages** (M001, PKG001).
- **Numbers and collections** (D001): Int64, floats, defined arithmetic,
  lists and maps with literals.
- **A standard library** (STD001) with descriptive names and the usual FP
  abstractions.
- **Concurrency** (CF001, FX002): structured fork-join built on the
  effect system.
- **More effect features:**
  - local state (FX003);
  - faster handler lookup (FX005);
  - general resumable handlers (FX006);
  - a relaxed cleanup rule (FX007).
- **A typed Go FFI** (I001).
- **Tooling** (IDE001, DOC001, PBT001, SCH001): an editor extension,
  doctests, property-based testing, and schema-driven parsing at
  boundaries.
- **Other targets** (J001): JavaScript for full-stack code shared with Go
  services is the leading candidate.

Deliberately out of scope for the early language: higher-ranked types,
GADTs and type families. Laziness, ownership and borrowing are not part of
the design.

### Roadmap at a glance

| Area | Status |
|---|---|
| Core language, ADTs, matching, comparison, printing | Done |
| Generics by specialization (P001) | Done |
| First-class functions (FN001) | Done |
| Algebraic effects, handlers, typed failures, cleanup (FX001, FX008) | Done |
| Effect diagnostics that say what to write (FX017, FX018) | Done |
| Text (D001, first tranche) | Done |
| Records, row-polymorphic (R001) | Design next |
| Inferred requirements and errors (INF001) | Reviewed; design next |
| Classes, modules, numbers, collections, stdlib | Planned |
| Concurrency, state, general resumption | Designed or planned |

## How the compiler is built

The pipeline has distinct stages: lex, parse, resolve names, type-check
(producing a checked IR), specialize (producing a monomorphic IR), then
generate Go. Each stage has its own data types, kept apart by enforced
module boundaries ([architecture](docs/architecture.md)).

Correctness is checked in several independent ways:

- exact-text diagnostic tests;
- Go snapshot tests;
- a reference interpreter that is compared with the generated Go on
  hundreds of random effectful programs;
- a differential tool that compares every compiler phase against a
  previous build;
- **regression proofs**, each of which reintroduces a past bug in an
  isolated copy of the compiler and shows that a test catches it.

`npm run verify` runs all of it. See [engineering](docs/engineering.md)
for the rules.

## Building and running

### Prerequisites and fresh checkout

Install these tools on PATH: Node >=22.5.0, PureScript 0.15.16, Spago 1.0.4,
purs-tidy 0.11.1, and Go 1.26.4 (the tested Go version). For example:

```sh
npm install -g purescript@0.15.16 spago@1.0.4 purs-tidy@0.11.1
```

Install Go using its official distribution. On platforms without a PureScript
npm binary, use the matching official release and verify its checksum.
There are no local npm dependencies. PureScript packages are pinned by
spago.yaml and spago.lock; the style checker is a separate workspace package.

From the repository root, the single verification command is:

```sh
npm run verify
```

First build requires access to the PureScript registry and package downloads.
Spago's cache is scoped to `.build/home` by scripts/cache.mjs because the
sandbox cannot write the normal user cache. An existing Spago cache can be
seeded there for offline work; see docs/findings.md. Do not change HOME.
The CLI defaults Go's cache to `.build/go-cache` when GOCACHE is unset;
test subprocesses select that workspace cache explicitly.

The initial session verified cached builds; npm package installation could
not be tested because registry.npmjs.org DNS was unavailable in its sandbox.
That environment limit is recorded as F001 in BACKLOG.md.

### Use

```sh
npm run build
node scripts/waxwing.mjs emit examples/answer.wxw .build/answer.go
node scripts/waxwing.mjs build examples/answer.wxw .build/answer
.build/answer
node scripts/waxwing.mjs run examples/answer.wxw
node scripts/waxwing.mjs run examples/tree.wxw
node scripts/waxwing.mjs run examples/services.wxw
```

Both execution paths print `42` for the answer example. `main` may return any
type: the executable prints the value in the coverage-witness format (`5`,
`true`, `Node(Leaf, 1, Node(...))`, negative integers with `-`), and
examples/tree.wxw prints a binary search tree. examples/services.wxw composes
services with overlapping effects (Database, Clock, Log) and constructs and
installs its handlers in `main` (the tests inject fakes); a program using
`defer` or `crash` that ends in a defect prints one report on stderr and
exits 1. Comparisons are built in, non-chaining and looser than `+`, with
one structural order (constructor declaration order, then fields left to
right; ADR 005). `emit` writes
canonical deterministic Go; `build` invokes Go on a temporary source file;
`run` builds and executes a temporary binary. Destinations are explicit and
may be overwritten. Diagnostics are JSON on stderr with stable tags and
source spans; source rejection exits 1, incorrect CLI usage exits 2. Boundary
errors use E_IO or E_TOOL. The compiler is a Node executable using compiled
PureScript modules, not yet a native Go compiler executable.

## Where to continue

- [Next-session handoff](docs/next-session.md) and [progress](docs/progress.md)
- [Local backlog](BACKLOG.md)
- [Language specification](docs/language.md)
- [Language direction, effects and future targets][direction]
- [Architecture](docs/architecture.md): five layers, Domain, Features,
  Format, Runtime, Program ([ADR 004](docs/adr/004-five-layers.md))
- Decisions: [ADR 001](docs/adr/001-slice.md),
  [ADR 002](docs/adr/002-polymorphic-lowering.md),
  [ADR 003](docs/adr/003-closed-adts.md),
  [ADR 004](docs/adr/004-five-layers.md),
  [ADR 005](docs/adr/005-structural-order.md),
  [ADR 006](docs/adr/006-nesting-limit.md),
  [ADR 007](docs/adr/007-specialization.md),
  [ADR 008](docs/adr/008-functions.md),
  [ADR 009](docs/adr/009-waxwing-name.md),
  [ADR 010](docs/adr/010-effects.md)
- [Engineering rules and gate coverage](docs/engineering.md)
- [Reference provenance](docs/provenance.md)
- [Self-hosting chain](docs/bootstrap.md)
- [Stage 0 bootstrap plan](docs/plans/bootstrap.md) (historical)

[inf001]: docs/plans/2026-10-11-requirement-and-error-inference-milestone.md
[direction]: docs/plans/2026-10-08-language-direction.md
