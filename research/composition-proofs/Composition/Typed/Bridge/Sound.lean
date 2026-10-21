/-
The P-1 bridge, statements only: soundness under option B (B4f, B4,
B5) and the equivariance statements BS-c1 and BS-c2.
-/
import Composition.Typed.Bridge.Valid
import Composition.Typed.Defs

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B B' : Type} [DecidableEq Label]

/-! ### B4, B5: soundness for option B (for a decision procedure) -/

/-- B4f. A generic instance over `B` covers every finite instance over
any injective extension. -/
def GenericInstExtFin : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (B₁ : Type) (j : B → B₁), Function.Injective j →
    GenericInst P π θs → ∀ θR : Assign Label B₁,
      RigidFin (P.mapBase j) θR → Sat θR (P.mapBase j).D →
      InPattern (P.mapBase j) π θR → Covers (P.mapBase j) (mapC j θs) θR

/-- B4. The same for every instance, finite or not: a generic instance
stays generic over any injective extension. Stronger than B5 needs. -/
def GenericInstExt : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (θs : CAssign Label B)
    (B₁ : Type) (j : B → B₁), Function.Injective j →
    GenericInst P π θs → GenericInst (P.mapBase j) π (mapC j θs)

/-- B5. Solved generic instances for every pattern give option-B
validity. -/
def D3bSoundOpen : Prop :=
  ∀ P : SigProblem Label B,
    (∀ π, HasInstance P π → ∃ θs, GenericInst P π θs ∧ SolvableFinAt P θs) →
    ValidOpen P

/-! ### Equivariance: checking is stable under extension -/

/-- BS-c1. Solvability at a generic instance survives renaming. -/
def SolvableMapBase : Prop :=
  ∀ (P : SigProblem Label B) (θs : CAssign Label B) (B₁ : Type)
    (j : B → B₁), Function.Injective j →
    (SolvableFinAt P θs ↔ SolvableFinAt (P.mapBase j) (mapC j θs))

/-- BS-c2. The explicit equation-free instance commutes with renaming.
(`thetaFlat` and `thetaStar` are not stated: `thetaFlat` is semantic
over instances at `B`.) -/
def ThetaFreeMapBase : Prop :=
  ∀ (P : SigProblem Label B) (π : Pattern Label) (B₁ : Type)
    (j : B → B₁),
    thetaFree (P.mapBase j) π = mapC j (thetaFree P π)

end Composition.Typed
