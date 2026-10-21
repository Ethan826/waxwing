/-
Two regression guards against removing `CellShape` (dossier §18.57).
STATEMENTS ONLY (`def … : Prop`); the proofs are in
Cell/Proofs/Refutations.lean. Restated from the soundness review's
description (§18.56): its scratch Lean was deleted under its brief, so
these are the coordinator's statements of the same claims.
-/
import Composition.Typed.Cell.ScenariosMore

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- CM with the `CellShape` premise dropped (`QSound` unchanged; its
region keeps `CellShape`). Intended: false (`route`, `routeJunk`). -/
def CellSoundNoShape : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    QSound P Q → cellCheck P Q σ = true →
    ∀ π θs, HasInstance P π → GenericInst P π θs → WithinC P θs →
      CellSolves P θs σ

/-- CD3 with the region replaced by `HasInstance`, `GenericInst` and
`WithinC` (`QSound` unchanged). Intended: false (`{...4, ...6}` on
`route` at `routeJunk`). -/
def EvalDefinedNoShape : Prop :=
  ∀ (P : SigProblem Label B) (Q : CellQ Label) (σ : CellCert Label B),
    QSound P Q → certOkC P Q σ = true →
    ∀ θs, (∃ π, HasInstance P π ∧ GenericInst P π θs ∧ WithinC P θs) →
    ∀ t v, evalC P Q σ t = some v →
      (evalT (combine (cliftP P) θs (cinst P θs σ)) (cliftT t)).isSome

end Composition.Typed.Cells
