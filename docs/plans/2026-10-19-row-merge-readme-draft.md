# Merging records with unknown fields

> **Draft: describes the adopted design; implementation pending.**
> Final path: src/Features/Check/RowMerge/README.md. The implementation
> plan's Task 10a moves it there, makes it match the code and has it
> reviewed; from then on it is authoritative for those modules. Today's
> compiler refuses a record literal with two spreads, so nothing below
> runs yet (docs/plans/2026-10-19-row-merge-implementation-plan.md).

Waxwing merges records with `{ ...a, ...b }`. This page explains how the
type checker handles a merge when it does not yet know which fields the
records have. It is written for programmers who know the language; the
papers and source files come at the end.

## Two examples

Both examples use this function:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
```

`r` and `s` are row variables: each stands for "some fields". `merge`
takes a record with the fields `r` and one with the fields `s` and
returns one with both. `where r disjoint s` promises that the two share
no field. Each call of `merge` chooses its own `r` and `s`;
`merge({ x: 1 }, { y: 2 })` chooses `r = { x }` and `s = { y }`.

### The checker waits, then solves

```wxw
fn apply2(f: (a, b) -> { x: Int, y: Int }, p: a, q: b): Int = f(p, q).x;
fn main(): Int = apply2(merge, { x: 1 }, { y: 2 });
```

When `merge` is passed as `f`, the checker learns that `r` and `s`
together are `{ x, y }`. That does not say which part holds `x`, so the
checker keeps the fact as a waiting constraint. The next argument,
`{ x: 1 }`, is passed where `merge`'s first parameter goes, so `r` is
`{ x }`. The waiting constraint now reads "`{ x }` and `s` together are
`{ x, y }`", so `s` is `{ y }`, and the program is accepted. Meeting
the arguments in the other order gives the same result; that holds for
every order the evidence checked (see "Evidence and its limits").

### A valid program that needs an annotation

```wxw
fn both(f: (p, q) -> { x: Int }, g: (p, w) -> { y: Int }): Int = 0;
fn main(): Int = both(merge, merge);
```

Here the two merges share their first part `p`. The checker solves a
constraint only when that constraint's own known parts decide it, and
neither constraint is decided on its own, so both wait and the checker
reports

```text
Cannot tell whether merge's r or s has field x; pass a lambda with
annotated parameters in place of merge
```

Yet the program has exactly one typing. Taking both constraints
together, `p` would have to hold a field of `{ x }` and of `{ y }`, so
it is `{}`, `q` is `{ x }` and `w` is `{ y }`. Writing one part down
settles it:

```wxw
fn main(): Int = both(fn(p: {}, q) => merge(p, q), merge);
```

Waxwing accepts this cost on purpose. The earlier custom solver
reasoned across constraints as the paragraph above does, with rules for
which no published source was found (see "Why this design").

## The ideas behind it

### Rigid variables

Inside `merge`'s own body, `r` and `s` are rigid:
they stand for whatever a caller passes, and the checker may use only
what the signature says about them. That is why the `disjoint` clause
matters. Without it in its own signature,

```wxw
fn size(p: { ...q }): Int = 0;
fn pair(a: { ...r }, b: { ...s }): Int = size(merge(a, b));
```

is refused with `r and s are not known to be disjoint; require r
disjoint s in the signature`.

### Unknowns and waiting constraints

At each call of `merge`, its `r` and `s` become unknowns that the
checker solves for that call alone. A fact about unknowns that cannot
be used yet is kept as a waiting constraint and tried again whenever
something it mentions becomes known, as in the first example.

### Defaulting

When a function's body has been checked, an unknown
that no waiting constraint mentions is taken to be the empty record
`{}`. The compiler already does this for unused record unknowns (ADR
013). For example:

```wxw
fn ignore(f: (p) -> q): Int = 0;
fn main(): Int = ignore(fn(p) => merge(p, { a: 1 }));
```

The lambda is never applied, so nothing fixes `p`. The merge is still
solved, because its second part is fully known: the result is `a` plus
whatever `p` holds. `p` then has nothing left constraining it, so it
becomes `{}`, and the program is accepted. An unknown that a waiting
constraint still mentions is never defaulted: `{}` might be an answer
the program did not mean, so the checker reports the program instead.

## How a merge constraint is solved

At a call, the checker turns `{ ...r, ...s }` into one unknown result
`t` and the constraint "`t` is `r` and `s` together, with no field in
both". Only the rules below change such a constraint.

### Cases 1-3, borrowed from PureScript 0.15.16

PureScript's type checker solves
its `Union` constraint in `unionRows`
(src/Language/PureScript/TypeChecker/Entailment.hs, tag v0.15.16, commit
4c66c05a) with three cases:

1. The left part has no unknown left (lines 636-638): the result is the
   left part's fields followed by the right part.
2. The right part and the result have no unknown (lines 639-660): the
   left part is the result without the right part's fields. If a field
   of the right part is missing from the result, nothing is concluded
   (line 654).
3. The left part has some known fields (lines 661-672): those fields
   move into the result, and a smaller constraint remains.

Otherwise the constraint waits (line 628). With a signature, a
constraint still waiting at the end is an error (lines 363-371); every
Waxwing function has a signature. PureScript allows a field in both
parts and forbids that with a second constraint, `Nub`; Waxwing records
never hold a field twice, so Waxwing's constraint is disjoint by
definition.

### Case 1g, Waxwing's adaptation

When neither part has an unknown left
(only fields and the function's own row variables), the result is
written directly as both parts together. PureScript reaches the same
result only when the signature states that exact combination as a
`Union` constraint, in that order and grouping. Waxwing also does it
with the parts swapped or grouped differently, and when the signature
only says the parts are disjoint. The justification is that with
nothing unknown the result has exactly one possible value; the
signature's disjointness is what makes that value a valid record.
research/purs-given-1g shows where the two agree and where Waxwing goes
further.

### Sym, an approved adaptation

PureScript's cases look at the left
part first. On their own they would reject `merge(p, { a: 1 })` and
accept `merge({ a: 1 }, p)`. Sym tries the same cases with the parts
swapped. Merging is symmetric, so this keeps exactly the same answers.
A part that ends in one of the function's own row variables never
counts as fully known, and field types are unified, never compared or
dropped.

### H, an approved rule that only classifies

When a body ends with a
constraint still waiting, H checks once whether some field on one side
can be in no unknown part of the other side, because each such part
lacks it or could hold it only by breaking a promise the signature does
not make. If so, the program has no typing, and the checker reports a
contradiction such as `merge's { ...r, ...s } must be { x: Int, y: Int
}, but neither r nor s can have field x` instead of asking for an
annotation. H runs after everything else and changes no binding, so it
can turn "cannot tell" into a contradiction but never makes a rejected
program acceptable.

### Where the rest comes from

Rows themselves (fields plus one unknown rest, unified field by field)
follow Rémy and ADR 013. "This row has no field `l`" is a lacks
constraint (Jones 1992). Disjointness is checked by breaking it into
single facts, as Ur/Web does (Chlipala 2010). Waxwing never moves a
constraint into an inferred type, because signatures are written in
full and lambdas are not generalized.

## What you get and what you give up

A merge of records that share a field is refused (`Field x is in both
records: r disjoint s`). Swapping a merge's arguments does not change
whether a program is accepted or which types it gets. Whether a program
is accepted, its types and the kind of error it gets do not depend on
the order in which the checker meets its parts. Both properties are
measured on the problem families listed under "Evidence and its
limits"; neither is proved.

The cost is annotations. Some valid programs need one, as `both(merge,
merge)` does. In four of the six annotation cases checked that need
one (listed under "For maintainers"), the annotation only writes down
the one typing the program has. In the other two it rules out typings
the program had and never used, which makes the function usable in
fewer ways. For example,

```wxw
fn apply0(f: (a, b) -> c, g: (d, e) -> c): Int = 0;
fn main(): Int = apply0(merge, merge);
```

needs one part of each merge written as `{}`:
`apply0(fn(p: {}, q) => merge(p, q), fn(p: {}, q) => merge(p, q))`. The
unannotated program also typechecks with both merges holding the same
extra fields in their left parts. Nothing uses the shared result `c`,
so no behaviour changes, but the annotated program no longer accepts
those typings.

On three families of generated test problems, which lean toward
unknowns that nothing fixes, the adopted design accepted 9,210, 4,340
and 7,792 runs where the earlier custom design accepted 14,255, 19,895
and 10,546 (the last family is shaped like programs). No collection of
real Waxwing programs exists to say how often users will meet this.

## Why this design

Three options were weighed (docs/plans/2026-10-18-row-merge-alternatives.md
and docs/plans/2026-10-18-row-merge-qualified-types.md).

### Adapting PureScript's algorithm

Waxwing's own code follows PureScript's published rules, cites them and
is checked against them. This adopts an algorithm without installing
any library: PureScript's rules live inside its compiler, written
against its own types, and no reference code is licensed for reuse here
(AGENTS.md).
The survey behind this design (PureScript, Ur/Web, Gaster and Jones,
Morris and McKinna's Rose, Leijen's scoped labels, Koka) found no
drop-in implementation of disjoint record merging another compiler
could call.

### Using a general solver such as Z3

Encoded as logic formulas
(research/row-merge-alternatives/z3-encode.mjs), the label-only form of
the problem is something Z3 answers exactly: it agreed with an
independent brute-force checker on 2,072 problems, and a checker built
on it could accept programs such as `both(merge, merge)`. Any SMT
integration would still leave this work with Waxwing:

- encoding rows as formulas and keeping the encoding correct;
- field types, the ordinary unifier and the order of checking;
- a time limit, because whether a least typing exists is coNP-hard in
  general, and a time limit brings back an "unknown" answer;
- error messages, because a solver explains a failure as a set of
  formulas;
- canonical answers, because a solver may return any solution;
- in this codebase, a foreign import, which the checker's pure layer
  may not make (AGENTS.md).

The binding that was tested (z3-solver 5.3.1 from npm) added costs of
its own, which another binding need not share: a 34.6 MB WebAssembly
build, an asynchronous interface, and about 35-70 ms per problem
against well under a millisecond for the prototypes. Z3 stays a research
tool for cross-checking.

### Keeping the custom solver

Tranche B's first design added a "sum
rule", upper bounds on each unknown, and "homes" and "commits" that put
a field in the only part that could hold it. It accepted
`both(merge, merge)`, all 186 programs of a reviewed family of
higher-order uses that have a best typing (each now needs one
annotation), and it proved some programs contradictory that the
adopted design reports as undecided. Those rules had no published
source, and the author could not check them against an established
account. ADR 014 settles this: the implementation uses published
techniques where it can and accepts some annotations to do so.

## Evidence and its limits

The design was measured with a small JavaScript model written for this
purpose, against independent checkers that enumerate every answer
(research/row-merge-qt with labels; research/row-merge-typed with field
types, type unknowns and records inside merged fields). In every family
checked, each accepted program's answer satisfied every constraint and
was the least one, each contradiction had no answer, and acceptance,
answers and kinds of error were the same in every order checked and
with every merge's arguments swapped. H never changed an acceptance or
an answer, and none of its contradictions had an answer. Merging three
records gave one answer for both groupings and every argument order.

These are measurements, not proofs: no argument shows that the rules
reach the same verdict in every order. The problem generators are
synthetic. The typed model has no rigid variables and nests records
one level deep; effects (rolling back and re-settling) and the exact
error texts are argued in the plan, not modelled. The compiler's tests
must show those (plan, Task B3 onward).

## For maintainers

### Modules

The plan's names; they may change before implementation.


1. Making constraints: at a use, `{ ...r, ...s }` becomes an unknown
   `t` and `Merge r s t`, its parts required disjoint (RowMerge/Desugar;
   facts in Check/Disjoint and Check/RowStore). A record type then holds
   at most one unknown part.
2. Unifying records by cancelling shared parts and applying ADR 013's
   one-unknown rules (Check/UnifyRecord, Check/RowResidue,
   Check/RecordTail).
3. Solving after each unification: cases 1-3, 1g, then Sym, until
   nothing changes (RowMerge/Cases, RowMerge/Improve). A case's failure
   is a contradiction.
4. The end of a body: no constraint waiting means accepted and unused
   unknowns are `{}`; otherwise H decides between a contradiction and
   "cannot tell" (RowMerge/End, Check/Homes).
5. Messages are built only from the three-way result (Solved,
   Contradiction, Unresolved).

### Research labels

The design is `QT-strict+Sym+H` in the research
scripts: QT-strict is PureScript's cases with 1g; Sym and H as above.

### Annotation cases

From `node qt-adopted.mjs examples` in research/row-merge-qt; typings
are counted over the program's fields plus one extra field `w`.

| Program | Smallest annotation | Narrows? |
|---|---|---|
| S1 `apply0(merge, merge)` (fixture design-quiet) | `apply0(fn(p: {}, q) => merge(p, q), fn(p: {}, q) => merge(p, q))` | yes: 5 typings become 2 |
| Q1 `fn relate(f: (p, s) -> { ...u }, g: (q, s) -> { b: Int, c: Int, ...u }): Int = 0;` `relate(merge, merge)` | `relate(fn(p, s: {}) => merge(p, s), merge)` | yes: 3 become 2 (the shared `s` holding an extra field, unused) |
| S2 `fn ignore(f: (p) -> q): Int = 0;` `ignore(fn(p) => merge(p, { a: 1 }))` | none (Sym) | an annotation `fn(p: {}) => …` would narrow, 2 to 1 |
| S3 `fn apply0(f: (a, b) -> {}): Int = 0;` `apply0(merge)` | `apply0(fn(p, q: {}) => merge(p, q))` | no |
| `both(merge, merge)` (design-forced-bound) | `both(fn(p: {}, q) => merge(p, q), merge)` | no |
| `apply(merge, noX)` (diag-14-fix) | `apply(fn(p: { x: Int }, q) => merge(p, q), noX)` | no |
| review F2's 392 programs `k(merge, …, merge)` with a shared parameter | the shared parameter, once, in the 186 with a least typing | no |

### Texts and fixtures

Approved texts quoted above: D4 (diag-01,
design-forced-bound's proposed class), D3 (diag-16), D2 (diag-15), D6
(diag-14). The first example is diag-11. Moving design-forced-bound,
design-quiet and diag-14-fix from Solved to Unresolved awaits the
user's approval (docs/plans/2026-10-19-row-merge-proposals.md).

### Commands

From research/row-merge-qt/ (needs only `node`; outputs
in its README):

```sh
node qt-adopted.mjs examples       # annotation cases, program 16, F2
node qt-adopted.mjs controls       # the 72 fixtures and research cases
node qt-adapt.mjs raw 21 2000      # generated problems, every variant
node qt-domains.mjs B 10           # exhaustive domain B (A: about 6 min)
node qt-checks2.mjs sym            # swapped arguments, typed
node qt-render.mjs render 2000     # diagnostics across orders
node qt-given.mjs                  # case 1g's programs
```

From research/row-merge-typed/: `node tr-run.mjs nested 1 2000` and
`node tr-run.mjs assoc 1 500`. From research/purs-given-1g/ and
research/purs-row-experiment/: `node run.mjs` (needs `purs` 0.15.16).
Once implemented, the compiler's checks run in `npm run verify`.

### Decision history

- docs/adr/014-composition-not-invention.md: why published techniques.
- docs/plans/2026-10-18-row-merge-qualified-types.md: the design, its
  measurements, the PureScript experiment and the user's decisions of
  2026-10-19.
- docs/plans/2026-10-18-row-merge-alternatives.md: the custom solver,
  simpler designs and Z3.
- docs/plans/2026-10-19-row-merge-implementation-plan.md and
  docs/plans/2026-10-19-row-merge-rules.md: what is kept, how the
  compiler gets there, and the argument for each rule.
- docs/adr/013-records.md: records and rows.

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
