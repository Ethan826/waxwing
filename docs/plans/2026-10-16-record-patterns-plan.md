# R004 Record patterns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `match` destructures records: `{ name: n, admin: true }`,
`{ name, ... }`, nested in and around constructor patterns, with
coverage, witnesses and Go lowering.

**Architecture:**
- **One new pattern form** at every layer. A punned field becomes a
  binder at parse time, so later layers never see puns. Through
  resolution and checking a field keeps its label's span:
  `{ label ∷ String, span ∷ Span, pattern ∷ Pattern }`, so `{ unknown:
  value }` is reported at `unknown`.
- **Checking is type-directed** (design §2): a record type, an inference
  hole, or anything else (`Expected a record, found T`).
- **Coverage** treats a record type as one complete head,
  `HRecord { labels ∷ Array String, open ∷ Boolean }`, built by
  `candidates` from the column type. The head carries openness to
  `witnessOf`, which prints `...` for an open type. A record pattern is
  widened to every label of its type, an unnamed one being `_`.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Spec:** docs/plans/2026-10-16-record-patterns-design.md (decisions and
texts approved 2026-10-16).

**Status:** Revised 2026-10-16 after the user's review (label spans,
coverage roots and inhabitation, witness openness, buildable commits,
execution evidence, ADT pointers inside records), then regrouped into
four slices (user, 2026-10-16): the split folds into whichever task
needs it, parse and resolve are one task, and Go lowering joins the
evidence task. Tasks 1 to 4 done: complete on branch `record-patterns`,
awaiting the merge decision.

## Global Constraints

- **AGENTS.md governs:** files at most 250 lines; 80 columns
  (scripts/width.mjs after `git add`); `where`, no `let … in`, no lambdas;
  layer and IR allowlists; error codes as an ADT; regression proofs fail
  with the defect restored, in an isolated copy.
- **Approved texts only** (design §2, §3, §6):
  - `Pattern is missing field admin; add it or end the pattern with ...`
    (E_TYPE, at the whole pattern; first unlisted label in label order);
  - `Pattern is missing the rest of { a: Int, ...r }; end the pattern
    with ...` (E_TYPE, at the whole pattern);
  - witnesses `{ admin: false, name: _ }`, and `{ a: _, ... }` when open;
    a record type with no known field prints `_` (approved 2026-10-16);
  - existing `Duplicate field x` (at the second label, note at the
    first), `a is not a field of { … }` (at the label's name), `Expected
    a record, found T` (at the pattern), `Expected X, found Y`.

  Any other user-facing text is a stop: report it.
- **Buildable commits.** Each task adds its layer's constructor and
  handles it fully in that layer. At the first downstream function that
  can fail, it returns a placeholder,
  `Internal "R004 placeholder: <what> (Task N)"`, at the pattern's span.
  On the feature branch, a record pattern then fails as E_INTERNAL past
  the finished layers, and old programs are unaffected. A downstream
  function that cannot fail gets a real case. Placeholders:

  | Added in | Placeholder at | Removed in |
  |---|---|---|
  | Task 1 (Syntax, Resolved) | Check/Match `patternAgainst` | Task 2 |
  | Task 2 (Checked) | Check/Coverage, before the matrix, for any match holding a record pattern | Task 3 (removed) |
  | Task 2 (Checked) | Specialize/Body `copyShape` | Task 4 (removed) |
  | Task 2 (Checked) | Matrix `simplify` returns `Any` | Task 3 (removed) |

  Matrix `simplify` cannot fail. Task 2 gives it a real case, which
  Task 3 completes. Task 4 gates on `grep -rn "R004 placeholder" src`
  returning nothing.
- **Splits on demand.** A file that a task would push past 245 lines is
  split along a real seam in that task, as its own behaviour-preserving
  commit (differential: 0 differences) before the feature change.
  Candidates: src/Domain/IR/Internal.purs (242), src/Domain/Resolved.purs
  (224).
- **Go output** of every existing valid program stays byte-identical
  (bootstrap/*.go snapshots; the differential against the base changes
  only sources with `{` in a pattern position, which were E_SYNTAX).
- **Parser stack margin** not reduced (scripts/depth-probe.mjs, ADR 006).
- **Every task:** tests seen failing first; `rm -rf output &&
  GOTOOLCHAIN=go1.26.4 npm run verify` exits 0 on the committed tree;
  delete .build/regression and .build/go-cache afterwards.
- **Models.** Sonnet implementers for Tasks 1 and 4; Opus for Tasks 2
  and 3. Task 4's regression rows get a substantive Opus review whoever
  writes them.

## Review Focus

1. **Every case analysis.** Several pattern walks end in `_ →`
   fallthroughs and would silently skip binders inside record fields:
   Check/Walk `foldPattern`, `retypePattern`; Resolve/Pattern `binders`;
   Go/Match `bindings`; Go/Capture `binders`. Tasks 1, 2, 4.
2. **Label spans.** Each diagnostic about a field sits at the label, not
   the field's pattern or the record. Tasks 1, 2.
3. **Holes and rigids.** A record pattern under a generic constructor,
   an unannotated lambda parameter as scrutinee, a rigid `a`, and
   `{ ...r }`. Task 2.
4. **Coverage through records.** Roots, inhabitation and witnesses for
   nested records, parameterized ADTs and open rows. Task 3.
5. **Pointers.** ADT-valued fields inside records stay pointers, with
   nil guards and dereferenced binders. Task 4.

---

### Task 1: Parse and resolve

**Files:**
- src/Domain/Syntax/Core.purs: `PRecord Span (Array FieldPattern)
  (Maybe Span)`, where `FieldPattern` is `{ label, span, pattern }` and
  the `Maybe Span` is the `...`'s span. Also Syntax `patternSpan`.
- src/Format/Parse/Pattern.purs (`on "{" recordPattern`) and a new
  src/Format/Parse/RecordPattern.purs reusing RecordType `label` and the
  `nested (defer …)` idiom. A punned field parses as `PBind` at the
  label.
- src/Domain/Resolved.purs: `Record Span (Array Field) Boolean`, with
  `Field = { label ∷ String, span ∷ Span, pattern ∷ Pattern }`.
- src/Features/Resolve/Pattern.purs `walk` and `binders` (no
  fallthrough for records); duplicate labels through
  Resolve/RecordFields; a new Resolve/RecordPattern.purs if Pattern.purs
  passes ~150 lines.
- Placeholder in Check/Match `patternAgainst`.

- [x] Failing tests test/r004-parse.test.mjs, through `Format.Parse`
  `parse` as test/r001-parse.test.mjs does: nesting both ways, trailing
  comma, `...` only last, `{}` and `{ ... }` E_SYNTAX, a pun and a pun
  beside an explicit field, label spans.
- [x] Failing tests test/r004-resolve.test.mjs: duplicate label with
  its note; duplicate binder across fields and puns; binders scoped to
  the arm; an unbound name in an arm body using a field binder of
  another arm.
- [x] Implement; depth probe unchanged; verify; commit.

### Task 2: Check

**Files:** src/Domain/Checked/Internal.purs: `Record (Array { label ∷
String, pattern ∷ Pattern }) Boolean`. Also Check/Match, with a new
Check/RecordPattern.purs for the rule. Also Check/Walk `foldPattern`
and `retypePattern`, with real cases. Also Domain/Problem
`PatternMissingField` and `PatternMissingRest`, Format/Diagnostic
texts, and Matrix `simplify` (real case). Placeholders in
Check/Coverage and Specialize/Body `copyShape`.

**Rule** (design §2): apply the substitution to the expected type.
- **`TRecord`:** each label known, else MissingField at the label's
  span. Then each field against its type. Then, without `...`,
  PatternMissingField for the first unlisted label, or
  PatternMissingRest for an open row.
- **Hole:** unify with `TRecord` over fresh holes per label. Closed
  without `...`. With `...`, a fresh tail plus `addLacks` of the labels
  (Check/Record `select` precedent).
- **Otherwise,** a rigid variable included: ExpectedRecord at the
  pattern.

- [x] Failing tests test/r004-check.test.mjs: every text at its
  location, including `{ unknown: value }` underlining `unknown`;
  generic constructor field; unannotated lambda parameter; rigid `a`;
  `{ ...r }`; field order irrelevant; arm bodies using field binders.
- [x] Implement; verify; commit.

### Task 3: Coverage, inhabitation and witnesses

**Files:**
- Check/Signature: `HRecord { labels, open }`, `candidates` from the
  column's `TRecord`, `arity`, `fieldTypes`, `witnessOf` producing
  `WRecord`.
- Check/Matrix: `complete`, and `simplify` widening to the type's
  labels from the pattern's own type.
- Check/Missing: `opened` and `rebuild`.
- Domain/Problem `Witness`: `WRecord (Array (Tuple String Witness))
  Boolean`. Format/Diagnostic `pattern`.
- Check/Coverage `roots`: collect ADT applications inside record types,
  nested records included.
- Check/Expand `field` and Check/Inhabited: a record field is no longer
  read as `Int`. A record is inhabited exactly when each field type is.
  Its data fields enter the dependency graph like a constructor's.
- test/coverage-oracle.mjs and coverage.test.mjs: a record type and
  record patterns. The oracle shares no code with the compiler.
- Removes the Coverage placeholder.

- [x] Failing tests:
  - a redundant arm after an exhaustive record row;
  - a witness through a record field, and a nested open-record witness
    `{ a: { b: _, ... }, c: false }`;
  - a parameterized ADT inside a record, `{ o: Option(Bool) }`;
  - an ADT whose only constructor holds a record with an uninhabited
    field, which is uninhabited;
  - the oracle with records.
- [x] Implement; verify; commit.

### Task 4: Go lowering, execution evidence, close-out

**Files:**
- Specialize/Body `copyShape` and the IR record shape; removes the
  placeholder.
- Format/Go/Match `conditions`: no tag test, fields via `recordField`.
  A record-valued field is inline. An ADT-valued field, inside a record
  as anywhere, stays a pointer, keeping its nil guard.
- Format/Go/Match `bindings`: dereference ADT-valued binders.
- Format/Go/Capture `binders`.
- Confirm a matched record's layout is registered (Go/Usage,
  RecordUse).

- [x] Failing tests test/r004-go.test.mjs, executed:
  - a record in a constructor and a constructor in a record;
  - an ADT-valued field bound and matched;
  - puns;
  - a generic function over an open row, specialized twice;
  - field binders captured by a lambda.
- [x] Implement the lowering; snapshots byte-identical; verify; commit
  before the evidence work.
- [x] **Reference execution.** Extend the FX001 reference interpreter
  (test/fx-oracle-parse.mjs, fx-oracle-context.mjs `matches`,
  fx-oracle-records.mjs) and its program generator with record
  patterns: omitted fields under `...`, puns, nesting both ways, and
  binders used by arm bodies. Compare its results with the compiled Go
  programs' output. Kept separate from the coverage oracle.
- [x] examples/records.wxw gains a match with record patterns; its
  bootstrap snapshot changes only by that addition.
- [x] docs/language.md pattern grammar and Records section; ADR 013
  addendum (or ADR 014) for record patterns.
- [x] Regression rows (scripts/regression-r004.mjs, probes in
  test/regression-r004.mjs), each proved failing:
  - the missing-field check removed;
  - label spans replaced by pattern spans;
  - the widening removed;
  - a Walk fallthrough skipping record binders;
  - record inhabitation read as `Int` again;
  - Go conditions ignoring record fields.
- [x] `grep -rn "R004 placeholder" src` is empty. Differential against
  main. Timing tests unchanged (T007 rules).
- [x] BACKLOG R004 done; progress, next-session; commit.
- [ ] Merge decision (the user's; fast-forward only).
