# Engineering guidance and actual enforcement

AGENTS.md is normative. CLAUDE.md is a pointer, so rules are not duplicated.
The verification command is npm run verify. scripts/build.mjs removes the
output of every workspace module before building, so each build recompiles
them and a promoted strict warning fails every build (F004 fixed; dependency
output stays cached). Via scripts/build-prune.mjs it also removes output of
workspace-prefixed modules whose source was deleted (F006;
test/build-prune.test.mjs). scripts/strict-rebuild.mjs, run by verify,
proves the recompile.
Never obtain green results by suppressing a gate, weakening an assertion, or
adding a bypass allowlist.

## Automated now

- pinned PureScript/Spago, purs-tidy formatting, strict warnings, pedantic
  packages, dependency lock, Unicode PureScript punctuation and 80 columns;
- 80 columns in every tracked .md, .mjs, .js and .wxw file (code points),
  enforced by scripts/width.mjs, which verify runs after the structure gate;
  test/width.test.mjs pins the rules. Exempt: Markdown table rows; ATX
  headings (a heading is one line); outside code fences, a line that is one
  token or one whole `[text](target)` link; inside a fence, a bare URL line;
  and skipped files: .agents/, .claude/skills/, docs/patches/, bootstrap/
  snapshots, editors/vscode/snapshots/ (generated) and lock files. Wrap
  with continuation lines; never reword. Generated JSON is not scanned;
- 250 physical lines for maintained PureScript/JS source, tests, and tools;
  final newlines, textual escape/suppression checks (conservative, includes
  text inside comments/strings; checker fixture strings are assembled);
- purs graph parses imports; the five-layer gate (Domain, Features, Format,
  Runtime, Program; docs/plans/2026-10-07-five-layers-design.md) rejects
  unlayered modules and imports of a later layer, restricts Domain, Features
  and Format to the core library allowlist (no Effect, Unsafe or Partial),
  and gives each internal IR its own importer allowlist (since P001
  Task 1): only Features.Check* and Features.Specialize* import
  Domain.Checked.Internal, and only Features.Specialize* and Format.Go*
  import Domain.IR.Internal, as does Domain.IR.Parts, its split-off
  helpers (scripts/structure.mjs `internalModules`;
  test/structure.test.mjs pins both directions).
  The core allowlist (scripts/structure.mjs `coreLibraries`) is Prelude and
  Data.{Either, Maybe, Int, String, Foldable, Traversable} modules, plus
  exactly Data.Array and Data.Array.NonEmpty (F007: Data.Array.ST and its
  submodules are mutation and stay rejected, pinned by the same test file)
  and, since A003 Task 3b, exactly Control.Monad.Rec.Class, for `tailRecM`
  loops over long inputs (BACKLOG E002); test/structure.test.mjs pins that
  Control.Monad.ST, Control.Monad and near-miss names stay rejected. Since
  P001 Task 3 it also admits exactly Data.Map, Data.Set and Data.Tuple
  (packages ordered-collections and tuples), for the unifier's
  substitution; their submodules (Data.Map.Internal, Data.Set.NonEmpty,
  Data.Tuple.Nested) and Data.List stay rejected, pinned by the same file.
  Since Text v1 Task 2 it also admits exactly Data.Enum (package enums), for
  `toEnum`/`fromEnum` between Int and CodePoint in `\u{…}` decoding and Go
  literal escaping; Data.Char and Data.Enum.* stay rejected, pinned by the
  same file;
- no JS FFI files outside src/Runtime; all runtime capabilities live in
  Runtime and Program; Program.Command runs over the Domain.Host ports and
  may not import Effect or Runtime, so tests drive it with fake hosts;
- separate language-cst-parser style package rejects let-in, anonymous lambdas,
  Maybe/Either constructor cases (including record-building or guarded cases),
  and do-blocks directly in case/if branches; parse recovery fails the gate;
- the same CST gate keeps parser productions applicative (G001;
  tools/style/src/Style/Parser.purs): in Format.Parse and
  Format.Parse.{Literal, Pattern, Expression, Declaration, Type, Lambda,
  Block, Mark}
  it rejects every `do` block, the operators `>>=`, `=<<`, `>=>` and
  `<=<` (including sections such as `(>>=)`), and the names `bind`,
  `join`, `discard`, Prelude's `ap`, `ifM`, `whenM`, `unlessM` and
  `liftM1`, and Control.Bind's `bindFlipped`, `composeKleisli` and
  `composeKleisliFlipped`, plain,
  qualified or in backticks. Format.Parse.Grammar, which holds the
  Parser instances, and Format.Parse.Cursor, the token cursor beneath it,
  are exempt; fixtures in test/style.test.mjs pin both the rejected and the
  exempt modules. The gate is syntactic: an aliased or re-exported Bind
  under another name would pass it, which review must catch;
- only Format.Parse may run a parser (G001 Task 5, same CST gate): every
  other module that imports Format.Parse.Grammar or Format.Parse.Cursor
  must name its imports, without `run` or `initialState`; an open, `as`-only
  or `hiding` import of either module is rejected. Format.Parse.Grammar,
  which defines `run` and re-exports `initialState`, is exempt. Without
  this, a production could run a sub-parser and inspect its result, which
  is Bind by another route. Fixtures in test/style.test.mjs cover the
  rejected forms, the exempt modules and an ordinary named import;
- structured negative diagnostics (test/diagnostics.test.mjs, one row per
  code family with exact code, span and text), generated-Go snapshots
  (bootstrap/answer.go, bootstrap/shapes.go, bootstrap/text.go), positive
  build/run, seeded AST roundtrips and reference execution (nested and flat
  multi-arm matches), a brute-force coverage oracle with brute-forced
  inhabitedness over generated type systems (test/coverage.test.mjs), and
  fake-host command tests (test/program.test.mjs);
- `npm run verify` runs every test/*.test.mjs file (32 files, 302 tests at
  P001 Task 9, no skips; the list is read from the directory, never
  hand-kept) in one parallel `node --test` run, except the
  `test/*.serial.test.mjs` files, which it runs afterwards in a second
  run with `--test-concurrency=1` (scale tests that time `go build` or
  long Waxwing phases against fixed bounds, so the parallel runner's own
  load cannot fail them; user decision 2026-10-09, FN001 Task 8). A new
  test that builds large Go programs against a time bound takes the
  `.serial.test.mjs` suffix (review convention; the split by suffix is
  automated in scripts/verify.mjs). The FX001 Task 11 timing tests
  (test/fx-scale.serial.test.mjs) follow one convention, a review
  convention, not an enforced rule: time the whole process after a warm-up
  run (which also checks the output), take the median of five runs on a
  quiet host to choose the bound, and set the bound to 3x that median; the
  `go build` test assumes the warm `.build/go-cache` that verify provides.
  test/text-scale.serial.test.mjs (Text v1) refines the `go build` timing:
  one warm-up build of a trivial program first, then each measured build is
  the minimum of three, since Go's fixed startup and link cost (about 130
  ms) is as large as the smaller bounds and load inflates single runs while
  a real regression inflates all of them. Only the 10,000-part case keeps a
  `go build` bound: for the 1 MB literal and the 100,000-escape program,
  `go build` time is Go's fixed startup (~130 ms) plus ~17/~4 ms of Waxwing
  output, so a time bound there tests the host, not the compiler (user
  decision 2026-10-13); they still build, run and match exactly.
  Under verify's load the measured figures stayed inside the bounds, but
  they are not guaranteed to on a busy host (T003 exposure). FN006's
  20,000-parameter timing suite
  is now test/fn-linear-timing.serial.test.mjs, separate from the existing
  fn-linear.serial.test.mjs; every workload, assertion and bound is
  unchanged. Repeated parallel-contention failures motivated this runner
  prerequisite (FX001 Task 3 continuation, user-authorized 2026-10-09).
  T003's deep/wide match ladder timing block is similarly extracted to
  test/match-lift-timing.serial.test.mjs; semantic match-lift tests stay
  parallel. Its source, constants, assertion and 1500 ms bound are identical
  (controller ruling after a 1670.670250 ms parallel failure). These moves
  apply the existing fixed-bound scheduling policy, not looser checks.
  Then verify runs
  scripts/regression.mjs (T013: one plain-purs baseline compiled per run in
  .build/regression/baseline, never the spago output, whose bytes differ;
  each row an independent `cp -cR` clone of it, or an ordinary recursive
  copy where cloning fails, never a hard link; the row's edits applied to
  the clone's sources and compiled incrementally with relative globs so
  source paths match; row directories removed in `finally`, a failing row's
  error saved to .build/regression-failed/<row>.log first, the
  baseline removed at the end. test/regression-incremental.test.mjs, run by
  verify, keeps this honest: it mutates Domain.Ids (TypeId newtype to
  data), asserts that modules other than the edited one change, and
  compares an incremental compile with a clean one over every output file
  except cache-db.json; it also forces the copy fallback and checks inode
  and nlink independence), a table of isolated-copy mutations, each of which
  must pass on the healthy build and fail on its mutant: `branch`
  (Features.Check.Infer branch type), `nil-guard` (Format.Go.Match drops the
  `!= nil`
  test; probe requires the unmatched panic, not a runtime error),
  `exhaustive` (Features.Check.Coverage always succeeds), `ctor-order`
  (Format.Go.Compare reverses the tag comparison), `first-field` (compares
  the last field first), `show-fields` (Format.Go.Show prints only the
  first field) and `state-thread` (Format.Parse.Steps' `applyAt` runs the
  second parser from the original state; examples/answer.wxw must still
  compile to bootstrap/answer.go) and `capture` (Format.Go.Match drops a
  match's scrutinee from its free locals, so an enclosing lifted match
  misses a local read only there; probe builds and runs test/match-lift's
  capture program), and since P001 four more, whose probes live in
  test/regression-poly.mjs (imported by test/regression.mjs): `occurs`
  (`bindBounded` skips the occurs check, in Features.Check.Binding since
  FX001 Task 3, Features.Check.Unify before; probe
  requires E_TYPE `Infinite type: _ occurs in List(_)`), `rigid` (a rigid
  variable unifies with any type; probe requires `fn f(x: a): Int = x;`
  to be E_TYPE `Expected Int, found a`), `instantiate`
  (Features.Check.Scheme `instantiate` does not advance the meta counter,
  so uses of a scheme share metas; probe requires `pair(id(1), id(true))`
  to print `Pair(1, true)`) and `spec-key` (Features.Specialize.Keys keys
  a type application's data-type arguments without their identity, so
  `List(List(Int))` and `List(List(Bool))` share one Go type; probe
  requires a program using both to build and print `Pair(1, 2)`), and
  since FN001 ten more, rows in scripts/regression-fn.mjs and probes in
  test/regression-fn.mjs (ADR 008): `stage-value` and `stage-lambda` (a
  named value or a lambda eta-expanded to its type's arity; timing probe
  `use(stuck)` must enter `stuck`, via test/support.mjs `panicOnEntry`),
  `partial-strict` (partial arguments evaluated inside the closure),
  `pipe-order` (every pipe lowered as the rewritten call), `block-order`
  (an application helper evaluates its 64 arguments before applying any),
  `lambda-capture` (Format.Go.Capture leaves a lambda's parameters free),
  `fun-compare` (Comparable ignores arrows), `functional-fixpoint`
  (Functional stops at its seeds), `value-edge` (bare references and
  lambda bodies are no instantiation edges) and `arrow-key` (arrows
  interned without their parameter), and since FX008
  `fx008-cycle-presence` (rows in scripts/regression-fx008.mjs, probes in
  test/regression-fx008.mjs, all probe files aggregated by
  test/regression-probes.mjs; Cycle.purs weighs a cycle by presence, so
  dup.wxw never settles, caught by a child-process compile under a 20 s
  timeout) and `fx008-settle-order-linear` (the settle order stays linear
  in the number of deferrals; 16,000 `defer`s compile under a 12 s
  timeout), and since FX001 Task 12 fifteen rows: the checker and
  diagnostics rows in scripts/regression-fx.mjs (`fx-side-condition`,
  `fx-defer-fail`, `fx-defer-rigid`, `fx-defer-unified`,
  `fx-closed-opened`, `fx-layout-edges`, `fx-provenance`,
  `fx-abbreviation`, and FX017's `fx-callback-row`, which restores the
  old classification of a callback row that lacks a caller label; probes
  in test/regression-fx.mjs) and the emitted-Go
  rows in scripts/regression-fx-go.mjs (`fx-clause-context`,
  `fx-abort-target`, `fx-clause-order`, `fx-cleanup-context`,
  `fx-cleanup-cause`, `fx-cleanup-defect`, `fx-ctx-reachable`; probes in
  test/regression-fx-go.mjs), both aggregated by
  test/regression-probes.mjs. A probe that could loop (`fx-side-condition`)
  compiles in a child process with its own 20 s timeout and reports the
  timeout as the detected defect, so the runner's 180 s spawn timeout never
  fires. Emitting `ctx` only for effect-using programs is the older row
  `effect-free-ctx`, not duplicated. The Task 12 verify
  (.build/task12a-verify.log in the worktree) printed 81 `Regression
  proof (…)` lines in all (`node scripts/regression.mjs name…` proves
  only the named rows); the A003 order and print tests also use an independent
  value
  oracle (test/value-oracle.mjs);
- Text v1 (ADR 011) adds seven regression rows, in
  scripts/regression-text.mjs with probes in test/regression-text.mjs (an
  import and a spread in scripts/regression.mjs and
  test/regression-probes.mjs): `text-order` (interpolation parts evaluated
  right to left), `text-nested-raw` (a Text in data printed raw),
  `text-indent-count` (a block's indent removed by length, not as an exact
  prefix), `text-dollar` (`\$` interpolating), `text-hash-mismatch` (a
  closing quote with too many `#`s accepted), `text-surrogate` (`\u{D800}`
  accepted) and `text-utf16-order` (the field comparison orders Text by
  UTF-16 unit). Go compares strings bytewise, which on valid UTF-8 is
  code-point order, and no Go helper compares Text, so the UTF-16 mutant
  replaces the field comparison itself. The scale rule is
  test/text-scale.serial.test.mjs (a serial test): a 1 MB literal, 10,000
  interpolation parts and a literal of 100,000 escapes each compile and run,
  and emission is deterministic. Each bound is 3x the median of five runs
  on the development host, for the in-process compile and, for the
  10,000-part case only, for `go build` alone (figures in docs/progress.md, Text
  entry). Examples are snapshotted
  byte for byte (examples/text.wxw to bootstrap/text.go,
  test/text-literal.test.mjs);
- R001 (records, ADR 013) adds sixteen regression rows, in
  scripts/regression-r001.mjs with probes in test/regression-r001.mjs:
  `r001-print-ground` (no ground-type printable check: the probe must see
  Go's own `go build` error, read after the `# command-line-arguments`
  header), `r001-record-order` (fields kept in written order),
  `r001-row-sort-propagation`, `r001-duplicate-field`,
  `r001-callee-to-caller`, `r001-settled-sort`, `r001-caller-conflict` and
  `r001-sort-feedback` (the row-sort solver), `r001-field-bound-tail`
  (tails decided against stale rows), `r001-sorted-layout` (layouts keyed in
  written order), `r001-lacks` (no lacks check), `r001-shared-remainder`
  (two open tails each given their own remainder), `r001-field-order`
  (every field used in place in the Go struct literal),
  `r001-shape-types` (layouts keyed by labels alone), `r001-body-lacks`
  (body types not held to the signature's lacks sets) and
  `r001-record-guard` (no repeated-label guard in lowering). R012 adds
  seven rows in scripts/regression-r012.mjs (probes in
  test/regression-r012.mjs), R004 seven in scripts/regression-r004.mjs
  (probes in test/regression-r004.mjs): `r004-missing-field`,
  `r004-label-span` (a field's span taken from its pattern),
  `r004-widening` (record patterns not widened to their type's labels),
  `r004-walk-binders` (settlement skipping patterns in record fields),
  `r004-inhabitation` (record fields read as Int), `r004-go-fields`
  (lowered conditions testing no field) and `r004-hole-tail` (a hole tail
  never extended), R005 eight in scripts/regression-r005.mjs (probes in
  test/regression-r005.mjs): `r005-overlap` (no overlap check),
  `r005-overlap-order` (the overlap reported at the item whichever was
  written first), `r005-written-use` (written lacks not seeded at a use),
  `r005-provenance` (the violation's clause forgotten, the shape text
  instead), `r005-rest-type` (a rest typed as the whole record),
  `r005-go-order` (extension temporaries out of written order),
  `r005-empty-unit` (`{}` unifying with Unit) and `r005-rest-layout` (a
  remainder layout interned and forgotten, so an unused rest's struct is
  never emitted), and FX024 adds `fx-label-argument-ambient`
  to scripts/regression-fx.mjs. Every one of these rows' `message`s pins
  the symptom of its restored defect (the wrong diagnostic, a wrong
  acceptance, an internal error, Go's build error, the wrong output, or,
  for `r001-record-guard`, the lowered layout `{ a, a }`), not only the
  probe's own failure label, so an unrelated mutant failure cannot satisfy
  the proof (BACKLOG T012, done in R001 Task 13). The scale rule is
  test/r001-scale.serial.test.mjs (programs in
  test/r001-scale-programs.mjs): 200 shapes through 20 generic links give
  exactly 4,001 keys and checked output, with compile, `go build` (the Text
  v1 method) and Go-line bounds of 3x the median of five runs (figures in
  docs/progress.md, "R001 Task 10"); a services proxy runs in the same file
  with exact keys and no time bound. The records example is snapshotted
  (examples/records.wxw to bootstrap/records.go, test/compiler.test.mjs);
- Go execution in tests is batched per test file (T001, test/go-batch.mjs):
  `runGoBatch(import.meta.url, cases, label?)` takes an array of
  `[name, source]` pairs (an array, so a computed name collision is refused
  at declaration rather than collapsing silently) and, on the first `run(name)`,
  compiles them all, writes a synthetic module
  under `.build/go-batches/<id>/` (its own go.mod with module path
  `waxwingbatch` and the pinned toolchain's language version, one package
  `c<N>` per case, a dispatcher `main` importing them), builds once with
  GOCACHE under .build and GOWORK off, and runs each case as its own process
  (the binary invoked with the case's package name). `<id>` is the test
  file's basename plus an optional label, sanitized; a batch clears only its
  own per-process directory, never the root, and an id may be claimed once
  per process.
  Before rewriting, each program must have exactly one `package main` clause
  and exactly one canonical printed entry (`func main() { fmt.Println(...) }`)
  or Unit entry (`func main() { waxwingFnN() }`), and no `func Main`; only
  those two lines change. Failure
  contract: a Waxwing rejection is recorded per case and rethrown, unchanged,
  by that case's `run` (runGo's error), while the other cases still build;
  an unexpected program shape or a Go compile failure is a batch
  infrastructure failure, thrown by every case's `run`, naming the offending
  case(s) when Go's output identifies their package. `run` keeps runGo's
  contract (stdout, exit status 0 asserted); `result` returns the raw
  process outcome. Panics keep their message and exit status; stack traces
  differ (package path `waxwingbatch/c<N>`, `Main`). Each process builds
  under its own `.build/go-batches/<id>.<pid>/` (T002), so concurrent runs
  of one file in a checkout do not race; the directory (binary included) is
  removed when the process exits or gets SIGINT/SIGTERM. A SIGKILLed run
  can leave one behind; `rm -rf .build/go-batches` reclaims them.
  The `go build` timeout (300 s) kills only the go command, not its compile
  children (spawnSync cannot kill a process group); depth.test.mjs's timed
  builds group-kill because their timeout is an assertion. Self-tests:
  test/go-batch.test.mjs (the concurrency one spawns
  test/go-batch-child.mjs). Not batched: depth.test.mjs timing builds,
  scripts/regression.mjs probes, `goTest`, and the slow accepted probes of
  test/fx008-probes.test.mjs (the batch compiles in-process, which would
  escape their child-process timeout); `runGo` remains as the
  self-tests' standalone reference;
- scripts/strict-rebuild.mjs (run by verify after the build) copies the
  workspace to .build/strict-rebuild, checks the unmodified copy builds, adds
  a shadowed name to one module and requires two consecutive builds to fail
  with ShadowedName (F004).

The CST ban on all anonymous lambdas is deliberately stronger than MileAhead's
manual 'name what you pass' rule. The Maybe/Either rule is stronger than its
pass-through-only automated eliminator gate, following explicit user steering.
Named where helpers and maybe' preserve laziness for computed fallbacks.

## Review conventions, not full automated lint yet

Types/instances, constants, public functions, private functions; descriptive
names; named constants except 0/1/2 and test data; 30 declaration lines,
3 nested decisions, 8 active branches, 8 where bindings. Branch expressions
should call a named helper when they hold computation. The CST gate currently
catches branch do blocks, not every complicated operator/record expression.
Comments explain why. These conventions were inspected in MileAhead and apply
here; E001 tracks extending automation after the first slice.

Loops whose length grows with the input (characters, tokens, declarations)
use `tailRecM` or a self tail call, and accumulate with Format.Stack or
indexing rather than Array.snoc/uncons/drop per item, which copy the array.
This is a review convention; only test/large-source.test.mjs (megabyte
padding, 20,000 declarations) checks it, and only for the paths it drives.

The FX008 probe gate (test/fx008-probes.test.mjs, data in test/fx008-probes/,
table in test/fx008-probe-table*.mjs) pins the outcome of every review probe
(code, text, span, Go SHA-256, stdout, stderr, status). A task may change an
entry only where the FX008 plan lists that probe for that task; any other
change stops the work, and a hash of the table without `flipped`
(test/fx008-probe-hash.mjs) catches accidental edits only, so the reviewer's
diff of the table is the real control.

No coverage percentage is claimed. Properties use deterministic generators
and explicit edge cases with no discarded inputs. Parsing tests compare with
independent generated trees; executable comparisons use a BigInt interpreter.
The unifier (Features.Check.Unify, P001 Task 3) is compared with an
independent union-find oracle (test/unify-oracle.mjs) and checked for
soundness, acyclicity and most-generality over generated pairs. Row
unification (Features.Check.UnifyRow, FX001 Task 3) is compared with an
independent recursive Leijen oracle (test/row-oracle.mjs) over generated
rows with repeated keys, shared tails and rigid tails, and checked for
soundness (scoped-label equality), symmetric acceptance and acyclicity; its
side-condition test runs in a timeout-guarded child process. These solved
properties remain in test/unify-row.test.mjs. The separate deferred-row
properties (test/row-properties.test.mjs) distinguish pending acceptance
from solved equality: an independent transactional oracle models rollback,
postponement and settling, with deferred keys, same-family payloads, arrow
label arguments and nonempty starting substitutions. Pending constraints
are retried after the body's ordinary constraints; they are not equality
witnesses. groundErased is used only at Resolve/Seeds monomorphism
boundaries; strict ground still checks both type variables and row tails.

Measurement and checking tools are committed, not ad hoc (T003); neither
runs in verify. scripts/differential.mjs compares two built compilers
phase by phase (lex, parse, resolve, check, specialize, Go emission, full
compile) over the sources the test suite parses (harvested by
scripts/differential-hook.mjs into .build), token soups, generated
nested-match programs and mutations, and exits 1 on any difference: run
it against an isolated build of the previous commit for every
behavior-preserving refactor or performance change. Its digests carry
normalisations for fields an IR gained, each dropped only where a baseline
without it agrees: a Plain token's `kind` (Text v1), an empty `records` in
the monomorphic IR (R001 Task 7) and a checked function's `sorts`, a copy
of resolve-phase data (R001 Task 8).
scripts/ladder-profile.mjs times the match-lift ladder cold and per phase,
alternating with a baseline build. Both are review conventions. The
differential loads compilers and harvests sources through
scripts/differential-load.mjs.

FX020's corpus migration used one-off tools (a resolver-driven rewriter and
a paired differential of each original program with its migrated twin).
They were removed in FX020 Task 7; git history keeps them.

The FX001 differential corpus (Task 10) is a test-side reference
interpreter (test/fx-oracle*.mjs, written from the design, no compiler code)
and a seeded generator of well-typed programs over two user effects, two
failure families and Console traces (test/fx-programs.mjs, fx-gen-*.mjs).
test/fx-differential.serial.test.mjs (serial phase, ruling F11) builds the
programs in go-batches of at most 100 and compares Go stdout, stderr and exit
status with the interpreter exactly; the census (test/fx-census.mjs counts
what the interpreter observed, not what the generator intended) must meet its
minimums (50 programs per scoped-handler scenario, 25 per cleanup outcome) or
the run fails, and so does a generated program the compiler rejects, with its
seed. Knobs, outside verify: `WAXWING_FX_SEED` (default 20261010; program
`i` has seed SEED+i, reproduced with `generate(SEED + i, i)`) and
`WAXWING_FX_PROGRAMS` (default 500; the minimums need about 400, so a
smaller count fails by design; larger counts build in more batches). A
differing program's source, both outcomes and a shrunk source
(test/fx-shrink.mjs) are written to .build/fx001-differential/. The 25
rejection variants of strict `defer` are generated from the same seed, and
25 more reach a failing handler (FX008: directly, through a forwarding
clause, through a clause calling an ambient callback).
Since FX020 Task 5 the interpreter reads qualified operations, signature
aliases and imports, with Console and Fail as effects
(test/fx-oracle-names.mjs; tests in test/fx020-oracle.test.mjs), and the
generator spells each function's operations bare, qualified (some through
an alias) or through imports of its own row (test/fx-gen-names.mjs), from
a stream of its own so a seed keeps its program shape. Each performed
operation reports its spelling, and the census requires programs that
perform one qualified (400), imported (150), through an alias (50) and
bare (75, until Task 7).
Since R001 Task 9 the interpreter models records (test/fx-oracle-records.mjs;
hand traces in test/fx-oracle-records.test.mjs): fields and update
replacements evaluate once in written order, values compare and print in
sorted label order (Text quoted as nested data), and a record payload's
Fail family is its label set. A record frame (test/fx-gen-records.mjs, in
70% of programs) draws a label universe with one type per label, writes
literals and types in shuffled order, and calls generic functions over open
records (test/fx-gen-record-fns.mjs). The census requires 250 programs each
running a record literal, access, update, generic record function,
comparison, print and Fail payload.
Since R004 Task 4 it also matches record patterns (fields, puns and
`...`; test/fx-oracle-records.mjs). test/fx-oracle-record-patterns.test.mjs
runs 200 generated programs (test/fx-gen-record-patterns.mjs), each match
an ordered partition of its scrutinee's type so it is exhaustive and
non-redundant by construction, through the compiler and Go, and compares
stdout, stderr and status with the interpreter's. It requires 95% of the
programs to be accepted and each pattern form in at least 10. It shares no
code with the compiler or with the coverage oracle.
Since R005 Task 3 it also evaluates a literal's spread (items left to
right, the base once), `without`, a named rest and `{}` (printed `{}`;
test/fx-oracle-records.mjs). test/fx-oracle-record-extension.test.mjs runs
200 generated programs (test/fx-gen-record-extension.mjs: each record
expression is built for a known label set, so it is well typed by
construction, with effectful items so output order is checked), through the
compiler and Go, and compares stdout, stderr and status with the
interpreter's. It requires 95% accepted and each form in at least 10.
test/fx-oracle.test.mjs validates the interpreter against the hand-derived
traces of Tasks 2, 4, 7 and 8 (imported from their program modules), the
shrinker, and a sensitivity check (clauses run in the operation's context
must change some of 50 programs). Both run in verify; the differential test
is in the serial phase.

Random clauses may fail (FX008 Task 11): a clause is fail-free, fails with a
family handled outside its `with` (parameter `w`, reserved for generated
failing clauses; the census counts the aborts of such clauses as `failing
random clause`, at least 25 programs), or forwards to an outer operation
whose handler may fail. A failing clause is reachable: the `with` may sit in
its own `handle`, and its body ends with the operation. Designed failing
frames (test/fx-gen-failing.mjs) add the shapes lexical, forward, callee,
value and ambient; they are extras outside the focus rotation, and the
random path alone meets the census row. The generator tracks the user
labels whose innermost handler may fail (`ctx.failing`): constrained cleanup
performs none and no function whose row names one is called under it, so
every program compiles. The one-way soundness differential
(test/fx008-soundness.serial.test.mjs, serial phase) generates 300 programs
`generate(SEED + 100000 + i, i, { unconstrained: true })` whose cleanup
ignores those frames. A rejected program must carry an FX008 headline at a
`defer` or at a call, or a strict `defer` text at a `defer`; a witnessed
escape must be rejected by an FX008 headline. An accepted program must never
make the interpreter report `typed abort escaped cleanup` and must agree with
Go exactly. Minimums: 50 accepted programs whose cleanup performs a user
operation, 50 rejected by an FX008 headline, 25 oracle-witnessed escapes
(`oracle error: typed abort escaped cleanup`), every one rejected, and at
least 5 witnessed escapes in each shape (lexical, forward, callee-plain,
callee-nofail, value-passed, value-returned, ambient, random). Failures are
saved to .build/fx008-soundness/. Sensitivity (ruling R1), run on commit
ff0c6d1 (Task 8, no mark check) with this corpus at the default seed: 110
of the 120 witnessed escapes are accepted, every shape except value-returned
(its 10 hit the strict `Fail` text), and the test fails.

## Definition of done and handoff

Acceptance criteria must run through the actual CLI/backend, with typed
rejections and regression sensitivity. Check new instructions from a clean
output directory, because incremental zero warnings do not prove a rebuild.
Update plan, progress, findings, ADRs, provenance, and backlog together.
Record known failures with concrete next actions; deferred language features
are scope decisions, not hidden failures. No external issue/commit/push rule
from a reference project is inherited.

Generated output/output caches and lockfiles are excluded from line limits.
Waxwing fixture files and generated Go are data; maintained source or test code
cannot be moved into those trees to evade checks. The checker tests test the
checker itself. Structural guarantees are bounded by direct imports and known
library APIs, not a proof of arbitrary dependency purity.

## Installed workflow material

Superpowers is project-local, revision-pinned third-party guidance, preserved
unmodified under .agents/skills with its MIT notice. It is distinct from
maintained Waxwing source/tests/tooling; project gates still cover their
existing
roots without weakened checks. docs/planning-skills.md records instruction
precedence and adoption. Migrated plans preserve historical evidence without
asserting retroactive TDD/commit records. Execution uses the installed
plan/task/review helpers and real commit ranges.

## Audit review findings (2026-10-07)

The audit moved computed Maybe fallbacks to named maybe' functions, contextual
traversal callbacks into where, independent resolver bindings into where, and
branch calculations into helpers. Private comma-list parsing functions now
have an explicit export boundary. No language semantics or gate was relaxed.
Numeric limits in maintained checking/mutation scripts are named constants.

The 30-line/3-decision/8-branch/8-binding budgets are review targets. The
flat exhaustive mappings in Format.Diagnostic (codeName: twelve ErrorCode arms;
code and message: fifteen Problem arms each) are retained together for
readability; E003 records this specific target exception and its next review.
All maintained code remains below 250 lines; automatic counts do not prove
full naming/complexity compliance. No new source behavior or unification is
claimed. Existing executable/snapshot/diagnostic tests validate this refactor.

## Research scripts

research/ holds maintained evidence for designs that is not part of the
compiler: prototypes, oracles and generators a design relies on (first
research/open-row-merge/, for R005 Tranche B). It is maintained but not
in verify: nothing there is built, tested or run by `npm run verify`.
Automated: scripts/width.mjs scans it like every tracked .mjs and .md
file, so the 80-column rule applies. Review convention: the 250-line
limit and the other tooling rules hold there too, although
scripts/structure.mjs scans only src, test, scripts and tools/style/src.
Each directory has a README.md with exact commands, seeds, expected
output and what each script checks; a design citing a result names the
command that reproduces it.

## Evidence for solvers and diagnostics (proposed, needs the user's approval)

Proposed 2026-10-17 from the open-row merge review; not binding, and not
in AGENTS.md, until the user approves it. A checker or solver change
whose diagnostics make claims would follow these rules:

- The solver returns an explicit result, `Solved`, `Contradiction` or
  `Unresolved`, and diagnostics are rendered only from it: a
  contradiction text only from `Contradiction`, an unresolved text only
  from `Unresolved`. No internal state is named for a property it has
  not established (for example "ambiguous").
- An independent oracle checks the claim behind each result: a solved
  problem's emitted solution satisfies every constraint; a contradiction
  has no solution by brute force; an unresolved result makes no claim
  about the number of solutions, and permanent fixtures cover it with
  zero, one and several solutions.
- Each worked example of a design is an executable fixture (source,
  result class, exact text, primary location, notes), checked against
  the oracle before approval and through the compiler once implemented.
- Every solving rule has a written argument before implementation (it
  preserves solutions; a rejection establishes impossibility; iteration
  terminates), is tested on small exhaustive domains and on random
  problems, and performance heuristics are labelled apart from
  correctness rules.
- A design keeps a claims ledger: each factual claim names the fixture
  or oracle property behind it or is marked "argument, not yet
  checked"; no unbacked claim passes the review before implementation.
- A review finding closes with a regression fixture or an oracle
  property, not with a document edit alone.
- A cross-boundary generator of real programs compares the compiler's
  outcome with an independent reference and shrinks failures into
  permanent fixtures.

First applied in docs/plans/2026-10-17-open-row-merge-plan.md (R005
Tranche B), where these are that plan's requirements.

## Known gaps in enforcement (A001)

Review conventions only: the layer names describe reasons to change, which no
gate checks; the gate checks import direction, purity and IR access.
F005: the nil-guard probe's temp-directory cleanup is not asserted.
