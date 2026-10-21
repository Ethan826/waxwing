/-
The P-1 bridge (dossier §18.31-18.33), statements only: extensions.
An extension renames bases only (`mapBase`, `mapG`, `mapAssign`,
`mapC`); `substBase` replaces bases by values. E1-E6 are the
building blocks. Every claim is a `Prop` definition; none is proved.
Prose and review: research/division-campaign/bridge/statements.md.
-/
import Composition.Typed.Model

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B' : Type} [DecidableEq Label]

/-! ### Extensions: renaming bases -/

mutual
  /-- Rename the bases written in an expression. -/
  def mapBaseT (f : B → B') : TExpr Label B → TExpr Label B'
    | .base b => .base (f b)
    | .arrow t u => .arrow (mapBaseT f t) (mapBaseT f u)
    | .tvar n => .tvar n
    | .record fs tails => .record (mapBaseF f fs) tails

  def mapBaseF (f : B → B') : Fields Label B → Fields Label B'
    | .nil => .nil
    | .cons l t rest => .cons l (mapBaseT f t) (mapBaseF f rest)
end

def mapBaseAtom (f : B → B') : Atom Label B → Atom Label B'
  | .eq t u => .eq (mapBaseT f t) (mapBaseT f u)
  | .lacks r l => .lacks r l
  | .disjoint r s => .disjoint r s
  | .ff => .ff

/-- The same signature problem with its written bases renamed along
`f`: same rigid lists, labels, variables and atom shapes. -/
def _root_.Composition.Syntax.SigProblem.mapBase (f : B → B')
    (P : SigProblem Label B) : SigProblem Label B' :=
  ⟨P.rigidTy, P.rigidRow, P.D.map (mapBaseAtom f), P.B.map (mapBaseAtom f)⟩

mutual
  /-- Rename the bases of a ground value, at every depth. -/
  def mapG (f : B → B') : G Label B → G Label B'
    | .base b => .base (f b)
    | .arrow a c => .arrow (mapG f a) (mapG f c)
    | .record r => .record fun k => mapGO f (r k)

  def mapGO (f : B → B') : Option (G Label B) → Option (G Label B')
    | none => none
    | some g => some (mapG f g)
end

def mapAssign (f : B → B') (θ : Assign Label B) : Assign Label B' :=
  ⟨fun n => mapG f (θ.ty n), fun r k => mapGO f (θ.row r k)⟩

/-- A generic assignment carried along `j`: problem bases renamed,
constants and cell labels kept. -/
def mapC (j : B → B') (θ : CAssign Label B) : CAssign Label B' :=
  mapAssign (Sum.map j id) θ

/-! ### Supports -/

mutual
  /-- Every base in the value satisfies `s`, at every depth. -/
  def BasesWithin (s : B → Prop) : G Label B → Prop
    | .base b => s b
    | .arrow a c => BasesWithin s a ∧ BasesWithin s c
    | .record f => ∀ k, BasesWithinO s (f k)

  def BasesWithinO (s : B → Prop) : Option (G Label B) → Prop
    | none => True
    | some g => BasesWithin s g
end

/-! ### Building blocks (proposed, unproved) -/

/-- E1. The identity extension changes nothing. -/
def MapBaseId : Prop :=
  ∀ P : SigProblem Label B, P.mapBase id = P

/-- E2. Positivity: renaming bases by any function preserves
satisfaction. -/
def SatMapBase : Prop :=
  ∀ (B₁ : Type) (f : B → B₁) (θ : Assign Label B) (C : Problem Label B),
    Sat θ C → Sat (mapAssign f θ) (C.map (mapBaseAtom f))

/-- E3. A finite value uses finitely many bases. -/
def FinSupport : Prop :=
  ∀ g : G Label B, FinG g → ∃ bs : List B, BasesWithin (· ∈ bs) g

mutual
  /-- Replace each base by a value, at every depth. -/
  def substBase (s : B → G Label B') : G Label B → G Label B'
    | .base b => s b
    | .arrow a c => .arrow (substBase s a) (substBase s c)
    | .record r => .record fun k => substBaseO s (r k)

  def substBaseO (s : B → G Label B') :
      Option (G Label B) → Option (G Label B')
    | none => none
    | some g => some (substBase s g)
end

def substAssign (s : B → G Label B') (θ : Assign Label B) :
    Assign Label B' :=
  ⟨fun n => substBase s (θ.ty n), fun r k => substBaseO s (θ.row r k)⟩

/-- E2′. Positivity for value substitutions: for `P`'s atoms renamed
along `g`, replacing bases by values preserves satisfaction, provided
every written base's image `g b` becomes the base `h b`. Both maps start
at `P`'s bases, so no map back into a possibly empty type is needed:
`g = j`, `h = id` maps an extension back to `B` (B4f, B5); `g = id` is
the one-map form (second review, §10). -/
def SatSubstBase : Prop :=
  ∀ (P : SigProblem Label B) (B₁ B₂ : Type) (g : B → B₁) (h : B → B₂)
    (s : B₁ → G Label B₂) (θ : Assign Label B₁) (C : Problem Label B),
    (∀ b ∈ basesOf P, s (g b) = .base (h b)) →
    (∀ a ∈ C, a ∈ P.D ++ P.B) →
    Sat θ (C.map (mapBaseAtom g)) →
      Sat (substAssign s θ) (C.map (mapBaseAtom h))

/-- E4. Renamings compose. -/
def MapBaseComp : Prop :=
  ∀ (P : SigProblem Label B) (B₁ B₂ : Type) (f : B → B₁) (g : B₁ → B₂),
    (P.mapBase f).mapBase g = P.mapBase (g ∘ f)

/-- E5. Renaming keeps the written labels, scope, and maps the written
bases. -/
def MapBaseSyntax : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (f : B → B₁),
    written (P.mapBase f) = written P ∧
    basesOf (P.mapBase f) = (basesOf P).map f ∧
    (Scoped (P.mapBase f) ↔ Scoped P)

/-- E6. Renaming commutes with reading the problem generically. -/
def MapBaseClift : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (f : B → B₁),
    cliftP (P.mapBase f) = (cliftP P).mapBase (Sum.map f id)

end Composition.Typed
