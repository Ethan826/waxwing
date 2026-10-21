/-
Presence over all allowed cells at once (for `CellIndependence`): if
`D`'s presence conditions hold at the pre-instance with no cell and at
each single-cell pre-instance of `C`, they hold at the pre-instance
over `C`. Every condition is label by label, and each label is either
written or one cell.
-/
import Composition.Typed.CellEval

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {C : List Cell} {Γ : CAssign Label B}

mutual
  theorem eval_none_proj (hC : ∀ r S, Γ.row r (.inr S) ≠ none → S ∈ C) :
      ∀ t : TExpr Label B, evalT Γ (cliftT t) = none →
        ∃ L ∈ Ls C, evalT (prAssign L Γ) (cliftT t) = none
    | .base _, h => by simp [cliftT, evalT] at h
    | .tvar _, h => by simp [cliftT, evalT] at h
    | .arrow t u, h => by
      simp only [cliftT, evalT] at h ⊢
      cases ht : evalT Γ (cliftT t) with
      | none =>
        obtain ⟨L, hL, h'⟩ := eval_none_proj hC t ht
        exact ⟨L, hL, by simp [h']⟩
      | some a =>
        cases hu : evalT Γ (cliftT u) with
        | none =>
          obtain ⟨L, hL, h'⟩ := eval_none_proj hC u hu
          exact ⟨L, hL, by simp [h']⟩
        | some c => simp [ht, hu] at h
    | .record fs tails, h => by
      simp only [cliftT] at h ⊢
      rw [evalT_record] at h
      cases hf : fieldRows Γ (cliftF fs) with
      | none =>
        obtain ⟨L, hL, h'⟩ := fieldRows_none_proj hC fs hf
        exact ⟨L, hL, by rw [evalT_record, h']; rfl⟩
      | some frs =>
        simp only [hf, Option.bind_some, Option.map_eq_none_iff] at h
        obtain ⟨L, hL, h'⟩ := composeAll_proj hC (fieldRows_inl fs hf) h
        refine ⟨L, hL, ?_⟩
        rw [evalT_record, pr_fieldRows L fs hf]
        have hmap : (frs.map (prRow L) ++ tails.map (prAssign L Γ).row) =
            (frs ++ tails.map Γ.row).map (prRow L) := by
          simp [prAssign, List.map_append, List.map_map, Function.comp_def]
        simp only [Option.bind_some, hmap, h', Option.map_none]

  theorem fieldRows_none_proj (hC : ∀ r S, Γ.row r (.inr S) ≠ none → S ∈ C) :
      ∀ fs : Fields Label B, fieldRows Γ (cliftF fs) = none →
        ∃ L ∈ Ls C, fieldRows (prAssign L Γ) (cliftF fs) = none
    | .nil, h => by simp [cliftF, fieldRows] at h
    | .cons l t rest, h => by
      simp only [cliftF, fieldRows] at h ⊢
      cases ht : evalT Γ (cliftT t) with
      | none =>
        obtain ⟨L, hL, h'⟩ := eval_none_proj hC t ht
        exact ⟨L, hL, by simp [h']⟩
      | some g =>
        cases hr : fieldRows Γ (cliftF rest) with
        | none =>
          obtain ⟨L, hL, h'⟩ := fieldRows_none_proj hC rest hr
          exact ⟨L, hL, by simp [h']⟩
        | some frs => simp [ht, hr] at h
end

variable {P : SigProblem Label B} {π : Pattern Label}

theorem eta_cells (r : Nat) (S : Cell)
    (h : (eta P π C).row r (.inr S) ≠ none) : S ∈ C := by
  simp only [eta, etaRow] at h
  split at h
  · next hs => exact hs.1
  · exact absurd rfl h

theorem ls_sub {L : List Cell} (h : L ∈ Ls C) : ∀ S ∈ L, S ∈ C := by
  rcases mem_Ls h with rfl | ⟨S, hS, rfl⟩
  · simp
  · simpa using hS

/-- Presence over `C` from presence with no cell and with each cell. -/
theorem defOk_cells (h0 : ∀ a ∈ P.D, DefOk (eta P π []) a)
    (h1 : ∀ S ∈ C, ∀ a ∈ P.D, DefOk (eta P π [S]) a) :
    ∀ a ∈ P.D, DefOk (eta P π C) a := by
  have hL : ∀ L ∈ Ls C, ∀ a ∈ P.D, DefOk (eta P π L) a := fun L hL =>
    match mem_Ls hL with
    | .inl h => h ▸ h0
    | .inr ⟨S, hS, h⟩ => h ▸ h1 S hS
  have hev : ∀ a ∈ P.D, ∀ t : TExpr Label B, (∀ L ∈ Ls C,
      (evalT (eta P π L) (cliftT t)).isSome) →
      (evalT (eta P π C) (cliftT t)).isSome := by
    intro _ _ t ht
    cases he : evalT (eta P π C) (cliftT t) with
    | some _ => rfl
    | none =>
      obtain ⟨L, hL', h'⟩ := eval_none_proj (eta_cells (P := P) (π := π)) t he
      have := ht L hL'
      rw [← eta_pr (ls_sub hL'), h'] at this
      cases this
  intro a ha
  cases a with
  | eq t u =>
    exact ⟨hev _ ha t fun L hl => (hL L hl _ ha).1,
      hev _ ha u fun L hl => (hL L hl _ ha).2⟩
  | lacks r l =>
    have := h0 _ ha
    simpa [DefOk, eta, etaRow] using this
  | ff => exact (h0 _ ha).elim
  | disjoint r s =>
    intro j
    cases j with
    | inl l =>
      have := (h0 _ ha : Composition.Disjoint _ _) (.inl l)
      simpa [eta, etaRow] using this
    | inr S =>
      by_cases hS : S ∈ C
      · have := (h1 S hS _ ha : Composition.Disjoint _ _) (.inr S)
        simpa [eta, etaRow, hS] using this
      · simp [eta, etaRow, hS]

end Composition.Typed
