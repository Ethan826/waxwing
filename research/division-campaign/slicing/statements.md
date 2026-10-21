# Slicing a signature problem: proposed statements (stream 10)

Dossier §18.20, item 4: the slicing lemmas S1 and S2 of
integration/measurements.md §5 become proposed statements, with their
definitions reviewed before anyone proves or implements them. This file
gives those definitions and statements, a restrictions table, a
counterexample hunt against naive slicings, and an independent
adversarial review. Written 2026-10-21 against `68cee4a`.

**Status.** Statements only. Nothing here is proved, and no slicing is
implemented in the compiler or in `checkAll`. The Lean file is
research/composition-proofs/Composition/Sig/SliceDefs.lean:
definitions, each claim a `Prop`, and `#guard`s that run the computable
definitions on five examples. Status labels: **proposed** (a statement
for review), **checked (bounded)** (sig-oracle evaluation at the bounds
stated), **argument only** (a sketch, no check).

## 0. In brief

- **What links.** Every variable links, rigid or flexible, row or type,
  at any depth (a row inside a field type counts), in `D` as in `B`. An
  atom that mentions no variable is a **ground atom**. Ground atoms go to
  a **ground slice**, which is kept and checked like any other.
- **S1 (independence).** For any slicing, `P` is valid iff `D` has no
  solution, or every slice is valid. The disjunct handles vacuity: if
  `D` is impossible in one slice, `P` is valid, even when another slice
  is invalid on its own. Without the disjunct the statement is false
  (`vacuity-one-slice`, `vacuity-ground-D`).
- **S2 (irrelevant pairs).** `checkAll` needs patterns only over the
  pairs `(r, l)` with `l` written in **r's slice**. The finer reading,
  "`l` written in an atom that mentions `r`", is unsound: P9s then
  accepts `u = r, u lacks a`, which is invalid (`atom-relevance`).
- **For the checker.** The minimal consequence, C1: if `checkAll`
  passes on every slice, `P` is valid (S0, S1 and K6 give it). The
  stronger claims, proposed separately: P9s's acceptance commutes with
  slicing (S1-acc), so some table passes the whole problem iff some
  tables pass the slices (C2), and the same for S2 (C3).
- **Counterexamples to naive slicing**: nine shapes, all confirmed by
  the bounded oracle (§5.1). Five are unsound, meaning the naive
  slicing accepts an invalid problem: a flexible type variable shared
  by two slices, a row shared inside a field, a dropped ground atom, a
  dropped variable-free group inside an atom, and relevance read per
  atom. Four make it incomplete, meaning it refuses a valid problem: a
  hypothesis on a rigid type variable lost, a hypothesis linking two
  rows lost, `D` impossible in one slice only, and a ground `ff` in
  `D`.
- **The cut stream 7b measured is unsound as a slicing.** It drops
  variable-free groups inside an atom. `{ a: Bool } = { a: Int, ...u }`
  loses its only contradiction (`field-clash`, found by the generated
  run). Its counts are measurements, not verdicts, so nothing reported
  as a verdict is wrong. The counts are of a slicing that S1 does not
  cover (§5.2).
- **No counterexample to S1, S1-acc or S2** (bounded) in 20 named
  problems, sig-oracle's 23 challenges and 1,100 generated problems
  (§5.3).

## 1. The model sliced

The Sig model, unchanged (dossier §13.1, §14.2, §15.2):
`SigProblem` has `rigidTy`, `rigidRow`, `D` and `B`. `ValidAll` reads
every rigid assignment satisfying `D`, and asks for a flexible one
satisfying `B` (`combine`). `ValidFin` is the same over finite values.
`Accepts` is P9s's rule: one certificate per pattern consistent with
`D`. `checkAll P T` checks a table, pattern by pattern, over
`patterns P = subsets (pairs P)`, `pairs P = rigidRow × written P`.

The cost to cut is `2^(|rigidRow| · |written P|)`. The synthetic `wide`
(measurements.md §6.1) gives `2^42` because every label written
anywhere in the body pairs with every rigid row.

## 2. Definitions (proposed)

### 2.1 Variables and atoms

- `SVar` is `ty n` or `row r`. Type variables and row variables are
  numbered separately in `Syntax.lean`, so they need separate tags.
- `atomVars a` lists the variables atom `a` mentions: `tyVarsOf [a]` and
  `rowVarsOf [a]`. Both recurse into field types and arrows
  (Reduction.lean), so a row inside `{ f: { ...u } }` is mentioned.
  `lacks r l` mentions `r`; `disjoint r s` mentions both; `ff` mentions
  nothing.
- `RigidIn P x` holds if `x` is in `P.rigidTy` or `P.rigidRow` (by its
  sort).
- A **ground atom** mentions no variable: `ff`, `Int = Bool`,
  `{ a: Int } = { a: Int }`, `{ a: Int, a: Int } = { a: Int }` (an
  undefined record, so the atom is false).

The **dependency graph** is a hypergraph. Its nodes are the variables
of `D ++ B`, and each atom joins all of its variables. Its components
are the finest slicing S1 covers.

### 2.2 The general shape: `IsSlicing P S`

`S` is a list of `SigProblem`s such that:

1. **sub**: each slice's `D` and `B` are drawn from `P.D` and `P.B`;
2. **sort**: on its own variables a slice agrees with `P` about which
   are rigid (`RigidIn Q x ↔ RigidIn P x`);
3. **cover**: every atom of `P.D` lies in some slice's `D`, and every
   atom of `P.B` in some slice's `B`;
4. **apart**: two slices at different positions share no variable
   (`List.Pairwise`).

A ground atom may lie in several slices, since it shares no variable
with anything. **cover** is what keeps ground atoms: a slicing that
drops them is not an `IsSlicing`.

### 2.3 The computed slicing: `slices P`

- `componentSets P`: for each non-ground atom of `D ++ B` not yet
  covered, the closure of its variables under "an atom meeting the set
  adds its variables" (`closeN`, `C.length` rounds).
- `sliceOn P vs`: the rigid variables of `P` in `vs`, and the atoms of
  `D` and of `B` that meet `vs`.
- `groundSlice P`: no rigid variables, the ground atoms of `D` and of
  `B`.
- `slices P = groundSlice P :: componentSets P map sliceOn P`.

The ground slice is always present, possibly empty. Its validity is
"if `D`'s ground atoms hold, so do `B`'s", since nothing in it varies.

### 2.4 What links, and why

| Ingredient | Links? | Reason | Example (§5.1) |
|---|---|---|---|
| shared row variable, rigid or flexible | yes | the slices would choose or read it separately | `rigid-shared-row` (see S1r) |
| shared flexible type variable | yes | one value must serve both slices | `shared-flex-tyvar` |
| shared rigid type variable | yes (conservative) | needed only through `D`; see S1r | `rigid-tyvar-hyp`, `rigid-tyvar-shared` |
| row in a field type | yes, at any depth | `u = r` inside `{ f: _ }` is still `u = r` | `nested-shared-row` |
| hypothesis in `D` over two slices' variables | yes | a `D` with equations projects non-trivially: `r = { a: Int, ...s }` tells slice `r` that `r` holds `a` | `hyp-links` |
| written label shared between slices | no | a label is a constant: two atoms naming it share no state | `shared-label` |
| ground atom | ground slice | a false ground atom in `B` makes `P` invalid; in `D`, vacuously valid | `ground-*`, `vacuity-ground-D` |

For hypotheses in source form the link is harmless but kept. Source
`D` has only `lacks` and `disjoint`, is closed downwards and holds when
every row is empty (`clauseOnly_satisfiable`, dossier §18.18). Setting
the other slice's rows to empty then satisfies every clause between
the two, so dropping the link loses nothing there
(`hyp-disjoint-only`).

**Rigid variables need not link if every slice keeps all of `D`
(S1r).** `∀x̄. D → ∃ȳ₁ȳ₂. B₁ ∧ B₂`, with `ȳ₁` and `ȳ₂` disjoint, is
equivalent to `(∀x̄. D → ∃ȳ₁. B₁) ∧ (∀x̄. D → ∃ȳ₂. B₂)`: `∀` and `→`
distribute over `∧`. So only flexible variables have to link `B`
atoms. The catch: each slice then carries all of `D` and `P`'s rigid
lists, so its patterns range over every rigid row and every label of
`D`. Pruning `D` back to a slice brings back the vacuity disjunct. S1
is the conservative statement; S1r is offered beside it.

## 3. Statements (proposed; none proved)

Lean names in SliceDefs.lean. Each is a `Prop` over `Label` and `B`
with `DecidableEq Label` (and `DecidableEq B` where the checker
appears).

- **S0, the computed slices are a slicing.** `IsSlicing P (slices P)`
  for every `P`. Argument to formalize: the closure is connected and
  closed after `C.length` rounds; distinct sets in `componentSets` are
  disjoint, because a later atom meeting an earlier set is skipped; and
  every atom meeting a set has all its variables in it.
- **DSatSplit.** For a slicing, `D` is satisfiable iff each slice's `D`
  is. Argument: glue the slices' solutions (variables are apart; ground
  atoms hold anywhere if they hold somewhere).
- **S1, independence.**
  `IsSlicing P S → (ValidAll P ↔ ¬ DSat P ∨ ∀ Q ∈ S, ValidAll Q)`.
  - ←: glue the slices' flexible solutions; congruence (`sat_congr`)
    and **sort** make each `B` atom hold in `P` as in its slice.
  - →: take any solution `θ₀` of `D`. For slice `Q` and a rigid
    assignment `θ` satisfying `Q.D`, use `θ` on `Q`'s variables and
    `θ₀` elsewhere. That satisfies `P.D`, because an atom of `P.D`
    meeting `Q`'s variables lies in `Q.D` (**cover** and **apart**). It
    then has a flexible solution for `P.B ⊇ Q.B`.
  - **Vacuity.** The disjunct is exact. By DSatSplit, `¬ DSat P` iff
    some slice's `D` is impossible. That covers a ground `ff` in `D`
    and a `D` impossible in one slice only (`vacuity-one-slice`). In
    those cases `P` is valid and S1 says nothing about the other slices.
    No other vacuity exists: when `D` is satisfiable, each slice's
    verdict is exact.
- **S1Fin.** The same for `ValidFin`, with `DSatFin` (a solution of `D`
  finite at the rigid variables) in the disjunct.
- **S1r, the refinement.** For `IsFlexSlicing P S` (every slice keeps
  `P`'s rigid lists and all of `D`, slices share only rigid variables,
  every `B` atom in some slice): `ValidAll P ↔ ∀ Q ∈ S, ValidAll Q`,
  and the same for `ValidFin`. No disjunct: every slice has the same
  `D`.
- **S1-acc, P9s's rule commutes.** `Accepts P ↔ ∀ Q ∈ slices P,
  Accepts Q`. No vacuity disjunct is needed: `Accepts` never reads
  `D`'s satisfiability. `Consistent` ignores `eq` and `ff` (§15.6), on
  the whole and on the slices alike. Argument to formalize, in two
  parts. Both use a homomorphism on generic values, of the kind `h` is
  in §14.3:
  - →: restrict a whole pattern to the slice, and **erase** from the
    certificate every label the slice neither writes nor holds as a
    rest of its own rigid rows. No slice atom names such a label, and
    erasing labels preserves equations, definedness, `lacks` at written
    labels, `disjoint`, W3 and finiteness.
  - ←: erase as above, then **expand** each rest `ρ_r` into `ρ_r` plus
    `A(r, l)` at every label `l` that the whole pattern puts in `r` and
    the slice does not write. Expansion maps the slice's `genRow r` to
    the whole's. Two rests composed or compared by `disjoint` are
    declared disjoint (W3, D2), so a consistent pattern gives them no
    common `l` and the expansion stays defined. Slices' certificates
    have disjoint flexible variables and are glued.
- **S2, irrelevant pairs.** `relevantPairs P` holds each slice's
  `pairs`: its rigid rows with the labels written in it.
  `AcceptsOn P keep` is P9s's rule, asking only for patterns with no
  presence outside `keep`. S2: `Accepts P ↔ AcceptsOn P (relevantPairs
  P)`. → is immediate. ← is the expansion of S1-acc applied inside one
  problem. Which components can be dropped: every `(r, l)` with `l`
  written in no atom of `r`'s slice. That includes every `l` written
  only in the ground slice, and every pair of a rigid row that no atom
  mentions.
- **C1, the sliced checker is sound.** `checkSliced P Ts = true →
  ValidAll P ∧ ValidFin P`, where `checkSliced` runs `checkAll` on each
  slice of `slices P` with its own table. From K6
  (`checkAll_validAll`, `checkAll_validFin`), S0, and the ← halves of
  S1 and S1Fin. This is the only consequence an implementation needs
  for soundness.
- **C2, the checker's verdict commutes.** `(∃ T, checkAll P T = true)
  ↔ ∃ Ts, checkSliced P Ts = true`. It is S1-acc at the level of finite
  tables. Erasure and expansion act on `SG` lists directly, so the
  argument does not need K7 or `accepts_iff_checkAll`. Using them is
  an alternative.
- **C3, S2 for the checker.** `checkAllOn P T` runs `checkAll`'s loop
  over `subsets (relevantPairs P)`. Soundness:
  `checkAllOn P T = true → ValidAll P ∧ ValidFin P`. Verdict:
  `(∃ T, checkAll P T = true) ↔ ∃ T, checkAllOn P T = true`.

**The weaker relation, stated plainly.** For validity, S1's
equivalence holds only with its vacuity disjunct. For the checker,
C1's one-way implication is what soundness needs. C2 and C3 say that
slicing never changes `checkAll`'s verdict, whichever table is
supplied. They do not make P9s complete: `split-plus` stays
Unresolved, sliced or not. Nor does slicing repair vacuity: a `D`
impossible in one slice gives Unresolved, whole or sliced
(`vacuity-one-slice`). Source `D` is never impossible
(`clauseOnly_satisfiable`).

**Not stated.**

- Cutting an atom into groups (the measured cut, §5.2) needs its own
  pointwise-equivalence lemma, and the cut as measured fails it.
- Slicing the presence decider (`bitCheck`, `writtenCheck`): it needs
  a separate statement over `PProblem`. measurements.md's sliced
  `writtenCheck` counts are not covered.
- A semantic S2 (rigid rows restricted to hold no irrelevant label):
  it needs infinitely many labels and a renaming lemma; `checkAll`
  does not need it.
- The cost of computing the slices (`closeN` is quadratic as written).

## 4. Restrictions table

| Restriction | Believed harmless because | Challenge | Status |
|---|---|---|---|
| slices are unions of whole atoms; no atom is cut | cutting needs a pointwise-equivalent decomposition, a separate lemma | `field-clash`, `ground-level-mismatch` refute the measured cut | kept; cutting not proposed |
| every variable links, rigid ones too | conservative: only merges slices | `rigid-shared-row`, `-bad`, `rigid-tyvar-shared`: S1r's finer slicing agrees with the whole | checked (bounded); S1r offered separately |
| `D` atoms link like `B` atoms | `D` with equations projects non-trivially onto one slice | `hyp-links`: ignoring the link refuses a valid problem; `hyp-disjoint-only`: harmless for source `D` | checked (bounded) |
| ground atoms kept in a ground slice | a false ground `B` atom makes `P` invalid; a false ground `D` atom makes it vacuously valid | `ground-ff-B`, `ground-eq-B`, `ground-undefined-B` (dropping: unsound); `vacuity-ground-D` (dropping: incomplete) | checked (bounded) |
| vacuity as one disjunct on the whole `D` | DSatSplit: `D` is impossible iff it is impossible in some slice | `vacuity-one-slice`, `vacuity-ground-D` | checked (bounded); DSatSplit proposed |
| labels never link | atom truth reads labels as constants; no state is shared | `shared-label` | checked (bounded) |
| relevance at slice level, not atom level | a label reaches a rigid row through flexible rows | `atom-relevance`, and the same shape inside `vacuity-one-slice` and `rigid-shared-row-bad` | atom level refuted; slice level checked (bounded) |
| slices restrict the rigid lists to their own variables | an unmentioned variable does not affect satisfaction (`sat_congr`); P9s gets fewer pairs | S0's **sort** field; C1 | argument only |
| a flexible index in an unscoped `D` links with the same index in `B` | over-linking only merges slices | none built | argument only |
| slices are checked with their own written labels and the oracle's unwritten ones | validity does not depend on which unwritten labels exist (S1 has no label condition) | the generated runs (§5.3) | checked (bounded) |
| P9s's incompleteness is unchanged by slicing | S1-acc | `split-plus`; 1,100 generated, P9s sliced and whole agree | checked (bounded) |
| `closeN` runs `C.length` rounds | each productive round adds an atom's variables | `#guard`s in SliceDefs.lean | part of S0 |

## 5. Counterexample hunt

Scripts in this directory, run from the repository root or here:

- slice.mjs: the proposed slicing and four naive ones (`rowsOnly`,
  `topLevel`, `dropGround`, `ignoreD`), and the two relevance notions.
- variants.mjs: the cut stream 7b measured (`measured`) and S1r's
  slicing (`flexLinked`).
- problems.mjs: the named problems, each with predicted verdicts.
- hunt.mjs: runs them (`node hunt.mjs`). A slicing's verdict is valid
  iff every slice, the ground slice included, is valid in the bounded
  model (sig-oracle/bounded.mjs). S1's verdict is the same with "valid"
  when `D` has no solution in the bounded rigid domain. P9s
  (sig-oracle/p9s.mjs) runs on the whole, on the proposed slices, and
  with patterns restricted to slice-level and to atom-level relevant
  pairs. `noVacuity` is the proposed slicing without S1's disjunct.
- generated.mjs: agreement runs (§5.3).

A slicing **unsound** in the table accepts an invalid problem; one
**incomplete** refuses a valid one.

### 5.1 Named problems (checked, bounded)

`node hunt.mjs`: 20 problems, all as predicted after three prediction
fixes (below). S1's verdict equals the whole problem's in all 20.

| Problem | `D`; `B` | Whole | Wrong slicings | Kind |
|---|---|---|---|---|
| `shared-flex-tyvar` | ; `x = {..r}`, `x = {..s}` | invalid | rowsOnly, topLevel | unsound |
| `nested-shared-row` | ; `{f: {..u}} = {f: {..r}}`, `{f: {..u}} = {f: {..s}}` | invalid | topLevel | unsound |
| `ground-ff-B` | ; `u = r`, `ff` | invalid | dropGround, measured | unsound |
| `ground-eq-B` | ; `u = r`, `Int = Bool` | invalid | dropGround, measured | unsound |
| `ground-undefined-B` | ; `u = r`, `{a: Int, a: Int} = {a: Int}` | invalid | dropGround, measured | unsound |
| `ground-level-mismatch` | ; `{f: {..u}, g: Int} = {f: {..r}}` | invalid | measured | unsound |
| `field-clash` | ; `{a: Bool} = {a: Int, ..u}` | invalid | measured | unsound |
| `rigid-tyvar-hyp` | `α = Int`; `α = Int` | valid | rowsOnly, topLevel | incomplete |
| `hyp-links` | `r = {a: Int, ..s}`; `{a: Int, ..u} = r`, `v = s` | valid | ignoreD | incomplete |
| `vacuity-one-slice` | `r = {a: Int}`, `r lacks a`; `v = s`, `v lacks b` | valid | noVacuity and every naive slicing | incomplete |
| `vacuity-ground-D` | `ff`; `r lacks a` | valid | noVacuity and every naive slicing | incomplete |
| `hyp-disjoint-only` | `r disjoint s`, `r lacks a`; `{a: Int, ..r} = u`, `v = s` | valid | none | control |
| `ground-D-true` | `Int = Int`; `r lacks a` | invalid | none | control |
| `shared-label` | `r, s lack a`, `s lacks b`; `{a: Int, ..r} = u`, `{a: Bool, b: Int, ..s} = v` | valid | none | control |
| `irrelevant-pair` | `s lacks b`; `u = r`, `{b: Int, ..s} = v` | valid | none | control (S2) |
| `atom-relevance` | ; `u = r`, `u lacks a` | invalid | none | S2 at atom level unsound |
| `split-plus` | `s disjoint t`; `r = u ⊎ v`, `u disjoint s`, `v disjoint t`, `x = α` | valid | none | P9s Unresolved, whole and sliced |
| `rigid-shared-row` | `r lacks a`; `{a: Int, ..r} = u`, `v = r` | valid | none | S1r |
| `rigid-shared-row-bad` | ; `u = r`, `v = r`, `v lacks a` | invalid | none | S1r |
| `rigid-tyvar-shared` | ; `x = α`, `{a: α} = {a: y}` | valid | none | S1r |

`r`, `s`, `t` are rigid rows, `u`, `v` flexible rows, `α` a rigid type
variable, `x`, `y` flexible type variables. `ff`-free `D` columns are
empty where shown as `;`.

P9s, sliced (S1-acc) and with slice-level relevance (S2), gives the
whole problem's verdict in all 20. With atom-level relevance it accepts
three invalid problems: `atom-relevance`, `vacuity-one-slice` (whose
second slice has the same shape; whole P9s is Unresolved there) and
`rigid-shared-row-bad`.

**Prediction fixes, recorded.** The first run flagged three: two were
predictions that missed the atom-relevance shape inside
`vacuity-one-slice` and `rigid-shared-row-bad`; one was a mis-written
problem (`irrelevant-pair` first had `{ b: Int, ...v } = s` with `s
lacks b`, invalid, where `{ b: Int, ...s } = v` was meant). None
changed a verdict of S1, S1-acc or S2.

**What the naive slicings get wrong, in one line each.**

- `rowsOnly` (rows link, type variables do not): a flexible type
  variable chosen twice (unsound); a hypothesis about a rigid type
  variable lost (incomplete).
- `topLevel` (only top-level tails link): additionally rows inside
  fields (unsound).
- `dropGround`: false ground `B` atoms (unsound); false ground `D`
  atoms (incomplete).
- `ignoreD` (`D` atoms spanning slices dropped): `hyp-links`
  (incomplete); never unsound, since dropping a hypothesis only makes
  slices harder.
- `noVacuity`: refuses vacuously valid problems (incomplete only).

No naive slicing that keeps every atom and links every flexible
variable at every depth was found unsound. Every unsoundness found
comes from dropping an atom or a group, or from letting one flexible
variable be chosen twice.

### 5.2 The cut stream 7b measured

measurements.md §2.3 cuts each equation into groups and drops groups
with no variable ("Groups with no variable (ground records) belong to
no slice"). variants.mjs reimplements that cut on the oracle's syntax.
A field held on both sides keeps a fresh flexible type variable on both
sides of its group, so each group is again an equation.

- Dropping a variable-free group drops contradictions that sit inside
  an atom with variables. One case is labels that differ at a level
  (`ground-level-mismatch`). Another is a clash one level down
  (`field-clash`, `{ a: Bool } = { a: Int, ...u }`, minimized from the
  three problems `generated.mjs plain 300 7` found).
- Otherwise the cut agreed with the whole in the named problems.

The measurement reports sizes, not verdicts, so no verdict reported
there is wrong. Its "sliced" counts measure a slicing that S1 does not
justify. They would be justified by S1 only after (a) groups with no
variable are kept, in the ground slice or in their atom's slice, and
(b) a decomposition lemma shows the remaining cut pointwise
equivalent. Without the cut, atom-level slicing can only merge the
measured components, so its counts are the same or larger. Whether
`wide` stays at `2^2` is not checked; it should, since its 20-field
record shares no variable with `r` or `s` (argument only).

### 5.3 Generated runs (checked, bounded)

Grammar fixed before running, as written in generated.mjs's header:

- `challenges`: sig-oracle's 23 challenges at their own bounds;
- `plain`: sig-oracle's plain grammar (grammar.mjs), default bounds;
- `pair`: two parts with rows `{0, 3}` and `{1, 4}`, labels `a` and `b`
  shared by both, rigid type variable `α` usable in both. Each part
  gets one or two `B` atoms (record equations with an optional field,
  `u lacks l`, `u disjoint r`) and `r lacks l` in `D` with probability
  0.3. Added at random: a ground `B` atom (`ff`, `Int = Bool`,
  `Int = Int`), a ground `D` atom (`ff`, `Int = Int`), `D` `{...0} =
  { a: Int }`, and with probability 0.2 one link (`u = s`, `u disjoint
  v`, or `x = {..r}` with `x = {..v}`). Bounds: one unwritten label,
  `Int` and `Bool` as field types.

| Run | Problems | With two or more slices | S1 disagrees | P9s sliced disagrees | S2 disagrees | atom-level relevance disagrees |
|---|---|---|---|---|---|---|
| `challenges` | 23 | 0 | 0 | 0 | 0 | 0 |
| `plain 300 7` | 300 | 137 | 0 | 0 | 0 | 3 |
| `pair 400 1` | 400 | 372 | 0 | 0 | 0 | 7 |
| `pair 400 2` | 400 | 370 | 0 | 0 | 0 | 6 |

Naive slicings' disagreements with the whole, counted (either
direction; `challenges` has `rowsOnly` 1 and `topLevel` 4, `plain`
has `measured` 3 and no other):

| Run | noVacuity | rowsOnly | topLevel | dropGround | ignoreD | measured | flexLinked (S1r) |
|---|---|---|---|---|---|---|---|
| `pair 400 1` | 33 | 39 | 39 | 42 | 33 | 44 | 0 |
| `pair 400 2` | 27 | 30 | 30 | 42 | 29 | 43 | 0 |

S1r's slicing (`flexLinked`) agreed with the whole in every problem of
every run, bounded evidence for S1r. The whole problem was valid in
112 and 103 of the pair problems, and P9s accepted 77 and 75.

**Power.** The same harness detects each refuted notion. In the named
problems, `p9sOn` with atom-level relevance accepts three invalid
problems, and `slicedVerdict` flags every naive slicing on its
counterexample. A run in which S1 or S2 never disagrees is therefore
not a harness that cannot see disagreements. It remains bounded
evidence at small sizes: at most three rigid rows, two flexible rows,
two written labels, one or two unwritten labels.

## 6. Adversarial review

Paused before completion; see RESUME.md. Soundness pass (independent
reviewer, 2026-10-21): no false statement found; S0 fuzzed in Lean on
4,000 problems, 0 failures. Three points, not yet applied:
(1) S2's ← sketch must erase per slice before expanding (otherwise
`u disjoint r` with `u` holding `b` from another slice breaks);
(2) S1Fin ← needs finite values at a slice's unmentioned extra rigid
variables, or `sort` tightened to `Q`'s rigid lists ⊆ `P`'s;
(3) state a `DSatFin` split beside DSatSplit. The completeness pass was
stopped by the pause.

## 7. For the author

1. **Approve or amend the definitions**: `atomVars` (every variable,
   any depth), `IsSlicing` (sub, sort, cover, apart), `slices` (ground
   slice always present), `relevantPairs` (slice level).
2. **S1's vacuity disjunct** versus refusing an impossible `D`
   separately (dossier §2.3). Either is consistent with
   source `D`, which is never impossible.
3. **S1r**: worth stating for proof? It slices finer when a rigid row
   is shared by flexible parts. Each slice then carries all of `D`, so
   pattern savings need `D` pruned again.
4. **Which checker statement to prove first.** C1 needs only S0 and
   the easy half of S1. C2 and C3 need the erasure and expansion
   homomorphisms (new machinery in the sense of ADR 014, of the same
   kind as §14.3's `h`).
5. **The measured cut**: recompute the sliced counts at atom level (or
   with ground groups kept), or state a decomposition lemma first.
6. **Presence slicing**: whether `bitCheck` and `writtenCheck` should
   get their own S1, since measurements.md reports sliced counts for
   them too.
