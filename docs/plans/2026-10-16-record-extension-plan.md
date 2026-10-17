# R005 Tranche A Implementation Plan (extension, written lacks, removal)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `{ ...p, admin: true }` (at most one spread), `where r lacks {
a, b }`, rest binders `{ name, ...rest }`, `p without { name, age }`, and
the empty record type `{}`, checked, lowered to Go and documented.

**Spec:** docs/plans/2026-10-16-record-extension-design.md §1-§5
(Tranche A approved 2026-10-16). Tranche B (§6) is not part of this plan.

**Architecture:**
- **New expression forms, old ones untouched.** A literal with a spread
  is a new form, `RecordExtension Span (Array Item)` with `Item = Given
  FieldValue | Spread Span Expr`, kept in written order to the IR so
  evaluation is left to right. A literal without a spread stays
  `RecordLiteral`, so existing programs lower byte-identically. Removal is
  `RecordRemoval Span Expr (Array Label)`, `Label = { name, span }`.
- **Rest binders** keep three distinct states (review, 2026-10-16): no
  rest, bare `...`, and named `...rest`. Syntax `Maybe Rest` with `Rest =
  { span, name ∷ Maybe Label }`; Resolved, Checked and IR an explicit
  `data Rest = NoRest | IgnoredRest | NamedRest LocalId` (the IR's
  carries the remainder's type), replacing R004's Boolean. Coverage
  treats a named rest as `_` (no change).
- **The remainder's layout is registered explicitly.** A named rest's
  type travels through checking (Checked carries it, retyped at
  settlement) and specialization, which registers the remainder layout
  even when no body expression has that type. An unused named rest
  follows Go lowering's existing treatment of unused binders.
- **Written lacks** are `constraints` on FunctionDecl at Syntax and
  Resolved (`Lacks { variable, span, labels }`). They join the implied
  lacks facts (Check/Implied, Seed) for the body and at each
  instantiation, keeping their provenance (the clause label's span) so a
  violation at a call can use the approved text.
- **Empty record type** `{}` is `TRecord` with no fields and no tail,
  which already exists internally (ADR 013); it never unifies with
  `TUnit`.

**Tech Stack:** PureScript 0.15.16, Spago 1.0.4, purs-tidy 0.11.1, Node
test runner, Go 1.26.4. No new dependency.

**Status:** Tasks 1 and 2 done (2026-10-16); Task 3 pending.

## Global Constraints

- **AGENTS.md governs:** files ≤250 lines; 80 columns (`node
  scripts/width.mjs`, check its exit code); `where`, not `let … in`; no
  anonymous lambdas; `maybe`/`either` with named helpers (the structural
  gate rejects `case` on Maybe/Either); layer and IR allowlists; error
  codes as an ADT; regression proofs fail with the defect restored.
- **Approved texts only** (design §3, §5):
  - existing `Duplicate field admin`, note `first written here`; for a
    literal, at the later item in written order with the note at the
    earlier: `{ ...p, admin: true }` at `admin` noted at `...p`;
    `{ admin: true, ...p }` at `...p` noted at `admin`;
  - existing `r may already have field admin`, note `r is introduced
    here`, at the label;
  - E_TYPE `admin is not allowed here: r lacks { admin }`, at the call
    argument, note `required here` at `admin` in the `where` clause;
  - E_TYPE `A record literal accepts at most one spread`, at the second
    spread;
  - existing `age is not a field of { … }` and `Duplicate field age` for
    `without`, at the label; `Expected a record, found T` at a non-record
    spread or receiver.
- **A `lacks` target that is not a record row variable** (approved
  2026-10-16), at the constraint's variable: an unknown name, existing
  E_UNBOUND for a type variable; an effect row, existing `r is an effect
  row, not a record row`; a type variable, E_TYPE `a is a type, not a
  record row`. Any other new text is a stop.
- **Reserved words** `where`, `lacks`, `without`, `disjoint` (design §2)
  break programs using them as names; ADR 013's section records it.
- **Buildable commits** with placeholders, as in R004: `Internal "R005
  placeholder: <what> (Task N)"` at the first downstream function that
  can fail; a function that cannot fail gets a real case. Task 3 gates on
  `grep -rn "R005 placeholder" src` being empty.

  | Added in | Placeholder at | Removed in |
  |---|---|---|
  | Task 1 (Resolved) | Check/Infer for `RecordExtension`, `RecordRemoval`; Check/RecordPattern for a named rest | Task 2 |
  | Task 2 (Checked) | Specialize/Body for the new expressions (`record extension and removal are lowered in Task 3`) and a named rest (`rest binders are lowered in Task 3`) | Task 3 (removed) |

- **Go output** of existing programs stays byte-identical (bootstrap
  snapshots; the differential against main changes only sources using the
  new syntax or the four new reserved words).
- **Files near the limit:** IR/Internal 243, Resolve.purs 242,
  Grammar 244, Resolved 229, Check/RecordPattern 227, Use 220, Infer
  214. Extract a module before adding to any of them; a split is its own
  behaviour-preserving commit (differential: 0 differences).
- **Every task:** tests seen failing first; `rm -rf output &&
  GOTOOLCHAIN=go1.26.4 npm run verify` exits 0 on the committed tree;
  delete .build/regression and .build/go-cache afterwards; no `git
  stash`.
- **Models:** Sonnet for Tasks 1 and 3; Opus for Task 2. Task 3's
  regression rows get an Opus review.

## Review Focus

1. **Evaluation order.** `{ a: f(), ...g(), b: h() }` calls f, g, h in
   that order, once each, in the reference interpreter and in Go. Task 3.
2. **Overlap locations** follow written order (Global Constraints).
   Task 2.
3. **Written-lack provenance** survives instantiation through a generic
   wrapper: the violation still names the clause. Task 2.
4. **`{}` versus Unit** in types, unification, printing and Go. Tasks 1-3.
5. **Exhaustive case analyses** over the new forms: Walk, Failure,
   Coverage, Comparable, Printable, DeferNotes, Instantiation, LocalUses,
   Specialize/Body, Go Expression/Context/Usage, Capture. Tasks 2-3.

---

### Task 1: Surface, resolution and written-lack scoping

**Files:**
- Lexer: Format/Lex/Chars.purs `reserved`; the editor grammar's
  `wordGroups` in scripts/editor-grammar-generate.mjs (`keyword.control`),
  regenerated grammar and snapshots; fixtures using the words as names.
- Types: Format/Parse/Type.purs `{}` builds `RecordRef span [] Nothing`.
- Literals: Format/Parse/Record.purs items (`...e` or `l: e`);
  Lookahead `labelled` also accepts `{ ...`; Expression.purs's two
  literal choices.
- Postfix: Format/Parse/Postfix.purs, a `Without` suffix (`on
  "without"`, `startsSuffix`), labels braced via RecordType `label`.
- Patterns: Format/Parse/RecordPattern.purs `restItem` takes an optional
  name after `...`.
- Signatures: Format/Parse.purs `function`, an `optionalOn "where"`
  constraint list before `=` (a new module, not Grammar.purs);
  Syntax.FunctionDecl `constraints`.
- Domain forms: Syntax, Resolved (span accessors included).
- Resolve: Resolve/Record.purs for the new expressions; a second spread
  is the approved E_TYPE; duplicate labels in a literal, `without` or
  `lacks` via RecordFields; a named rest issues a LocalId (Resolve/
  RecordPattern, Pattern `binders`); constraints resolve their variable
  against the signature's sorted variables (the approved texts for
  non-record ones) and join Resolve/Lacking `lackingOf` so body types
  may write the lacked labels.

- [x] Failing tests test/r005-parse.test.mjs and r005-resolve.test.mjs:
  each new form parsed (spread first, last, alone; `without` chained
  with call, access, update and `|>`; named and bare rest; `where` with
  several constraints; `{}` in parameter, result and nested types);
  reserved-word use as a name is E_SYNTAX; second spread; repeated
  labels; constraint variable errors; a body type writing a lacked
  label is accepted only with the clause.
- [x] Implement; editor grammar test passes; depth probe unchanged;
  verify; commit.

### Task 2: Checking

**Files:** Domain/Checked forms; a new Check/Extension.purs (spread),
Check/Removal.purs (`without`), the rest binder in Check/RecordPattern
(extract first: 227 lines); Check/Implied and Seed take written lacks with
provenance; Lacks violation reporting distinguishes a written lack;
Problem and Diagnostic for the two new texts; the traversals in Review
Focus 5; placeholders in Specialize/Body.

**Rules:**
- **Spread** (design §1): infer the base; a `TRecord` must not hold the
  literal's labels: a known field is the overlap (written-order
  location), a rigid tail must lack each label (else `r may already have
  field`, note at the signature's first `...r`); a hole base is unified
  with `{ ...ρ }`, ρ fresh lacking the labels; anything else is `Expected
  a record`. The result is the base's row plus the fields.
- **`without`:** each label a known field (`.l`'s rule); a hole receiver
  is unified with `{ l1: α1, …, ...ρ }`, ρ lacking them; the result is
  the remainder, `{}` when nothing is left.
- **Rest binder:** its type is the matched type minus the pattern's
  labels (the open tail, or the closed remainder).
- **Written lacks:** seeded for the body (rigid) and at each use (meta);
  a call whose argument puts a lacked label in the tail is the approved
  text at the argument, noted at the clause's label, also through a
  generic wrapper that passes the row on.
- **`{}`** unifies only with an empty closed record.

- [x] Failing tests test/r005-check.test.mjs: every text at its
  location in both written orders; hole bases and receivers; rigid
  tails with and without the clause; rest binder types; removal to `{}`;
  `{}` against Unit both ways; provenance through a wrapper; written
  lacks through a function reference (`let g = granted;` then `g(p)`)
  and through partial application, each rejected when the later
  application supplies the forbidden field; a named rest's type after
  settlement.
- [x] Implement; verify; commit.

### Task 3: Lowering, evidence, docs, close-out

- [ ] **Lowering:** Specialize/Body copies the new forms (placeholders
  removed). Format/Go/Record: extension evaluates items in written order
  into temporaries, then builds the result struct from the base's fields
  and the new ones; removal copies the remaining fields into the result
  layout; a rest binder builds its remainder struct from the scrutinee's
  access path; the empty layout is the empty struct. Usage/RecordUse
  register helpers; Capture and Context cover the new forms. Executed
  tests test/r005-go.test.mjs: evaluation order with effects, extension
  of an open row specialized twice, removal and rest to `{}`, `{}`
  printing beside `()`, equality of empty records, ADT-valued fields
  kept as pointers; an unused named rest whose remainder shape appears
  nowhere else in the program (its layout is still emitted and the Go
  builds); bare `...` and no rest unchanged. Snapshots byte-identical;
  verify; commit.
- [ ] **Reference execution:** the FX001 interpreter
  (test/fx-oracle-records.mjs, fx-oracle-parse.mjs) evaluates spreads,
  `without`, named rests and `{}` (with an event per spread for order),
  sharing no compiler code; a generator compares it with Go for
  generated programs, as test/fx-oracle-record-patterns.test.mjs does.
- [ ] examples/records.wxw, docs/language.md (grammar, reserved words,
  Records), ADR 013 section "Extension, written lacks and removal (R005
  Tranche A)" including the reserved-word break.
- [ ] Regression rows (scripts/regression-r005.mjs, probes in
  test/regression-r005.mjs), each proved failing: overlap check removed;
  overlap location ignoring written order; written lacks not seeded at a
  use; provenance lost (implied text instead); rest binder typed as the
  whole record; Go extension evaluating in the wrong order; `{}`
  unifying with Unit.
- [ ] `grep -rn "R005 placeholder" src` empty; differential against
  main classified; BACKLOG R005 (Tranche A done, B pending), progress,
  next-session; commit; the user's merge decision.
