# CX: refuting a signature by a counter-instance, statements first

Date: 2026-10-21. Base: 67ba706 (dossier §18.66, design stream CX).
Scope: exact statements for ground (2) of requirements.md §2.4 (a
checked counter-instance), the refuter interface `Refute_sound`
(requirements.md §4.4), and the shape of ground (1), class c1 (§2.3).
**Nothing here is proved.** No refuter is implemented and no compiler
code changed. The author's decisions of dossier §18.69 (Q10, Q11) are
reflected below and marked "(§18.69)".

Lean: research/composition-proofs/Composition/Typed/Refute/:

| File | Contents |
|---|---|
| Statements.lean | `withBody`, `GroundT`, `GroundF`, `Denotes`, `RigidFin`; CX-D1, CX-D2, CX-S, CX-FM; `CounterAt`, CX, CX-C, CX-CA, CX-P; `CXChecked`, CX-K, CX-KC, CX-KP; `RefuteSound`, `RealizesCX`, CX-R; CX-PR |
| Rules.lean | `C1Rule`, C1, C1-P, C1-M, C1-T, `withD`, C1-D; `HeadClash`, `BindsTo`, `ClashIn`, `OccursIn`, `ClashRule`, `OccursRule`; C1-H, C1-O, C1-U, C1-X, C1-E |
| Examples.lean | `unlRho`, `unlTheta`, `clashP`, `occursP`, `flexP`, `badChoice`, `badArrow`, `pinP`; X1-X7, X6b |

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
- **`Denotes P ρ θR`**: `ρ`'s keys are duplicate-free
  (`(ρ.ty.map Prod.fst).Nodup`, the same for `ρ.row`); `ρ` binds only
  rigid variables of `P`; every
  rigid type variable `n` is bound to a ground `t` with
  `evalT θR t = some (θR.ty n)`; every rigid row variable `r` is bound
  to ground fields with no tail, denoting `θR.row r`. Binding a
  flexible variable is forbidden: it would fix a choice that
  `ValidOpen` leaves to the existential side, and CX would become
  unsound. Duplicate keys are forbidden because `lookup` reads only
  the first binding of a key while `eqs ρ` keeps every pair (§2).
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
bindings evaluate the same under every assignment). This step
needs `Denotes`'s duplicate-free keys: `eqs ρ` has one equation per
pair, shadowed pairs included, while `Denotes` constrains only what
`lookup` returns. The adversarial review of 88c052d proved a
counterexample without the condition: with `B = Bool`,
`ρ.ty = [(0, base true), (0, base false)]`, `rigidTy = [0]` and
`θR.ty 0 = base true` satisfy the old
`Denotes`, yet no `θF` gives `Sat (combine …) (eqs ρ)`. CX-S itself
held even then, since substitution reads only through `lookup`; the
alternative fix, a lookup-only substitution lemma, was not taken. With
duplicate-free keys, every pair of `ρ` is the pair `lookup` returns.
The substituted
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
| CX-P `CXPrefix` | for injective `i`: `B₀ ⊆ P.B → CounterAt (withBody P B₀) i ρ θR → ¬ ValidOpen P` | expected true: CX on `withBody P B₀`, then C1-M |

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

**CX-P, a counter-instance to part of the body.** `withBody P B₀`
keeps the rigid lists and the whole `D` and replaces the body by a
sublist `B₀`. CX refutes `withBody P B₀`; C1-M (more body atoms, fewer
valid signatures) carries this to `P`. This is the form bounded
evidence uses when it keeps only the atoms a refusal needs. Only the
body may be cut: a counter-instance to a sub-`D` is not one to `P`
(C1-D, §5).

**CX-CA, the searchable converse.** A refuter needs one fixed supply,
`B ⊕ Nat`. The argument is CX-C's, preceded by B1b
(`AtomsToOpen`, Bridge/Valid.lean: conjectured, unproved, flagged at an
empty `B₁` in bridge/statements.md §3). Without B1b, an invalid
signature might be refutable only over a richer base type. **Unsure,
exactly as B1b is.** Soundness (CX, CX-K) does not depend on it.
**Decided (§18.69 Q10):** the first refuter is sound and possibly
incomplete; B1b's completeness does not block it. An invalid
signature that the refuter cannot refute stays Unresolved, never
Solved.

## 4. Checked certificates and `Refute_sound`

**`CXChecked P ρ`** is the certificate condition at `B ⊕ Nat`, built
from decidable parts only: `Scoped P`; `ρ`'s keys are duplicate-free
(as in `Denotes`); `ρ` binds only rigid
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
| CX-KP `CXCheckedPrefixSound` | `B₀ ⊆ P.B → CXChecked (withBody P B₀) ρ → ¬ ValidOpen P` | expected true: CX-K on `withBody P B₀` (same `D`, so `Scoped` is unchanged), then C1-M |

**CX-K, argument.** Define `θR` by lookup: `θR.ty n` is the value of
`ρ.ty.lookup n` and `θR.row r` that of `ρ.row.lookup r` (ground and
well-formed, so each evaluates; any value off the rigid lists). Then
`Denotes`: its value conditions hold by construction, and its
duplicate-free keys are part of `CXChecked`, so every pair of `ρ` is
the one `lookup` read. `decideCall` true on
the substituted `D` gives an assignment satisfying it; CX-S `←` and
scoping (`D` reads only rigid variables, where the combined assignment
is `θR`) give `Sat θR D′`. Apply CX with `i = Sum.inl`. Needs, beyond
CX: "ground and well-formed implies `evalT` defined" (not yet stated
anywhere; expected true by induction, using `wfT`'s duplicate check)
and `Scoped` preserved by `mapBase` (E5, proved).

**The certificate `{rho, body}`.** CX-KP fixes the shape: a ground
substitution `rho : Subst Label (B ⊕ Nat)` and `body`, a sublist of
`P.B` given as atom ids, checked as `CXChecked (withBody P body) rho`.
The check reads the whole `D`; the certificate never names a subset of
`D`. There is no `θR` and no base map `i` in it: `CXChecked` is fixed
at `B ⊕ Nat` with `i = Sum.inl`, and `θR` is what `rho` denotes.
CX-K is the case `body = P.B`.

**`RefuteSound` is the interface,** generic in the certificate type:
any refuting strategy supplies a proof of it for its own `check`.
`RealizesCX check` says each acceptance is backed by a `CXChecked`
certificate; CX-R says that suffices. A future refuter with a
different certificate (say, a c1 rule's evidence) supplies
`RefuteSound` its own way.

**Naming.** The Lean `RefuteSound` is requirements.md's
`Refute_sound`: the same statement, named after the Lean files'
convention for `Prop` definitions. Documents should write
`RefuteSound` and may note the requirements name.

**Pending refuters (§18.69 Q10).** A refuter whose soundness
obligation is not yet discharged (CX-K, CX-KP or CX-R for a
`CXChecked` refuter, plus CX-PR when it reads a recorded problem; or
its own `RefuteSound` proof) may run for research or shadow evidence.
It **must not mint the trusted Contradiction** until that obligation
is discharged: its acceptances are recorded as shadow evidence and
never change the verdict, which is whatever the other components
give. T-R0a carries this with two constructors, not a status field
(r0/generation-interface.md §5.1): `shadowRefuter`, given the pending
statement, logs `Shadow` records in the attempt log; only
`trustedRefuter`, given a proved theorem, wraps a `CXChecked` as the
token `Refuted`. Rules still require a proof. The first trusted
refuter is sound and possibly incomplete (§3).

**Sub-bodies and the whole `D` (§18.69 Q10).** The full `D` is always
preserved (C1-D, X7); a certificate may name a justified sub-body
`body ⊆ P.B` (CX-KP), "justified" meaning that the check is run on
`withBody P body` with the whole `D`, never on a sub-`D`.

### 4.1 The projection from the recorded problem

T-R0b's `RecordedProblem` is richer than `SigProblem`: `app h args`
nodes outside `TExpr`, requirement atoms (`pr`, `cmp`), canonical
variable names, atoms inside `outside` constructs. Everything above is
stated over `SigProblem`, so rules and refuters read a projection
`toSig : RecordedProblem → SigProblem`. `RecordedProblem` and its
validity are not in Lean, so **CX-PR `ProjectionSound ValidR toSig`**
is stated over an abstract type `R`, a validity `ValidR` and `toSig`:
`∀ p, ¬ ValidOpen (toSig p) → ¬ ValidR p`. Composed with any
`RefuteSound check`, an acceptance of `check (toSig p) c` refutes `p`.

**Whose `ValidR` (§18.69 Q11).** CX-PR's `ValidR` is T-R0b's
definition, r0/recorder-rules.md §5.4 (a proposed sketch: ground
values with free `app` nodes, `D` as hypothesis, every recorded body
atom, requirement atoms by the stated ground rule, unsupported
constructs listed). CX consumes it and does not define it; validity
is never defined by whichever checker succeeds. The sketch states
VR-CX, its argument that conditions 4 and 5 below hold (an injective
encoding of `app` values as fresh base atoms), and VR-sub, which
carries `¬ ValidR p` to the declaration.

**Initial proved-model scope (§18.69 Q10).** CX's statements, and the
first proofs, stay over `SigProblem` (`TExpr`: base, arrow, type
variable, record). Requirement atoms (`BQ`) and further type
constructors (`app`) are kept apart from that scope: they reach CX
only through `toSig`, which drops or generalizes them (conditions 3,
4), never as new cases of `CXChecked`.

Conditions on `toSig` for CX-PR to hold:

1. **Names.** Canonical names map injectively to `Nat`, per sort;
   rigid variables stay rigid and flexible ones stay flexible.
2. **`D` whole.** `D` is translated atom for atom; nothing is dropped
   or generalized. A `D` atom outside `TExpr` (an `app`, a requirement
   atom, an atom under an `outside` marker) leaves `toSig` undefined
   for that problem, and no refutation through it applies (T-R0b's
   `d` holds only `lacks`/`disjoint` over rigid variables, so this
   does not arise from source; markers carry no atoms). Weakening
   `D` admits more rigid assignments (C1-D, §5).
3. **Body atoms dropped.** A body atom outside the fragment may be
   dropped. By C1-M, dropping can only add solutions.
4. **`app` generalized.** Each occurrence of `app h args` in a kept
   body atom becomes its own fresh flexible type variable, mentioned
   nowhere else (not shared between occurrences: sharing would assert
   that two occurrences are equal). Given a solution of the recorded
   body at a rigid assignment, setting each fresh variable to the
   value of its occurrence solves the generalized body. This needs
   `ValidR`'s values of `app` nodes to be values of `G` over an
   injective extension of the bases (for example a fresh base atom
   per applied type), finite at every depth (`ValidFin` asks for a
   finite `θF`), and chosen after the rigid assignment, which a
   flexible variable allows.
5. **Bases.** `ValidR` quantifies over injective base extensions at
   least as `ValidOpen` does, so that its validity at every extension
   gives `ValidOpen (toSig p)`.

Status: **unsure**. `ValidR` now has an owner and a proposed sketch
(T-R0b §5.4), but no formal definition, and its conditions are
argued, not checked. Under conditions 1-5 the argument is expected
true: conditions 3 and 4 make every recorded solution a solution of
the projection, so `ValidR p → ValidOpen (toSig p)`, which is CX-PR's
contrapositive.

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
| C1-D `SubDAntitone` | `D₀ ⊆ P.D → ¬ ValidOpen (withD P D₀) → ¬ ValidOpen P` | **expected false** (X7) |
| C1-U `UnsatBodySound` | `(∃ θR, RigidFin ∧ Sat θR D) → ¬ Satisfiable P.B → ¬ ValidOpen P` | expected true |
| C1-H `ClashSound` | `C1Sound ClashRule` | expected true, via C1-U |
| C1-O `OccursSound` | `C1Sound OccursRule` | expected true, via C1-U |
| C1-X `ClashAfterSubstSound` | the clash rule on `substProblem σ P.B`, any `σ`, refutes `P` | **expected false** at every inhabited `B` (X6) |
| C1-E `ClashAfterEntailedSound` | the same, when every solution of `P.B` satisfies `eqs σ` | expected true |

C1-P is the form §2.4 relies on: generation that stops early leaves a
prefix of `B`, and a rule that fires on the prefix must still be
evidence about the whole signature. C1-T reduces it to C1.

**Whole `D`, sublist of `B`.** A c1 rule reads the whole `D` and a
sublist of `B` (`withBody P B₀` keeps `P.D`), never a sub-`D`.
`ValidOpen` is antitone in the body but not in `D`: dropping `D` atoms
admits more rigid assignments, so a refutation of `⟨D₀, B₀⟩` with
`D₀ ⊂ D` does not refute `⟨D, B₀⟩`. C1-D states the tempting converse
and X7 refutes it: `pinP b` declares and requires `x = Int`, `x`
rigid, and is valid; with `D` dropped, `x := {}` is a rigid assignment
no body solution survives. A checker that re-runs a rule must
therefore re-run it on `withBody P premises`, premises drawn from `B`
only.

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
refutes it at every inhabited base type, `Unit` included: `x = Int`,
`x` flexible, is valid, but under the choice `x := Int -> Int` the
rewritten body is `(Int -> Int) = Int`. (The two-base form, with
`x := Bool`, is X6b; it is vacuous when `B` has at most one element.)
C1-E is the boundary: if `σ` is entailed by the original body (every
solution of `P.B` satisfies `eqs σ`, as for a most general unifier of
original equations), the rule is sound, by `binding_correspondence` (proved,
Binding.lean) and C1-H. Entailment is semantic; whether the online
solver's substitution is entailed is exactly what bindings chosen by
`H` or `shareTails` can break.

**Which c1 rules are stated.** Stated: C1-H (top-level head clash,
including two equations binding one type variable to clashing heads)
and C1-O (the type-variable occurs check), each with the `ClauseOnly`
gate on `D`. **Not stated, so not yet c1** (questions 4, 5):

- nested head clashes, through arrows or inside record fields (for
  example `{a: Bool, ...r} = {a: Int, ...r}`);
- record-field clashes generally: `HeadClash` makes record against
  record `False`, and records are equal modulo label order and
  disjoint union, so a free-term-algebra argument does not carry over;
- cancellation (removing equal parts from both sides);
- `lacks`/`disjoint` refutations on original atoms, the third
  candidate of §2.3;
- the occurs check through row tails (`r = { l: t, ...r }`).

Their statement shapes are left unwritten: each needs a decomposition
of record equality that this tranche has not fixed, and a wrong shape
would be worse than none. A document that labels any of them "c1"
should say "c1 candidate; unstated". **Decided (§18.69 Q10):**
unstated rules stay candidates; none is used as a ground for
Contradiction until it is stated and proved.

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
- **X6 `ClashAfterSubstRefuted`**: at every `b : B`, `flexP b` is
  valid; the clash rule fires on its body under `badArrow b`
  (`x := b -> b`); so C1-X fails at every inhabited `B`, `Unit` included.
  The adversarial review proved `¬ ClashAfterSubstSound` at `Bool` and
  at `Unit` in a scratch copy.
- **X6b `ClashAfterSubstRefuted2`**: the earlier form, with
  `badChoice c` and `b ≠ c`. It is vacuous when `B` has at most one
  element, which is why X6 now uses `badArrow`.
- **X7 `SubDRefuted`** (F1): at every `b`, `pinP b` (rigid `x`, `D`
  and body both `x = b`) is valid, `withD (pinP b) []` is not (take
  `x := {}`), so C1-D fails.

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
| `flexP ()` at `Unit`; under `badArrow ()` | true; false | — |
| `pinP true`, `D` dropped; `x := {}` | false | — |
| `pinP true`, whole `D`; `x := {}` | — | false |

The `badArrow` and `pinP` rows were evaluated at the revision of
§9, the same way (a scratch file, deleted). The `pinP` rows show
X7's point as a certificate: `x := {}` refutes the body with `D`
dropped, but violates the whole `D`, so it certifies nothing about
`pinP`.

The `cStar` control shows why `D` is checked: `unlRho` violates the valid
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
| CX-P | CX, C1-M |
| CX-KP | CX-K, C1-M |
| CX-PR | conditions 1-5 of §4.1; C1-M; T-R0b's `ValidR` (§5.4: **sketched, proposed; not formal**) |
| C1-T | C1-M |
| C1-U | B0 (`openToFin`) |
| C1-H, C1-O | C1-U, `clauseOnly_satisfiable`, head/occurs facts (new) |
| C1-E | `binding_correspondence`, C1-H's unsatisfiability fact |

## 8. Questions for review

The author's decisions (§18.69 Q10, Q11) settle questions 4 (in part),
6 and 8; questions 1, 2, 3 and 5 stay open.

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
   occurs check are stated (§5 lists the rest). Should this tranche
   also state the `lacks`/`disjoint` refutations on original atoms,
   nested and record-field clashes, cancellation and the row occurs
   check? **Decided in part (§18.69 Q10):** unstated rules stay "c1
   candidate; unstated"; this tranche states none of them. Whether a
   later tranche states them is open.
5. **C1-E as the criterion.** Is "every solution of the original body
   satisfies `eqs σ`" the intended line between original and
   solver-chosen atoms, so that an mgu-based rule counts as c1?
6. **Fresh bases.** Soundness never needs them. Completeness at a
   searchable supply (CX-CA, CX-KC) stands or falls with B1b. Should
   B1b be proved before a refuter is planned, or is a sound,
   incomplete refuter enough for the Contradiction verdict? **Decided
   (§18.69 Q10):** start with a sound, possibly incomplete refuter;
   B1b does not block it (§3).
7. **Name.** Settled by review: documents write `RefuteSound` (the
   Lean name), noting that it is requirements.md's `Refute_sound`
   (§4).
8. **`ValidR`.** CX-PR needs the recorded problem's validity. Which
   document defines it, and does it meet conditions 4 and 5 of §4.1?
   **Decided (§18.69 Q11):** T-R0b defines it (r0/recorder-rules.md
   §5.4), with requirements and unsupported constructs explicit; CX
   consumes it. T-R0b's sketch argues conditions 4 and 5 (VR-CX); a
   check or proof is still owed, so CX-PR stays unsure.

## 9. Revision log (reviews of 88c052d)

Two reviews of 88c052d (an interface reconciliation and an
adversarial soundness review) led to these changes. Nothing is proved;
every claim is still a `def … : Prop`.

- **Adversarial 4 (CX-S route).** Chosen fix: duplicate-free keys,
  `(ρ.ty.map Prod.fst).Nodup` and the same for `ρ.row`, added to
  `Denotes` and `CXChecked`; not a lookup-only substitution lemma.
  CX-S's argument (§2) and CX-K's construction of `θR` (§4, now by
  `lookup`) cite the condition. X1 and X2 still inhabit: `unlRho n`
  binds row 0 and rows `1..n` once each.
- **Adversarial 9(a) (X6).** X6 now uses `badArrow b` and holds at
  every inhabited `B`, `Unit` included; the two-base form is kept as
  X6b, noted as vacuous when `B` has at most one element. C1-X's
  status reads "expected false at every inhabited `B`".
- **F1 (whole `D`).** §5 states that c1 rules read the whole `D` and a
  sublist of `B`; new `withD`, C1-D `SubDAntitone` (expected false)
  and X7 `SubDRefuted` with `pinP` (expected true; bounded check in
  §6).
- **F2 (projection).** New §4.1 and CX-PR `ProjectionSound`, over an
  abstract recorded type, with conditions 1-5 in prose. Status
  unsure: `ValidR` is not defined. New question 8.
- **F3 (sub-body evidence).** New CX-P `CXPrefix` and CX-KP
  `CXCheckedPrefixSound` (expected true, from CX or CX-K and C1-M);
  certificate shape `{rho, body}` in §4. `withBody` moved from
  Rules.lean to Statements.lean so CX-P can use it.
- **F4 (c1 scope).** §5 lists what is stated (C1-H, C1-O) and what is
  not (nested and record-field clashes, cancellation,
  `lacks`/`disjoint`, row occurs); shapes left unwritten, with the
  reason. Rules.lean carries the same list.
- **F6 (naming).** §4 notes that Lean `RefuteSound` is requirements'
  `Refute_sound`; question 7 marked settled.
- One Lean section heading said "lemma"; renamed so the Refute files
  contain none of `theorem`, `lemma`, `sorry`, `axiom`.

### Consistency re-check (39320ad)

- §4.1 condition 2: notes that a `D` atom outside `TExpr` does not
  arise from source, since T-R0b's `d` (recorder-rules §10, Sig4-Sig8)
  holds only `lacks`/`disjoint` over rigid variables and its
  `outside` markers carry no atoms (re-check R7).

### Author's decisions (§18.69)

- Q10: a sound, possibly incomplete refuter first; B1b does not block
  it (§3, question 6). Unstated rules stay candidates (§5, question
  4). The whole `D` is preserved and justified sub-bodies are
  permitted (§4). The initial proved-model scope is `SigProblem`,
  kept apart from `BQ` and further type constructors (§4.1). Pending
  refuters may run for research or shadow evidence but do not mint
  the trusted Contradiction before their soundness obligation is
  discharged (§4).
- Q11: CX-PR's `ValidR` is T-R0b's (r0/recorder-rules.md §5.4,
  proposed); §4.1, §7 and question 8 updated. CX-PR's status stays
  unsure.
- Still open: questions 1 (total binding of unused rigid variables),
  2 (scoped `D`), 3 (certificate cost) and 5 (C1-E as the line).
  Statements.lean is unchanged (no Lean edits in this revision).

### Reconciliation after §18.69

The four editors applied §18.69 in parallel; this pass removes the
stale cross-references they left. No decision changed and no Lean
file was edited.

- §4, "Pending refuters": T-R0a no longer has a `Pending` status on
  `RefuterSpec`; it injects either `shadowRefuter` (statement;
  `Shadow` records only) or `trustedRefuter` (proved theorem; the only
  maker of `Refuted`). A shadow result leaves the verdict to the other
  components rather than forcing Unresolved.
