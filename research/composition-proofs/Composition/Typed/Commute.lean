/-
`hv` commutes with evaluation (the analogue of P9s's L3, scoped as in
§14.8 to expressions whose labels are written labels of the problem),
and preserves finiteness. Unlike P9s, no well-formedness premise is
needed: the generic model is the plain semantics, and `hv` maps every
defined composition to a defined one (Typed/Interp.lean).
-/
import Composition.Typed.Interp
import Composition.Sig.FinitePres

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {θ : Assign Label B} {ν : Val Label B}

mutual
  /-- L3 for `hv`. -/
  theorem hv_evalT :
      ∀ (t : TExpr Label B), (∀ l ∈ labelsT t, l ∈ written P) →
        ∀ {Γ : CAssign Label B} {g : CG Label B},
          evalT Γ (cliftT t) = some g →
            evalT (hvAssign P θ ν Γ) t = some (hv P θ ν none g)
    | .base b, _, Γ, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      simp [evalT, hv]
    | .arrow t u, hl, Γ, g, h => by
      simp only [cliftT, evalT, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨a, ha, b, hb, rfl⟩ := h
      have hla : ∀ l ∈ labelsT t, l ∈ written P := fun l h =>
        hl l (by simp [labelsT, h])
      have hlb : ∀ l ∈ labelsT u, l ∈ written P := fun l h =>
        hl l (by simp [labelsT, h])
      simp [evalT, hv_evalT t hla ha, hv_evalT u hlb hb, hv]
    | .tvar n, _, Γ, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      simp [evalT, hvAssign]
    | .record fs tails, hl, Γ, g, h => by
      simp only [cliftT] at h
      rw [evalT_record] at h
      simp only [Option.map_eq_some_iff, Option.bind_eq_some_iff] at h
      obtain ⟨v, ⟨frs, hfr, hv'⟩, rfl⟩ := h
      have hf := hv_fieldRows fs (fun l h => hl l (by
        simpa [labelsT] using h)) hfr
      rw [evalT_record, hf]
      have hmap : (frs.map (hvRow P θ ν none) ++
          tails.map (hvAssign P θ ν Γ).row) =
          (frs ++ tails.map Γ.row).map (hvRow P θ ν none) := by
        simp [hvAssign, List.map_append, List.map_map, Function.comp_def]
      simp only [Option.bind_some, hmap, composeAll_hvRow none hv',
        Option.map_some, hv_record]

  theorem hv_fieldRows :
      ∀ (fs : Fields Label B), (∀ l ∈ labelsF fs, l ∈ written P) →
        ∀ {Γ : CAssign Label B} {frs : List (Row (CL Label) (CG Label B))},
          fieldRows Γ (cliftF fs) = some frs →
            fieldRows (hvAssign P θ ν Γ) fs =
              some (frs.map (hvRow P θ ν none))
    | .nil, _, Γ, frs, h => by
      simp only [cliftF, fieldRows, Option.some.injEq] at h
      subst h
      rfl
    | .cons l t rest, hl, Γ, frs, h => by
      simp only [cliftF, fieldRows, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨g, hg, frs', hfrs', rfl⟩ := h
      have hlw : l ∈ written P := hl l (by simp [labelsF])
      have ht := hv_evalT t (fun k h => hl k (by
        simp [labelsF, h])) hg
      have hr := hv_fieldRows rest (fun k h => hl k (by
        simp [labelsF, h])) hfrs'
      simp [fieldRows, ht, hr, hvRow_single hlw]
end

/-- A row's image holds only written labels and labels of rigid rows. -/
theorem hvRow_some_mem {κ : Option Label} {f : Row (CL Label) (CG Label B)}
    {k : Label} (h : hvRow P θ ν κ f k ≠ none) :
    k ∈ written P ∨ ∃ r ∈ P.rigidRow, θ.row r k ≠ none := by
  by_cases hw : k ∈ written P
  · exact Or.inl hw
  · right
    by_cases hc : cellOf P θ k = []
    · exact absurd (by simp [hvRow, hw, hc]) h
    · obtain ⟨r, hr⟩ := List.exists_mem_of_ne_nil _ hc
      simp only [cellOf, List.mem_filter, Option.isSome_iff_ne_none] at hr
      exact ⟨r, hr.1, hr.2⟩

mutual
  /-- `hv` keeps values finite when `θ`'s rigid values and `ν`'s are. -/
  theorem hv_fin (hθ : RigidFin P θ) (hν : ∀ c κ, FinG (ν c κ)) :
      ∀ (κ : Option Label) (g : CG Label B), FinG g → FinG (hv P θ ν κ g)
    | _, .base (.inl _), _ => by simp [hv, FinG]
    | κ, .base (.inr c), _ => by simpa [hv] using hν c κ
    | κ, .arrow a b, h => by
      simp only [FinG] at h
      simp only [hv, FinG]
      exact ⟨hv_fin hθ hν κ a h.1, hv_fin hθ hν κ b h.2⟩
    | κ, .record f, h => by
      rw [hv_record, finG_record]
      have hf := (finG_record f).mp h
      obtain ⟨ls, hls⟩ := finRow_cover θ.row P.rigidRow
        (fun r hr => ((finG_record _).mp (hθ.2 r hr)).1)
      refine ⟨⟨written P ++ ls, fun k hk => ?_⟩, fun k => ?_⟩
      · rcases hvRow_some_mem hk with hw | ⟨r, hr, hk'⟩
        · exact List.mem_append_left _ hw
        · exact List.mem_append_right _ (hls r hr k hk')
      · rw [hvRow_eq]
        cases src P θ k with
        | none => simp [FinO]
        | some j => exact hvO_fin hθ hν _ (f j) (hf.2 j)

  theorem hvO_fin (hθ : RigidFin P θ) (hν : ∀ c κ, FinG (ν c κ)) :
      ∀ (κ : Option Label) (o : Option (CG Label B)), FinO o →
        FinO (hvO P θ ν κ o)
    | _, none, _ => by simp [hvO, FinO]
    | κ, some g, h => by
      simp only [FinO] at h
      simp only [hvO, FinO]
      exact hv_fin hθ hν κ g h
end

end Composition.Typed
