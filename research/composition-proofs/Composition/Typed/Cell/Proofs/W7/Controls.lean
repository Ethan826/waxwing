/-
Stream W7: two control facts. `splitFree` is not closed-valid (every
rigid row holding one label; `splitFree_not_valid`'s argument over
finite values), and a problem with `D = [ff]` is vacuously valid.
-/
import Composition.Typed.Cell.Proofs.Main
import Composition.Typed.Bridge.ProofValid

namespace Composition.Typed.Cells.ProofsW7

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

theorem splitFree_not_validFin : ¬ ValidFin (splitFree : SigProblem Nat B) := by
  intro hv
  obtain ⟨θF, -, h⟩ := hv ⟨fun _ => emptyG, fun _ => oneField 0⟩
    (fun n hn => by simp [splitFree] at hn)
    (fun _ _ => TypedAttack.finG_single finG_emptyG)
    (by simp [Sat, splitFree])
  have hz : ∀ r ∈ [0, 1, 2], (combine splitFree
      ⟨fun _ => emptyG, fun _ => oneField (B := B) 0⟩ θF).row r 0 ≠ none :=
    fun r hr => by
      simp only [List.mem_cons, List.not_mem_nil, or_false] at hr
      rcases hr with rfl | rfl | rfl <;>
        simp [combine, splitFree, oneField, single]
  exact splitFree_core (hz 0 (by simp))
    (split_eq (h _ (by simp [splitFree])))
    (h (.disjoint 3 1) (by simp [splitFree]))
    (h (.disjoint 4 2) (by simp [splitFree])) (hz 1 (by simp)) (hz 2 (by simp))

theorem ff_open : ValidOpen (⟨[], [0], [.ff], []⟩ : SigProblem Label B) :=
  fun _ _ _ _ _ _ hD =>
    (hD .ff (by simp [SigProblem.mapBase, mapBaseAtom])).elim

/-- An invalid problem is refused by every certificate (CM-impl). -/
theorem checkI_false_of_not_open {L C : Type} [DecidableEq L] [DecidableEq C]
    {P : SigProblem L C} (h : ¬ ValidOpen P) (σ : CellCert L C) :
    checkI P σ = false :=
  Bool.eq_false_iff.mpr fun hc => h (cellOpenImpl P σ hc)

/-- Outside the fragment, the guard refuses every certificate. -/
theorem checkI_false_of_fragment {L C : Type} [DecidableEq L] [DecidableEq C]
    {P : SigProblem L C} (h : fragmentS P = false) (σ : CellCert L C) :
    checkI P σ = false := by
  simp [checkI, cellCheck, h]

end Composition.Typed.Cells.ProofsW7
