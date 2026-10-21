/-
Substitution of constants in the generic model (for `MGUExists`,
`CellIndependence` and `Universality`): occurrence, composition,
congruence, finiteness, and the occurs check. Constants `CConst` play
the part of Robinson's variables; see construction.md §6.1 for the
correspondence with the published term language and what differs.
-/
import Composition.Typed.Defs

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type}

/-- A constant as a generic value: Robinson's variable. -/
abbrev cv (c : CConst Label) : CG Label B := .base (.inr c)

mutual
  /-- Constant `c` occurs in a generic value, at any depth. -/
  def Occ (c : CConst Label) : CG Label B → Prop
    | .base (.inl _) => False
    | .base (.inr d) => d = c
    | .arrow a b => Occ c a ∨ Occ c b
    | .record f => ∃ j, OccO c (f j)

  def OccO (c : CConst Label) : Option (CG Label B) → Prop
    | none => False
    | some g => Occ c g
end

theorem substG_record (τ : CSubst Label B) (f : Row (CL Label) (CG Label B)) :
    substG τ (.record f) = .record fun k => substO τ (f k) := by
  simp only [substG]

theorem substO_none_iff {τ : CSubst Label B} {o : Option (CG Label B)} :
    substO τ o = none ↔ o = none := by
  cases o <;> simp [substO]

mutual
  theorem substG_comp (τ₁ τ₂ : CSubst Label B) : ∀ g : CG Label B,
      substG τ₁ (substG τ₂ g) = substG (fun c => substG τ₁ (τ₂ c)) g
    | .base (.inl _) => rfl
    | .base (.inr _) => rfl
    | .arrow a b => by
      simp only [substG, substG_comp τ₁ τ₂ a, substG_comp τ₁ τ₂ b]
    | .record f => by
      simp only [substG_record]
      congr 1
      funext k
      exact substO_comp τ₁ τ₂ (f k)

  theorem substO_comp (τ₁ τ₂ : CSubst Label B) : ∀ o : Option (CG Label B),
      substO τ₁ (substO τ₂ o) = substO (fun c => substG τ₁ (τ₂ c)) o
    | none => rfl
    | some g => by simp only [substO, substG_comp τ₁ τ₂ g]
end

mutual
  theorem substG_congr {τ₁ τ₂ : CSubst Label B} : ∀ g : CG Label B,
      (∀ c, Occ c g → τ₁ c = τ₂ c) → substG τ₁ g = substG τ₂ g
    | .base (.inl _), _ => rfl
    | .base (.inr c), h => h c (by simp [Occ])
    | .arrow a b, h => by
      simp only [substG]
      rw [substG_congr a fun c hc => h c (Or.inl hc),
        substG_congr b fun c hc => h c (Or.inr hc)]
    | .record f, h => by
      simp only [substG_record]
      congr 1
      funext k
      exact substO_congr (f k) fun c hc => h c ⟨k, hc⟩

  theorem substO_congr {τ₁ τ₂ : CSubst Label B} : ∀ o : Option (CG Label B),
      (∀ c, OccO c o → τ₁ c = τ₂ c) → substO τ₁ o = substO τ₂ o
    | none, _ => rfl
    | some g, h => by simp only [substO, substG_congr g h]
end

mutual
  theorem substG_id : ∀ g : CG Label B, substG cv g = g
    | .base (.inl _) => rfl
    | .base (.inr _) => rfl
    | .arrow a b => by simp only [substG, substG_id a, substG_id b]
    | .record f => by
      simp only [substG_record]
      congr 1
      funext k
      exact substO_id (f k)

  theorem substO_id : ∀ o : Option (CG Label B), substO cv o = o
    | none => rfl
    | some g => by simp only [substO, substG_id g]
end

mutual
  theorem occ_substG {τ : CSubst Label B} {c : CConst Label} :
      ∀ g : CG Label B, Occ c (substG τ g) → ∃ d, Occ d g ∧ Occ c (τ d)
    | .base (.inl _), h => by simp [substG, Occ] at h
    | .base (.inr d), h => ⟨d, by simp [Occ], h⟩
    | .arrow a b, h => by
      simp only [substG, Occ] at h
      rcases h with h | h
      · obtain ⟨d, h1, h2⟩ := occ_substG a h
        exact ⟨d, Or.inl h1, h2⟩
      · obtain ⟨d, h1, h2⟩ := occ_substG b h
        exact ⟨d, Or.inr h1, h2⟩
    | .record f, h => by
      rw [substG_record] at h
      obtain ⟨k, hk⟩ := h
      obtain ⟨d, h1, h2⟩ := occO_substO (f k) hk
      exact ⟨d, ⟨k, h1⟩, h2⟩

  theorem occO_substO {τ : CSubst Label B} {c : CConst Label} :
      ∀ o : Option (CG Label B), OccO c (substO τ o) →
        ∃ d, OccO d o ∧ Occ c (τ d)
    | none, h => by simp [substO, OccO] at h
    | some g, h => occ_substG g h
end

mutual
  /-- Substituting finite values into a finite value is finite. -/
  theorem fin_substG {τ : CSubst Label B} : ∀ g : CG Label B, FinG g →
      (∀ c, Occ c g → FinG (τ c)) → FinG (substG τ g)
    | .base (.inl _), _, _ => trivial
    | .base (.inr c), _, h => h c (by simp [Occ])
    | .arrow a b, hg, h => by
      simp only [FinG] at hg
      exact ⟨fin_substG a hg.1 fun c hc => h c (Or.inl hc),
        fin_substG b hg.2 fun c hc => h c (Or.inr hc)⟩
    | .record f, hg, h => by
      rw [substG_record, finG_record]
      have hf := (finG_record f).mp hg
      obtain ⟨ls, hls⟩ := hf.1
      refine ⟨⟨ls, fun k hk => hls k fun h0 => hk (by simp [h0, substO])⟩,
        fun k => ?_⟩
      exact finO_substO (f k) (hf.2 k) fun c hc => h c ⟨k, hc⟩

  theorem finO_substO {τ : CSubst Label B} : ∀ o : Option (CG Label B),
      FinO o → (∀ c, OccO c o → FinG (τ c)) → FinO (substO τ o)
    | none, _, _ => trivial
    | some g, hg, h => fin_substG g hg h
end

open Classical in
mutual
  /-- A finite value has finitely many constants. -/
  theorem fin_occ_cover : ∀ g : CG Label B, FinG g →
      ∃ L : List (CConst Label), ∀ c, Occ c g → c ∈ L
    | .base (.inl _), _ => ⟨[], fun _ h => by simp [Occ] at h⟩
    | .base (.inr d), _ => ⟨[d], fun c h => by simp [Occ] at h; simp [h]⟩
    | .arrow a b, hg => by
      simp only [FinG] at hg
      obtain ⟨La, ha⟩ := fin_occ_cover a hg.1
      obtain ⟨Lb, hb⟩ := fin_occ_cover b hg.2
      refine ⟨La ++ Lb, fun c h => ?_⟩
      rcases h with h | h
      · exact List.mem_append_left _ (ha c h)
      · exact List.mem_append_right _ (hb c h)
    | .record f, hg => by
      have hf := (finG_record f).mp hg
      obtain ⟨ls, hls⟩ := hf.1
      have hk : ∀ k, ∃ L : List (CConst Label), ∀ c, OccO c (f k) → c ∈ L :=
        fun k => finO_occ_cover (f k) (hf.2 k)
      refine ⟨ls.flatMap fun k => Classical.choose (hk k), fun c h => ?_⟩
      obtain ⟨k, hc⟩ := h
      have hne : f k ≠ none := fun h0 => by simp [h0, OccO] at hc
      exact List.mem_flatMap.mpr
        ⟨k, hls k hne, Classical.choose_spec (hk k) c hc⟩

  theorem finO_occ_cover : ∀ o : Option (CG Label B), FinO o →
      ∃ L : List (CConst Label), ∀ c, OccO c o → c ∈ L
    | none, _ => ⟨[], fun _ h => by simp [OccO] at h⟩
    | some g, h => fin_occ_cover g h
end

end Composition.Typed
