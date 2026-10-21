/-
Proof stream C, part 2 (region and queries): the proposed queries are
conservative on the cell region, CV2 `ImplSound` (`implSound`).
-/
import Composition.Typed.Cell.Proofs.C.Cover

/-! ### CV2: the proposed queries are conservative -/

namespace Composition.Typed.Cells.ProofsC

open Composition Composition.Syntax Composition.Typed Composition.Typed.Cells

variable {Label B : Type} [DecidableEq Label]

theorem holds_of_D {P : SigProblem Label B} {θs : CAssign Label B}
    (hD : Sat θs (cliftP P).D) {a : Atom Label B} (ha : a ∈ P.D) :
    Holds θs (cliftAtom a) :=
  hD _ (List.mem_map.mpr ⟨a, ha, rfl⟩)

omit [DecidableEq Label] in
theorem written_of_within {P : SigProblem Label B} {θs : CAssign Label B}
    (hW : WithinC P θs) {r : Nat} (hr : r ∈ P.rigidRow) {l : Label}
    (h : θs.row r (.inl l) ≠ none) : l ∈ written P := by
  have := hW.2 r hr
  simp only [WithinG] at this
  exact this.1 l h

/-- `holdersOK` refuses holders `rs` of `l` only when a declared atom,
true at `θs`, empties one of them at `l`. -/
theorem holders_sound {P : SigProblem Label B} {θs : CAssign Label B}
    (hD : Sat θs (cliftP P).D) {l : Label} {rs : List Nat}
    (h : holdersOK P l rs = false) :
    ∃ r ∈ rs, θs.row r (.inl l) = none := by
  simp only [holdersOK, List.all_eq_false] at h
  obtain ⟨a, ha, hf⟩ := h
  have hh := holds_of_D hD ha
  cases a with
  | lacks x k =>
    simp only [cliftAtom, Holds] at hh
    simp at hf
    obtain ⟨rfl, hx⟩ := hf
    exact ⟨x, hx, hh⟩
  | disjoint x y =>
    simp only [cliftAtom, Holds, Composition.Disjoint] at hh
    simp at hf
    obtain ⟨hx, hy⟩ := hf
    rcases hh (.inl l) with h | h
    · exact ⟨x, hx, h⟩
    · exact ⟨y, hy, h⟩
  | eq _ _ => simp at hf
  | ff => simp at hf

theorem possW_sound {P : SigProblem Label B} {θs : CAssign Label B}
    (hW : WithinC P θs) (hD : Sat θs (cliftP P).D) {r : Nat}
    (hr : r ∈ P.rigidRow) {l : Label}
    (h : (decide (l ∈ written P) && holdersOK P l [r]) = false) :
    θs.row r (.inl l) = none := by
  rcases Bool.and_eq_false_iff.mp h with h | h
  · refine Classical.byContradiction fun hne => ?_
    have := written_of_within hW hr hne
    simp_all
  · obtain ⟨x, hx, hn⟩ := holders_sound hD h
    simp only [List.mem_singleton] at hx
    subst hx; exact hn

theorem possBoth_sound {P : SigProblem Label B} {θs : CAssign Label B}
    (hW : WithinC P θs) (hD : Sat θs (cliftP P).D) {r s : Nat}
    (hr : r ∈ P.rigidRow) {l : Label}
    (h : (decide (l ∈ written P) && holdersOK P l [r, s]) = false) :
    θs.row r (.inl l) = none ∨ θs.row s (.inl l) = none := by
  rcases Bool.and_eq_false_iff.mp h with h | h
  · refine Or.inl (Classical.byContradiction fun hne => ?_)
    have := written_of_within hW hr hne
    simp_all
  · obtain ⟨x, hx, hn⟩ := holders_sound hD h
    simp only [List.mem_cons, List.not_mem_nil, or_false] at hx
    rcases hx with rfl | rfl
    · exact Or.inl hn
    · exact Or.inr hn

end Composition.Typed.Cells.ProofsC

namespace Composition.Typed.Cells

open Composition Composition.Syntax Composition.Typed

variable {Label B : Type} [DecidableEq Label]

/-- CV2. -/
theorem implSound : ImplSound (Label := Label) (B := B) := by
  intro P θs hreg r hr s hs
  obtain ⟨π, _, hG, hW, hC⟩ := hreg
  have hD := hG.2.1
  refine ⟨fun l h => ProofsC.possW_sound hW hD hr h,
    fun l h => ProofsC.possBoth_sound hW hD hr h, fun K S h hK => ?_,
    fun L R S h hS hL => ?_⟩
  · refine Classical.byContradiction fun hne => ?_
    simp only [not_or, ← ne_eq, Option.ne_none_iff_isSome] at hne
    obtain ⟨hcand, hfree, hrS⟩ := hC r hr S hne.1
    obtain ⟨_, _, hsS⟩ := hC s hs S hne.2
    have hsat : cubeSat S ((r, true) :: (s, true) :: K) = true :=
      ProofsC.cubeSat_cons.mpr ⟨by simp [hrS],
        ProofsC.cubeSat_cons.mpr ⟨by simp [hsS], hK⟩⟩
    have := ProofsC.cellPossS_complete P _ ⟨r, List.mem_cons_self⟩ hcand hfree hsat
    simp only [implQ] at h
    rw [this] at h; exact absurd h (by decide)
  · obtain ⟨hcand, hfree, hrS⟩ :=
      hC r hr S (Option.ne_none_iff_isSome.mp hS)
    exact coverS_sound P r L R hr h S hcand hfree hrS hL

end Composition.Typed.Cells
