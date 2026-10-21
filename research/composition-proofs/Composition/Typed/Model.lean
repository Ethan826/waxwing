/-
D3b's generic model (dossier §18.6, §18.10, §18.13 stream 1):
definitions only, no claim. The statements are in Typed/Defs.lean. Reuses
the Sig model (`SigProblem`, `Assign`, `Sat`, `combine`, `written`,
`FinG`); typed problems are not formalized a second time.

The generic model is the ordinary semantics at other label and base
types (no special satisfaction relation, unlike P9s's `HoldsG`):

- labels `CL = Label ⊕ Cell`: a label of the problem, or one label per
  Venn cell (a nonempty set of rigid rows, listed in `P.rigidRow`'s
  order, as `cellOf` computes it);
- bases `CB = B ⊕ CConst`: the problem's bases, or a constant standing
  for a rigid type variable (`T n`), a rigid row's field at a written
  label (`A r l`), or a rigid row's field in a cell (`X r S`).

`hv` maps generic values into the ground model of one rigid assignment
`θ`: a written label maps field by field; an unwritten label `k` reads
the generic field at the label of `k`'s cell in `θ`, and a constant
under it is valued at `k` (`ν c (some k)`). Unwritten labels of `CL`
(`inl k`, `k` unwritten) and cells `θ` leaves empty are dropped.
-/
import Composition.Sig.Generic

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

/-! ### The generic model -/

/-- A Venn cell of the rigid rows: the rows holding a label. -/
abbrev Cell := List Nat

abbrev CL (Label : Type) := Label ⊕ Cell

/-- Generic constants: a rigid type variable, a rigid row's field at a
written label, a rigid row's field in a cell. -/
inductive CConst (Label : Type) where
  | T : Nat → CConst Label
  | A : Nat → Label → CConst Label
  | X : Nat → Cell → CConst Label

abbrev CB (Label B : Type) := B ⊕ CConst Label
abbrev CG (Label B : Type) := G (CL Label) (CB Label B)
abbrev CAssign (Label B : Type) := Assign (CL Label) (CB Label B)

mutual
  /-- `P`'s syntax in the generic model. -/
  def cliftT : TExpr Label B → TExpr (CL Label) (CB Label B)
    | .base b => .base (.inl b)
    | .arrow t u => .arrow (cliftT t) (cliftT u)
    | .tvar n => .tvar n
    | .record fs tails => .record (cliftF fs) tails

  def cliftF : Fields Label B → Fields (CL Label) (CB Label B)
    | .nil => .nil
    | .cons l t rest => .cons (.inl l) (cliftT t) (cliftF rest)
end

def cliftAtom : Atom Label B → Atom (CL Label) (CB Label B)
  | .eq t u => .eq (cliftT t) (cliftT u)
  | .lacks r l => .lacks r (.inl l)
  | .disjoint r s => .disjoint r s
  | .ff => .ff

/-- The same signature problem, read in the generic model. -/
def cliftP (P : SigProblem Label B) : SigProblem (CL Label) (CB Label B) :=
  ⟨P.rigidTy, P.rigidRow, P.D.map cliftAtom, P.B.map cliftAtom⟩

/-! ### Interpreting generic values at a rigid assignment -/

/-- The cell of label `k` under `θ`: the rigid rows holding `k`. -/
def cellOf (P : SigProblem Label B) (θ : Assign Label B) (k : Label) :
    Cell :=
  P.rigidRow.filter fun r => (θ.row r k).isSome

/-- Values of the constants; a cell constant may depend on the label
expanding its cell (`some k`), other positions pass `none`. -/
abbrev Val (Label B : Type) := CConst Label → Option Label → G Label B

mutual
  /-- `hv`, under the context `κ` (the innermost unwritten label). -/
  noncomputable def hv (P : SigProblem Label B) (θ : Assign Label B)
      (ν : Val Label B) (κ : Option Label) : CG Label B → G Label B
    | .base (.inl b) => .base b
    | .base (.inr c) => ν c κ
    | .arrow a b => .arrow (hv P θ ν κ a) (hv P θ ν κ b)
    | .record f => .record fun k =>
      if k ∈ written P then hvO P θ ν κ (f (.inl k))
      else if cellOf P θ k = [] then none
      else hvO P θ ν (some k) (f (.inr (cellOf P θ k)))

  noncomputable def hvO (P : SigProblem Label B) (θ : Assign Label B)
      (ν : Val Label B) (κ : Option Label) :
      Option (CG Label B) → Option (G Label B)
    | none => none
    | some g => some (hv P θ ν κ g)
end

/-- `hv` on rows. -/
noncomputable def hvRow (P : SigProblem Label B) (θ : Assign Label B)
    (ν : Val Label B) (κ : Option Label)
    (f : Row (CL Label) (CG Label B)) : Row Label (G Label B) :=
  fun k => if k ∈ written P then hvO P θ ν κ (f (.inl k))
    else if cellOf P θ k = [] then none
    else hvO P θ ν (some k) (f (.inr (cellOf P θ k)))

/-- `hv` on assignments, at the top (no context). -/
noncomputable def hvAssign (P : SigProblem Label B) (θ : Assign Label B)
    (ν : Val Label B) (σ : CAssign Label B) : Assign Label B :=
  ⟨fun n => hv P θ ν none (σ.ty n), fun r => hvRow P θ ν none (σ.row r)⟩

/-- `θ`'s rigid values are finite. -/
def RigidFin (P : SigProblem Label B) (θ : Assign Label B) : Prop :=
  (∀ n ∈ P.rigidTy, FinG (θ.ty n)) ∧
    ∀ r ∈ P.rigidRow, FinG (.record (θ.row r))

def RigidFinC (P : SigProblem Label B) (θ : CAssign Label B) : Prop :=
  (∀ n ∈ P.rigidTy, FinG (θ.ty n)) ∧
    ∀ r ∈ P.rigidRow, FinG (.record (θ.row r))

/-- `θs` covers `θR`: some valuation maps every rigid value of `θs` to
`θR`'s, and takes finite values when `θR`'s rigid values are finite. -/
def Covers (P : SigProblem Label B) (θs : CAssign Label B)
    (θR : Assign Label B) : Prop :=
  ∃ ν : Val Label B, (RigidFin P θR → ∀ c κ, FinG (ν c κ)) ∧
    (∀ n ∈ P.rigidTy, hv P θR ν none (θs.ty n) = θR.ty n) ∧
    ∀ r ∈ P.rigidRow, hvRow P θR ν none (θs.row r) = θR.row r

/-! ### Patterns, validity per pattern, generic instances -/

/-- `θ` has written-label pattern `π`. -/
def InPattern (P : SigProblem Label B) (π : Pattern Label)
    (θ : Assign Label B) : Prop :=
  ∀ r ∈ P.rigidRow, ∀ l ∈ written P, (θ.row r l).isSome = π r l

/-- Some rigid assignment of pattern `π` satisfies `D`. -/
def HasInstance (P : SigProblem Label B) (π : Pattern Label) : Prop :=
  ∃ θR, Sat θR P.D ∧ InPattern P π θR

/-- The signature holds for the instances of pattern `π`. -/
def ValidIn (P : SigProblem Label B) (π : Pattern Label) : Prop :=
  ∀ θR, Sat θR P.D → InPattern P π θR →
    ∃ θF, Sat (combine P θR θF) P.B

/-- The same over finite values (`ValidFin`, per pattern). -/
def ValidFinIn (P : SigProblem Label B) (π : Pattern Label) : Prop :=
  ∀ θR, RigidFin P θR → Sat θR P.D → InPattern P π θR →
    ∃ θF, FinAssign θF ∧ Sat (combine P θR θF) P.B

/-- The body has a solution at the generic rigid assignment `θs`. -/
def SolvableAt (P : SigProblem Label B) (θs : CAssign Label B) : Prop :=
  ∃ σ, Sat (combine (cliftP P) θs σ) (cliftP P).B

def SolvableFinAt (P : SigProblem Label B) (θs : CAssign Label B) :
    Prop :=
  ∃ σ, FinAssign σ ∧ Sat (combine (cliftP P) θs σ) (cliftP P).B

/-- `θs` is a generic instance for pattern `π`: finite, satisfies `D`,
has pattern `π`, and covers every instance of `π` satisfying `D`. -/
def GenericInst (P : SigProblem Label B) (π : Pattern Label)
    (θs : CAssign Label B) : Prop :=
  RigidFinC P θs ∧ Sat θs (cliftP P).D ∧
    (∀ r ∈ P.rigidRow, ∀ l ∈ written P,
      (θs.row r (.inl l)).isSome = π r l) ∧
    ∀ θR, Sat θR P.D → InPattern P π θR → Covers P θs θR

/-! ### Fresh labels and bases, for the converse -/

mutual
  def basesT : TExpr Label B → List B
    | .base b => [b]
    | .arrow t u => basesT t ++ basesT u
    | .tvar _ => []
    | .record fs _ => basesF fs

  def basesF : Fields Label B → List B
    | .nil => []
    | .cons _ t rest => basesT t ++ basesF rest
end

/-- The base types written in `P`. -/
def basesOf (P : SigProblem Label B) : List B :=
  (P.D ++ P.B).flatMap fun
    | .eq t u => basesT t ++ basesT u
    | _ => []

mutual
  /-- A generic value uses only written labels, cells, written bases and
  constants, at every depth. -/
  def WithinG (P : SigProblem Label B) : CG Label B → Prop
    | .base (.inl b) => b ∈ basesOf P
    | .base (.inr _) => True
    | .arrow a c => WithinG P a ∧ WithinG P c
    | .record f => (∀ k, f (.inl k) ≠ none → k ∈ written P) ∧
        ∀ k, WithinO P (f k)

  def WithinO (P : SigProblem Label B) : Option (CG Label B) → Prop
    | none => True
    | some g => WithinG P g
end

def WithinC (P : SigProblem Label B) (θs : CAssign Label B) : Prop :=
  (∀ n ∈ P.rigidTy, WithinG P (θs.ty n)) ∧
    ∀ r ∈ P.rigidRow, WithinG P (.record (θs.row r))

/-- Fresh labels for the cells and fresh bases for the constants. -/
def Fresh (P : SigProblem Label B) (z : Cell → Label)
    (e : CConst Label → B) : Prop :=
  (∀ S S', z S = z S' → S = S') ∧ (∀ S, z S ∉ written P) ∧
    (∀ c c', e c = e c' → c = c') ∧ ∀ c, e c ∉ basesOf P

end Composition.Typed
