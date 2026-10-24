# `entailedGround`: reduction through entailed equalities

Task 4.2 Step 2 of the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md). Date 2026-10-23,
base 8ac3e67. The written argument docs/engineering.md asks for
before a solving rule is implemented ("Every solving rule has a
written argument"). Written and committed before the implementation,
for review. Nothing here is implemented or run yet. Revised after the
argument review (task-4.2-argument-review.md beside the brief,
"sound with corrections"; findings B1-B4 and the non-blocking items),
before any implementation or run.

Labels: **cited** (a source or a file:line at 8ac3e67), **proved
there** (a Lean theorem in research/composition-proofs, for the
fragment it states), **argued** (reasoning, unchecked), **planned
check** (a test Step 1 writes, with its grammar fixed here).

## 1. What it answers

`entailedGround ∷ RecordedProblem → Entry ReqAtom → Maybe GroundType`.
For a `BQ` atom `pr τ` or `cmp τ` it answers `Just g` only when every
solution of the problem's original equations gives `τ` the ground
value `g`; otherwise `Nothing` ("not ground"). It never reads a
candidate σ, a solver's binding, or anything but the problem.

Entailed equalities are the ones "that hold in every solution of the
problem's original atoms, never bindings a solver chose" (cited:
research/division-campaign/r0/generation-interface.md:443-445, T-R0a
§3.5; dossier §18.65, §18.69 Q2). The argument below does not cite
CX's C1-E as the criterion (its standing is CX §8 Q5, open; cited:
research/division-campaign/refute/statements.md:481).

A solution is T-R0b §5.4's: for a base extension `B₁`, a finite
rigid assignment `θR` with `Sat θR p.d` and a finite flexible one
`θF` with `Sat (θR ∪ θF) p.b`, where an equation holds when both
sides are defined and equal (cited: research/composition-proofs/
Composition/Syntax.lean:81-86, `Holds`; records are compositions of
disjoint parts, :53-74). Ground records are label maps, so field
order does not matter.

`E` is the `Equal` atoms of `p.d` and `p.b`. Today `p.d` holds only
`Lacks` and `Disjoint` atoms (cited: every `ToD` in
src/Features/Check/Generate/Signature.purs:95-198, whose atoms come
from :189-198 and Generate/Facts.purs:48-52), so `E` is `p.b`'s
equations.

## 2. The procedure

Robinson's unification (Robinson 1965) in Martelli and Montanari's
transformation form (1982), as the Lean unifier states it for the
tail-free fragment (cited: Composition/Unify/Algo.lean:1-7), with
Rémy's row rule for records of at most one tail (Rémy 1989, 1994).
Composition of published primitives (ADR 014); the three design
choices that are this note's own are marked **(choice)**.

**The fragment.** Every `Record` in `E`, at every depth, has at most
one tail and no repeated label. Otherwise the answer is `Nothing`
for every atom not already ground **(choice: the restriction is
whole-problem)**.

**Rigid variables are constants (choice).** A rigid variable is never
bound. A step that would bind one, or equate two distinct rigid
variables, fails.

**Rules**, on a list of equations and an idempotent substitution
`θ` (initially empty):

| # | equation | step |
|---|---|---|
| R1 | `t = t` (syntactically) | delete |
| R2 | `a → b = c → d` | `a = c`, `b = d` |
| R2′ | `App h ās = App h b̄s` (same head, same arity) | pairwise equations |
| R3 | `Base b = Base b′`, `b ≠ b′`; arrow, app, base or record against a different constructor; `App` heads or arities differ | fail |
| R4 | `x = t`, `x` flexible, `t ≠ x` | fail if `x` occurs in `t`; else bind `x := t` |
| R4′ | `t = x` with `t` not a flexible variable | as R4, swapped |
| R4″ | `p = t`, `p` rigid, `t ≠ p` not a flexible variable (a base, arrow, record, app or another rigid variable) | fail |
| R5 | `{L \| T} = {L′ \| T′}` | below |

Here `x = p`, `p` rigid, binds `x := p` (R4); `p = Int`, `p = q` for
distinct rigid `p`, `q`, fail (R4″). A rigid row is met only as a
tail, in R5.

R5, with `A = labels(L) \ labels(L′)` and `B = labels(L′) \ labels(L)`
and `T`, `T′` each a row variable or none: first one equation per
common label. Then:

| tails | condition | binding |
|---|---|---|
| none, none | `A = B = ∅` | none |
| none, `ρ′` | `B = ∅`, `ρ′` flexible | `ρ′ := {L↾A}` |
| `ρ`, `ρ` | `A = B = ∅` | none |
| `ρ`, `ρ′`, `ρ ≠ ρ′` | `A = B = ∅`, one flexible | flexible one `:=` other |
| `ρ`, `ρ′`, `ρ ≠ ρ′` | `A ≠ ∅ = B`, `ρ′` flexible | `ρ′ := {L↾A \| ρ}` |
| `ρ`, `ρ′`, `ρ ≠ ρ′` | `A = ∅ ≠ B`, `ρ` flexible | `ρ := {L′↾B \| ρ′}` |
| `ρ`, `ρ′`, `ρ ≠ ρ′` | `A, B ≠ ∅`, both flexible | fresh flexible `ρ″`: `ρ := {L′↾B \| ρ″}`, then `ρ′ := {L↾A \| ρ″}` |

(the symmetric `ρ`, none case swapped). Any other case fails; in
particular `ρ`, `ρ` with `A` or `B` non-empty.

**Binding** (R4 and every R5 binding, in sequence). A binding
`v := t` first has the current `θ` and every earlier binding of the
same step applied to `t`; it fails if `v` occurs in the result, in a
field type or as a tail (the occurs check covers tails). Then it is
applied to the remaining equations and to `θ`'s images, so `θ` stays
idempotent. In the fresh-variable row the second binding's right side
therefore has `ρ := …` applied before its occurs check: for
`{a: {|r} | r} = {b: {|s} | s}`, `r := {b: {|s} | ρ″}` turns the
second side into `{a: {b: {|s} | ρ″} | ρ″}`, which mentions `s`, so
the step fails (review finding B2's cycle). Binding `ρ := {M | T″}`
turns `{K | ρ}` into `{K ∪ M | T″}`, still one tail; if `K` and `M`
share a label, the step fails. A fresh `ρ″` is a flexible variable
the problem's `vars` does not hold.

*Amendment (2026-10-24, BACKLOG R021; written after the code changed,
on the token review's finding I-3).* The implementation no longer
applies a binding to the remaining equations and to `θ`'s images when
it is made. That cost was quadratic. Features.Check.Entailed.Triangular
keeps `θ` in triangular form (Baader and Snyder's dag solved form). An
equation, or a binding's image, is read through `θ` when it is taken,
read images are compressed, and the answer is the back-substitution
into an idempotent `θ`. R2 also takes a whole arrow spine at once.
Each binding takes a fresh, later place, even for a variable bound
before. The rules above, and the occurs check against the image under
the current `θ`, are unchanged. Equivalence holds under a precondition
this note did not need before: the problem is well-sorted, meaning no
variable is both a type and a record tail. `fragment` does not check
this. On an ill-sorted problem the eager reading substitutes a
variable's first binding where it occurs as a type, and the triangular
reading uses its later one, so the answers can differ. Neither answer
is then a safe reading, so a guard enforces the precondition (token
re-review B-1): Entailed's `wellSorted`, a problem-level check. Both
`reduction` and the read-back's completion treat an ill-sorted problem
as outside the fragment, so `g0Guard` declines its non-ground atoms.
The guard fires on none of the 3,017 generated problems of RT8's run.
The argument is in docs/findings.md, "R021: a triangular unifier for
the `BQ` detectors" and its fix rounds 1 and 2. The check is
test/r0-mgu-eager.test.mjs, a seeded differential against a port of
the eager algorithm.

**Answer.** If `τ` is already ground (no variable, no tail, no
repeated label), `Just τ` without unifying **(choice)**. Else, if the
rules end without failure, apply `θ` to `τ`; `Just` the result if it
is ground, else `Nothing`. Failure gives `Nothing`. `g0Guard` reads
the same reduced type (not ground, mentions a rigid variable) through
a shared internal step; `entailedGround` is its `Maybe` view. On a
unification failure there is no reduced type: `g0Guard` then reads
the atom as recorded (declines if it is not ground and mentions a
rigid variable), and admits an atom over flexible variables only,
whose candidate the check refuses, since `E` then has no generic
solution (argued).

## 3. The argument

**EG (soundness).** If `entailedGround p e = Just g`, `e`'s type `τ`
evaluates to `g` in every solution of `p`. Argued, in four steps.

1. **Monotone in the atoms.** Every solution of `p` satisfies `E`,
   since `E` is a subset of `p.d ∪ p.b`. So a fact true in every
   solution of `E` is true in every solution of `p`. Lacks, disjoint
   and `ff` atoms, and any hypothesis G-ValidR adds (Pr-1's implicit
   printable atoms, r0-validr-draft.md §4.2), only shrink the
   solution set, so this holds before and after G-ValidR (argued).
   G-ValidR's `∀ κ` does not shrink it but leaves `E` and `θ(τ)`
   unchanged, and a ground `g` has no fresh base (argued).
2. **Each rule keeps every solution (forward direction).** If `s`
   solves the equations and bindings before a step, some extension
   of `s` to the step's fresh variables solves them after, and
   `s(x) = s(θ(x))` for each binding. R1 is trivial. R4's forward
   step is proved there by `elim_complete` (Unify/Facts.lean:66), for
   every Lean `TExpr`, tails included; R2's by `holds_arrow_iff`
   (Facts.lean:118, which needs `wfT`, so tail-free). Both are proved
   for app-free values over flexible variables only (Lean has no
   `app` and no rigid variables, Syntax.lean header); their move to
   `GA(B₁)` with `app` is argued. R2′ is R2's argument for a free
   constructor (`app` is free in T-R0b §5.4's values, cited; §5.4 is
   itself proposed): argued. R3 and R4″ are failures, which EG never
   needs justified. R5 is argued here:
   - Let `s` solve `{L | T} = {L′ | T′}`. Both sides are defined, so
     `L`'s labels are disjoint from `s(T)` and `L′`'s from `s(T′)`,
     and the two label maps are equal. A common label's two field
     values are then equal (the field equations hold).
   - A label of `A` is on the left only in `L`, so on the right it is
     in `s(T′)`; likewise `B ⊆ labels(s(T))`. With no tail on one side
     the corresponding set must be empty, which is the "none" rows'
     condition. With one tail `ρ` on both sides, `L ∪ s(ρ) = L′ ∪
     s(ρ)` with both unions disjoint forces `labels(L) = labels(L′)`.
   - With `ρ ≠ ρ′`, put `R = s(ρ)` minus the labels of `B`. Then
     `s(ρ) = L′↾B ∪ R` and, removing `L ∪ L′`'s labels from both
     sides of the equal maps, `s(ρ′) = L↾A ∪ R`. Setting `s(ρ″) = R`
     satisfies both bindings. When `A` or `B` is empty, `R` is
     `s(ρ′)` or `s(ρ)` itself and no fresh variable is needed.
   - A failure only ever gives `Nothing`, so no failure needs to be
     justified for EG. (An occurs failure has no finite solution,
     proved there for type variables by `occurs_unsat`,
     Facts.lean:109, and argued for rows; EG does not use it.)
3. **Rigid constants.** No rule binds a rigid variable, so each
   rule's forward step holds for every value `θR` gives it; the
   failures R3, R4 and R5 add for rigid variables only give
   `Nothing`. Argued. Bindable rigid variables would also satisfy EG
   (`θR` ranges over all values). The choice is for `g0Guard`: no
   fresh `ρ″` and no flexible variable ever replaces a rigid one, so
   a rigid variable an atom depends on stays mentioned. That it is
   exactly the rigid dependence rests on §5's most-generality, the
   backward direction (the dropped `ρ″` side condition) and no
   forced-empty rigid row; argued, not part of EG.
4. **Conclusion.** By induction on the steps (they terminate: §4),
   every solution `s` of `E` satisfies `θ`'s binding equations. Then
   `s(τ) = s(θ(τ))` is proved there for app-free terms with any tails:
   `subst_evalT` (Correspond.lean:93, `Sat θ (eqs σ) → evalT θ
   (substT σ t) = evalT θ t`), with `Subst`'s row bindings encoded as
   `{|ρ} = {M | T}` (Subst.lean:35-37, :66-68); `subst_sat`
   (Binding.lean:100) is the same for problems. For `app`, argued.
   `θ(τ) = g` is ground with no repeated label, so it is defined and
   does not depend on `s`. With step 1, EG follows.

The backward direction (each restricted new solution is an old one)
holds once `ρ″ lacks labels(L ∪ L′)` is kept as a side condition;
`entailedGround` drops it, since EG uses the forward direction only.
It matters for §5, not for EG (argued).

**What the choices cost (argued).**

- *Rigid constants.* A failure from binding a rigid `p` or `ρ` loses
  no valid problem: with `p.d` only `Lacks` and `Disjoint` (§1), some
  rigid assignment satisfies `p.d` and leaves `E` unsolvable, so
  `¬ ValidR` whatever `BQ` says: `θR(p) = Bool` against `Int`;
  `θR(ρ) = {}` against a row with fields; `θR(ρ) = {c: Int}`, `c` a
  label `p.d` does not lack, against a closed row
  (`{a: x | q} = {a: Int}`); two distinct values for two rigid
  variables. This needs no forced-empty rigid row: `D` never holds
  `Disjoint q q` (cited: docs/findings.md:2040, `DisjointSame`,
  refused at Resolve). Under Pr-1 the counter-assignments must also
  satisfy `Q_imp ∪ p.q`: `Bool` and `{c: Int}` are printable, and
  `p.q` is empty today. Revisit if `p.d` gains equations or `Q`
  gains hypotheses.
- *Whole-problem fragment.* An atom not already ground, in a problem
  where some equation has a record with two tails, is "not ground"
  even if a separate equation fixes it. `g0Guard` then declines (the
  brief's "or lies outside the unitary fragment"), a cost local to
  G0 that Task 4.5 counts.
- *Ground shortcut.* Identity rewrite: sound for every problem.

## 4. Termination

Measure, lexicographic: the number of distinct variables in the
equations, then their total size. Lean's measure counts type
variables only (cited: Unify/Measure.lean:33, `nvars` over
`tyVarsOf`); counting row variables is argued. With the sequential
binding and the tail occurs check (§2), a bound variable leaves the
equations and every image: R4 and the one-binding R5 rows remove one
variable; the fresh-variable row removes `ρ` and `ρ′` and adds `ρ″`.
The binding-free rows and R1, R2, R2′ keep the variables and lower
the size. Argued. (As first written, without `ρ ≠ ρ′` in rows 5-7 and
with a fields-only occurs check, this was false: review finding B2.)

## 5. Why the fragment is unitary, and the rest is not

Within the fragment, when `E` has a solution, `θ` is most general:
if `θ(τ)` keeps a variable `v`, two solutions give `τ` different
values (vary a type variable between `Int` and `Bool`, or add a label
outside `E` to a row; definedness depends only on labels, and fresh
labels exist). Argued; it is a completeness claim, not needed for EG.

With two tails in one record the problem has no most general unifier.
`{...r, ...s} = {a: Int}` has the solutions `r ↦ {a: Int}, s ↦ {}` and
`r ↦ {}, s ↦ {a: Int}`, and no single substitution has both as
instances: its `r` would have to be a row without fields, its `s` too,
and then the equation is still unsolved (argued). This is Wand's
problem for record concatenation (Wand 1991, cited from the
literature, not re-read here).

## 6. Planned checks (Step 1; grammar fixed before any run)

The grammar below was amended after the argument review (findings B3,
B4 and the non-blocking `App` item), before any run: the atom
`pr {...s}`, the `Box(l)` terms, the pinned sampler, the hand list and
the two extra mutants are that amendment.

- **EG-oracle** (bounded). Grammar G-EG: flexible type variables `x`,
  `y`; rigid type variable `p`; flexible rows `r`, `s`; rigid row `q`;
  labels `a`, `b`; one declared type `Box` of one parameter. Leaves,
  in this order: `Int`, `Bool`, `x`, `y`, `p`. Terms, in this order:
  the 5 leaves; `l → l′` (25, `l` outer); `Box(l)` (5); records of
  at most one field (none, then `a: l` for each leaf, then `b: l`;
  outer) with tails `[]`, `[r]`, `[s]`, `[q]`, `[r, s]` (inner): 55.
  90 terms. One-equation problems: every ordered pair, 8,100,
  exhaustively. Two-equation problems: 2,000, sampled with
  replacement by mulberry32 seeded with 1, each problem drawing four
  term indices `⌊90·u⌋` in the order `t₁, u₁, t₂, u₂`. `p.d` empty.
  Atoms: `pr x`, `pr y`, `pr {...r}`, `pr {...s}`. Values: types
  `Int`, `Bool`, `Int → Int`, `Box(Int)`, `{}`, `{a: Int}`; rows:
  every subset of `{a, b, c}` with `Int` values, plus `{a: Bool}`
  and `{b: Bool}` (10). Assertion: if the answer is `Just g`, every
  assignment of the problem's variables in this domain that solves
  `E` gives the atom the value `g`. A bounded check: a counterexample
  refutes EG; none does not prove it. Reported beside it, not
  asserted: how many `Just` answers are non-vacuous (their problem
  has a solution in the domain), and in-fragment `Nothing` answers
  whose problem has two solutions disagreeing at the atom (§5's
  claim, bounded). Fields are leaves here, so the `K ∪ M` merge and
  the row occurs checks are exercised by the hand list only.
- **Hand list** (asserted: each answer exactly, and each `Just`
  non-vacuous in the domain). One per R5 row and for R4:
  - R4: `x = Int`; `pr x` is `Just Int`.
  - none, none: `{a: x} = {a: Int}`; `pr x` is `Just Int`.
  - none, `ρ′`: `{a: Int} = {...r}`; `pr {...r}` is `Just {a: Int}`.
  - `ρ`, `ρ`: `{a: x | r} = {a: Int | r}`, `{...r} = {}`; `pr x` is
    `Just Int`.
  - `ρ`, `ρ′`, `A = B = ∅`: `{...r} = {...s}`, `{...s} = {b: Int}`;
    `pr {...r}` is `Just {b: Int}`.
  - `A ≠ ∅ = B`: `{a: Int | r} = {...s}`, `{...r} = {}`; `pr {...s}`
    is `Just {a: Int}`.
  - `A = ∅ ≠ B`: `{...r} = {b: Int | s}`, `{...s} = {}`; `pr {...r}`
    is `Just {b: Int}`.
  - fresh `ρ″`: `{a: Int | r} = {b: Int | s}`, `{...s} = {a: Int}`;
    `pr {...r}` is `Just {b: Int}`.
  - merge: `{a: Int | r} = {a: Int | s}`, `{...s} = {b: Bool}`,
    atom `pr {a: Int | r}` is `Just {a: Int, b: Bool}`.
  - cycles (terminate, `Nothing`): `{a: {...r} | r} = {b: {...s} | s}`
    for `pr {...r}`; `{a: Int | r} = {...r}` for `pr {...r}`.
- **Several tails.** `{...r, ...s} = {a: Int}` with `x = Int` gives
  `Nothing` for `pr {...r}` and for `pr x` (whole-problem), and
  `Just Int` for an atom `pr Int`.
- **Guard.** `{...r} = {...q}` with atom `pr {...r}`: `g0Guard`
  declines (the reduced type is `{...q}`).
- **No σ.** Structural: the module imports nothing from
  Strategy.Substitution and the signature has no substitution.
- **Mutants**, each run in a scratch copy, its patch and failing
  tests recorded. Each must fail EG-oracle or the hand list: R2
  pairing `a = d`, `b = c`; the "none, `ρ′`" row binding
  `ρ′ := {L′↾B}`; the `A ≠ ∅ = B` row binding `ρ′ := {L′↾B | ρ}`;
  the fresh row with `A` and `B` swapped. Dropping a failure (an
  occurs check, a label condition) is not expected to fail them: the
  problems it then accepts have no solution, so any answer is
  vacuously sound. Dropping the rigid-constant failure (binding
  rigid variables) cannot fail them either, for another reason:
  binding rigid variables is sound (§3 step 3). The guard fixture
  above kills it, since a bindable `q` may become `q := r`.

## References

- J. A. Robinson, "A machine-oriented logic based on the resolution
  principle", JACM 12(1), 1965.
- A. Martelli, U. Montanari, "An efficient unification algorithm",
  TOPLAS 4(2), 1982.
- D. Rémy, "Typechecking records and variants in a natural extension
  of ML", POPL 1989; "Type inference for records in a natural
  extension of ML", in Theoretical Aspects of Object-Oriented
  Programming, MIT Press, 1994.
- M. Wand, "Type inference for record concatenation and multiple
  inheritance", Information and Computation 93(1), 1991.
