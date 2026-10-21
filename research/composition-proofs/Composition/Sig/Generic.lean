/-
P9s's generic model (dossier §14.2, as amended in §14.8). A pattern fixes
each rigid row's presence at the written labels; the generic rigid
assignment holds constants there and one rest label `inr r` per rigid
row. A certificate gives, for every pattern consistent with `D`, a
finite flexible assignment satisfying the body under two disjointness
obligations: every equation's value is well-formed (D1, two rests in one
row at any depth need a declared `disjoint`) and so is each pair of
rests across a `disjoint` atom (D2). Definitions only; P9s's search for
certificates is not formalized.
-/
import Composition.Sig.Finite

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

/-- The generic model's constants: a rigid row's field type at a
written label, a rest's field type, a rigid type variable. -/
inductive Const (Label : Type) where
  | A : Nat → Label → Const Label
  | R : Nat → Const Label
  | T : Nat → Const Label

/-- Generic labels: a written label `inl l`, or the rest of rigid row
`r`, `inr r`. Generic base types: `B`'s, or a constant. -/
abbrev GL (Label : Type) := Label ⊕ Nat
abbrev GB (Label B : Type) := B ⊕ Const Label
abbrev GG (Label B : Type) := G (GL Label) (GB Label B)

mutual
  /-- `P`'s syntax in the generic model. -/
  def liftT : TExpr Label B → TExpr (GL Label) (GB Label B)
    | .base b => .base (.inl b)
    | .arrow t u => .arrow (liftT t) (liftT u)
    | .tvar n => .tvar n
    | .record fs tails => .record (liftF fs) tails

  def liftF : Fields Label B → Fields (GL Label) (GB Label B)
    | .nil => .nil
    | .cons l t rest => .cons (.inl l) (liftT t) (liftF rest)
end

def liftAtom : Atom Label B → Atom (GL Label) (GB Label B)
  | .eq t u => .eq (liftT t) (liftT u)
  | .lacks r l => .lacks r (.inl l)
  | .disjoint r s => .disjoint r s
  | .ff => .ff

/-- The labels written in `D` and `B`. -/
def written (P : SigProblem Label B) : List Label := labelsOf (P.D ++ P.B)

/-- `D` declares `r` and `s` disjoint, in either order. -/
def Declared (P : SigProblem Label B) (r s : Nat) : Prop :=
  Atom.disjoint r s ∈ P.D ∨ Atom.disjoint s r ∈ P.D

/-- W3: two different rigid rows' rests in one row are declared
disjoint. -/
def WFRow {V : Type} (P : SigProblem Label B) (f : Row (GL Label) V) :
    Prop :=
  ∀ r ∈ P.rigidRow, ∀ s ∈ P.rigidRow, r ≠ s → f (.inr r) ≠ none →
    f (.inr s) ≠ none → Declared P r s

mutual
  /-- W3 at every depth. -/
  def WFG (P : SigProblem Label B) : GG Label B → Prop
    | .base _ => True
    | .arrow a c => WFG P a ∧ WFG P c
    | .record f => WFRow P f ∧ ∀ k, WFO P (f k)

  def WFO (P : SigProblem Label B) : Option (GG Label B) → Prop
    | none => True
    | some g => WFG P g
end

/-- A pattern: rigid row `r` holds written label `l` iff `π r l`. -/
abbrev Pattern (Label : Type) := Nat → Label → Bool

def Consistent (P : SigProblem Label B) (π : Pattern Label) : Prop :=
  (∀ r l, Atom.lacks r l ∈ P.D → π r l = false) ∧
    ∀ r s l, Atom.disjoint r s ∈ P.D → ¬ (π r l = true ∧ π s l = true)

/-- The pattern of a rigid assignment. -/
def presenceOf (θ : Assign Label B) : Pattern Label :=
  fun r l => (θ.row r l).isSome

/-- Rigid row `r` in the generic model of `π`. -/
def genRow (P : SigProblem Label B) (π : Pattern Label) (r : Nat) :
    Row (GL Label) (GG Label B)
  | .inl l => if l ∈ written P ∧ π r l = true then
      some (.base (.inr (.A r l))) else none
  | .inr s => if s = r then some (.base (.inr (.R r))) else none

/-- The generic assignment: rigid variables from `π`, flexible ones
from `σ`. -/
def genAssign (P : SigProblem Label B) (π : Pattern Label)
    (σ : Assign (GL Label) (GB Label B)) : Assign (GL Label) (GB Label B) :=
  ⟨fun n => if n ∈ P.rigidTy then .base (.inr (.T n)) else σ.ty n,
   fun r => if r ∈ P.rigidRow then genRow P π r else σ.row r⟩

/-- Generic satisfaction with the disjointness obligations D1, D2. -/
def HoldsG (P : SigProblem Label B) (Γ : Assign (GL Label) (GB Label B)) :
    Atom (GL Label) (GB Label B) → Prop
  | .eq t u => ∃ g, evalT Γ t = some g ∧ evalT Γ u = some g ∧ WFG P g
  | .disjoint x y => Holds Γ (.disjoint x y) ∧
      ∀ r ∈ P.rigidRow, ∀ s ∈ P.rigidRow, r ≠ s →
        Γ.row x (.inr r) ≠ none → Γ.row y (.inr s) ≠ none → Declared P r s
  | a => Holds Γ a

/-- A certificate for pattern `π`. -/
def Certifies (P : SigProblem Label B) (π : Pattern Label)
    (σ : Assign (GL Label) (GB Label B)) : Prop :=
  FinAssign σ ∧ ∀ a ∈ P.B, HoldsG P (genAssign P π σ) (liftAtom a)

/-- P9s accepts: every pattern consistent with `D` has a certificate. -/
def Accepts (P : SigProblem Label B) : Prop :=
  ∀ π, Consistent P π → ∃ σ, Certifies P π σ

end Composition.Syntax
