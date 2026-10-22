/-
Proof stream W7 (proof-plan.md, wave 2): the two regression guards
against dropping `CellShape` (Cell/Refutations.lean), and the controls
`ScShapeSplit`, `ScSplitFree`, `ScOutsideFragment`, `ScDivide5`. Each
"refused by every certificate" conjunct follows from `¬ ValidOpen` and
`cellOpenImpl`, or from the fragment guard; `divide5`'s refusal is
direct (Proofs/W7/Divide5.lean).
-/
import Composition.Typed.Cell.Proofs.W7.Refute
import Composition.Typed.Cell.Proofs.W7.Controls
import Composition.Typed.Cell.Proofs.W7.Divide5

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- Dropping `CellShape` from CM is unsound: `route`'s accepted
certificate fails at `routeJunk`. -/
theorem not_cellSoundNoShape : ¬ CellSoundNoShape (Label := Label) (B := B) := by
  intro h
  obtain ⟨π, hπ⟩ := routeP_hasInstance Label B
  obtain ⟨hg, hw, -, hns⟩ := cellShapeNeeded Label B π hπ
  exact hns (h routeP (implQ routeP) routeCert (implSound routeP)
    (scRoute Label B).2.2.2 π _ hπ hg hw)

/-- Dropping `CellShape` from CD3 is unsound: `{...4, ...6}` on `route`
evaluates symbolically but is undefined at `routeJunk`. -/
theorem not_evalDefinedNoShape :
    ¬ EvalDefinedNoShape (Label := Label) (B := B) := by
  intro h
  obtain ⟨π, hπ⟩ := routeP_hasInstance Label B
  obtain ⟨hg, hw, -, -⟩ := cellShapeNeeded Label B π hπ
  obtain ⟨v, hv⟩ := ProofsW7.route_eval46 (Label := Label) (B := B)
  have := h routeP (implQ routeP) routeCert (implSound routeP)
    (cellCheck_certOk _ _ _ (scRoute Label B).2.2.2) (routeJunk π)
    ⟨π, hπ, hg, hw⟩ _ v hv
  rw [ProofsW7.junk_eval46] at this
  exact Bool.false_ne_true this

/-- `ScShapeSplit`. -/
theorem scShapeSplit : ScShapeSplit :=
  ⟨shapeSplitSeparates.2, ProofsW7.checkI_false_of_not_open shapeSplitSeparates.2⟩

omit [DecidableEq Label] [DecidableEq B] in
/-- `ScSplitFree`. -/
theorem scSplitFree (B : Type) [DecidableEq B] : ScSplitFree B := by
  have hn : ¬ ValidOpen (splitFree : SigProblem Nat B) := fun h =>
    ProofsW7.splitFree_not_validFin (openToFin _ h)
  exact ⟨rfl, hn, ProofsW7.checkI_false_of_not_open hn⟩

omit [DecidableEq Label] [DecidableEq B] in
/-- `ScOutsideFragment`. -/
theorem scOutsideFragment (Label B : Type) [DecidableEq Label]
    [DecidableEq B] : ScOutsideFragment Label B :=
  ⟨agreeOpen, ProofsW7.checkI_false_of_fragment rfl, ProofsW7.ff_open,
    ProofsW7.checkI_false_of_fragment rfl⟩

omit [DecidableEq Label] [DecidableEq B] in
/-- `ScDivide5`: `divide5` is valid and no cell certificate passes. -/
theorem scDivide5 (Label B : Type) [DecidableEq Label] [DecidableEq B] :
    ScDivide5 Label B := fun as has =>
  ⟨ProofsW7.d5_open as, ProofsW7.d5_refused as has⟩

end Composition.Typed.Cells
