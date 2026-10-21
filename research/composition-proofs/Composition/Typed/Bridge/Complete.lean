/-
The P-1 bridge, statements only: completeness under option B. B3a has
no existence premise; W trims to the problem's symbols; B3 composes
with existence (`D3bExists`, open) as an implication; B3e and B3f are
the fragment forms; C is the characterization (P-3).
-/
import Composition.Typed.Bridge.Valid
import Composition.Typed.Bridge.Fresh

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B' : Type} [DecidableEq Label]

/-! ### Existence within symbols -/

/-- Generic instances within the problem's symbols, for some instance
of every pattern that has one. -/
def D3bExistsWithin : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label), Scoped P →
    HasInstance P π → ∃ θs, GenericInst P π θs ∧ WithinC P θs

/-! ### B3: completeness under option B -/

/-- B3a. Completeness at a given generic instance, under option B. No
existence claim. -/
def D3bCompleteOpen : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (z : Cell → Label), FreshLabels P z → WithinC P θs →
    GenericInst P π θs → ValidOpen P → SolvableFinAt P θs

/-- W. Per instance: a generic instance can be trimmed to the problem's
symbols (delete unwritten `inl` labels; replace unwritten problem bases
by constants unused in the rigid values). -/
def WithinTrim : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B),
    GenericInst P π θs → ∃ θs', GenericInst P π θs' ∧ WithinC P θs'

/-- W, global form (follows from `WithinTrim`). -/
def ExistsToWithin : Prop :=
  D3bExists (Label := Label) (B := B) →
    D3bExistsWithin (Label := Label) (B := B)

/-- Existence within symbols, for one problem. -/
def ExistsWithinAt (P : SigProblem Label B) : Prop :=
  ∀ π, HasInstance P π → ∃ θs, GenericInst P π θs ∧ WithinC P θs

/-- B3, per problem: existence for this problem, with option-B
validity, gives a solvable generic instance per pattern. -/
def D3bOpenCompleteAt : Prop :=
  ∀ P : SigProblem Label B, (∃ z, FreshLabels P z) → ExistsWithinAt P →
    ValidOpen P → ∀ π, HasInstance P π →
      ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs

/-- B3e. Unconditional on the equation-free fragment (existence there is
`d3bEqFree`, proved). -/
def D3bOpenCompleteEqFree : Prop :=
  ∀ P : SigProblem Label B, Scoped P → EqFree P →
    (∃ z, FreshLabels P z) → ValidOpen P → ∀ π, HasInstance P π →
      SolvableFinAt P (thetaFree P π)

/-- B3f. Unconditional on the flat fragment (`d3bFlat`, proved). -/
def D3bOpenCompleteFlat : Prop :=
  ∀ P : SigProblem Label B, Scoped P → FlatD P →
    (∃ z, FreshLabels P z) → ValidOpen P → ∀ π, HasInstance P π →
      SolvableFinAt P (thetaFlat P π)

/-- B3's conclusion: every option-B-valid problem has, for each pattern
with an instance, a generic instance within its symbols at which the
body is solvable. -/
def D3bOpenComplete : Prop :=
  ∀ P : SigProblem Label B, Scoped P → (∃ z, FreshLabels P z) →
    ValidOpen P → ∀ π, HasInstance P π →
      ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs

/-- B3. The composition, conditional on the open existence claim. -/
def BridgeComposition : Prop :=
  D3bExists (Label := Label) (B := B) →
    D3bOpenComplete (Label := Label) (B := B)

/-- C. The characterization (P-3): for a problem with existence within
symbols, option-B validity is exactly solvability at generic instances.
`←` is B5; `→` is B3 per problem. -/
def OpenCharacterization : Prop :=
  ∀ P : SigProblem Label B, Scoped P → (∃ z, FreshLabels P z) →
    ExistsWithinAt P →
      (ValidOpen P ↔ ∀ π, HasInstance P π →
        ∃ θs, GenericInst P π θs ∧ WithinC P θs ∧ SolvableFinAt P θs)

end Composition.Typed
