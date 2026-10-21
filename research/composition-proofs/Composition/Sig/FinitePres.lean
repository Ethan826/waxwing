/-
`h` preserves finiteness (dossier §14.8): if `θ`'s rigid values and the
choice `c` are finite, `h` maps every finite generic value to a finite
ground value. A row's image holds only written labels and labels of
rigid rows' rests, finitely many of each.
-/
import Composition.Sig.Commute

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {θ : Assign Label B} {c : G Label B}

omit [DecidableEq Label] in
/-- One list covers the labels of finitely many finite rows. -/
theorem finRow_cover {V : Type} (rows : Nat → Row Label V) :
    ∀ rs : List Nat, (∀ r ∈ rs, FinRow (rows r)) →
      ∃ ls : List Label, ∀ r ∈ rs, ∀ k, rows r k ≠ none → k ∈ ls
  | [], _ => ⟨[], fun _ h => by simp at h⟩
  | r :: rs, h => by
    obtain ⟨a, ha⟩ := h r (List.mem_cons.mpr (Or.inl rfl))
    obtain ⟨b, hb⟩ := finRow_cover rows rs
      (fun s hs => h s (List.mem_cons_of_mem _ hs))
    refine ⟨a ++ b, fun s hs k hk => ?_⟩
    rcases List.mem_cons.mp hs with rfl | hs
    · exact List.mem_append_left _ (ha k hk)
    · exact List.mem_append_right _ (hb s hs k hk)

mutual
  theorem interp_fin (hty : ∀ n ∈ P.rigidTy, FinG (θ.ty n))
      (hrow : ∀ r ∈ P.rigidRow, FinG (.record (θ.row r))) (hc : FinG c) :
      ∀ g : GG Label B, FinG g → FinG (interp P θ c g)
    | .base (.inl _), _ => by simp [interp, FinG]
    | .base (.inr (.A r l)), _ => by
      simp only [interp]
      split
      · next hr =>
        cases h : θ.row r l with
        | none => exact hc
        | some v =>
          have := ((finG_record _).mp (hrow r hr)).2 l
          rw [h] at this
          exact this
      · exact hc
    | .base (.inr (.R _)), _ => hc
    | .base (.inr (.T n)), _ => by
      simp only [interp]
      split
      · next hn => exact hty n hn
      · exact hc
    | .arrow a b, h => by
      simp only [FinG] at h
      simp only [interp, FinG]
      exact ⟨interp_fin hty hrow hc a h.1, interp_fin hty hrow hc b h.2⟩
    | .record f, h => by
      rw [interp_record, finG_record]
      have hf := (finG_record f).mp h
      obtain ⟨ls, hls⟩ := finRow_cover θ.row P.rigidRow
        (fun r hr => ((finG_record _).mp (hrow r hr)).1)
      refine ⟨⟨written P ++ ls, fun k hk => ?_⟩, fun k => ?_⟩
      · by_cases hw : k ∈ written P
        · exact List.mem_append_left _ hw
        · simp only [hRow, hw, ↓reduceIte] at hk
          obtain ⟨r, hr⟩ := restAt_wit hk
          exact List.mem_append_right _ (hls r hr.1 k hr.2.2)
      · by_cases hw : k ∈ written P
        · simp only [hRow, hw, ↓reduceIte]
          exact interpO_fin hty hrow hc (f (.inl k)) (hf.2 (.inl k))
        · simp only [hRow, hw, ↓reduceIte]
          unfold restAt
          split
          · next hx =>
            exact ((finG_record _).mp
              (hrow _ (Classical.choose_spec hx).1)).2 k
          · simp [FinO]

  theorem interpO_fin (hty : ∀ n ∈ P.rigidTy, FinG (θ.ty n))
      (hrow : ∀ r ∈ P.rigidRow, FinG (.record (θ.row r))) (hc : FinG c) :
      ∀ o : Option (GG Label B), FinO o → FinO (interpO P θ c o)
    | none, _ => by simp [interpO, FinO]
    | some g, h => by
      simp only [FinO] at h
      simp only [interpO, FinO]
      exact interp_fin hty hrow hc g h
end

end Composition.Syntax
