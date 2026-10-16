# R004 Record patterns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `match` destructures records: `{ name: n, admin: true }`,
`{ name, ... }`, nested in and around constructor patterns, with
coverage, witnesses and Go lowering.

**Architecture:**
- **One new pattern form** at every layer: a record pattern holds its
  field patterns by label and whether it ends with `...`. A punned field
  is a binder pattern at parse time, so later layers never see puns.
- **Checking is type-directed.** The expected type, with the
  substitution applied, decides: a record type checks fields directly; a
  hole is unified with the record type the pattern writes (closed, or
  open with a fresh tail lacking the written labels, as `.l` does); any
  other type is the existing `Expected a record, found T`.
- **Coverage** treats a record type as one complete head, `HRecord`, over
  the type's known labels in label order. A record pattern is widened to
  every label, an unnamed one being `_`, so the matrix never forks on it.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Spec:** docs/plans/2026-10-16-record-patterns-design.md (decisions
approved 2026-10-16).

**Status:** Draft 2026-10-16, not started. One text needs approval first
(Global Constraints, "Stop item").

## Global Constraints

- **AGENTS.md governs:** files at most 250 lines; 80 columns
  (scripts/width.mjs after `git add`); `where`, no `let … in`, no lambdas;
  layer and IR allowlists; error codes as an ADT; regression proofs fail
  with the defect restored, in an isolated copy.
- **Approved texts only:**
  - `Pattern is missing field admin; add it or end the pattern with ...`
    (E_TYPE, at the pattern; the first missing label in label order);
  - witnesses `{ admin: false, name: _ }`, and `{ a: _, ... }` for an
    open type;
  - existing `Duplicate field x` (at the second label, note at the
    first), `a is not a field of { … }` (at the label), `Expected a
    record, found Int` (at the pattern), `Expected X, found Y`.
- **Stop item (before Task 4).** An open type whose known fields are all
  listed, without `...` (`{ a: x }` against `{ a: Int, ...r }`), has no
  missing field to name. Proposed E_TYPE `Pattern is missing the rest of
  { a: Int, ...r }; end the pattern with ...`. Needs the user's approval;
  any other new text is also a stop.
- **Go output** of every existing valid program stays byte-identical
  (bootstrap/*.go snapshots; differential against the base shows only
  sources that use record patterns or `{` in a pattern position, which
  were E_SYNTAX before).
- **Parser stack margin** not reduced (scripts/depth-probe.mjs, ADR 006).
- **Every task:** tests seen failing first; `rm -rf output &&
  GOTOOLCHAIN=go1.26.4 npm run verify` exits 0 on the committed tree;
  delete .build/regression and .build/go-cache afterwards.
- **Models.** Sonnet implementers for Tasks 1, 2, 3, 6 and 7 (mechanical,
  well-precedented); Opus for Tasks 4 and 5 (type rules and coverage).

## Review Focus

1. **Every case analysis.** Several pattern walks end in `_ →`
   fallthroughs (Check/Walk `foldPattern`, `retypePattern`; Resolve/
   Pattern `binders`; Go/Match `bindings`; Go/Capture `binders`) and
   would silently skip record fields' binders. Tasks 3, 4, 6.
2. **Holes.** A record pattern under a generic constructor (`Some({ a:
   x, ... })`) and a lambda-free scrutinee whose type is still a hole.
   Task 4.
3. **Rigid tails.** `{ a: x, ... }` against `{ ...r }` is `a is not a
   field of { ...r }`; nothing is learned from a rigid tail. Task 4.
4. **Coverage widening.** Rows written with different label subsets
   meet in one column; the oracle compares. Task 5.

---

### Task 1: Behaviour-preserving splits

**Files:** src/Domain/IR/Internal.purs (242): move `Pattern` and `Shape`
to a new IR-internal module, added to the IR allowlist in
scripts/structure.mjs and docs/engineering.md. Same for
src/Domain/Resolved.purs (224) if Task 3 would pass 245.

- [ ] Split; export lists unchanged for importers except module names.
- [ ] Verify; differential against the base: 0 differences.
- [ ] Commit `refactor: splits for R004`.

### Task 2: Parse

**Files:** src/Domain/Syntax/Core.purs (`PRecord Span (Array
FieldPattern) (Maybe Span)`, the `...`'s span), Syntax `patternSpan`,
src/Format/Parse/Pattern.purs (`on "{" recordPattern`), a new
src/Format/Parse/RecordPattern.purs reusing RecordType `label` and the
`nested (defer …)` idiom; `{ name }` and `{ name, ... }` parse a punned
field as `PBind`.

- [ ] Failing tests test/r004-parse.test.mjs: nested, trailing comma,
  `...` only last, `{}` and `{ ... }` E_SYNTAX, pun, a pun beside a
  literal field.
- [ ] Implement; depth probe unchanged; verify; commit.

### Task 3: Resolve

**Files:** src/Domain/Resolved.purs (`Record Span (Array (Tuple String
Pattern)) Boolean`), src/Features/Resolve/Pattern.purs `walk`,
`binders`; duplicate labels through Resolve/RecordFields; a new
Resolve/RecordPattern.purs if Pattern.purs passes ~150.

- [ ] Failing tests: duplicate label (with note), duplicate binder across
  fields and puns, binders scoped to the arm.
- [ ] Implement; verify; commit.

### Task 4: Check (after the stop item is settled)

**Files:** src/Domain/Checked/Internal.purs (`Record (Array (Tuple
String Pattern)) Boolean`), src/Features/Check/Match.purs (new
Check/RecordPattern.purs for the rule), Check/Walk `foldPattern` and
`retypePattern`, Domain/Problem (`PatternMissingField`, and the stop
item's problem), Format/Diagnostic texts.

**Rule:** apply the substitution to the expected type. A `TRecord`:
each label must be known (else MissingField at the label), each field
pattern checked against its field type, then without `...` the first
unlisted label in order is PatternMissingField; an open row without
`...` is the stop item's error. A hole: unify with `TRecord` of fresh
holes per label, closed, or with a fresh tail plus `addLacks` of the
labels when `...` (Check/Record `select` precedent). Otherwise
ExpectedRecord.

- [ ] Failing tests test/r004-check.test.mjs: each diagnostic at its
  location; generic constructor field; rigid tail; field order
  irrelevant; bodies typed with field binders.
- [ ] Implement; verify; commit.

### Task 5: Coverage and witnesses

**Files:** Check/Signature (`HRecord (Array String)`, `candidates`,
`arity`, `fieldTypes`, `witnessOf`), Check/Matrix (`complete`,
`simplify` widening to the column type's labels), Check/Missing
(`opened`, `rebuild`), Domain/Problem `Witness` (`WRecord (Array (Tuple
String Witness)) Boolean`), Format/Diagnostic `pattern`; test/coverage-
oracle.mjs and coverage.test.mjs gain a record type and record patterns.

- [ ] Failing tests: redundant arm after an exhaustive record row;
  missing witness through a record field; open-type witness `...`; a
  record of an uninhabited field type; oracle with records.
- [ ] Implement; verify; commit.

### Task 6: Specialize and Go

**Files:** Specialize/Body `copyShape`; Format/Go/Match `conditions` (no
tag test; fields via `recordField`, not pointers), `bindings`;
Format/Go/Capture `binders`; confirm a matched record's layout is
registered (Go/Usage, RecordUse).

- [ ] Failing tests test/r004-go.test.mjs: executed results for nested
  record-in-constructor and constructor-in-record patterns, puns,
  generic functions over open rows specialized twice, captured field
  binders in a lambda.
- [ ] Implement; snapshots byte-identical; verify; commit.

### Task 7: Example, docs, regression, close-out

- [ ] examples/records.wxw gains a match with record patterns (and its
  bootstrap snapshot regenerates only by that addition).
- [ ] docs/language.md pattern grammar and Records section; ADR 013
  addendum (or ADR 014) for record patterns.
- [ ] Regression rows (scripts/regression-r004.mjs, probes in
  test/regression-r004.mjs): a missing-field check removed, the
  widening removed, a Walk fallthrough skipping record binders, Go
  conditions ignoring record fields; each proved failing.
- [ ] Differential against main; timing tests unchanged (T007 rules).
- [ ] BACKLOG R004 done; progress, next-session; commit; merge decision.
