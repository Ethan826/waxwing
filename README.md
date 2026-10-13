<p align="center">
  <img src="assets/branding/waxwing-logo.png" alt="Waxwing bird logo" width="240">
</p>

# Waxwing bootstrap

Waxwing is a small functional language targeting ordinary Go. Waxwing source
files use the `.wxw` extension. Stage 0, the compiler in this repository, is
implemented in PureScript and emits deterministic Go source.

Implemented and merged into main:

- Typed functions over Int, Bool and Unit, with blocks and `let`, and
  structured JSON diagnostics with source spans.
- Closed algebraic data types with exhaustive nested `match` (A001,
  [ADR 003](docs/adr/003-closed-adts.md)); structural comparison
  `== != < <= > >=` on every type and printing of whatever `main` returns
  (A003, [ADR 005](docs/adr/005-structural-order.md)).
- Rank-1 polymorphism: parameterized types and generic functions, lowered by
  whole-program specialization (P001, [ADR 007](docs/adr/007-specialization.md)).
- First-class functions: function types, partial application, lambdas,
  closures and `|>`, staged by declared arity (FN001,
  [ADR 008](docs/adr/008-functions.md)).
- Effects (FX001, [ADR 010](docs/adr/010-effects.md)): effect declarations,
  an effect row on every arrow, first-class handler values installed with
  `with`, typed failures with `fail` and `handle`, `defer` cleanup, `crash`,
  and a host Console effect. `nofail` marks make `defer` sound: cleanup can
  never end in a typed failure (FX008). Rejections explain where an effect
  came from and which boundary refused it.

Effect rows are written, not inferred; automatic requirement and error
composition is the next milestone (INF001,
[brief](docs/plans/2026-10-11-requirement-and-error-inference-milestone.md)).
Records, type classes, modules, a standard library, concurrency and a Go
foreign-function interface are planned or in design; see BACKLOG.md and the
[language direction](docs/plans/2026-10-08-language-direction.md).
[docs/language.md](docs/language.md) states what is implemented, including
its stated limits.

## Prerequisites and fresh checkout

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

## Use

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
services with overlapping effects (Database, Clock, Log) and selects real or
fake handlers in `main`; a program using `defer` or `crash` that ends in a
defect prints one report on stderr and exits 1. Comparisons are built in,
non-chaining and looser than `+`, with one structural order (constructor
declaration order, then fields left to right; ADR 005). `emit` writes
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
- [Language direction, effects and future targets](docs/plans/2026-10-08-language-direction.md)
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
