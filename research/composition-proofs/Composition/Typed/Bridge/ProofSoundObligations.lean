/-
Proof obligations of the option-B soundness track (statements.md
§10.6): `HvSubst`, `CellOfSubst` and the lemmas B4f's argument uses.
These are lemmas the proof owner proves (ProofSound*.lean), not changes
to the reviewed statements in Sound.lean.

B4f's argument (statements.md §3). Walk the generic roots of `θs` and
the ground roots of `θR` (over the extension `B₁`) in lockstep, as `hv`
reads them (`Reach`). Value each constant occurrence `(c, κ)` by the
ground subtree met there (`reachVal`). If anything disagrees (two
occurrences of `(c, κ)` with different subtrees, or a shape mismatch),
one back substitution `s` (`BackSubst`: `j b ↦ base b` for every `b`,
other bases to `emptyG` or `arrow emptyG emptyG`) separates it
(`Separate*`); `s θR` is an instance over `B` (`SubstInstance`), so θs
covers it with some `ν_s`, and `hv` under `ν_s` agrees with `s` on every
reached pair (`HvReach`, for every `s`), which contradicts the
separation. `SubstInstance` uses E2′, E1 and E5's `written`; `ReachMatch`
and `HvSubst` use E5's `written`. BS-c1f uses E2, E6, `FinMapG` and
`CombineMap`.

Review (independent agent, before any proof; scratch Lean, not
committed): every obligation true and needed, except `SeparateArrow`
and `SeparateRecord`, false without `Function.Injective j` (at `B =
Bool`, `B₁ = Unit`, no back substitution exists; checked in Lean), now
added; `HvSubst` and `InPatternSubst` superfluous; `BackSubstExists`
named as missing; nothing over-strong; `Reach` mirrors `hv` exactly and
`reachVal` trivializes nothing. Verdict: approved with those changes.
-/
import Composition.Typed.Bridge.Sound
import Composition.Typed.Defs

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### Definitions used by the obligations -/

/-- `s` maps every base of `j`'s image back: `s (j b) = base b`, for
every `b` (B4f has no `WithinC`, so unwritten bases occur in θs). -/
def BackSubst {B₁ : Type} (j : B → B₁) (s : B₁ → G Label B) : Prop :=
  ∀ b, s (j b) = .base b

/-- Generic and ground subterms met together when `hv` reads generic
roots against ground roots: under a written label `k` the generic
field at `inl k`; under an unwritten `k` with nonempty cell the field
at `inr (cell k)`, with context `some k`. -/
inductive Reach {B₁ : Type} (W : List Label) (cell : Label → Cell)
    (Root : CG Label B → G Label B₁ → Prop) :
    CG Label B → Option Label → G Label B₁ → Prop
  | root {g t} : Root g t → Reach W cell Root g none t
  | arrowL {a c t u κ} : Reach W cell Root (.arrow a c) κ (.arrow t u) →
      Reach W cell Root a κ t
  | arrowR {a c t u κ} : Reach W cell Root (.arrow a c) κ (.arrow t u) →
      Reach W cell Root c κ u
  | wr {f h κ k g t} : Reach W cell Root (.record f) κ (.record h) →
      k ∈ W → f (.inl k) = some g → h k = some t → Reach W cell Root g κ t
  | cl {f h κ k g t} : Reach W cell Root (.record f) κ (.record h) →
      k ∉ W → cell k ≠ [] → f (.inr (cell k)) = some g → h k = some t →
      Reach W cell Root g (some k) t

/-- The rigid roots: each rigid type variable's value, and each rigid
row taken as a record. -/
def Roots {B₁ : Type} (P : SigProblem Label B) (θs : CAssign Label B)
    (θR : Assign Label B₁) (g : CG Label B) (t : G Label B₁) : Prop :=
  (∃ n ∈ P.rigidTy, g = θs.ty n ∧ t = θR.ty n) ∨
    ∃ r ∈ P.rigidRow, g = .record (θs.row r) ∧ t = .record (θR.row r)

/-- The pairs reached from the rigid roots of `θs` and `θR`, read as
`hv (P.mapBase j)` at `θR` reads them. -/
def ReachR {B₁ : Type} (P : SigProblem Label B) (j : B → B₁)
    (θs : CAssign Label B) (θR : Assign Label B₁) :
    CG Label B → Option Label → G Label B₁ → Prop :=
  Reach (written P) (cellOf (P.mapBase j) θR) (Roots P θs θR)

open Classical in
/-- The candidate valuation: the ground subtree at some reached
occurrence of `(c, κ)`, else `emptyG`. -/
noncomputable def reachVal {B₁ : Type} (P : SigProblem Label B)
    (j : B → B₁) (θs : CAssign Label B) (θR : Assign Label B₁) :
    Val Label B₁ := fun c κ =>
  if h : ∃ t, ReachR P j θs θR (.base (.inr c)) κ t then Classical.choose h
  else emptyG

/-! ### The obligations -/

/-- `CellOfSubst` (§10.6). Substituting values for bases keeps every row
domain, so the cells are those of the renamed problem at `θ`. -/
def CellOfSubst : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (j : B → B₁)
    (s : B₁ → G Label B) (θ : Assign Label B₁),
    cellOf P (substAssign s θ) = cellOf (P.mapBase j) θ

/-- `HvSubst` (§10.6). `hv` commutes with a back substitution, for every
base `b`. Not used by the assembly (review: superfluous); proved because
§10.6 lists it. -/
def HvSubst : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (j : B → B₁)
    (s : B₁ → G Label B) (θ : Assign Label B₁) (ν : Val Label B₁)
    (κ : Option Label) (g : CG Label B), BackSubst j s →
    substBase s (hv (P.mapBase j) θ ν κ (mapG (Sum.map j id) g)) =
      hv P (substAssign s θ) (fun c κ' => substBase s (ν c κ')) κ g

/-- `SubstInstance`. A back substitution carries an instance over the
extension to an instance over `B` (from E2′ at `g = j`, `h = id`). -/
def SubstInstance : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (B₁ : Type)
    (j : B → B₁) (s : B₁ → G Label B) (θR : Assign Label B₁),
    BackSubst j s → Sat θR (P.mapBase j).D →
    InPattern (P.mapBase j) π θR →
      Sat (substAssign s θR) P.D ∧ InPattern P π (substAssign s θR)

/-- `BackSubstExists`. An injective `j` has a back substitution, also
when `B` is empty or `B₁` has bases outside `j`'s image. -/
def BackSubstExists : Prop :=
  ∀ (B₁ : Type) (j : B → B₁), Function.Injective j →
    ∃ s : B₁ → G Label B, BackSubst j s

/-- `HvReach`. If `ν` covers `s θR` by θs, `hv` under `ν` agrees with
`s` on every reached pair. -/
def HvReach : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B) (B₁ : Type)
    (j : B → B₁) (θR : Assign Label B₁) (s : B₁ → G Label B)
    (ν : Val Label B),
    (∀ n ∈ P.rigidTy, hv P (substAssign s θR) ν none (θs.ty n) =
      (substAssign s θR).ty n) →
    (∀ r ∈ P.rigidRow, hvRow P (substAssign s θR) ν none (θs.row r) =
      (substAssign s θR).row r) →
    ∀ g κ t, ReachR P j θs θR g κ t →
      hv P (substAssign s θR) ν κ g = substBase s t

/-- `Separate`. Distinct ground values over an injective extension are
told apart by some back substitution. -/
def Separate : Prop :=
  ∀ (B₁ : Type) (j : B → B₁), Function.Injective j →
    ∀ t t' : G Label B₁, t ≠ t' →
      ∃ s : B₁ → G Label B, BackSubst j s ∧ substBase s t ≠ substBase s t'

/-- `SeparateArrow`, `SeparateRecord`. A value that is not an arrow (a
record) stays so under some back substitution. (Injectivity added after
review: without it no back substitution need exist.) -/
def SeparateArrow : Prop :=
  ∀ (B₁ : Type) (j : B → B₁), Function.Injective j → ∀ t : G Label B₁,
    (∀ a c, t ≠ .arrow a c) →
      ∃ s : B₁ → G Label B, BackSubst j s ∧
        ∀ a c, substBase s t ≠ .arrow a c

def SeparateRecord : Prop :=
  ∀ (B₁ : Type) (j : B → B₁), Function.Injective j → ∀ t : G Label B₁,
    (∀ h, t ≠ .record h) →
      ∃ s : B₁ → G Label B, BackSubst j s ∧ ∀ h, substBase s t ≠ .record h

/-- `ReachMatch`. If every back substitution of `θR` is covered by θs,
`hv` under `reachVal` maps each reached generic subterm, renamed, to
its ground partner. -/
def ReachMatch : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B) (B₁ : Type)
    (j : B → B₁) (θR : Assign Label B₁), Function.Injective j →
    (∀ s, BackSubst j s → Covers P θs (substAssign s θR)) →
    ∀ g κ t, ReachR P j θs θR g κ t →
      hv (P.mapBase j) θR (reachVal P j θs θR) κ (mapG (Sum.map j id) g) =
        t

/-- `ReachFin`. Reached ground subterms of a rigid-finite `θR` are
finite. -/
def ReachFin : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B) (B₁ : Type)
    (j : B → B₁) (θR : Assign Label B₁), RigidFin (P.mapBase j) θR →
    ∀ g κ t, ReachR P j θs θR g κ t → FinG t

/-- `InPatternSubst` (§10.6, B5's `HasInstance P π′`). A substitution
keeps every row domain, so it keeps the presence pattern. -/
def InPatternSubst : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (s : B₁ → G Label B)
    (θ : Assign Label B₁), InPattern P (presenceOf θ) (substAssign s θ)

/-- `FinMapG` (§10.6). Renaming bases keeps values finite. -/
def FinMapG : Prop :=
  ∀ (B₁ : Type) (f : B → B₁) (g : G Label B), FinG g → FinG (mapG f g)

/-- `CombineMap` (§10.6). `combine` commutes with renaming bases. -/
def CombineMap : Prop :=
  ∀ (Q : SigProblem Label B) (B₁ : Type) (f : B → B₁)
    (θ σ : Assign Label B),
    combine (Q.mapBase f) (mapAssign f θ) (mapAssign f σ) =
      mapAssign f (combine Q θ σ)

end Composition.Typed
