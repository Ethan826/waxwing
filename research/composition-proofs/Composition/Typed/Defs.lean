/-
D3b, a generic instance per written-label pattern (dossier §18.6,
§18.10, §18.13 stream 1). STATEMENTS ONLY: the construction and each
claim as a `Prop` definition, proved (or not) elsewhere. The generic
model and `hv` are in Typed/Model.lean. Prose, worked examples and the
restrictions table: research/division-campaign/d3b/construction.md.
-/
import Composition.Typed.Model

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### The construction -/

/-- The candidate cells: nonempty sublists of the rigid rows. -/
def cellCands (P : SigProblem Label B) : List Cell :=
  (subsets P.rigidRow).filter (· ≠ [])

/-- The pre-instance over cells `C`: every unknown a constant. -/
def etaRow (P : SigProblem Label B) (π : Pattern Label) (C : List Cell)
    (r : Nat) : Row (CL Label) (CG Label B)
  | .inl l => if l ∈ written P ∧ π r l = true then
      some (.base (.inr (.A r l))) else none
  | .inr S => if S ∈ C ∧ r ∈ S then some (.base (.inr (.X r S))) else none

def eta (P : SigProblem Label B) (π : Pattern Label) (C : List Cell) :
    CAssign Label B :=
  ⟨fun n => .base (.inr (.T n)), etaRow P π C⟩

/-- A substitution of the constants, applied at every depth. -/
abbrev CSubst (Label B : Type) := CConst Label → CG Label B

mutual
  def substG (τ : CSubst Label B) : CG Label B → CG Label B
    | .base (.inl b) => .base (.inl b)
    | .base (.inr c) => τ c
    | .arrow a b => .arrow (substG τ a) (substG τ b)
    | .record f => .record fun k => substO τ (f k)

  def substO (τ : CSubst Label B) : Option (CG Label B) → Option (CG Label B)
    | none => none
    | some g => some (substG τ g)
end

def thetaOf (P : SigProblem Label B) (π : Pattern Label) (C : List Cell)
    (τ : CSubst Label B) : CAssign Label B :=
  ⟨fun n => substG τ ((eta P π C).ty n),
   fun r k => substO τ ((eta P π C).row r k)⟩

/-- `τ` unifies `D` over the pre-instance with cells `C`. -/
def UnifiesD (P : SigProblem Label B) (π : Pattern Label) (C : List Cell)
    (τ : CSubst Label B) : Prop :=
  Sat (thetaOf P π C τ) (cliftP P).D

/-- A most general unifier, with finite values. -/
def IsMGU (P : SigProblem Label B) (π : Pattern Label) (C : List Cell)
    (τ : CSubst Label B) : Prop :=
  UnifiesD P π C τ ∧ (∀ c, FinG (τ c)) ∧
    ∀ τ', UnifiesD P π C τ' → ∃ τ'', ∀ c, substG τ'' (τ c) = τ' c

/-- Cell `S` can be occupied: `D` is unifiable with `S` as the only
cell. -/
def Allowed (P : SigProblem Label B) (π : Pattern Label) (S : Cell) :
    Prop :=
  ∃ τ, UnifiesD P π [S] τ

open Classical in
noncomputable def allowedCells (P : SigProblem Label B) (π : Pattern Label) :
    List Cell :=
  (cellCands P).filter fun S => decide (Allowed P π S)

/-- D3b's construction: the mgu applied to the pre-instance over the
allowed cells. -/
noncomputable def thetaStar (P : SigProblem Label B) (π : Pattern Label)
    (τ : CSubst Label B) : CAssign Label B :=
  thetaOf P π (allowedCells P π) τ

/-! ### Equation-free hypotheses (Waxwing's `where` clauses) -/

def EqFreeAtom : Atom Label B → Prop
  | .eq _ _ => False
  | _ => True

def EqFree (P : SigProblem Label B) : Prop := ∀ a ∈ P.D, EqFreeAtom a

/-- No two rows of the cell are declared disjoint. -/
def FreeCell (P : SigProblem Label B) (S : Cell) : Prop :=
  ∀ r ∈ S, ∀ s ∈ S, Atom.disjoint r s ∉ P.D

open Classical in
noncomputable def freeCells (P : SigProblem Label B) : List Cell :=
  (cellCands P).filter fun S => decide (FreeCell P S)

/-- The explicit generic instance when `D` has no equations. -/
noncomputable def thetaFree (P : SigProblem Label B) (π : Pattern Label) :
    CAssign Label B :=
  eta P π (freeCells P)

/-! ### Statements -/

/-- Transfer: a generic solution at `θs` maps by `hv` to a solution at
every rigid assignment `θs` covers; finite when both inputs are. -/
def Transfer : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B) (θR : Assign Label B)
    (σ : CAssign Label B), Covers P θs θR →
    Sat (combine (cliftP P) θs σ) (cliftP P).B →
    ∃ θF, Sat (combine P θR θF) P.B ∧
      (FinAssign σ → RigidFin P θR → FinAssign θF)

/-- D3b's soundness half: solving at a generic instance gives validity
in its pattern, over all values and over finite ones. -/
def D3bSound : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B),
    GenericInst P π θs →
      (SolvableAt P θs → ValidIn P π) ∧
      (SolvableFinAt P θs → ValidFinIn P π)

/-- D3b, existence: every pattern with an instance has a generic one. -/
def D3bExists : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label), Scoped P →
    HasInstance P π → ∃ θs, GenericInst P π θs

/-- The construction: an mgu over the allowed cells gives a generic
instance, within the problem's labels and bases. -/
def Universality : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (τ : CSubst Label B),
    Scoped P → HasInstance P π → IsMGU P π (allowedCells P π) τ →
      GenericInst P π (thetaStar P π τ) ∧ WithinC P (thetaStar P π τ)

/-- Allowed cells together: `D` is unifiable with all of them at once. -/
def CellIndependence : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label), Scoped P →
    HasInstance P π → ∃ τ, UnifiesD P π (allowedCells P π) τ

/-- Robinson's theorem for the pre-instance: unifiable means a finite
mgu exists. -/
def MGUExists : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (C : List Cell),
    (∃ τ, UnifiesD P π C τ) → ∃ τ, IsMGU P π C τ

/-- Vacuity: pattern `π` has an instance satisfying `D` iff `D` is
unifiable on the pre-instance with no cell. When it is not, `ValidIn`
holds vacuously and there is no generic instance. -/
def InstanceIffUnifiable : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label), Scoped P →
    (HasInstance P π ↔ ∃ τ, UnifiesD P π [] τ)

/-- D3b for equation-free hypotheses, with the explicit instance. -/
def D3bEqFree : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label), Scoped P → EqFree P →
    HasInstance P π →
      GenericInst P π (thetaFree P π) ∧ WithinC P (thetaFree P π)

/-- Assembly: a solved generic instance for every pattern that has an
instance gives validity, over all values and over finite ones. -/
def D3bValidAll : Prop :=
  ∀ P : SigProblem Label B,
    ((∀ π, HasInstance P π → ∃ θs, GenericInst P π θs ∧ SolvableAt P θs) →
      ValidAll P) ∧
    ((∀ π, HasInstance P π →
      ∃ θs, GenericInst P π θs ∧ SolvableFinAt P θs) → ValidFin P)

/-- D3b's completeness half: with fresh labels and bases, a generic
instance within the problem's labels and bases is realized by a rigid
assignment, so validity in the pattern gives a solution at the generic
instance. -/
def D3bComplete : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (z : Cell → Label) (e : CConst Label → B), Fresh P z e →
    WithinC P θs → GenericInst P π θs →
      (ValidIn P π → SolvableAt P θs) ∧
      (ValidFinIn P π → SolvableFinAt P θs)

end Composition.Typed
