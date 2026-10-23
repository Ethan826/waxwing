# `entailedGround`: reduction through entailed equalities

Task 4.2 Step 2 of the R0 implementation plan
(docs/plans/2026-10-22-r0-implementation-plan.md). Date 2026-10-23,
base 8ac3e67. The written argument docs/engineering.md asks for
before a solving rule is implemented ("Every solving rule has a
written argument"). Written and committed before the implementation,
for review. Nothing here is implemented or run yet.

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

**The fragment.** Every `Record` in `E` has at most one tail and no
repeated label. Otherwise the answer is `Nothing` for every atom not
already ground **(choice: the restriction is whole-problem)**.

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
| R5 | `{L \| T} = {L′ \| T′}` | below |

Here `x = p`, `p` rigid, binds `x := p` (R4); `p = Int`, `p = q` for
distinct rigid `p`, `q`, fail.

R5, with `A = labels(L) \ labels(L′)` and `B = labels(L′) \ labels(L)`
and `T`, `T′` each a row variable or none: first one equation per
common label. Then:

| tails | condition | binding |
|---|---|---|
| none, none | `A = B = ∅` | none |
| none, `ρ′` | `B = ∅`, `ρ′` flexible | `ρ′ := {L↾A}` |
| `ρ`, `ρ` | `A = B = ∅` | none |
| `ρ`, `ρ′`, `ρ ≠ ρ′` | `A = B = ∅`, one flexible | flexible one `:=` other |
| `ρ`, `ρ′` | `A ≠ ∅ = B`, `ρ′` flexible | `ρ′ := {L↾A \| ρ}` |
| `ρ`, `ρ′` | `A = ∅ ≠ B`, `ρ` flexible | `ρ := {L′↾B \| ρ′}` |
| `ρ`, `ρ′` | `A, B ≠ ∅`, both flexible | fresh flexible `ρ″`: `ρ := {L′↾B \| ρ″}`, `ρ′ := {L↾A \| ρ″}` |

(the symmetric `ρ`, none case swapped). Any other case fails. Each
row binding fails if the bound variable occurs in its fields' types.
Binding `ρ := {M | T″}` turns `{K | ρ}` into `{K ∪ M | T″}`, still
one tail; if `K` and `M` share a label, the step fails.

**Answer.** If `τ` is already ground (no variable, no tail, no
repeated label), `Just τ` without unifying **(choice)**. Else, if the
rules end without failure, apply `θ` to `τ`; `Just` the result if it
is ground, else `Nothing`. Failure gives `Nothing`. `g0Guard` reads
the same reduced type (not ground, mentions a rigid variable) through
a shared internal step; `entailedGround` is its `Maybe` view.

## 3. The argument

**EG (soundness).** If `entailedGround p e = Just g`, `e`'s type `τ`
evaluates to `g` in every solution of `p`. Argued, in four steps.

1. **Monotone in the atoms.** Every solution of `p` satisfies `E`,
   since `E` is a subset of `p.d ∪ p.b`. So a fact true in every
   solution of `E` is true in every solution of `p`. Lacks, disjoint
   and `ff` atoms, and any hypothesis G-ValidR adds (Pr-1's implicit
   printable atoms, r0-validr-draft.md §4.2), only shrink the
   solution set, so this holds before and after G-ValidR (argued).
2. **Each rule keeps every solution (forward direction).** If `s`
   solves the equations and bindings before a step, some extension
   of `s` to the step's fresh variables solves them after, and
   `s(x) = s(θ(x))` for each binding. R1-R3 and R4 for the tail-free
   fragment are proved there (Unify/Facts.lean:66 `elim_complete`,
   :109 `occurs_unsat`, and the decomposition facts beside them;
   `unify_complete`, Unify/Complete.lean). R2′ is R2's argument for a
   free constructor (`app` is free in T-R0b's values, §5.4): argued.
   R5 is argued here:
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
   - An occurs failure has no finite solution (values are finite at
     every depth, T-R0b §5.4): proved there for type variables
     (`occurs_unsat`); for a row variable inside its own field types,
     argued the same way. A failure only ever gives `Nothing`, so no
     failure needs to be justified for EG.
3. **Rigid constants.** No rule binds a rigid variable, so each
   rule's forward step holds for every value `θR` gives it; the
   failures R3, R4 and R5 add for rigid variables only give
   `Nothing`. Argued. Bindable rigid variables would also satisfy EG
   (`θR` ranges over all values); the choice keeps "mentions a rigid
   variable" exact for `g0Guard`, since no fresh `ρ″` ever replaces a
   rigid row.
4. **Conclusion.** By induction on the steps (they terminate: §4),
   every solution `s` of `E` has `s(x) = s(θ(x))` for every bound
   `x`. By induction on `τ`, `s(τ) = s(θ(τ))` whenever the right side
   is defined; `θ(τ) = g` is ground with no repeated label, so it is
   defined and does not depend on `s`. The `{K | ρ}` case uses that
   `K ∪ M` has no repeated label in `g`. With step 1, EG follows.

The backward direction (each restricted new solution is an old one)
holds once `ρ″ lacks labels(L ∪ L′)` is kept as a side condition;
`entailedGround` drops it, since EG uses the forward direction only.
It matters for §5, not for EG (argued).

**What the choices cost (argued).**

- *Rigid constants.* A failure from binding a rigid `p` or `ρ` loses
  no valid problem: with `p.d` only `Lacks` and `Disjoint` (§1), the
  rigid assignment `θR(p) = Bool` (against `Int`), `θR(ρ) = {}`
  (against a row with fields) or two distinct values for two rigid
  variables satisfies `p.d` and leaves `E` unsolvable, so `¬ ValidR`
  whatever `BQ` says. If `p.d` ever gains equations this needs
  revisiting.
- *Whole-problem fragment.* An atom not already ground, in a problem
  where some equation has a record with two tails, is "not ground"
  even if a separate equation fixes it. `g0Guard` then declines (the
  brief's "or lies outside the unitary fragment"), a cost local to
  G0 that Task 4.5 counts.
- *Ground shortcut.* Identity rewrite: sound for every problem.

## 4. Termination

Measure, lexicographic: the number of distinct variables in the
equations, then their total size (cited: Unify/Measure.lean:1-6 for
the tail-free fragment). R4 and the one-binding R5 rows remove one
variable; the fresh-variable row removes two and adds one; the
binding-free rows and R1, R2, R2′ keep the variables and lower the
size. Argued for R5.

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

- **EG-oracle** (bounded, exhaustive). Grammar G-EG: flexible type
  variables `x`, `y`; rigid type variable `p`; flexible rows `r`,
  `s`; rigid row `q`; labels `a`, `b`. Leaves: `Int`, `Bool`, `x`,
  `y`, `p`. Terms: a leaf; `l → l′` for leaves; a record of at most
  one field (label `a` or `b`, a leaf) with tails `[]`, `[r]`, `[s]`,
  `[q]` or `[r, s]`: 85 terms. Problems: every one-equation problem
  (`t = u` for all ordered pairs, 7,225) and 2,000 two-equation
  problems drawn with a fixed seed (1); `p.d` empty. Atoms: `pr x`,
  `pr y`, `pr {...r}`. Values: types `Int`, `Bool`, `Int → Int`,
  `{}`, `{a: Int}`; rows: every subset of `{a, b, c}` with `Int`
  values, plus `{a: Bool}` and `{b: Bool}` (10). Assertion: if the
  answer is `Just g`, every assignment of the problem's variables in
  this domain that solves `E` gives the atom the value `g`. A
  bounded check: a counterexample refutes EG; none does not prove it.
  A `Just` from a problem with no solution in the domain is vacuous,
  so the test also reports how many `Just` answers have one.
  Reported beside it, not asserted: in-fragment `Nothing` answers
  whose problem has two solutions in the domain disagreeing at the
  atom (§5's claim, bounded).
- **Several tails.** `{...r, ...s} = {a: Int}` with `x = Int` gives
  `Nothing` for `pr {...r}` and for `pr x` (whole-problem), and
  `Just Int` for an atom `pr Int`.
- **No σ.** Structural: the module imports nothing from
  Strategy.Substitution and the signature has no substitution.
- **Mutants** (each must fail EG-oracle): R2 pairing `a = d`,
  `b = c`; R5's "none, `ρ′`" row binding `ρ′ := {L′↾B}` (the wrong
  side; `{a: Int} = {...r}` then gives `pr {...r}` the value `{}`).
  A mutant that only drops a failure (an occurs check, a label
  condition) is not expected to fail it: the problems it then
  accepts have no solution, so any answer is vacuously sound; such
  failures matter for completeness and for `g0Guard`, not EG.

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
