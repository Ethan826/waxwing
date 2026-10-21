import Composition.Typed.Cell.Proofs.B.Wf

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

section AtomLevel
variable [DecidableEq B]

theorem cellCheck_certOk (P : SigProblem Label B) (Q : CellQ Label)
    (σ : CellCert Label B) : cellCheck P Q σ = true → certOkC P Q σ = true := by
  intro h
  simp only [cellCheck, Bool.and_eq_true] at h
  exact h.1.2

theorem bodyAll : BodyAll (Label := Label) (B := B) := by
  intro P Q σ h a ha
  simp only [cellCheck, Bool.and_eq_true, List.all_eq_true] at h
  exact h.2 a ha

theorem eqBothSides : EqBothSides (Label := Label) (B := B) := by
  intro P Q σ t u h
  simp only [atomC] at h
  split at h
  · rename_i a b ha hb
    simp [ha, hb]
  · simp at h

end AtomLevel

theorem dupRefused : DupRefused (Label := Label) (B := B) :=
  fun P Q σ fs r h => ProofsB.evalFC_nodup P Q σ fs r h

theorem evalWf : EvalWf (Label := Label) (B := B) :=
  fun P Q σ hc t v h => ProofsB.evalC_wf P Q σ hc t v h

end Composition.Typed.Cells
