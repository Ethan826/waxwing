/-
Proof stream W2 (wave 2, dossier §18.57): exactness over the region of
the written-label queries, QR1 `PossWExact` and QR2 `PossBothExact`, and
QR5 `RegionTrivialities`. Plan:
research/division-campaign/cellcheck/proof-plan.md, "Wave 2".
Soundness is wave 1's `possW_sound`/`possBoth_sound`. For the converse,
the pattern in which exactly the holders `rs` hold `l` has an instance
when `holdersOK P l rs` (on the fragment), and `thetaFree` of that
pattern is in the region (`coverFree`). QR5 uses the empty pattern,
which always has an instance on the fragment.
-/
import Composition.Typed.Cell.Exact
import Composition.Typed.Cell.Proofs.C
import Composition.Typed.Cell.Proofs.D

namespace Composition.Typed.Cells.ProofsW2

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

/-- The pattern in which exactly the rows `rs` hold `l`. -/
def holderPat (rs : List Nat) (l : Label) : Pattern Label :=
  fun r k => decide (r ∈ rs ∧ k = l)

/-- An instance of `holderPat rs l`. -/
def holderAssign (rs : List Nat) (l : Label) : Assign Label B :=
  ⟨fun _ => emptyG, fun r k => if r ∈ rs ∧ k = l then some emptyG else none⟩

/-- On the fragment, `holdersOK` gives the holder pattern an instance. -/
theorem holder_hasInstance {P : SigProblem Label B} (hF : LDFragment P)
    {l : Label} {rs : List Nat} (h : holdersOK P l rs = true) :
    HasInstance P (holderPat rs l) := by
  refine ⟨holderAssign rs l, fun a ha => ?_, fun r _ k _ => ?_⟩
  · have hh := List.all_eq_true.mp h a ha
    rcases hF a ha with ⟨x, k, rfl, _⟩ | ⟨x, y, rfl, _, _⟩
    · simp only [Bool.not_eq_true', Bool.and_eq_false_iff,
        decide_eq_false_iff_not] at hh
      show (if x ∈ rs ∧ k = l then some emptyG else none) = none
      refine ite_eq_right fun ⟨hx, hk⟩ => ?_
      rcases hh with hh | hh
      · exact hh hk
      · exact hh hx
    · simp only [Bool.not_eq_true', Bool.and_eq_false_iff,
        decide_eq_false_iff_not] at hh
      intro j
      show (if x ∈ rs ∧ j = l then some emptyG else none) = none ∨
        (if y ∈ rs ∧ j = l then some emptyG else none) = none
      rcases hh with hh | hh
      · exact Or.inl (ite_eq_right fun h' => hh h'.1)
      · exact Or.inr (ite_eq_right fun h' => hh h'.1)
  · simp only [holderAssign, holderPat]
    by_cases hc : r ∈ rs ∧ k = l <;> simp [hc]

/-- On the fragment, the empty pattern has an instance: every row empty. -/
theorem empty_hasInstance {P : SigProblem Label B} (hF : LDFragment P) :
    HasInstance P (fun _ _ => false) := by
  refine ⟨⟨fun _ => emptyG, fun _ => Row.empty⟩, fun a ha => ?_,
    fun _ _ _ _ => rfl⟩
  rcases hF a ha with ⟨x, k, rfl, _⟩ | ⟨x, y, rfl, _, _⟩
  · rfl
  · exact fun _ => Or.inl rfl

theorem thetaFree_inl (P : SigProblem Label B) (π : Pattern Label)
    (r : Nat) (l : Label) :
    (thetaFree P π).row r (.inl l) =
      if l ∈ written P ∧ π r l = true then
        some (.base (.inr (.A r l))) else none := rfl

/-- On the fragment, `thetaFree` of a pattern with an instance is in the
region. -/
theorem thetaFree_region [DecidableEq B] {P : SigProblem Label B}
    (hF : LDFragment P) {π : Pattern Label} (hI : HasInstance P π) :
    InCellRegion P (thetaFree P π) := by
  obtain ⟨hG, hW, hC⟩ := coverFree P π hF hI
  exact ⟨π, hI, hG, hW, hC⟩

theorem holder_holds {P : SigProblem Label B} {l : Label}
    {rs : List Nat} (hl : l ∈ written P) {r : Nat} (hr : r ∈ rs) :
    (thetaFree P (holderPat rs l)).row r (.inl l) ≠ none := by
  rw [thetaFree_inl]
  simp [holderPat, hl, hr]

theorem empty_lacks (P : SigProblem Label B) (r : Nat) (l : Label) :
    (thetaFree P (fun _ _ => false)).row r (.inl l) = none := by
  rw [thetaFree_inl]
  simp

end Composition.Typed.Cells.ProofsW2

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

/-- QR1. -/
theorem possWExact : PossWExact (Label := Label) (B := B) := by
  intro P r l hF hr
  constructor
  · intro h
    simp only [implQ, Bool.and_eq_true, decide_eq_true_eq] at h
    exact ⟨_, ProofsW2.thetaFree_region hF (ProofsW2.holder_hasInstance hF h.2),
      ProofsW2.holder_holds h.1 List.mem_cons_self⟩
  · rintro ⟨θs, hreg, hne⟩
    obtain ⟨π, _, hG, hW, _⟩ := hreg
    refine Classical.byContradiction fun hf => hne ?_
    exact ProofsC.possW_sound hW hG.2.1 hr (Bool.not_eq_true _ ▸ hf)

/-- QR2. -/
theorem possBothExact : PossBothExact (Label := Label) (B := B) := by
  intro P r s l hF hr _
  constructor
  · intro h
    simp only [implQ, Bool.and_eq_true, decide_eq_true_eq] at h
    exact ⟨_, ProofsW2.thetaFree_region hF (ProofsW2.holder_hasInstance hF h.2),
      ProofsW2.holder_holds h.1 (by simp),
      ProofsW2.holder_holds h.1 (by simp)⟩
  · rintro ⟨θs, hreg, hr', hs'⟩
    obtain ⟨π, _, hG, hW, _⟩ := hreg
    refine Classical.byContradiction fun hf => ?_
    rcases ProofsC.possBoth_sound hW hG.2.1 hr (Bool.not_eq_true _ ▸ hf)
      with h | h
    · exact hr' h
    · exact hs' h

/-- QR5. -/
theorem regionTrivialities : RegionTrivialities (Label := Label) (B := B) := by
  intro P hF
  have hreg := ProofsW2.thetaFree_region hF (ProofsW2.empty_hasInstance (B := B) hF)
  exact ⟨⟨_, hreg⟩, fun r _ l => ⟨_, hreg, ProofsW2.empty_lacks P r l⟩⟩

end Composition.Typed.Cells
