# Open-row merge on qualified types with row predicates (R005 Tranche B)

Status:
Proposed re-plan under ADR 014; no implementation authorized.
Not approved (user review, 2026-10-18). Open findings before any
decision: four order-dependent raw problems unexplained; QT (strict
PureScript) annotation burden not yet reported against QS; three checks
ran from uncommitted scratch scripts; most citations recalled, not
re-read; disjoint `Union`, symbolic multi-tail dependencies and
empty-row defaulting still need justification. No approval of QS,
N1-N5, fixture moves, D6b or retirements. An evidence follow-up is
authorized.

Written 2026-10-18 on branch `design-principles` from 1b45917 (ADR 014
committed). Documents and research scripts only: no compiler source,
test or script changed, nothing built, verify not run, and the compiler
was not run (no claim below comes from it). The prototype is in
research/row-merge-qt/ (README: exact commands and outputs). Every
number below was produced by those commands on 2026-10-18 unless it is
marked **estimate**. Branch r005b-task5 (Task 5 WIP, unverified) is
reference only.

Governing: docs/adr/014-composition-not-invention.md. Every solving
component names its published source (§1); every piece without one is
listed in §3.6 for the user's approval, with the textbook alternative
and its cost measured.

## 0. In brief

- **Predicates.** Three, all on record rows: `l ∉ r` (lacks; Gaster and
  Jones 1996), `r # s` (disjointness; Ur/Web's `[r ~ s]`, Chlipala
  2010) and `Merge r s t` (`t` is the disjoint union of `r` and `s`:
  PureScript's `Prim.Row.Union` restricted to disjoint rows, which is
  what Waxwing's merge means). They are predicates of
  qualified types (Jones 1992, 1994): solved by improvement when
  determined, deferred otherwise.
- **Improvement only when determined**, by the functional dependencies
  PureScript declares for `Union` (`r s -> t`, `s t -> r`, `r t -> s`;
  Jones 2000): the forward dependency is applied at once and
  symbolically (`t := { ...r, ...s }`, Ur/Web's concatenation, Tranche
  B Task 1's row of several tails); an equation that ADR 013's one-tail
  rules cannot solve after cancellation waits as a `Merge` predicate,
  and is re-examined until one side is determined. Two waiting
  predicates over the same parts have equal results (pairwise
  improvement, Jones 2000).
- **Entailment.** Signatures are explicit and nothing is generalized
  (docs/language.md; design draft 3 §6), so the givens are the
  enclosing signature's facts on its rigid variables, and every wanted
  predicate is local to one body. At the end of a body, unbound metas
  default to `{}` (Haskell 98's defaulting, §4.3.4); a predicate that
  is neither solved nor satisfied by that default is an error: "needs
  an annotation" (the approved D4).
- **What it costs.** On the assessment's 19 programs (30 variants) it
  needs an annotation the current design does not in 2 (programs 11,
  `both(merge, merge)`, and 12, `apply(merge, noX)`); it proves 2
  contradictions the current design leaves unresolved (program 16 and
  the `odd-cycle` fixture). On review F2's 392 `k(merge, …)` programs it
  needs one annotated lambda in all 186 the current design accepts
  (§4).
- **What it removes.** The invented solver of Task 4: the sum rule,
  upper bounds (U1-U4), homes and commits (about 420 src lines in five
  modules plus parts of six others, §5). Tasks 1-3 and most of Task 4
  (cancellation, the one-tail rules, the three-way result, the stop
  classification, the oracle tests) survive.
- **Flagged, not standard** (§3.6): Merge as a *disjoint* union (a
  published combination, Ur/Web's `++` under `~`, stated as a
  three-place predicate); two one-line rules, E (an empty union empties
  its parts) and H (a label every part excludes is a contradiction),
  recommended; C (Task 4's commit), not recommended.

## 1. Components and their sources

Citations as published; bibliographic details are given as known to
the author of this document, and only the PureScript sources were
fetched and read for it (2026-10-18). Nothing below copies code
(docs/provenance.md: conceptual influence only).

| Component | Source | What is taken | What Waxwing changes |
|---|---|---|---|
| Rows, one-tail unification, lacks on metas | Rémy [R94]; Gaster and Jones [GJ96]; ADR 013 (rules 1-6, already Waxwing's) | a row is labels plus a tail; unify labels field-wise, extend a meta tail, share one fresh remainder between two meta tails; a meta's lacks set checked and passed on when it is bound | rigid tails are treated as constants beside labels (Ur/Web's normal form, below) |
| Lacks predicate `l ∉ r` | [GJ96] (`r\l`, a predicate of qualified types); PureScript `Prim.Row.Lacks` [PS] | a written or implied predicate on row variables, entailed by the context | already Tranche A's `where r lacks { … }` (ADR 013) |
| Disjointness `r # s` and its prover | Ur/Web [C10] (`[c1 ~ c2]` guards, a prover that decomposes over known fields and variables); Harper and Pierce [HP91] (compatibility assertions) | written in the quantifier (`where r disjoint s`), implied by `{ ...r, ...s }`, decomposed into label/label, label/tail, tail/tail | Task 3, unchanged |
| Concatenation as a row with several tails | Ur/Web [C10] (`$(r1 ++ r2)` and its normal form: known fields plus row variables, common parts cancelled) | `{ ...r, ...s }` is one row whose tails are `r` and `s`, well formed only under `r # s` | Task 1's representation, unchanged |
| `Merge r s t` and its dependencies | PureScript `Prim.Row.Union` [PS]: `class Union left right union \| left right -> union, right union -> left, union left -> right`; `Nub` for duplicate-free rows; Morris and McKinna's combination predicate `ρ1 ⊙ ρ2 ~ ρ3` [MM19] | a three-place predicate with three dependencies, solved by the compiler, not by instances | disjoint rather than duplicate-keeping (§3.6, N1) |
| Solving only when determined | PureScript's `unionRows` [PS], three cases, quoted in §3.3 | progress only when the dependencies determine the result; otherwise the constraint is deferred | Waxwing generalizes nothing, so a deferred predicate is solved later in the same body or reported (§3.5) |
| Improvement | Jones [J95] (improvement: a substitution that leaves the satisfiable instances unchanged); Jones [J00] (functional dependencies; pairwise improvement); Sulzmann et al. [SDPS07] (the same rules as constraint handling rules, with conditions for soundness and termination) | the forward and backward rules of §3.3; two predicates agreeing on two arguments agree on the third | — |
| Context reduction under substitution | [J94] ch. 2-3 (predicates are re-simplified as their variables are bound) | the bind rule: a bound meta's facts are re-required on its image | Task 3's bind rule, unchanged |
| Entailment by the signature | [J94] (entailment `P ⊩ Q`); [GJ96]; [C10] | a wanted predicate on rigid variables must follow from the enclosing signature's predicates | no given ever mentions a body-local meta (§3.5) |
| Defaulting at the end of a body | Haskell 98 Report §4.3.4 [H98]; [J94] on ambiguity | an ambiguous variable takes a default only if every constraint on it is then satisfied, else an ambiguity error | the default is `{}` for row metas, which lowering already gives an unsolved tail (ADR 013) |
| Three-way result, stop channel | docs/engineering.md ("Evidence for solvers and diagnostics", "Result boundary classification") | — | Task 4, unchanged (§3.8) |

Not used: Wand's concatenation [W91] (no principal types without
disjointness), Leijen's scoped labels [L05] (duplicates; ADR 002 and
013 exclude them), Stickel's AC unification and any search for splits.

## 2. What changes for the user

The surface does not change. `fn merge(a: { ...r }, b: { ...s }): {
...r, ...s } where r disjoint s = { ...a, ...b };` is written as
approved, and a use of `merge` whose argument rows are known (the
common case) checks as before.

What changes is one rule, which fits in a sentence: *the parts of a
merged row must be determined, by arguments, annotations or written
facts, at the point of use; when they cannot be, the checker asks for an
annotation.* The current design also derived parts from upper bounds
(the sum rule); the re-plan does not, so a use that only bounds fixed
the parts now needs an annotation (programs 11 and 12, §4).

## 3. The design

### 3.1 Predicates and their meaning

A record row is labelled fields plus a multiset of tails (Task 1); a
tail is a rigid variable (from the enclosing signature) or a meta. Its
meaning is the disjoint union of its fields and its tails' values.

| Predicate | Meaning | Written as | Made by |
|---|---|---|---|
| `l ∉ r` | `r` has no field `l` | `where r lacks { l }` | Tranche A: clauses, fields beside a tail, `select`'s fresh rest |
| `r # s` | `r` and `s` share no label | `where r disjoint s` | Task 3: clauses, a row with two tails, a literal's spreads |
| `Merge P O` | the disjoint union of the rows `P` is the row `O` | never written | an equation between rows that waits (§3.3) |

`Merge r s t` in the three-place form of §0 is `Merge [r, s] t`; the
n-ary form keeps `{ ...r, ...s, ...t }` one predicate instead of two
with an intermediate meta (which loses cancellation, §3.2). Every
`Merge` implies the disjointness of its parts, which is recorded as
`#` facts when the rows are made (Ur/Web: `++` is well formed only
under `~`).

**Desugaring.** The surface `{ a: A, ...r, ...s }` in a signature means
a row `t` with `Merge [r, s] t'`, `t = { a: A, ...t' }`, `a ∉ r`,
`a ∉ s`. Because the forward dependency (`r s -> t`) is applied at once
and the result is expressible as a row of several tails, `t'` is
written `{ ...r, ...s }` directly: the predicate is solved where it is
made, and only its implied facts (`r # s`, the lacks) remain. A merge
literal `{ ...e1, x: v, ...e2 }` likewise has the type `{ x: V, ...R1,
...R2 }` with `R1 # R2` and `x` lacked by both, as Task 3 records.

### 3.2 Representation: why the forward dependency is symbolic

Two formulations were prototyped (research/row-merge-qt, `QT` and
`QS`):

- **QT (PureScript's formulation, strict).** A row holds at most one
  meta tail. `{ ...?r, ...?s }` becomes a fresh `?t` with `Merge ?r ?s
  ?t`, and `?t` stays opaque until `?r` or `?s` is known, as PureScript
  leaves `Union l r u` unsolved while `l` is open.
- **QS (symbolic forward dependency).** `?t := { ...?r, ...?s }` at
  once (Ur/Web's concatenation, Task 1's rows); a predicate exists only
  where an equation between such rows cannot be solved.

Both are sound on every run (§4.3). QT hides the parts of `?t` from
cancellation, so an equation such as `{ b, c, ...m0, ...m2 } ~ { ...m3,
...m2 }`, where `m2` cancels and `m3 := { b, c, ...m0 }` follows, waits
in QT. Measured on raw seed 21 (2,000 problems, five orders), QT leaves
170 runs needing an annotation that the current design accepts, QS 55.
**Proposed: QS.** It keeps Task 1's representation and Task 4's
cancellation, and its predicate is the n-ary form above.

### 3.3 Solving

Each requirement between two record rows runs, in order:

1. **Flatten and cancel** (Task 4 RowResidue, Ur/Web's normal form):
   follow bound tails; labels on both sides unify field-wise once; equal
   tails cancel as a multiset. What remains is, per side, constants (the
   other side's missing labels and rigid tails) and metas.
2. **A constant with no meta opposite** is a mismatch (ADR 013; Task 4
   Homeless, step 4). A Contradiction.
3. **One-tail rules** (ADR 013 rules 2-3, Rémy, Gaster and Jones), the
   cases in which the dependencies determine the solution:
   - a side that is exactly one bare meta is bound to the other side
     (`r s -> t` forward, symbolically; or `t s -> r` when the bare meta
     is a part);
   - one meta on each side, each with constants: both bound with one
     shared fresh remainder (rule 3; the most general unifier);
   - no metas left: done.
4. **Otherwise the equation waits** as `Merge P O`: `P` the metas of
   one side, `O` the other side. Nothing is guessed and no fresh meta
   is made.

**Re-examination** (the improvement loop). After every top-level
unification and in every effect-settling round, every waiting predicate
is examined again by steps 1-4 until a pass changes nothing (a full
rescan: dependency-complete by construction, as the alternatives
assessment's hybrid proposed; ledger L32 met without an index). A
waiting predicate is solved once a binding leaves one side with at most
one meta: that is the dependencies `s t -> r` and `r t -> s` applied as
PureScript's second case does (subtract the known part from the known
result).

**Pairwise improvement** (Jones 2000; [SDPS07]'s FD rules), between two
waiting predicates, after each pass:

- `r s -> t`: two predicates whose parts are the same metas have equal
  other sides; the other sides are unified and one predicate dropped
  once that unification is solved (if it would only wait, both stay).
- `r t -> s`: two predicates with equal other sides whose parts differ
  in exactly one meta each have those two metas equal.

PureScript's solver, for comparison (Entailment.hs `unionRows`, read
2026-10-18; quoted comments): "If the left hand side is a closed row,
then we can merge its labels into the right hand side"; "If the right
hand side and output are closed rows, then we can compute the left hand
side by subtracting the right hand side from the output"; "If the left
hand side is not definitely closed, then the only way we can safely make
progress is to move any known labels from the left input into the
output, and add a constraint for any remaining labels". When none
applies the constraint is not solved: it is deferred, generalized
(`Unsolved`) where the binding may be generalized, or reported
(`NoInstanceFound`). Step 3 above covers all three cases (the third is
cancellation plus the shared remainder).

**Facts** (Task 3, unchanged). `#` decomposes on known parts:
label/label is an overlap (D2), label/tail a lack, tail/tail a pair; a
meta twice is forced to `{}` (`x # x` holds only for `{}`); a rigid
twice is D3'; two rigids need a given (D3). A bound meta's lacks and
pairs are re-required on its image (the bind rule; context reduction
under substitution).

### 3.4 Where the predicates come from

Unchanged from design draft 3 §1.4 and Task 3: signatures (givens on
rigids in their own body; wanted on metas at each use, with `Lacks` and
`Disjoint` provenance), `where` clauses, declared types joining two
record parameters (Resolve.Apart, ArgumentPairs), constructors, merge
literals (`Spread` facts at their site), rows the checker makes
(`select`'s `{ l: α, ...ρ }`), and equations (§3.3 step 4). A `Merge`
keeps its identity, its site (the unification that made it wait), and
its owner (the callee use whose variables its metas instantiate), as
Task 4's `Equation` does, for diagnostics only.

### 3.5 Entailment, deferral and the end of a body

**No generalization** (confirmed): docs/language.md "Functions" (a
lambda's parameters take their annotations or fresh variables; lambdas
are monomorphic), design draft 3 §6 ("functions are fully annotated,
lambdas are monomorphic … and a `let` is not generalized", Check/Block),
and design draft 3 §1.5 (a `let`-bound reference shares its metas).
What this simplifies, against the textbook account:

1. No predicate is ever inferred into a type, so there is no
   simplification for presentation, no principal-type question and no
   ambiguity check at generalization ([J94]'s hardest parts).
2. Givens are only the enclosing signature's facts on its rigid
   variables: written `lacks` and `disjoint`, and the facts implied by
   its rows. A `Merge` over rigids is solved where it is made (its
   result is the row of several rigid tails), so no given is ever a
   `Merge`. Entailment is Task 3's lookup: a fact on rigids is a given
   or it fails (D3, D3', D3'').
3. Every wanted predicate on a meta is local to one body, so at the
   end of the body it is solved, satisfied by the default, or an error;
   it can never be "entailed later".
4. No evidence is passed at run time: every function is specialized
   (ADR 007), so rows are ground before lowering (Morris and McKinna's
   system passes evidence for its predicates [MM19]; Waxwing needs
   none).

**Deferral.** A waiting predicate lives in the substitution (so a
postponed effect pair's revert removes it, as `watch` and `marks` are
reverted), with its identity, site and owner. It is re-examined as
§3.3 says, including in each settle round (the joint fixpoint of design
draft 3 §6: a round that solved or changed a predicate counts as
changed).

**The end of a body** (defaulting). Every unbound record meta is
ambiguous (nothing is generalized) and defaults to `{}`, which is what
lowering already gives an unsolved tail. The default is accepted only
if every waiting predicate holds under it: a predicate whose sides then
have equal constants (a quiet one, metas on both sides and no constant
left) holds; one with a constant does not, and the body is
**Unresolved**: D4 at the predicate's site, "needs an annotation". A
predicate failing under the default is not a contradiction (the
default was a choice; the predicate may have other solutions).
Bindings are most general (each rule replaces the problem by an
equivalent one) and every image is monotone in the free metas, so when
the all-`{}` assignment is a solution it is the least (rules file §12's
obligation, the argument the alternatives assessment gives for A).

### 3.6 Pieces without a direct published source (for approval)

Each is offered with the textbook alternative and its measured cost.
Counts are runs (problem × order) on raw seeds 21-24 (14,000 problems,
five orders) and program shapes (12,000 problems, two orders), from
§4.3; QS-E against QS for N2, QS-EH against QS-E for N3, QS-EHC against
QS-EH for N4.

| ID | Piece | Status of the source | Textbook alternative | Measured | Proposal |
|---|---|---|---|---|---|
| N1 | `Merge` is a *disjoint* union with all three dependencies | the combination is published (Ur/Web `++` under `~` [C10]; Rose's ⊙ [MM19]); PureScript's `Union` keeps duplicates and gets disjointness from `Nub` [PS]. Stating it as one predicate with the three dependencies is this document's | `Union` plus `Nub u u`, as the PureScript `Record` library's `disjointUnion` is constrained (as recalled, not re-read; two predicates, the same solutions) | not a behavioural choice: Waxwing rows cannot hold duplicates (ADR 002, 013), so `Nub` would always hold | approve as the definition |
| N2 | E: a `Merge` whose other side is `{}` binds every part to `{}` | an improvement in [J95]'s sense (the solutions are unchanged), not a dependency; alternative A's "metas against nothing" | leave it waiting; the end default satisfies it | raw: 130 more accepted runs (13,763 to 13,893), order differences 7 to 5; shapes: 4 more; fixtures: none | approve (one-line argument: a union is empty only if its parts are) |
| N3 | H: a constant of `O` that every part already excludes is a Contradiction | a consistency check (an unsatisfiable predicate set), not improvement; alternative A's step 4; Task 4's homeless check | leave it waiting; Unresolved at the end | changes only the class, never acceptance: raw 183 more contradictions (53,222 to 53,405), shapes 66; order differences 5 to 4 (raw), 14 to 0 (shapes); keeps Example 14 (`diag-14`) a Contradiction with its approved D6 | approve |
| N4 | C: a constant with exactly one non-excluding part is committed there | none (Task 4's commit, invented) | leave it waiting | raw: 307 more accepted runs (13,893 to 14,200), dense 4,095; shapes none; fixtures: `diag-14-fix` | not proposed |
| N5 | `x # x` binds `x := {}` | a stated improvement, Task 3 (rules §10) | leave the pair; the end default satisfies it | not measured separately (Task 3 behaviour) | keep (already merged and approved) |

### 3.7 Removal, rest, `lacks` and precedence

- **Removal and rest binders** keep the approved fresh-remainder rule
  (design draft 3 §5.2, user decision 6): `e without { l }` requires
  `e` against `{ l: α, ...ρ }` in one requirement, and its type is `ρ`.
  Under this design that requirement is an ordinary equation: if `e`'s
  row is `{ ...?r, ...?s }` it waits as `Merge [?r, ?s] { l: α, ...ρ }`
  and `ρ lacks l` holds at once, so `.l` on the rest is refused while
  it waits (fixtures `design-removal-*`, unchanged classes, §4.1).
- **Tranche A's `where r lacks { … }`** is the `∉` predicate,
  unchanged: written lacks are givens in the body and wanted at uses.
- **Provenance and precedence** (user decision 5; Task 3 `Because`,
  `prefer`) are unchanged: they choose which reason a fact keeps, never
  whether it holds. `Equated` becomes the reason of a fact or binding
  made by solving a predicate (renamed in prose only; the constructor
  stays), ranked last as approved.

### 3.8 Result boundary classification

Unchanged in form (rules file §11b; Task 4's `outcome`). What
establishes each claim under this design:

| Result | Produced by | What establishes it |
|---|---|---|
| `Solved` | no predicate waits after the end default | every step is an equivalence; the default satisfies every remaining fact and predicate |
| `Contradiction` | a mismatch (steps 1-2), a fact violated (Task 3), an occurs check, a determined predicate whose equation fails, pairwise improvement leading to one of those, H (if approved) | each is a rejection argued in the rules file (§1, §4, §7, §10) or by the dependencies (a function has one value) |
| `Unresolved` | a predicate with a constant left at the end of the body | nothing about the number of solutions (0, 1 or many; §4.4) |
| `Stop Limit` | `TooDeep` | nothing |
| `Stop Internal` | `Unexpected` (a broken invariant) | nothing |
| `Stop Unfinished` | `Placeholder` (a later task) | nothing |

The failure constructors that bounds and the sum rule added
(`Refused (Outside …)`, `Refused (Derived …)`) are removed with them
(§5); each removal is a change to the classifier's table, made in the
same commit.

### 3.9 Field types, effect rows, specialization and lowering

- **Field types.** Common labels unify field-wise in step 1 before a
  predicate waits, so a nested equation (`{ a: { ...?p, ...?q }, ...?r,
  ...?s } ~ { a: { x: Int, y: Int }, z: Int }`) gives two waiting
  predicates, the inner one with the outer site (approved R6/R7). Not
  prototyped (labels only); Task B2's nested tests are the evidence.
- **Effect rows.** Predicates live in the substitution: rollback by a
  postponed pair's revert is free, and the joint fixpoint adds one
  re-examination pass per settle round (design draft 3 §6, unchanged).
- **Specialization and lowering** are unchanged (design draft 3 §9):
  under a key every rigid is its key row and unsolved tails are `{}`,
  so every row is ground; the merge literal is built field by field in
  label order from typed temporaries evaluated left to right.

### 3.10 Arguments (for the rules file)

- Steps 1-3 and the bind rule are Tasks 3-4's, argued in rules §1-§4,
  §6-§7, §10 (rewrites preserve solutions).
- Step 4 changes nothing (a waiting predicate is the equation itself).
- Pairwise improvement: `Merge P O1` and `Merge P O2` give `O1 = O2`
  because the union is a function of its parts; `Merge (P ∪ {a}) O`
  and `Merge (P ∪ {b}) O` give `a = b` because disjoint union cancels
  (`X ⊎ a = X ⊎ b` with both well formed implies `a = b`).
- E: `⊎P = {}` iff every part is `{}`. H: a constant of `O` must be in
  some part; if every part excludes it there is no solution.
- The end default: as §3.5. Termination: each re-examination pass binds
  a meta, drops a predicate or stops; metas made are bounded as in
  rules §13 (only the shared remainder makes one).

## 4. Program-level consequences

### 4.1 The 19 representative programs

The alternatives assessment's program set (its §4), rerun through the
prototype, every order each fixture names (`node qt-fixtures.mjs
programs`). S, C, U as before; QS is the proposed core, QS-EH with N2
and N3, QS-EHC also with N4. Every verdict was checked by the
brute-force oracle (0 violations).

| # | Program (alternatives assessment §4) | Fixture | C | A | AH | QS | QS-EH | QS-EHC |
|---|---|---|---|---|---|---|---|---|
| 1 | `merge(merge({ x: 1 }, { y: 2 }), { z: 3 }).x` | design-composition | S | S | S | S | S | S |
| 2 | `merge({ x: 1 }, { x: 2 }).x` (D2) | diag-15 | C | C | C | C | C | C |
| 3 | generic `three`; without the facts (D3) | design-generic-three; -d3 | S; C | S; C | S; C | S; C | S; C | S; C |
| 4 | `tagged` without, with `s lacks { id }, r disjoint s` | design-mixed; -fixed | C; S | C; S | C; S | C; S | C; S | C; S |
| 5 | `Both` with the annotated result | design-both-annotated | S | S | S | S | S | S |
| 6 | `let b = Both({ x: 1, y: 2 })` | diag-07 | U | U | U | U | U | U |
| 7 | wrapper `W`, `k({ y: 1 }, { y: 2 })` | none (facts only; regression row r005b-wrapper-pairs) | C | C | C | C | C | C |
| 8 | `apply2(merge, { x: 1 }, { y: 2 })`, both orders | diag-11, design-defer | S | S | S | S | S | S |
| 9 | `apply0(merge)`; with an annotated lambda | diag-01; -fix | U; S | U; S | U; S | U; S | U; S | U; S |
| 10 | partial `merge({ x: 1 })`; `apply0(merge3({ x: 1 }))` | design-partial; diag-08 | S; U | S; U | S; U | S; U | S; U | S; U |
| 11 | `both(merge, merge)` | design-forced-bound | S | U | U | **U** | **U** | **U** |
| 12 | `apply(merge, noX)` (`r lacks { y }`, `s lacks { x }`) | diag-14-fix | S | U | S | **U** | **U** | S |
| 13 | quiet `apply0(merge, merge)` | design-quiet | S | S | S | S | S | S |
| 14 | `drop … without { x }`: `.x` (left, right, waiting); `.y` | design-removal-left, -right, -wait; -rest-field | C, C, C; S | C, C, C; S | C, C, C; S | C, C, C; S | C, C, C; S | C, C, C; S |
| 15 | `apply1(merge, { z: 1 })`; `apply3(merge3, …, { z: 3 })`; `both(merge, merge, { z: 1 })` | diag-13, diag-17, diag-19 | C | C | C | C | C | C |
| 16 | `same(merge, merge)` (no solution) | none; written in qt-programs.mjs | C | U | U | **C** | **C** | **C** |
| 17 | holes: `apply0(merge, k)`; `use(merge, p)` | design-holes; diag-18 | U | U | U | U | U | U |
| 18 | `determinate` (one solution); `odd-cycle` (none) | determinate; odd-cycle | U; U | U; U | U; U | U; **C** | U; **C** | U; **C** |
| 19 | records in an effect operation (labels as #1) | design-composition | S | S | S | S | S | S |

Program 7 has no equation: its verdict is Task 3's facts, which this
design keeps unchanged (the row is recorded, not run). Program 19's
rollback and joint fixpoint are not in the labels-only abstraction
(§10). Not shown: QT (strict), which gives QS's classes on all 30
variants.

Against the current design, QS and QS-EH need an annotation on two
programs (11 and 12) and prove two contradictions it leaves unresolved
(16, by `r s -> t`: both uses share `r` and `s`, so `{ x }` = `{ y }`;
and `odd-cycle`, by `r t -> s`: `a ⊎ b = { x }` and `a ⊎ c = { x }`
give `b = c`, then `b # c` forces both to `{}`, and `b ⊎ c = { x }`
fails). Against alternative A and
AH, the classes are equal except 12 (AH accepts it by its commit) and
16 and `odd-cycle` (proved here).

### 4.2 Annotations needed

| Program | Unresolved where | Annotation that resolves it | Checked |
|---|---|---|---|
| 11 `both(merge, merge)` | D4 at the first `merge` | `both(fn(p: {}, q: { x: Int }) => merge(p, q), merge)` | prototype: accepted in both orders (scratch script over the fixture's rows plus `m0 = {}`, `m1 = { x }`) |
| 12 `apply(merge, noX)` | D4 at `merge` | `apply(fn(p: { x: Int }, q: { y: Int }) => merge(p, q), noX)` | prototype: accepted |
| review F2's family, `k(merge, …, merge)` with a shared parameter: 186 of 392 | D4 at the first `merge` | one annotated parameter: `fn(p: P, q) => merge(p, q)` for the first callback, `P` the shared parameter's row | prototype: all 186 accepted with only the shared parameter fixed (scratch script, not committed) |

Each annotation is a lambda parameter annotation, which the language
permits (docs/language.md, "Functions"; the approved R9 hint `pass a
lambda with annotated parameters in place of merge` names exactly this
edit). The other 206 F2 programs have no least solution and are
Unresolved under every design.

**Quantified.** On the 30 program variants: 2 need an annotation the
current design does not (11, 12); against AH, one more (12). On
F2: 186 of 392 (as A and AH). On generated problems (§4.3): raw 362 of
14,255 runs the current design accepts (2.5 %); dense 8,725 of 19,895
(44 %, the stress test of two-meta sums); program shapes 0 of 10,546.

### 4.3 Measured over generated problems

Five constraint orders per raw or dense problem, two per program
shape; every run judged by research/open-row-merge's brute-force oracle
(S: an accepted assignment is a solution; L: it is the least; H: a
refusal has no solution). Totals over raw seeds 21 (2,000 problems)
and 22-24 (4,000 each), dense the same seeds, program shapes seeds 1
(2,000) and 2 (4,000) without and with `SHARE=1`:

| Generator | Variant | Accept | Refuse | Unresolved | accept→U | refuse→U | U→accept | U→refuse | Order differences |
|---|---|---|---|---|---|---|---|---|---|
| raw | C | 14,255 | 53,525 | 2,220 | — | — | — | — | 0 |
| raw | A | 13,893 | 53,360 | 2,747 | 362 | 165 | 0 | 0 | 4 |
| raw | AH | 14,200 | 53,480 | 2,320 | 55 | 45 | 0 | 0 | 0 |
| raw | QT | 12,933 | 53,172 | 3,895 | 1,322 | 353 | 0 | 0 | 3 |
| raw | QS | 13,763 | 53,192 | 3,045 | 492 | 333 | 0 | 0 | 7 |
| raw | QS-E | 13,893 | 53,222 | 2,885 | 362 | 303 | 0 | 0 | 5 |
| raw | QS-EH | 13,893 | 53,405 | 2,702 | 362 | 120 | 0 | 0 | 4 |
| raw | QS-EHC | 14,200 | 53,520 | 2,280 | 55 | 5 | 0 | 0 | 0 |
| dense | C | 19,895 | 22,540 | 27,565 | — | — | — | — | 0 |
| dense | A | 11,110 | 11,070 | 47,820 | 8,785 | 11,470 | 0 | 0 | 0 |
| dense | AH | 15,215 | 15,175 | 39,610 | 4,680 | 7,365 | 0 | 0 | 0 |
| dense | QS-EH | 11,305 | 19,030 | 39,665 | 8,725 | 3,590 | 135 | 80 | 0 |
| dense | QS-EHC | 15,400 | 21,144 | 33,456 | 4,640 | 1,476 | 145 | 80 | 1 |
| shapes | C | 10,546 | 12,896 | 558 | — | — | — | — | 0 |
| shapes | A, AH | 10,546 | 12,841 | 613 | 0 | 55 | 0 | 0 | 1 |
| shapes | QT | 10,524 | 12,896 | 580 | 22 | 0 | 0 | 0 | 0 |
| shapes | QS | 10,542 | 12,794 | 664 | 4 | 102 | 0 | 0 | 14 |
| shapes | QS-EH | 10,546 | 12,868 | 586 | 0 | 28 | 0 | 0 | 0 |
| F2 (392) | C | 186 | 0 | 206 | — | — | — | — | — |
| F2 | every A, QT, QS variant | 0 | 0 | 392 | 186 | 0 | 0 | 0 | — |

**Soundness: no S, L or H violation for any variant on any run**
(fixtures, the 19 programs, every generator above). Every QS variant
accepted only least solutions and refused only unsatisfiable problems.
Unlike A, QS-EH also *gains* on dense problems: 135 runs the current
design leaves unresolved are accepted (with the least solution) and 80
are proved contradictions, through pairwise improvement, which neither
the current design nor A has.

Readings:

- **QS-EH loses no acceptance on program shapes** (0 of 10,546) and
  2.5 % of raw acceptances, the same as A; dense problems (two-meta
  sums against labels, exactly the case the sum rule decides) are where
  the current design's invented machinery pays.
- **Order independence** (problems whose verdict depends on the
  order). The current design: 0. QS-EH: 4 of 14,000 raw problems, 0 on
  dense and shapes. QS without E and H: 7 raw and 14 on shapes, which
  is one reason E and H are recommended. Every difference is between
  Unresolved and a definite verdict, never between Solved and
  Contradiction (the oracle would have caught it).
- **QT (strict)** loses 1,322 raw acceptances against QS's 492: the
  cost of hiding several-tail rows behind an opaque meta (§3.2).

### 4.4 The Unresolved buckets

The evidence rules require permanent fixtures pinning Unresolved with
zero, one and several solutions. Under QS `odd-cycle` (zero solutions)
becomes a Contradiction, so its bucket needs a new fixture. Proposed,
found in the dense generator (seed 21, problem 1955) and written out in
qt-programs.mjs as `zero (new)`:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
```

with rows `m0 ⊎ m3 = { c } ⊎ m2` and `m2 ⊎ m3 = { a } ⊎ m0` (every
order: Unresolved under every variant; 0 solutions by brute force:
counting atoms forces `|m3| = 1`, and each choice of `m3`'s atom breaks
one equation). A Waxwing source producing these rows is part of Task
B2's fixture work (§7), written and checked against the oracle before
the bucket moves. `determinate` (one solution) and `diag-01` (four) stay
Unresolved, with their counts.

## 5. Tasks 1-4: what survives, what is replaced

Merged modules (main at f0075d3; line counts today). "Invented" means
no published source was found for it (ADR 014, Decision 4): it is
replaced, not kept behind a flag.

**Survives as is.**

| Piece | Modules | Task | Source under this design |
|---|---|---|---|
| several-tail rows, flatten, substitution of tails | Domain.Type.RecordSubst (39), FlatRecord (52), Domain.Type record rows | 1 | Ur/Web's concatenation normal form [C10]; the symbolic forward dependency (§3.2) |
| surface `{ ...r, ...s }`, `where r disjoint s`, D8, D9, D3 in body types; pairs through declared types | Format/Parse/Constraint, Resolve/Apart (198), ArgumentPairs (156), Resolve.Lacking | 2 | surface (bespoke, ADR 014 Decision 1); [HP91], [C10] for the clause |
| the fact store, provenance and precedence (`Because`, `prefer`, `Joined`, `Implied`, `Spread`, `Equated`) | RowStore (lacks, apart, arrivedAt; 199), Because (107), Flex, PartOrigin | 3 | [GJ96] lacks; [C10] disjointness; provenance is diagnostics metadata |
| decomposition of `#`, the bind rule, seeding givens and wanted facts | Disjoint (161, minus pruning), RecordTail `bindTail` (234, minus U3), Seed (82), UseFacts (53) | 3 | [C10]'s prover; [J94] context reduction; [GJ96] entailment |
| D1, D2, D3, D3', D3'' and their notes | Format.Diagnostic.Records, Lacked (minus `Outside`, `Derived`) | 3 | — |
| flatten-cancel-residue, a constant with no meta opposite, one meta alone, two bare metas, the shared remainder | UnifyRecord (138), RowResidue (122), Homeless (70, step 4 only), RowSettle `alone`, `bareMetas`, `shared` | 4 | ADR 013 rules 1-3 [R94, GJ96] with [C10]'s cancellation |
| the three-way result, the stop channel, `Equation` identity and site | RowOutcome (85), Refused (35), RowStore `equations`, `boundBy` (re-purposed: the predicate whose solving bound a meta) | 4 | docs/engineering.md |
| test entry, oracle port, property E read-back with its sensitivity, domains A and B, generators, 72 fixtures | RowEntry (182), test/row-merge-*.mjs, scripts/row-merge-*.mjs | 0, 4 | — (counts re-recorded, §7) |

**Replaced (invented under ADR 014).**

| Piece | Modules | Replaced by |
|---|---|---|
| the sum rule (bound, lack, apart derived from an equation, both directions) | SumRule (143) | nothing: a waiting predicate derives no fact; its implied disjointness was recorded when its rows were made |
| upper bounds U1-U4, narrowing, pruning, `emptied`, the `Outside` and `Derived` refusals | Narrow (116), RowBound (50); RowStore `upper`, `emptied`; RecordTail steps 2 and 6; Disjoint's `prune` calls; Homeless's emptied bounds; Lacked's two cases; UnifyFailure's `Outside`, `Derived` | nothing; the classifier's table loses two rows |
| homes and commits | Homes (54), Commit (54); RowSettle `placing`, `forced` | waiting (§3.3 step 4); `Homes.admits` may survive as read-only diagnostic metadata for R3's list of candidate parts (§6) |

About 420 src lines in five modules go, plus their parts of RowStore,
RecordTail, Disjoint, Homeless, Lacked and RowSettle (**estimate**: 550
to 650 lines in all), with their tests: test/r005b-unify.test.mjs's
bound and commit cases, test/row-merge-homes.mjs, Task 4's regression
row `r005b-pruned-reason` (U4) and the plan rows `r005b-upper` and
`r005b-bound-reason`, which retire. `r005b-cancel` stays.

**Removed or reverted.** Nothing is reverted by `git revert`: Task 4's
commit mixes kept and replaced pieces. The replaced pieces are removed
forward, in one behaviour-changing commit (Task B1 below), after
behaviour-preserving splits where a file mixes both (RecordTail,
Disjoint, RowSettle).

**Migration, buildable at every commit.**

1. B1a (behaviour-preserving): split RecordTail's U3 steps and
   Disjoint's pruning calls into their own functions; differential 0.
2. B1b (behaviour-changing): `UnifyRecord.decide` no longer calls the
   sum rule; RowSettle `placing` sends every residue with two or more
   metas on a side to the existing placeholder `equations that wait are
   solved in Task 5` (now "in Task B2"), never commits; remove the five
   modules and the store fields; remove `Outside` and `Derived` from
   UnifyFailure and the classifier (rules §11b) in the same commit.
   Expected: problems the current compiler solves by a commit or a
   bound now reach the placeholder (a stop, never a verdict); domains A
   and B re-recorded (Solved shrinks, skipped grows; 0 defects
   required); the 25 fixtures at `stages.solver` 4 keep their classes
   (in the prototype none of them ever has a waiting predicate under
   QS-EH, in any order: a scratch check, not committed; the compiler
   run must confirm it, and any that waits becomes a stage-5 fixture);
   E and H, if approved, are written here explicitly (as Task 4's code
   reads, their effect comes today from U4 and `commitAnyway`, which
   go; B0 confirms this); differential: 0
   on sources without Tranche B syntax, and each Tranche B difference
   classified.
3. B2: the predicates (§7) remove the placeholder.

Task 5's WIP (branch r005b-task5) is reference only. Its behaviour-
preserving split (85ca98e, a settle round's change test extracted) and
its interface note (2c7292d, the stop channel kept) fit this design and
may be redone on main; the rest assumes bounds and the `naming` index
and is not used.

## 6. Diagnostics

### 6.1 The approved texts under this design

| ID | Status today | Under this design | Why |
|---|---|---|---|
| D1 | Approved (Tranche A, Task 3) | survives unchanged | a written `∉` given violated: facts layer unchanged |
| D2, D2' | Approved | survive unchanged | an overlap under `#` |
| D3, D3', D3'' | Approved | survive unchanged | a wanted fact on rigids not entailed by the signature; D3's hint `require r disjoint s in the signature` is exactly "add the given" |
| D4 | Approved (diagnostics file, R1-R9, R11) | survives; its meaning is unchanged (neither a solution nor a contradiction established) and now reads as "a predicate is undetermined at the end of the body: annotate" | R3 lists the parts that may still hold the constant (diagnostic metadata, not a solving step); R4, R7-R9, R11 unchanged; R9's hints are the annotations of §4.2 |
| D6 | Approved (forms of §2) | survives for a contradiction found when a determined predicate's equation fails (`… so r cannot have field z`) and, with N3 (H), for `… but neither r nor s can have field x` | the predicate is the equation; `required here` at its site |
| R10.1 | Approved (commit and drain bindings keep their equation) | survives for bindings made by solving a predicate (Example 17); the commit half retires with commits | `boundBy` keeps the predicate |
| R10.2 | Approved (U4's `{}` keeps the pruning fact) | retires with U4; its principle stays for E's `{}` binding (if approved): the binding keeps its predicate, so a later failure is D6, never `Expected {}, found …` | — |
| R10.3 | Approved in principle (the bound that excludes) | retires with bounds; the failing predicate is the one being examined, so no selection is needed (Examples 13, 19 keep their texts, §6.2) | — |
| D8, D9 | Approved | survive unchanged | surface |

**New text needed (Proposed, not approved).** D6b, a contradiction from
pairwise improvement (§3.3), which the approved forms cannot state
because two predicates are involved:

- `O's ROW must be both OTHER1 and OTHER2`, when two uses share every
  part (program 16: `merge's { ...r, ...s } must be both { x: Int } and
  { y: Int }`), at the expression being checked (R7), notes `required
  here` at each predicate's site in source order.
- For the `r t -> s` case (`odd-cycle`), the derived equality ends in a
  failing predicate (`b ⊎ c = { x }` with both parts forced to `{}`),
  which an approved D6 form can state (`… but neither b nor c can have
  field x`), with an `excluded here` note at the two predicates that
  forced the equality. Whether that reads well enough is a rendering
  question for the user (decision 5, §9); the alternative is to drop the
  `r t -> s` pairwise rule, which keeps `odd-cycle` Unresolved with its
  approved D4 text; its effect on the generated problems was not
  measured separately.

### 6.2 Examples of the main failure classes

All texts below are approved ones unless marked; locations follow the
approved rules (R7, location rule 1).

| Class | Program | Text | Primary | Notes |
|---|---|---|---|---|
| undetermined predicate (annotate) | `both(merge, merge)` (program 11) | D4 `Cannot tell whether merge's r or s has field x; pass a lambda with annotated parameters in place of merge` | the first `merge` (the unification that made the predicate wait) | `r and s are written here` at merge's result type; `{ x: Int } is required here` at both's parameter type |
| undetermined predicate | `apply0(merge)` (Example 1, program 9) | D4, as approved | `merge` | as approved |
| determined predicate fails | `apply1(merge, { z: 1 })` (Example 13) | D6 `merge's { ...r, ...s } must be { x: Int, y: Int }, so r cannot have field z` | `{ z: 1 }` | `required here` at the argument `merge` |
| a binding made by solving fails later | `apply3(merge3, { x: 1 }, { y: 2 }, { z: 3 })` (Example 17) | D6 `merge3's { ...r, ...s, ...t } must be { x: Int, y: Int }, so t cannot have field z` | `{ z: 3 }` | `required here` at `merge3` |
| no part can hold a constant (with H) | `apply(merge, noX)` (Example 14) | D6 `merge's { ...r, ...s } must be { x: Int, y: Int }, but neither r nor s can have field x` | `noX` | `required here` at `merge`; `excluded here` at each clause's `x` |
| two predicates disagree | `same(merge, merge)` (program 16) | **Proposed** D6b `merge's { ...r, ...s } must be both { x: Int } and { y: Int }` | the second `merge` | `required here` at each `merge` |
| overlap | `merge({ x: 1 }, { x: 2 })` (Example 15) | D2 `Field x is in both records: r disjoint s` | `{ x: 2 }` | `first written here` at `{ x: 1 }`; `required here` at the clause |
| missing disjointness | `pair(a, b) = size(merge(a, b))` without the clause (Example 16) | D3 `r and s are not known to be disjoint; require r disjoint s in the signature` | `b` in `merge(a, b)` | `required here` at merge's clause |
| lacks violation | `f({ name: 1, admin: false })` with `where r lacks { admin }` (P1) | D1 `admin is not allowed here: r lacks { admin }` | the argument | `required here` at the clause's `admin` |

Without H, Example 14 is Unresolved, and the approved D4 form has no
candidate part to name (both parts exclude `x`): it would need a new
D4 form. That is the main reason N3 (H) is recommended.

## 7. The re-plan

Every task as the existing plan's Global Constraints (AGENTS.md, tests
seen failing first, verify on the committed tree, a classified
differential, regression rows proved in an isolated copy, placeholders
at the first function that can fail). Estimates are planning estimates
in tokens and agent hours, **not a budget**; Task 4 overran its
estimate by about 1.5×.

| Task | What | Model | Estimate |
|---|---|---|---|
| B0 gate | the user's decisions (§9); rules file rewritten for this design (§3.10: the pairwise rules, E, H, the end default; the bound, sum-rule and commit sections marked superseded); claims ledger rows re-backed; fixture updates (§7.2) checked against the prototype; the zero-solution fixture's source written | Opus | 150-200k, 3-4 h |
| B1 removal | §5's migration steps 1-2: splits, then the sum rule, bounds, homes and commits removed; classifier table; domains re-recorded; differential | Opus | 200-250k, 4-5 h |
| B2 predicates | waiting predicates in the substitution (identity, site, owner); full-rescan re-examination after each top-level unification and in each settle round (joint fixpoint); pairwise improvement; E and H if approved; the end default and `Unresolved`; rollback; nested field predicates; placeholder `unresolved row predicates are reported in Task B3` | Opus | 300-350k, 5-6 h |
| B3 diagnostics | D4 and D6 from `Unresolved` and `Contradiction` (R1-R9, R11; R10.1 for solved predicates), metadata (creation sites, lambda parameter names), D6b if approved | Opus | 300-350k, 5-6 h |
| 7 literal, removal, rest | as planned (the merge literal makes rows of several tails; removal's fresh remainder is an ordinary equation) | Opus | 350k, 5-6 h |
| 8 lowering | as planned | Sonnet | 250k, 4 h |
| 9 generator, oracle level 2 | as planned, with this prototype as the second reference | Opus | 300k, 4-5 h |
| 10 close-out | ADR 013 Tranche B section (sources named per ADR 014), language.md, examples, progress | Sonnet | 200k, 3 h |

Total about 2.05-2.25M tokens (**estimate**), against 1.95M remaining
for the current plan: the paths cost about the same; the difference is
what is maintained (no invented solver) and what users annotate (§4).
Tasks B1-B3 replace Tasks 5 and 6.

### 7.1 Evidence plan

- **Oracle properties** (compiler-backed, test/row-merge*.mjs, as
  Task 4): S, L, H on domains A and B in every order and on the
  generators; property E (the state read back, independently of the
  compiler's flattener) on every Solved and every waiting state;
  `Unresolved` claims nothing, with the three buckets asserted
  (`zero (new)` 0, `determinate` 1, `diag-01` 4).
- **Second reference**: the compiler's verdicts against
  research/row-merge-qt's QS-EH (the prototype of the approved
  configuration) on the generators and fixtures, as Task 4 compared
  with research/open-row-merge; Z3 (research/row-merge-alternatives)
  stays optional, outside verify.
- **Order independence**: verdict per problem over five orders; the
  measured rate (QS-EH: 4 in 14,000 raw problems) is recorded, and a
  rise is a defect.
- **Rule arguments** before B2: the rules file (§3.10).
- **Result boundary**: the classifier's table changed in B1 (two rows
  removed) and tested by injection, as test/r005b-outcome.test.mjs.
- **Fixtures**: every fixture at the stage it can run (§7.2).
- **Regression rows** (scripts/regression-r005b.mjs), new: `qt-pairwise`
  (two predicates over the same parts not compared: program 16
  unresolved), `qt-end-default` (a predicate with a constant accepted
  at the end: `split({ x: 1, y: 2 })` accepted), `qt-rescan` (a
  predicate not re-examined after a settle round), `qt-solved-reason`
  (a binding made by solving a predicate loses it: Example 17 reads the
  shape text); kept: the plan's rows except `r005b-upper`,
  `r005b-bound-reason` and `r005b-pruned-reason`, which retire, and
  `r005b-defer`, `r005b-drained-reason`, whose wording moves to
  predicates.

### 7.2 What happens to the fixtures and research

- **test/fixtures/r005b (72 fixtures).** 68 keep their `result`, text
  and stages (69 with H). Up to four move, each a decision for the user:
  `design-forced-bound` and `diag-14-fix` Solved → Unresolved (new D4
  texts at the first `merge` and at `merge`, with the annotated programs
  added as their `-annotated` fixtures); `diag-14` stays Contradiction
  with H, else Unresolved; `odd-cycle` Unresolved → Contradiction (D6
  via pairwise improvement, text to pin), its bucket role passing to the
  new `zero` fixture. One fixture added for program 16 (`same`).
- **research/open-row-merge** stays as the record of the current
  design's evidence (its fixtures.mjs asserts that design's classes);
  research/row-merge-alternatives stays as the assessment's.
  research/row-merge-qt is the reference for this design.
- **The 72 research fixtures' rows** are shared by all three prototypes;
  nothing is deleted.

### 7.3 Risks

- **Field types in predicates** (nested predicates) are argued, not
  prototyped; B2's nested tests are the first evidence. A case the
  argument misses stops the task.
- **The joint fixpoint** with effect settling is argued (one
  re-examination pass per round); a non-terminating interplay would
  show as a timeout in B2's tests.
- **Full-rescan cost** on large bodies: measured on the scale programs
  (R001, T003) in B2; an index is added only if measured necessary, and
  then compared with the rescan on the domains (ledger L32).
- **Users meet D4 more often** in point-free higher-order uses (F2
  family, `both(merge, merge)`); the hint names the fix. A corpus of
  real programs would show whether this matters; none exists yet.
- **B1 removes merged, verified code**; the differential and the
  re-recorded domains are the guard, and the 25 stage-4 fixtures must
  keep their classes.

## 8. Explicability

What the author can say about the whole mechanism, with its sources:

> A record type is some known fields plus some unknown parts, each a
> row variable (Rémy; Gaster and Jones). Writing `{ ...r, ...s }`
> concatenates two such parts, which is allowed only when they are
> disjoint (Ur/Web's `++` and `~`, Harper and Pierce's compatibility):
> the checker records that `r` and `s` share no label, and it checks
> such facts by breaking them into facts about single labels and pairs
> of variables (Ur/Web's prover), against what the function's signature
> states (entailment, as in Jones's qualified types). When two record
> types must be equal, the checker cancels what they have in common and
> solves what is left by the usual one-tail rules (ADR 013), which find
> the most general answer when each side has at most one unknown part.
> When a side still has two unknown parts, as in `{ ...?r, ...?s } =
> { x: Int, y: Int }`, the answer is not determined: the checker keeps
> the equation as a constraint, a predicate in Jones's sense, and looks
> at it again whenever something it mentions becomes known. That is how
> PureScript's compiler treats its `Union` constraint: it solves it in
> the directions its functional dependencies allow (two parts known
> give the whole; the whole and one part give the other), and otherwise
> waits. Two constraints over the same parts must have the same whole,
> and the checker uses that too (Jones's functional dependencies). At
> the end of a function, every part still unknown is taken to be empty,
> as Haskell defaults an ambiguous type, and the program is accepted if
> that satisfies every constraint; if not, the checker cannot tell which
> part holds which field and asks the programmer for an annotation.
> Nothing is ever inferred into a signature, because Waxwing signatures
> are written in full, so every constraint is settled inside the
> function that made it. After specialization every row is known, and
> the merged record is built field by field.

The two small rules beyond that, if approved (§3.6): an empty
concatenation has empty parts; a field that every part is known to lack
cannot be in the whole.

References for each sentence: [R94], [GJ96], [C10], [HP91], [J94],
ADR 013, [PS], [J00], [H98], design draft 3 §6, §9.

## 9. Decisions for the user

1. **Adopt the re-plan** (Tasks B0-B3 replacing Tasks 5-6, and B1's
   removal of the sum rule, upper bounds, homes and commits). This
   reopens user decision 3 of 2026-10-17 (forced solving with upper
   bounds) and review F2's adopted fix.
2. **QS over QT** (§3.2): the forward dependency applied symbolically,
   keeping Task 1's representation (QT, PureScript's strict form, loses
   1,322 raw acceptances against 492).
3. **N1-N5** (§3.6): approve N1 (Merge as disjoint union, the
   definition); N2 (E) and N3 (H) recommended; N4 (C, the commit) not
   proposed; N5 kept as merged.
4. **Fixture classes** (§7.2): `design-forced-bound` and `diag-14-fix`
   to Unresolved with new D4 renderings; `odd-cycle` to Contradiction,
   with `zero (new)` taking its bucket; a fixture for program 16.
5. **D6b** (§6.1), Proposed text for two predicates that disagree, or
   drop the `r t -> s` pairwise rule and keep `odd-cycle` Unresolved.
6. **The approved R10.2 and R10.3 retire** with the machinery they
   explained; R10.1 is kept for bindings made by solving a predicate.
7. **Retire the plan's regression rows** `r005b-upper`,
   `r005b-bound-reason`, and Task 4's merged `r005b-pruned-reason`.

## 10. Evidence limits

- Labels only: field types (nested predicates), effect rows (rollback,
  the joint fixpoint), texts, specialization and lowering are absent
  from the prototype, as from the earlier ones; B2's and B3's compiler
  tests cover them.
- The prototype is a toy written for this document, not a port of the
  compiler, and it imports the earlier prototypes' oracle and
  generators. Its order differences are counted, not analysed.
- The generators are synthetic; no corpus of real Waxwing programs
  using merge exists.
- Bibliographic details other than PureScript's were not re-read for
  this document (§1). The PureScript quotations are from the compiler's
  master branch and Pursuit as fetched on 2026-10-18.
- The scratch checks cited (the annotations of §4.2 on programs 11, 12
  and F2; the 25 stage-4 fixtures never waiting) were run from scripts
  not committed; their inputs are the committed fixtures and generator.
- Estimates (§5, §7) are planning estimates.

## References

- [C10] Adam Chlipala. Ur: statically-typed metaprogramming with
  type-level record computation. PLDI 2010.
- [GJ96] Benedict R. Gaster and Mark P. Jones. A polymorphic type
  system for extensible records and variants. Technical report
  NOTTCS-TR-96-3, University of Nottingham, 1996.
- [H98] Simon Peyton Jones (ed.). Haskell 98 Language and Libraries:
  the Revised Report. Cambridge University Press, 2003; §4.3.4,
  "Ambiguous types, and defaults for overloaded numeric operations".
- [HP91] Robert Harper and Benjamin Pierce. A record calculus based on
  symmetric concatenation. POPL 1991.
- [J92] Mark P. Jones. A theory of qualified types. ESOP 1992, LNCS 582.
- [J94] Mark P. Jones. Qualified Types: Theory and Practice. Cambridge
  University Press, 1994 (from the author's Oxford D.Phil. thesis,
  1992).
- [J95] Mark P. Jones. Simplifying and improving qualified types. FPCA
  1995.
- [J00] Mark P. Jones. Type classes with functional dependencies. ESOP
  2000, LNCS 1782.
- [L05] Daan Leijen. Extensible records with scoped labels. Trends in
  Functional Programming, 2005.
- [MM19] J. Garrett Morris and James McKinna. Abstracting extensible
  data types: or, rows by any other name. POPL 2019.
- [PS] PureScript: `Prim.Row` (Union, Nub, Lacks, Cons; class
  declarations with their functional dependencies),
  https://pursuit.purescript.org/builtins/docs/Prim.Row; the compiler's
  src/Language/PureScript/TypeChecker/Entailment.hs (`unionRows`,
  `nubRows`, `rowLacks`, the deferral to `Unsolved` or
  `NoInstanceFound`), https://github.com/purescript/purescript, master
  branch, both read 2026-10-18.
- [R94] Didier Rémy. Type inference for records in a natural extension
  of ML. In Theoretical Aspects of Object-Oriented Programming, MIT
  Press, 1994 (earlier as INRIA research report 1431, 1991).
- [SDPS07] Martin Sulzmann, Gregory J. Duck, Simon Peyton Jones and
  Peter J. Stuckey. Understanding functional dependencies via
  constraint handling rules. Journal of Functional Programming 17(1),
  2007.
- [W91] Mitchell Wand. Type inference for record concatenation and
  multiple inheritance. Information and Computation 93(1), 1991.
