# CX: refuting a signature by a counter-instance, statements first

Date: 2026-10-21. Base: 67ba706 (dossier §18.66, design stream CX).
Scope: exact statements for ground (2) of requirements.md §2.4 (a
checked counter-instance), the refuter interface `Refute_sound`
(requirements.md §4.4), and the shape of ground (1), class c1 (§2.3).
**Nothing here is proved.** No refuter is implemented and no compiler
code changed.

Lean: research/composition-proofs/Composition/Typed/Refute/:

| File | Contents |
|---|---|
| Statements.lean | `GroundT`, `GroundF`, `Denotes`, `RigidFin`; CX-D1, CX-D2, CX-S, CX-FM; `CounterAt`, CX, CX-C, CX-CA; `CXChecked`, CX-K, CX-KC; `RefuteSound`, `RealizesCX`, CX-R |
| Rules.lean | `C1Rule`, C1, C1-P, C1-M, C1-T; `HeadClash`, `BindsTo`, `ClashIn`, `OccursIn`, `ClashRule`, `OccursRule`; C1-H, C1-O, C1-U, C1-X, C1-E |
| Examples.lean | `unlRho`, `unlTheta`, `clashP`, `occursP`, `flexP`, `badChoice`; X1-X6 |

Every claim is a `def … : Prop`. The files contain no `theorem`,
`sorry` or `axiom`, and build in the default target (imported from
Composition.lean).

Status labels follow bridge/statements.md: **expected true** (an
argument is given, not mechanized), **unsure**, **expected false**.
**Checked** marks a bounded evaluation (§6), not a proof.

## 1. Ground substitutions and what they denote

A counter-instance must be something a program can write down and
check, so the rigid assignment is given as syntax: a substitution `ρ`
(the existing `Subst`, Subst.lean) whose bindings are ground.

- **`GroundT t`**: `wfT t = true` and `tyVarsT t = []`. `wfT` already
  forbids row tails at every depth and repeated labels in a record, so
  a ground expression has no variable of either sort and always
  evaluates. **`GroundF fs`** is `GroundT (.record fs [])`.
- **`Denotes P ρ θR`**: `ρ` binds only rigid variables of `P`; every
  rigid type variable `n` is bound to a ground `t` with
  `evalT θR t = some (θR.ty n)`; every rigid row variable `r` is bound
  to ground fields with no tail, denoting `θR.row r`. Binding a
  flexible variable is forbidden: it would fix a choice that
  `ValidOpen` leaves to the existential side, and CX would become
  unsound.
- **`RigidFin P θR`**: `ValidFin`'s finiteness premise on the rigid
  part, factored out.

| Name | Statement | Status |
|---|---|---|
| CX-D1 `DenotesFin` | `Denotes P ρ θR → RigidFin P θR` | expected true: a ground expression has finitely many fields at each record, at every depth; induction on `TExpr` |
| CX-D2 `FinDenotable` | `RigidFin P θR → ∃ ρ, Denotes P ρ θR` | expected true (classical): `FinRow` gives a label list; dedupe and filter it; induction on `G`. Only the completeness side uses it |

"Finite at every depth" is therefore not a separate premise of CX: it
is a consequence of writing the instance as ground syntax (CX-D1).

## 2. The substitution lemma

**CX-S `SubstSat`**: for `Denotes P ρ θR`, every `θF` and every
problem `C`,
`Sat (combine P θR θF) C ↔ Sat θF (substProblem ρ C)`.

Expected true. Route: the proved `subst_sat` (Binding.lean) gives
`Sat θ C ↔ Sat θ (substProblem ρ C)` whenever `Sat θ (eqs ρ)`. Take
`θ := combine P θR θF`: it satisfies `eqs ρ` by `Denotes` (ground
bindings evaluate the same under every assignment). The substituted
problem mentions no rigid variable (every rigid variable is bound, to
ground syntax, and `ρ` is applied once in parallel), so on it
`combine P θR θF` and `θF` agree; congruence (`evalT_congr`,
Closed.lean) finishes. CX needs only `→`; CX-C needs `←`.

**CX-FM `SatFin`**: a satisfiable problem has a solution finite at
every depth. Expected true: R1 (`r1`, proved) restricts a solution to
the written labels `labelsOf C`, at every depth; a value restricted to
a finite label list is finite (induction on `G`). Only the
completeness side uses it, because `decideCall` decides satisfiability
over all assignments while `ValidFin` asks for a finite witness.

## 3. CX and its converse

**`CounterAt P i ρ θR`** (bases `B₁` with `DecidableEq`):
`Denotes (P.mapBase i) ρ θR`, `Sat θR (P.mapBase i).D`, and
`decideCall (substProblem ρ (P.mapBase i).B) = false`.

| Name | Statement | Status |
|---|---|---|
| CX | for injective `i : B → B₁`: `CounterAt P i ρ θR → ¬ ValidOpen P` | expected true |
| CX-C `CXComplete` | `¬ ValidOpen P → ∃ B₁, DecidableEq B₁, injective i, ρ, θR, CounterAt P i ρ θR` | expected true |
| CX-CA `CXCompleteAtoms` | `¬ ValidOpen P → ∃ ρ θR, CounterAt P Sum.inl ρ θR` at `B ⊕ Nat` | unsure: needs B1b |

**CX, argument.** Assume `ValidOpen P`. Instantiate at `B₁`, `i`: this
is why `i` must be injective, since `ValidOpen` quantifies only over
injective extensions. `ValidFin (P.mapBase i)` applies to `θR`
(`RigidFin` by CX-D1; `D` holds by hypothesis) and yields some `θF`
with `Sat (combine _ θR θF) _.B`. CX-S turns this into
`Sat θF (substProblem ρ _.B)`, so the substituted body is satisfiable
and `decideCall_correct` (proved) makes `decideCall` true, a
contradiction. Needs: CX-D1, CX-S, `decideCall_correct`. `DecidableEq
B₁` is needed only to state `decideCall`, as requirements.md §4.4
says. The finiteness of `θF` is not used: CX refutes every flexible
assignment, finite or not.

**CX-C, argument.** `¬ ValidOpen P` gives `B₁`, injective `i`, and a
`θR` with `RigidFin` and `Sat θR D′` for which no finite `θF` solves
`B′`. CX-D2 gives `ρ`. If `decideCall` were true, the substituted body
would have a solution (`decideCall_correct`), a finite one by CX-FM,
and CX-S `←` would turn it into a finite `θF` solving `B′`. The
decidable equality on `B₁` is classical; this is why it sits under
`∃` in the statement. CX-C needs no fresh bases beyond those
`¬ ValidOpen` supplies, but it does not say where to look.

**CX-CA, the searchable converse.** A refuter needs one fixed supply,
`B ⊕ Nat`. The argument is CX-C's, preceded by B1b
(`AtomsToOpen`, Bridge/Valid.lean: conjectured, unproved, flagged at an
empty `B₁` in bridge/statements.md §3). Without B1b, an invalid
signature might be refutable only over a richer base type. **Unsure,
exactly as B1b is.** Soundness (CX, CX-K) does not depend on it.

## 4. Checked certificates and `Refute_sound`

**`CXChecked P ρ`** is the certificate condition at `B ⊕ Nat`, built
from decidable parts only: `Scoped P`; `ρ` binds only rigid
variables, every rigid variable, each to a ground expression (rows: to
ground fields and no tail); `decideCall` is true on `ρ` applied to the
renamed `D` and false on `ρ` applied to the renamed body. No `θR` is
supplied: it is the assignment `ρ` denotes. `Scoped P` is what lets
the check read `D` through `decideCall`: once `ρ` is applied, a scoped
`D` is closed.

| Name | Statement | Status |
|---|---|---|
| CX-K `CXCheckedSound` | `CXChecked P ρ → ¬ ValidOpen P` | expected true |
| CX-KC `CXCheckedComplete` | `Scoped P → ¬ ValidOpen P → ∃ ρ, CXChecked P ρ` | unsure: needs B1b |
| `RefuteSound check` | `check P c = true → ¬ ValidOpen P` | the interface (requirements.md's `Refute_sound`) |
| CX-R `RefuteSoundOfCX` | `RealizesCX check → RefuteSound check` | expected true |

**CX-K, argument.** Define `θR` from `ρ`'s bindings (ground and
well-formed, so each evaluates). Then `Denotes`. `decideCall` true on
the substituted `D` gives an assignment satisfying it; CX-S `←` and
scoping (`D` reads only rigid variables, where the combined assignment
is `θR`) give `Sat θR D′`. Apply CX with `i = Sum.inl`. Needs, beyond
CX: "ground and well-formed implies `evalT` defined" (not yet stated
anywhere; expected true by induction, using `wfT`'s duplicate check)
and `Scoped` preserved by `mapBase` (E5, proved).

**`RefuteSound` is the interface,** generic in the certificate type:
any refuting strategy supplies a proof of it for its own `check`.
`RealizesCX check` says each acceptance is backed by a `CXChecked`
certificate; CX-R says that suffices. A future refuter with a
different certificate (say, a c1 rule's evidence) supplies
`RefuteSound` its own way. The Lean name is `RefuteSound`, after the
file's convention for `Prop` definitions; it is requirements.md's
`Refute_sound`.

## 5. Class c1: rules on original atoms and `D`

A c1 rule (requirements.md §2.3) reads the problem as recorded: rigid
lists, `D`, original body atoms. **`C1Rule`** is just
`SigProblem Label B → Prop`; what makes it c1 is that it is applied to
`P` itself, never to atoms a solver rewrote.

| Name | Statement | Status |
|---|---|---|
| C1 `C1Sound rule` | `rule P → ¬ ValidOpen P`, every `P` | the schema |
| C1-P `C1SoundPrefix rule` | `B₀ ⊆ P.B → rule (withBody P B₀) → ¬ ValidOpen P` | the schema, on a prefix |
| C1-M `ValidOpenAntitone` | `B₀ ⊆ P.B → ValidOpen P → ValidOpen (withBody P B₀)` | expected true: the same `θF` serves |
| C1-T `C1SoundToPrefix` | `C1Sound rule → C1SoundPrefix rule` | expected true, from C1-M |
| C1-U `UnsatBodySound` | `(∃ θR, RigidFin ∧ Sat θR D) → ¬ Satisfiable P.B → ¬ ValidOpen P` | expected true |
| C1-H `ClashSound` | `C1Sound ClashRule` | expected true, via C1-U |
| C1-O `OccursSound` | `C1Sound OccursRule` | expected true, via C1-U |
| C1-X `ClashAfterSubstSound` | the clash rule on `substProblem σ P.B`, any `σ`, refutes `P` | **expected false** (X6) |
| C1-E `ClashAfterEntailedSound` | the same, when every solution of `P.B` satisfies `eqs σ` | expected true |

C1-P is the form §2.4 relies on: generation that stops early leaves a
prefix of `B`, and a rule that fires on the prefix must still be
evidence about the whole signature. C1-T reduces it to C1.

**The candidate rules.** `HeadClash t u`: top-level constructors
differ (base, arrow, record), or two different bases; neither side a
type variable. `ClashIn C`: one body equation whose sides clash, or
two body equations binding one type variable (`BindsTo`, either
orientation) to clashing heads. `OccursIn C`: a body equation binding
`n` to some `t ≠ .tvar n` with `n ∈ tyVarsT t`. `ClashRule` and
`OccursRule` add `ClauseOnly P.D`.

**Why a condition on `D`.** If no finite rigid assignment satisfies
`D`, every signature is vacuously valid, and no body rule is sound.
`ClauseOnly` is the syntactic gate: `clauseOnly_satisfiable` (proved)
gives a finite assignment satisfying any clause-only `D`, which is
C1-U's premise. Source-derived `D` is clause-only (§2.3 row b).

**C1-U, argument.** `ValidOpen P → ValidFin P` (B0, `openToFin`,
proved); apply it to the given `θR`; the resulting `θF` solves `P.B`,
so `P.B` is satisfiable. C1-H: a clashing equation holds under no
assignment (evaluation preserves the head constructor); two equations
binding `n` force `θ.ty n` to have two clashing heads. C1-O: `θ.ty n`
would be a proper subterm of itself; `G` is inductive with
function-valued rows, so the proof is by induction on `G`, not by
`sizeOf`.

**C1-X and C1-E: where "original" ends.** Today's head-clash, `lacks`
and `disjoint` refusals read atoms rewritten by the online
substitution (§2.3 row e). C1-X states that reading as a rule, and X6
refutes it: `x = Int`, `x` flexible, is valid, but under the choice
`x := Bool` the rewritten body is `Bool = Int`. C1-E is the boundary:
if `σ` is entailed by the original body (every solution of `P.B`
satisfies `eqs σ`, as for a most general unifier of original
equations), the rule is sound, by `binding_correspondence` (proved,
Binding.lean) and C1-H. Entailment is semantic; whether the online
solver's substitution is entailed is exactly what bindings chosen by
`H` or `shareTails` can break.

**Not stated here** (questions 4, 5): `lacks`/`disjoint` refutations
on original atoms, the third candidate of §2.3; nested head clashes;
an occurs check through row tails (`r = { l: t, ...r }`).

## 6. Non-vacuity

Every inhabitant below is a `Prop` in Examples.lean, unproved.
Bounded evaluations, run on the scratch file described below and
recorded only here, support them.

- **X1 `UnlCounter b`** (`star-unlacked`, W5's `notOpenUnl`): at
  every `n ≥ 1`, `CounterAt (cStar n b true false) id (unlRho n)
  (unlTheta n)`. `unlRho n` is W5's `θR` written as syntax: `h` (row
  0) bound to `{ f_n: {} }`, each `r_i` to `{}`; `unlTheta n` is W5's
  assignment verbatim. Inhabits CX's premise with `i = id`.
- **X2 `UnlChecked b`**: the same `ρ`, over `B ⊕ Nat`, satisfies
  `CXChecked`. `cStar`'s `D` mentions only rows `0` and `r_i`, which
  are rigid, so it is scoped.
- **X3 `StarNoCounter b`** (control): the valid `star` has no
  counter-instance at any injective extension. Follows from CX and
  `star`'s validity (`ScStar` with `cellOpenImpl`).
- **X4 `ClashFires`**, **X5 `OccursFires`**: `Int = Bool` and
  `x = x -> Int`, nothing declared; each rule fires and the problem is
  not `ValidOpen`.
- **X6 `ClashAfterSubstRefuted`**: `flexP b` is valid; the clash rule
  fires on its body under `badChoice c`; so C1-X fails at any base
  type with two distinct elements.

**Checked** (bounded evaluation, `B = Bool`, `#eval` in a scratch
file importing Composition.Typed.Refute.Examples, not committed):

| Problem, `ρ` | `decideCall` on `ρ`-substituted `B` | on `D` |
|---|---|---|
| `cStar 1 _ true false`, `unlRho 1` | false | true |
| `cStar 2 _ true false`, `unlRho 2` | false | true |
| `cStar 3 _ true false`, `unlRho 3` | false | true |
| `cStar 1 _ true false` over `Bool ⊕ Nat`, `unlRho 1` | false | — |
| `cStar 2 _ false false`, all rows empty (control) | true | true |
| `cStar 1 _ false false`, `unlRho 1` (control) | false | false |
| `clashP true false`, no `ρ` | false | — |
| `occursP true`, no `ρ` | false | — |
| `flexP true`; under `badChoice false` | true; false | — |

The last control shows why `D` is checked: `unlRho` violates the valid
`star`'s `D` (`h lacks f_n`), so it is no counter-instance there even
though the body fails. The second file, which included `n = 3`, took
6 min 49 s; `decideCall` enumerates pattern subsets, so a checker's
cost grows quickly (question 3).

## 7. What each statement needs

| Statement | Needs (proved unless marked) |
|---|---|
| CX-D1 | induction on `TExpr` (new) |
| CX-D2 | `FinRow`, classical choice, induction on `G` (new) |
| CX-S | `subst_sat`, `evalT_congr`; ground bindings satisfy `eqs ρ` (new) |
| CX-FM | `r1`; finiteness of restricted values (new) |
| CX | CX-D1, CX-S, `decideCall_correct` |
| CX-C | CX-D2, CX-FM, CX-S `←`, `decideCall_correct` |
| CX-CA, CX-KC | CX-C's needs and **B1b (unproved)** |
| CX-K | CX, CX-S, E5, "ground and `wfT` implies defined" (new) |
| CX-R | CX-K |
| C1-T | C1-M |
| C1-U | B0 (`openToFin`) |
| C1-H, C1-O | C1-U, `clauseOnly_satisfiable`, head/occurs facts (new) |
| C1-E | `binding_correspondence`, C1-H's unsatisfiability fact |

## 8. Questions for review

1. **Rigid-only domain.** `Denotes` forbids binding flexible variables
   and requires binding every rigid one. Is total binding of the rigid
   list right when a rigid variable is unused (it must then be bound
   to some ground value, say `{}`)?
2. **Scoped `D`.** `CXChecked` requires `Scoped P`. Is every
   source-derived `D` scoped, or must the certificate also carry
   values for flexible variables that `D` mentions?
3. **Cost.** Checking `decideCall` false is exponential in the pattern
   enumeration (6 min 49 s for the second probe file). Should a
   certificate carry more (for example the closed problem's failing
   unification per pattern), or is this acceptable for the rare
   Contradiction verdict?
4. **Scope of c1.** Only top-level head clash and the type-variable
   occurs check are stated. Should this tranche also state the
   `lacks`/`disjoint` refutations on original atoms, nested clashes and
   the row occurs check?
5. **C1-E as the criterion.** Is "every solution of the original body
   satisfies `eqs σ`" the intended line between original and
   solver-chosen atoms, so that an mgu-based rule counts as c1?
6. **Fresh bases.** Soundness never needs them. Completeness at a
   searchable supply (CX-CA, CX-KC) stands or falls with B1b. Should
   B1b be proved before a refuter is planned, or is a sound,
   incomplete refuter enough for the Contradiction verdict?
7. **Name.** `RefuteSound` in Lean for requirements.md's
   `Refute_sound`; rename either?
