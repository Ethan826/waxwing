# Merging records with unknown fields

> **Draft: describes the adopted design; implementation pending.**
> Final path: src/Features/Check/RowMerge/README.md (the implementation
> plan's Task 10a moves it there, makes it match the code, and has it
> reviewed for accuracy and readability; from then on it is
> authoritative for those modules). Until then the compiler does not do
> what this page describes: today it refuses a record literal with two
> spreads, and the checking described here is planned in
> docs/plans/2026-10-19-row-merge-implementation-plan.md.

This page explains how Waxwing's checker handles record merging, written
`{ ...a, ...b }`, for readers who know the language but not type theory.
The papers and source files behind it are listed at the end. The
decisions are recorded in docs/adr/014-composition-not-invention.md and
docs/plans/2026-10-18-row-merge-qualified-types.md ("The user's
decisions (2026-10-19)"); you do not need the plans to follow this page.

## 1. The problem

### Merging records whose fields are known

```wxw
fn main(): Int = { ...{ a: 1 }, ...{ b: 2 } }.b;
```

Both records are written out, so the checker sees every field: the
result is `{ a: Int, b: Int }`. Waxwing's merge is **disjoint**: the two
records may not share a field. An update such as `p { a = 2 }` is the
only way to replace a field (a settled decision, design draft 3).

### Merging records whose fields are not known yet

A function can merge records it knows nothing about:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
```

`r` and `s` are **row variables**: each stands for "some fields". The
signature says that `merge` takes a record with the fields `r` and one
with the fields `s`, and returns one with both. `where r disjoint s`
promises that the two never share a field, which is what makes `{ ...a,
...b }` well formed. Each use of `merge` picks its own `r` and `s`:

```wxw
fn main(): Int = merge({ x: 1 }, { y: 2 }).y;   // r = { x }, s = { y }
```

Here the arguments decide everything. The trouble starts when they do
not:

```wxw
fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = apply0(merge);
```

`apply0` wants a function whose result has `x` and `y`. `merge` fits if
`r` and `s` together are `{ x, y }`, but which part has which field?
Four answers work (`x` in `r` or `s`, `y` in `r` or `s`) and nothing in
the program chooses. The checker must not guess: it reports

```text
Cannot tell whether merge's r or s has field x; pass a lambda with
annotated parameters in place of merge
```

(an approved text, fixture test/fixtures/r005b/diag-01.json), and the
programmer writes the choice down:

```wxw
fn main(): Int = apply0(fn(p: { x: Int }, q: { y: Int }) => merge(p, q));
```

So the hard question is: when a merged row's parts are unknown, what
can the checker work out on its own, and when must it ask?

## 2. Four ideas, in small examples

### Rigid variables

Inside `merge`'s own body, `r` and `s` are **rigid**: they stand for
whatever a caller will pass, so the checker may not choose them. It may
use only what the signature says about them. That is why the clause
matters:

```wxw
fn size(p: { ...q }): Int = 0;
fn pair(a: { ...r }, b: { ...s }): Int = size(merge(a, b));
```

is refused with `r and s are not known to be disjoint; require r
disjoint s in the signature` (approved, fixture diag-16): nothing in
`pair`'s signature promises that `a` and `b` have no field in common.
Adding `where r disjoint s` to `pair` fixes it.

### Unknowns

At a **use** of `merge`, its `r` and `s` become **unknowns**: rows the
checker is trying to find for this one use, like the unknown `x` in an
equation. `merge({ x: 1 }, { y: 2 })` finds them at once.

### Waiting constraints

Sometimes a fact about unknowns cannot be used yet. The checker then
keeps it as a **waiting constraint** and comes back to it whenever
something it mentions becomes known.

```wxw
fn apply2(f: (a, b) -> { x: Int, y: Int }, p: a, q: b): Int = f(p, q).x;
fn main(): Int = apply2(merge, { x: 1 }, { y: 2 });
```

Before: when `merge` is passed as `f`, the checker learns "`r` and `s`
together are `{ x, y }`", which does not say which part has which
field, so the constraint waits. After: the second argument makes `r`
`{ x }`; the waiting constraint now says "`{ x }` and `s` together are
`{ x, y }`", so `s` is `{ y }`. The program is accepted (fixture
diag-11). The order in which the checker meets the arguments does not
change the answer.

### Defaulting

At the end of a function, an unknown that nothing constrains any more
is taken to be the empty record `{}` (the compiler already does this
for unused record unknowns, ADR 013):

```wxw
fn ignore(f: (p) -> q): Int = 0;
fn main(): Int = ignore(fn(p) => merge(p, { a: 1 }));
```

The lambda is never applied, so nothing fixes `p`'s fields. The merge
constraint is still solved, because one part (`{ a: 1 }`) is fully
known: the result is "`a` plus whatever `p` has". `p` is then an
unknown nothing constrains, and it defaults to `{}`. Accepted. What the
checker never does is default an unknown that a **waiting** constraint
still mentions: choosing `{}` there could pick an answer the program
did not mean, so the program is reported instead (next section).

### Why a valid program can still need an annotation

```wxw
fn both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int }): Int = 0;
fn main(): Int = both(merge, merge);
```

This program has exactly one typing: the shared `p` must be `{}` (it
would otherwise have to hold a field of both `{ x }` and `{ y }`), so
`q` is `{ x }` and `w` is `{ y }`. A person finds that by reasoning
across both constraints at once. The checker's rules look at one
constraint at a time and solve it only when its own known parts decide
it, so here both constraints wait and the checker says (the expected
text; this program's fixture, design-forced-bound, is accepted by the
earlier design, and moving it awaits the user's approval)

```text
Cannot tell whether merge's r or s has field x; pass a lambda with
annotated parameters in place of merge
```

One annotation settles it: `both(fn(p: {}, q) => merge(p, q), merge)`.
Waxwing chose this over a cleverer checker (§3); the price is measured
in §6.

## 3. The options weighed

**Adapt an existing compiler's algorithm.** PureScript solves the same
problem for its `Union` constraint with a short, published set of rules
in its type checker (§4). Adopting an *algorithm* means writing our own
code that follows those rules, citing them, and checking that ours
behaves the same. It is not *installing a library*: PureScript's rules
live inside its compiler, written against its own types, and no
reference code is licensed for reuse here (AGENTS.md). The research for
this design surveyed PureScript, Ur/Web, Gaster and Jones's records,
Morris and McKinna's Rose, Leijen's scoped labels and Koka
(docs/plans/2026-10-18-row-merge-alternatives.md §3.3) and found no
drop-in implementation of disjoint record merging that another compiler
could call.

**Use a general solver (Z3).** Z3 is a library: it decides logic
formulas. Encoded as formulas (research/row-merge-alternatives/
z3-encode.mjs), the label-only version of our problem is something Z3
answers exactly: it agreed with an independent brute-force checker on
2,072 problems, and a checker built on it could accept programs such as
`both(merge, merge)` (§2) that have exactly one answer. What it
would not give us (alternatives assessment §8.3): field types, the
ordinary unifier and the order of checking stay our code; deciding
whether a best answer exists is a hard problem (coNP-hard, design draft
3 §2.7), so a time limit would bring back an "unknown" answer; its
explanations are sets of formulas, not Waxwing error messages; it is a
34.6 MB WebAssembly module with an asynchronous interface, which the
checker's pure layer cannot call without restructuring; and it took
about 35-70 ms per problem against well under a millisecond. It stays a
research tool for cross-checking, outside the build.

**Keep our custom solver.** Tranche B's first design (2026-10-16 to
-18) added its own rules: a "sum rule", upper bounds on each unknown,
"homes" and "commits" that placed a field in the only part that could
hold it, and a bespoke way of re-checking waiting equations. It bought
real things: it accepted `both(merge, merge)`, the 186 programs of a
reviewed family of higher-order uses (each now needs one annotation),
and it proved some programs contradictory that the adopted design only
reports as undecided. It cost something harder to measure: those rules
had no published source, so nobody could check them against an
established account, and the author could not independently evaluate
them. ADR 014 makes the trade explicit: inventiveness belongs in the
language's design, while the implementation composes well-understood
techniques and accepts some annotation burden to do so.

## 4. The adopted design: QT-strict + Sym + H

"QT-strict" is PureScript's mechanism with nothing added; "Sym" and "H"
are two small, approved Waxwing rules.

### What comes from PureScript

PureScript 0.15.16 (tag commit 4c66c05a; the installed compiler, whose
relevant files are identical to the audited revision cb3c4965) treats
`Union left right result` as a constraint solved by its type checker,
src/Language/PureScript/TypeChecker/Entailment.hs, in `unionRows`:

1. **Left part fully known** (lines 636-638): the result is the left
   part's fields plus the right part.
2. **Right part and result fully known** (lines 639-660): the left part
   is the result minus the right part's fields; if a right field is
   missing from the result, no progress (line 654).
3. **Left part has some known fields** (lines 661-672): those fields
   move into the result, and a smaller constraint remains.

Otherwise the constraint waits (line 628). A constraint still waiting
at the end is an error when the function has a signature (lines
363-371), which every Waxwing function has. Waxwing turns `{ ...r, ...s
}` at a use into one unknown result and one such constraint, `Merge r s
t`, and applies these cases. Rows themselves (fields plus one unknown
"rest", unified field by field) are the long-standing technique of Rémy
and of ADR 013; "this row has no field `l`" is a lacks constraint (Jones
1992); disjointness is checked by breaking it into single facts, as
Ur/Web does (Chlipala 2010).

### What differs, and why

- **Disjoint union.** PureScript's `Union` allows duplicate fields and
  adds a separate `Nub` constraint to forbid them (the Record library's
  `disjointUnion`). Waxwing records never have duplicates, so `Merge` is
  disjoint by definition: one constraint, the same answers.
- **Sym: both parts are treated alike.** PureScript's cases look at the
  left part first. Taken alone, that makes `merge(p, { a: 1 })` fail
  where `merge({ a: 1 }, p)` succeeds, which a symmetric merge must not
  do. Sym tries the same three cases again with the parts swapped. It
  is safe because a disjoint union does not depend on the order of its
  parts; it never treats a part with a rigid variable as fully known,
  and it unifies field types rather than comparing or dropping them.
  Approved 2026-10-19; argument: qualified-types plan §14.1.
- **H: a useful contradiction instead of "cannot tell".** When checking
  ends with a constraint still waiting, H looks once more: if some field
  of one side cannot possibly be in any unknown part of the other side
  (each part is known to lack it, or could hold it only by breaking a
  promise the signature does not make), there is no answer at all, and
  the checker says so with a contradiction message instead of asking
  for an annotation. H runs only after everything else, changes nothing it
  looks at, and never turns a rejected program into an accepted one.
  Approved as a classification rule only, 2026-10-19; argument: §14.2.
- **No generalization.** PureScript may move an unsolved constraint into
  an inferred type; Waxwing signatures are written in full and lambdas
  are not generalized, so every constraint is settled inside the
  function that made it.
- **Defaulting only where nothing waits** (§2): an unknown no waiting
  constraint mentions becomes `{}`.

Nothing else improves a constraint: no rule combines two constraints,
and no part is ever guessed.

## 5. What programmers get

- **Disjoint merges.** `merge({ x: 1 }, { x: 2 })` is refused with
  `Field x is in both records: r disjoint s` (fixture diag-15).
- **Symmetric treatment.** Swapping a merge's arguments does not change
  whether a program is accepted or what types it gets (measured: 0
  differences on every test family, §8).
- **Predictable checking.** Whether a program is accepted, the types it
  gets, and the kind of error it gets do not depend on the order in
  which the checker meets its parts. This is **supported by
  measurement** on exhaustive small problem sets and millions of
  generated runs (§8); it is not proved.
- **Useful contradiction messages.** A field no part can hold is
  reported as a contradiction, for example
  `merge's { ...r, ...s } must be { x: Int, y: Int }, but neither r nor
  s can have field x` (fixture diag-14), and a field a known part cannot
  take as `… so r cannot have field z` (diag-13).

## 6. What programmers give up

Some valid programs need an annotation, and some annotations make a
function usable in fewer ways ("narrow its possible typings"). Every
example below defines `merge` as in §1. Counts of typings are over the
program's own fields plus one extra field `w`
(research/row-merge-qt, `node qt-checks2.mjs generality`).

| Program | Annotation | Does it narrow? |
|---|---|---|
| S1: `fn apply0(f: (a, b) -> c, g: (d, e) -> c): Int = 0;` `apply0(merge, merge)` | `apply0(fn(p: {}, q) => merge(p, q), fn(p: {}, q) => merge(p, q))` | **yes**: 5 typings become 2. Lost: the typings in which the merges' left parts hold fields; nothing uses the shared result `c`, so no behaviour changes, but the annotated program no longer type-checks there |
| Q1: `fn relate(f: (p, s) -> { ...u }, g: (q, s) -> { b: Int, c: Int, ...u }): Int = 0;` `relate(merge, merge)` | `relate(fn(p, s: {}) => merge(p, s), merge)` | **yes**: 3 become 2. Lost: the typing in which the shared `s` holds an extra field (it would appear in both results; unused) |
| S2: `fn ignore(f: (p) -> q): Int = 0;` `ignore(fn(p) => merge(p, { a: 1 }))` | none needed (Sym) | an annotation `fn(p: {}) => …`, needed only without Sym, would narrow: 2 become 1 |
| S3: `fn apply0(f: (a, b) -> {}): Int = 0;` `apply0(merge)` | `apply0(fn(p, q: {}) => merge(p, q))` | no: one typing, the annotation is redundant |
| `both(merge, merge)` (§2) | `both(fn(p: {}, q) => merge(p, q), merge)` | no (redundant) |
| a reviewed family of 392 higher-order programs `k(merge, …, merge)` sharing a parameter | the shared parameter, once | no: redundant in all 186 that have a best typing (the other 206 have no best typing and need a choice written down under every design considered) |

S1 and Q1 are the cases to remember: the annotation is the smallest
the checker accepts, it fixes the typing a cleverer checker would have
chosen, and the typings it excludes are ones nothing in the program
uses. S1 is a published example; Q1 was found by shrinking generated
programs. On generated problems (synthetic, weighted toward unknowns
nothing fixes) the adopted design accepted 9,210 runs where the earlier
custom design accepted 14,255 (raw), 4,340 against 19,895 (dense) and
7,792 against 10,546 (program-shaped); no collection of real Waxwing
programs exists to say how often users will meet this. The approved
hint names the fix: pass a lambda with annotated parameters.

## 7. What maintainers get

- **Less bespoke machinery.** The sum rule, upper bounds, homes and
  commits go (four whole modules and parts of several others, about
  560-650 lines by the plan's estimate). What remains is the row unifier of ADR
  013, the fact store of Tranche B Task 3, PureScript's three cases,
  and two short approved rules.
- **A clear connection to established implementations.** Each piece
  names its source (§4, the plan's §1.3), so a reader can compare it
  with PureScript's code or the papers.
- **Responsibility kept for Waxwing's adaptations.** Sym, H, the
  disjoint `Merge`, the empty default and the translation of `{ ...r,
  ...s }` into constraints are Waxwing's own; their arguments and
  evidence are in the qualified-types plan (§13-§14) and the rules file
  the plan's Task B0 writes, and the tests in §8 must keep passing.

## 8. Evidence and its limits

**What was measured** (research/row-merge-qt, a small JavaScript model
of the design written for this purpose, with an independent brute-force
checker that enumerates every answer):

- Every accepted program's answer satisfied every constraint and was
  the least one; every contradiction had no answer; on every family:
  generated raw, dense and program-shaped problems, a typed set of
  336,610 problems, and every problem of two exhaustive small domains
  (A: 3,339,712 problems, about 19 million runs; B: 79,825 problems).
- Acceptance, answers and kinds of error the same in every order
  checked, and with every merge's arguments swapped: 0 differences on
  all of them.
- H: acceptance and answers unchanged on every family, and none of its
  new contradictions had an answer.
- Against the installed PureScript compiler (research/purs-row-
  experiment): the model without Sym and H accepted exactly what
  PureScript accepted on all 13 sampled cases in every order. This is
  weak evidence: with a signature, PureScript rejected all but one of
  them.

**What that does not establish.** Measured is not proved: no argument
shows the rules reach the same verdict in every order. The generators
are synthetic. The model works with field names only, except a small
typed set with fixed field types; unknown field types, records nested
in fields, effects (rolling back and re-settling) and error texts are
argued, not modelled, and are the first things the compiler tests must
show (plan §3.3). No generated problem has a row of three unknown parts;
the ten published examples that do were each checked in every order of
their parts (a scratch check the plan's Task B0 commits).

**Where the checks live.** From research/row-merge-qt/ (needs only
`node`; outputs in its README):

```sh
node qt-adapt.mjs raw 21 2000      # raw problems, every variant
node qt-adapt.mjs shaped 1 2000    # program-shaped problems
node qt-typed.mjs 10               # the typed set
node qt-domains.mjs B 10           # exhaustive domain B (A: about 6 min)
node qt-checks2.mjs sym            # swapped arguments, typed
node qt-checks2.mjs generality     # does each annotation narrow?
node qt-fixtures.mjs fixtures      # the 72 published examples
```

From research/purs-row-experiment/: `node run.mjs` (needs `purs`
0.15.16). Once implemented, the compiler's own checks run in `npm run
verify`: the fixtures in test/fixtures/r005b/, the oracle tests
test/row-merge*.test.mjs and the permanent tests the plan lists (§4).

## 9. How the checker does it, step by step

Module names below are the plan's; they may change before
implementation.

1. **Making constraints.** When a use of `merge` is checked, its
   signature's `{ ...r, ...s }` becomes a new unknown `t` and the
   constraint `Merge r s t`; the checker records that `r` and `s` are
   disjoint (RowMerge/Desugar; facts: Check/Disjoint, Check/RowStore).
   A record type thus holds at most one unknown part.
2. **Unifying records.** Two record types are made equal by cancelling
   what they share and applying ADR 013's one-unknown rules
   (Check/UnifyRecord, Check/RowResidue, Check/RecordTail).
3. **Solving.** After each unification, every waiting constraint is
   tried with PureScript's three cases and then with its parts swapped
   (RowMerge/Cases, RowMerge/Improve), until nothing changes. A case's
   failure is a contradiction.
4. **The end of a function.** No constraint waiting: accepted, unused
   unknowns are `{}`. Otherwise H decides between a contradiction and
   "cannot tell" (RowMerge/End, Check/Homes).
5. **Reporting.** The messages are built only from that three-way
   result (Solved, Contradiction, Unresolved), so a "cannot tell"
   message can never claim a contradiction or the reverse.

## 10. Decision history

- docs/adr/014-composition-not-invention.md: why the implementation
  composes published techniques.
- docs/plans/2026-10-18-row-merge-qualified-types.md: the design, the
  measurements, the PureScript experiment, QT-strict, Sym and H, and the
  user's decisions of 2026-10-19.
- docs/plans/2026-10-18-row-merge-alternatives.md: the custom solver
  against simpler designs and Z3.
- docs/plans/2026-10-19-row-merge-implementation-plan.md: what is kept
  and removed, and how the compiler gets there.
- docs/adr/013-records.md: records, rows and their unification.

## References

- PureScript 0.15.16, src/Language/PureScript/TypeChecker/Entailment.hs
  (`unionRows`) and Environment.hs (`Union`'s dependencies),
  https://github.com/purescript/purescript (tag v0.15.16); the
  purescript-record library's `disjointUnion`.
- Mark P. Jones. A theory of qualified types. ESOP 1992 (constraints
  such as "lacks" attached to types). Simplifying and improving
  qualified types, FPCA 1995; Type classes with functional
  dependencies, ESOP 2000 (solving a constraint once its inputs are
  known).
- Benedict R. Gaster and Mark P. Jones. A polymorphic type system for
  extensible records and variants, 1996 (lacks constraints; cited, not
  re-read for this design).
- Adam Chlipala. Ur: statically-typed metaprogramming with type-level
  record computation. PLDI 2010 (disjointness constraints and their
  checking).
- Didier Rémy. Type inference for records in a natural extension of ML,
  1994 (rows with an unknown rest).
- Daan Leijen. Extensible records with scoped labels, 2005 (rows with
  duplicate labels, used for Waxwing's effect rows, not its records).
- The Haskell 98 Report, §4.3.4 (defaulting an ambiguous type).
