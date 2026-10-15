# R001 Records (first tranche) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Structural, row-typed records: types, literals, `e.l` and
`e { l = v }`, row-polymorphic functions with implicit lacks constraints,
equality, ordering, printing, records as `Fail` payloads, and lowering to
Go structs.

**Architecture:**
- **Prerequisite.** Fix E017 first: a printable check at each print site's
  ground type, after specialization.
- **Types.** One new type form, a record over a record row. A record row
  holds sorted, unique labels, each with a field type, plus a tail
  variable of record sort, with its own unifier carrying lacks sets.
- **Lowering.** Record rows enter specialization keys, canonicalised.
  Each closed shape becomes one hash-consed Go value struct, and fields
  of ADT type are stored as pointers.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Spec:** docs/plans/2026-10-14-records-design.md (approved 2026-10-14).

**Status:** Done 2026-10-14: Tasks 1-11 on branch `records` (commits
356397c..HEAD from de96a15), as built in ADR 013 and docs/progress.md
("R001"); the controller's rulings are in
.superpowers/sdd/2026-10-14-records-plan/progress.md. Not merged; the
user's merge decision (fast-forward only) is next.

## Global Constraints

- **AGENTS.md governs:**
  - files at most 250 lines (about 100 is the target);
  - 80 columns (scripts/width.mjs, which checks git-tracked files only,
    so run it after `git add`);
  - `where`, never `let … in`; no lambdas; named helpers;
  - layer and IR allowlists (only Check*/Specialize* import
    Domain.Checked.Internal; only Specialize*/Format.Go* import
    Domain.IR.Internal);
  - error codes as an ADT;
  - regression proofs fail with the defect restored, in an isolated copy.
- **Approved texts only** (spec §6):
  - `age is not a field of { name: Text }` (E_TYPE);
  - `Duplicate field name` (E_DUPLICATE), note `first written here`;
  - `Expected a record, found Int` (E_TYPE);
  - `r is a record row, not an effect row` and `r is an effect row, not
    a record row` (E_TYPE);
  - `Type { name: Text, ...r } is not comparable` (existing template);
  - existing `Expected X, found Y`, `Expected a printable value, found
    <t>` and `Fail needs a concrete error family`.

  Any other user-facing text is a stop: report it.
- **Locations** (spec §6):
  - missing field: at the field name;
  - duplicate: at the second label, with a note at the first;
  - non-record access: at the receiver;
  - row-sort error: at the conflicting use, with a note at the first use
    where possible;
  - mismatches: existing conventions.

  A duplicate location is never invented from an inferred row.
- **Types print** with sorted labels and the tail written `...r`.
- **Go output** of every valid existing program stays byte-identical:
  - the seven bootstrap/*.go snapshots;
  - the differential, where the only allowed existing-source change is
    E017's E_TOOL → E_TYPE, listed and classified.
- **Parser stack margin is not reduced.** Measure with
  scripts/depth-probe.mjs per ADR 006. Today: constructor-argument 259,
  call-argument 296, parens 396, parens-in-call-in-constructor 326. The
  nesting limit (128) is unchanged.
- **Every task:**
  - behavioural tests are seen failing first;
  - `rm -rf output && GOTOOLCHAIN=go1.26.4 npm run verify` exits 0 on
    the committed clean tree;
  - the differential runs against the task's base;
  - timing failures are recorded in BACKLOG T007 (figures only), and no
    bound is relaxed;
  - delete .build/regression and .build/go-cache afterwards;
  - no bare `git stash`.

## Review Focus

1. **Postfix on every receiver kind.** `f(x).a`, `(e).a`, `r.a.b`,
   `xs |> f(_).a` grouping, and `Log.log` still a qualifier. Task 5.
2. **Update after keyword heads.** `match r { a = 1 } { … }` and
   `with h { log(1) }` must not misparse. An update needs `name =`, and
   `name =>` stays a match arm. Task 5.
3. **Records crossing generic boundaries.**
   - A record built in one function, passed through two generic
     functions with different tails, and read back.
   - The specialization keys must coincide for reordered rows.

   Task 7.
4. **Nil and malformed values.** A record holding an ADT whose pointer is
   nil reports the existing malformed-value panic in comparison and
   printing, not a Go nil dereference. Task 7.
5. **Records in effect operations and handlers.** An operation taking
   and returning a record; a handler clause updating it; a record field
   holding a `Handler(L)` value (not printable, not comparable). Task 8.

---

### Task 1: Behaviour-preserving splits

**Files:**
- Split src/Features/Check/Subst.purs (246), Unify.purs (245),
  src/Features/Resolve/Types.purs (240), src/Features/Specialize/Keys.purs
  (233) and src/Domain/Type/Core.purs (231) along real seams.
- Each must end with headroom for Tasks 3-8.

**Interfaces:** export lists are unchanged; importers change only module
names.

- [x] Split. `npm run verify` exits 0, and the differential against the
  base shows 0 differences.
- [x] Commit `refactor: splits for R001`.

### Task 2: Specialization-time printable check (E017)

**Files:**
- New module under src/Features/Specialize/ (e.g. Printable.purs), called
  where print, show and crash sites get their ground types.
- Tests: test/r001-printable.test.mjs.
- Regression: new scripts/regression-r001.mjs and test/regression-r001.mjs
  (model them on regression-fx020).

**Interfaces:**
- Produces: `groundPrintable ∷ Ty Void → Boolean` (true unless a function
  or handler occurs anywhere, including nested data). Task 6 extends it
  to records.
- A failing site returns E_TYPE `Expected a printable value, found <t>`
  at the print site's span, with `<t>` printed ground.

- [x] **Failing tests.** For each of `show`, `Console.print` and `crash`,
  a generic printer `fn p(x: a): … = show(x)` (or `Console.print(x)`,
  `crash(x)`) is reached with:
  - a function;
  - a `Handler(Log)`;
  - `Box(Int -> Int)` (nested in an ADT).

  Each gives E_TYPE `Expected a printable value, found <t>` at the print
  site, never E_TOOL. A printable instantiation (`Int`, `Box(Int)`) still
  runs.
- [x] Implement it.
- [x] **Regression row `r001-print-ground`.** Restoring "no
  specialization-time check" makes the probe reach E_TOOL.
- [x] **Differential.** List every existing source that changes. The only
  allowed change is E_TOOL → this E_TYPE.
- [x] Commit `fix: printable check at the ground type (E017)`, and mark
  BACKLOG E017 done.

### Task 3: Record types: syntax, resolution, row sorts

**Files:**
- src/Domain/Syntax/Core.purs: a `RecordType` type reference (fields,
  each with a span, plus an optional `...r` tail).
- src/Format/Parse/Type.purs (or a new Format/Parse/RecordType.purs): `{`
  in type position.
- src/Domain/Type/Core.purs: `TRecord (RecordRow v)`.
- New src/Domain/Type/Record.purs:
  `RecordRow v = { fields ∷ Array (Tuple String (Ty v)), tail ∷ Maybe v }`,
  kept sorted by label, with `recordRow`, `sortFields` and `labels`.
- src/Features/Resolve/Types.purs: resolution of record types, plus the
  sort of every row variable (record or effect), solved over declarations
  to a fixed point. An unconstrained variable defaults to effect sort.
- Problem: duplicate field (`DuplicateKind` Field); the two row-sort
  errors (new constructors).
- Tests: test/r001-types.test.mjs.

**Interfaces:**
- Produces `TRecord`, `RecordRow`, the record sort on VarIds, and
  `sortOf ∷ VarId → Sort` from resolution.
- The empty row is `{ fields: [], tail: Nothing }`, internal only.

- [x] **Failing tests:**
  - **Parsing:** `{ a: Int, b: Bool }`, `{ a: Int, ...r }`, `{ ...r }`,
    a trailing comma, and nesting inside a constructor field and in a
    type argument.
  - **Order:** `{ b: Bool, a: Int }` equals `{ a: Int, b: Bool }` (same
    resolved type).
  - **Duplicate:** `Duplicate field name` at the second label, with
    `first written here`.
  - **Row sorts:** `r is a record row, not an effect row` for `fn f(x:
    { a: Int, ...r }): Unit with ...r`, and the reverse text for the
    reverse order, each at the conflicting use with a note at the first.
  - **Propagation:** through `type Box(...r) = Box({ a: Int, ...r })` used
    as `Box(...e)` together with `with ...e` (sort error), and through a
    forward reference.
  - **Default:** an unconstrained declaration row parameter stays effect
    sort, so existing programs are unchanged.
  - **Source:** `{}` in type position is E_SYNTAX (existing text).
- [x] Implement it. Verify, run the differential (new sources only), and
  commit `feat: record types and row sorts`.

### Task 4: Record-row unification with lacks sets

**Files:**
- New src/Features/Check/UnifyRecord.purs.
- A lacks map per record meta in the substitution (the split from
  Task 1).
- Calls from Unify for `TRecord`.
- Type printing for diagnostics (sorted labels, `...r`).
- Tests: test/r001-unify.test.mjs, driven through whole programs with
  annotated functions.

**Interfaces:**
- Produces `unifyRecord ∷ … → RecordRow Flex → RecordRow Flex → Either
  Failure Subst`.
- Its failures map to the existing `Expected X, found Y` at existing
  locations. They map to `Duplicate field name` only when two source
  occurrences are known.

- [x] **Failing tests,** one per spec §2 rule:
  1. **Closed versus closed:** same labels unify; a missing or extra
     label gives `Expected { a: Int, b: Bool }, found { a: Int }`.
  2. **Extension of a meta tail.**
  3. **Shared remainder.** A program forcing `{ a: Int, ...ρ }` ~
     `{ b: Bool, ...σ }`, observable through both arguments' use.
  4. **Lacks propagation:**
     - binding a tail to a row containing a forbidden label is rejected
       with the shape mismatch;
     - the lacks set survives into the remainder and through
       instantiation of `fn f(x: { a: Int, ...r }): …` called at
       `{ a: Int, b: Bool }`.
  5. **Occurs check:** a cyclic record equation is rejected, as is a
     shared tail with incompatible explicit labels.
  6. **Rigid tails:** known-field access on `{ name: Text, ...r }`
     succeeds; an unknown field is `age is not a field of { name: Text,
     ...r }` and never extends `r`.
- [x] Implement it. Verify, run the differential, and commit `feat: record
  row unification`.

### Task 5: Literals, access, update (parse, resolve, infer)

**Files:**
- **Parser:**
  - Format/Parse/Expression.purs or a new Format/Parse/Record.purs: a
    literal, when `{` is followed by a lowercase name and `:`;
  - Format/Parse/Name.purs and Grammar: postfix `.l` (touching) and
    `{ l = v, … }` on any non-qualifier receiver, at the same level as
    calls, left to right.
- **Syntax and Resolved nodes:** `RecordLiteral`, `FieldAccess`,
  `RecordUpdate`, each with spans for every label.
- **Checked nodes** (Domain.Checked.Internal): the same three. Literal
  fields are kept in written order (evaluation order); the sorted order
  is in the type.
- **Inference** in a new Features/Check/Record.purs.
- **Tests:** test/r001-expressions.test.mjs and test/r001-parse.test.mjs.

**Interfaces:**
- Produces `Checked.RecordLiteral (Array {label, value})`,
  `Checked.FieldAccess Expr String` and `Checked.RecordUpdate Expr (Array
  {label, value})`.
- Task 7 lowers these.

- [x] **Failing tests:**
  - **Literal:** a literal and its inferred closed type; `{}` is still
    Unit; `{ x }` is still a block.
  - **Access:** access, chains `r.a.b`, and access after a call and after
    parentheses.
  - **Update:** update, and `f(x) { name = n }.name` grouping as
    `((f(x)) { name = n }).name`. `|>` binds looser.
  - **Missing field:** `age is not a field of { name: Text }` at `age`,
    for both access and update.
  - **Duplicate:** a duplicate in a literal or update gives `Duplicate
    field name`.
  - **Non-record access:** `Expected a record, found Int` at the
    receiver.
  - **Type preservation:** an update with a wrong-typed value gives
    `Expected Int, found Text` at the value.
  - **Qualifiers:** `Log.log(1)` is unchanged, and a spaced `r . a` gives
    the existing `Expected ';'`.
  - **Review Focus 1 and 2:** the receiver kinds; `match r { a = 1 } { … }`
    parses as an update head; a match arm `a => …` is unchanged;
    `with h { log(1) }` is unchanged.
- [x] **Depth.** Measure the four forms before and after in an isolated
  copy, with no loss. Record the figures in the report, and in G002 only
  if they change.
- [x] Implement it. Verify, run the differential, and commit `feat: record
  literals, access and update`.

### Task 6: Comparison and printability on records

**Files:**
- Features/Check/Comparable.purs: records are comparable when every
  field is, and a record tail variable is a variable for groundness.
- Features/Check/Printable.purs and Task 2's module: records are
  printable when every field is, including tails at the ground type.
- Tests: test/r001-compare.test.mjs.

- [x] **Failing tests:**
  - **Comparison groundness:** comparing a `{ name: Text, ...r }` in
    generic code gives `Type { name: Text, ...r } is not comparable` at
    the left operand. A concrete call site comparing a known record is
    accepted.
  - **Function fields:** a record with a function field is not comparable
    (existing text with the record type).
  - **Printing in generic code:** a generic printer of `{ a: Int, ...r }`
    is accepted. At `r = { f: Int -> Int }` it gives Task 2's E_TYPE
    naming the full record.
  - **Handlers:** a record holding a `Handler(Log)` field is neither
    comparable nor printable.
- [x] Implement it. Commit `feat: record comparison and printability
  rules`.

### Task 7: Specialization keys and Go lowering

**Files:**
- **Specialization:** Features/Specialize/Keys.purs and Intern.purs.
  Record row arguments are canonicalised (sorted labels, interned field
  types) in function keys, and closed shapes are interned as layouts.
- **IR** (Domain.IR.Internal): `TRecord LayoutId` and record nodes.
- **Go:** a new Format/Go/Record.purs for structs `waxwingRec<N>`.
  - Fields are named with a fixed prefix plus the label, in sorted order.
  - A field of declared type is a pointer, and records are values.
  - Literal and update use temporaries in written order, skipping a
    temporary only for a literal or a local name.
  - Compare and show helpers are emitted only when used, with nil-guarded
    ADT fields.
  - The empty layout is an empty struct.
- **Example:** examples/records.wxw with bootstrap/records.go.
- **Tests:** test/r001-go.test.mjs, plus the snapshot in the existing
  snapshot test.

**Interfaces:**
- Consumes Task 5's checked nodes.
- Produces deterministic layout numbering, in first-use order of the
  worklist, as ADTs have.

- [x] **Failing tests:**
  - **Shapes:**
    - `{ x: Int }` and `{ x: Text }` are two structs;
    - two orderings of one shape are one struct;
    - two calls with reordered rows share one function copy (Review
      Focus 3).
  - **Evaluation order:** literal and update fields with `Console.print`
    in the field expressions print in written order, and the base of an
    update is evaluated once.
  - **Recursion:** `type Node = End | Node({ child: Node })` builds a
    three-level value that runs, compares and prints. A list of records
    does the same.
  - **Nil:** a nil ADT field inside a record reports the existing
    malformed-value panic (Review Focus 4).
  - **Ordering and printing:** `<` on records compares fields in sorted
    label order. `print` gives `{ age: 36, name: "Ada" }`.
  - **Determinism:** two emits are byte-identical, and the seven existing
    snapshots are byte-identical.
  - **Keys:** existing specialization keys are unchanged (differential: 0
    Go differences on existing sources).
  - **Limit:** record layouts do not count toward the 10,000 limit, but
    function copies at new row arguments do. A test pins both counts.
- [x] Implement it. Verify, run the differential, and commit `feat: record
  specialization and Go lowering`.

### Task 8: Records as `Fail` payloads

**Files:**
- Domain/Row.purs: `TypeHead` gains `HeadRecord (Array String)`, the
  sorted labels.
- Fail key settling in Features/Check/Failure.purs and Unify: a payload
  whose labels are still unknown stays deferred.
- Runtime keys (Format/Go, Fail key assignment): label sets count up from
  MinInt32 + 1, in sorted order of their canonical label lists. The
  emitter refuses a program in which that range would meet the
  declared-type range, which counts down from -4.
- Tests: test/r001-fail.test.mjs.

- [x] **Failing tests:**
  - **Same family:** `Fail({ a: Int, b: Int })` raised and caught by a
    clause `fail(error: { b: Int, a: Int })`.
  - **Two families at once:** handlers for `{ code: Int }` and `{ msg:
    Text }` are installed together, and each abort reaches its own
    handler.
  - **Same labels:** `{ code: Int }` versus `{ code: Text }` in one row is
    the existing mismatch.
  - **Open payloads:** an open payload in generic code gives `Fail needs
    a concrete error family`.
  - **Existing keys:** Int -1, Bool -2, Unit -3, data -4−id and Text
    MinInt32 are unchanged (check emitted Go), as are the seven
    snapshots.
  - **Review Focus 5:**
    - an operation taking and returning a record;
    - a handler clause that updates the record;
    - a record field holding a `Handler(L)`.
- [x] Implement it. Commit `feat: records as Fail payloads`.

### Task 9: Reference interpreter and generator

**Files:**
- test/fx-oracle*.mjs: records as an independent model. That covers
  literal evaluation order, access, update, sorted-order comparison and
  printing, and Fail families by label set.
- test/fx-gen-*.mjs: generate record types, literals, access, updates and
  generic functions over open records.
- test/fx-census.mjs: minimums for programs that run a record literal, an
  access, an update and a generic record function.

- [x] Write the interpreter tests first (record RED).
- [x] Implement them.
- [x] Run `WAXWING_FX_SEED=$((20261010+500*k)) node --test
  test/fx-differential.serial.test.mjs` for k=0..10. Each seed must show
  0 disagreements.
- [x] Commit `test: records in the interpreter and generator`.

### Task 10: Regression rows, scale, proxy measurement

**Files:**
- scripts/regression-r001.mjs and test/regression-r001.mjs (from Task 2).
- test/r001-scale.serial.test.mjs.

- [x] **Rows,** each "fixed passes; restored defect fails":
  - `r001-sorted-layout`: layouts in written order;
  - `r001-lacks`: no lacks check;
  - `r001-shared-remainder`: tails extended independently;
  - `r001-field-order`: Go composite literal order relied on;
  - `r001-shape-types`: shape identity by labels only.
- [x] **Scale.** N distinct shapes flow through a chain of K generic
  functions. Measure keys, Go lines and compile and build time on this
  host, and set each bound to 3x the median of five runs (the Text v1
  method: one warm-up build, then the minimum of three builds).
- [x] **Proxy.** Overlapping record-of-function environments are passed
  through generic code. Record keys and lines in docs/progress.md as a
  proxy for the services scenario, not as a validation of it.
- [x] Commit `test: R001 regression rows and scale`.

### Task 11: Documentation

- [x] **ADR 013** (docs/adr/013-records.md): the as-built decisions,
  including why record rows enter specialization keys while effect rows
  stay erased (ADR 010), and the confirmation of ADR 002.
- [x] **docs/language.md:** a Records section and the grammar.
- [x] **docs/architecture.md:** the new modules.
- [x] **README:** records under "works today", plus a sample.
- [x] **BACKLOG:**
  - R001: first tranche done;
  - new fast-follow items: record patterns; extension, merge and removal
    with written lacks constraints;
  - later items: polymorphic fields, punning and type aliases;
  - E017: done;
  - G002 if the margin changed.
- [x] **Progress files:** docs/progress.md, docs/next-session.md, and
  docs/findings.md if anything was learned.
- [x] Run `node scripts/width.mjs` after `git add`, then verify.
- [x] Commit `docs: R001 ADR 013 and language`.

## Execution

Subagent-driven, as for FX020:
- Sonnet implements and Opus reviews, with a review gate after every task
  and a whole-branch Opus review before the user's merge decision.
- Branch `records` in .worktrees/records, integrated by fast-forward
  only, and pushing needs the user's approval.
