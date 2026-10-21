/-
The P-1 bridge, statements only: option B's validity. `ValidOpen` is
`ValidFin` at every injective extension of the bases; `ValidAtoms` is
the same at one fixed atom supply, `B ⊕ Nat`. B0, B1 and BS.
-/
import Composition.Typed.Bridge.Extension

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B' : Type} [DecidableEq Label]

/-! ### Option B's validity -/

/-- Valid at every injective extension of the bases (option B). -/
def ValidOpen (P : SigProblem Label B) : Prop :=
  ∀ (B₁ : Type) (i : B → B₁), Function.Injective i →
    ValidFin (P.mapBase i)

/-- Valid at one fixed supply of atoms. -/
def ValidAtoms (P : SigProblem Label B) : Prop :=
  ValidFin (P.mapBase (Sum.inl : B → B ⊕ Nat))

/-! ### B0, B1: the two definitions of option B -/

/-- B0 (memo C1). Option B's validity implies closed validity. -/
def OpenToFin : Prop :=
  ∀ P : SigProblem Label B, ValidOpen P → ValidFin P

/-- B1a. -/
def OpenToAtoms : Prop :=
  ∀ P : SigProblem Label B, ValidOpen P → ValidAtoms P

/-- B1b. -/
def AtomsToOpen : Prop :=
  ∀ P : SigProblem Label B, ValidAtoms P → ValidOpen P

/-- B1 (memo C3). -/
def AtomsIffOpen : Prop :=
  ∀ P : SigProblem Label B, ValidAtoms P ↔ ValidOpen P

/-- BS. Stability under unrelated additions: an injective extension
neither gains nor loses option-B validity. -/
def OpenExtensionStable : Prop :=
  ∀ (P : SigProblem Label B) (B₁ : Type) (j : B → B₁),
    Function.Injective j → (ValidOpen P ↔ ValidOpen (P.mapBase j))

end Composition.Typed
