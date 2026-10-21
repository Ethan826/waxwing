/-
The pre-instance is cell-shaped and finite, and so is every value `D`'s
sides take there: the equations `eqPairs` that unification solves are
between finite cell-shaped values.
-/
import Composition.Typed.UnifCS
import Composition.Typed.EqFree

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]
variable {P : SigProblem Label B} {C : List Cell}

theorem csRow_single {l : Label} (hl : l ∈ written P) {g : CG Label B}
    (hg : CS P C g) : CSRow P C (single (.inl l) g) := by
  refine ⟨fun k hk => ?_, fun k => ?_, fun S => Or.inl ?_⟩
  · by_cases h : k = l
    · exact h ▸ hl
    · exact absurd (by simp [single, h]) hk
  · by_cases h : k = l
    · subst h; simpa [single, CSO] using hg
    · simp [single, h, CSO]
  · simp [single]

mutual
  theorem eval_cs {Γ : CAssign Label B} (hty : ∀ n, CS P C (Γ.ty n))
      (hrow : ∀ r, CSRow P C (Γ.row r)) :
      ∀ (t : TExpr Label B), (∀ l ∈ labelsT t, l ∈ written P) →
        (∀ b ∈ basesT t, b ∈ basesOf P) → ∀ {g : CG Label B},
          evalT Γ (cliftT t) = some g → CS P C g
    | .base b, _, hb, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      exact hb b (by simp [basesT])
    | .arrow t u, hl, hb, g, h => by
      simp only [cliftT, evalT, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨a, ha, c, hc, rfl⟩ := h
      exact ⟨eval_cs hty hrow t (fun l h => hl l (by simp [labelsT, h]))
          (fun b h => hb b (by simp [basesT, h])) ha,
        eval_cs hty hrow u (fun l h => hl l (by simp [labelsT, h]))
          (fun b h => hb b (by simp [basesT, h])) hc⟩
    | .tvar n, _, _, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      exact hty n
    | .record fs tails, hl, hb, g, h => by
      simp only [cliftT] at h
      rw [evalT_record] at h
      simp only [Option.map_eq_some_iff, Option.bind_eq_some_iff] at h
      obtain ⟨v, ⟨frs, hfr, hv⟩, rfl⟩ := h
      have hf := fieldRows_cs hty hrow fs (fun l h => hl l (by
        simpa [labelsT] using h)) (fun b h => hb b (by
        simpa [basesT] using h)) hfr
      refine (cs_record v).mpr (composeAll_cs (fun x hx => ?_) hv)
      rcases List.mem_append.mp hx with hx | hx
      · exact hf x hx
      · obtain ⟨r, _, rfl⟩ := List.mem_map.mp hx
        exact hrow r

  theorem fieldRows_cs {Γ : CAssign Label B} (hty : ∀ n, CS P C (Γ.ty n))
      (hrow : ∀ r, CSRow P C (Γ.row r)) :
      ∀ (fs : Fields Label B), (∀ l ∈ labelsF fs, l ∈ written P) →
        (∀ b ∈ basesF fs, b ∈ basesOf P) →
        ∀ {frs : List (Row (CL Label) (CG Label B))},
          fieldRows Γ (cliftF fs) = some frs → ∀ x ∈ frs, CSRow P C x
    | .nil, _, _, frs, h => by
      simp only [cliftF, fieldRows, Option.some.injEq] at h
      subst h
      simp
    | .cons l t rest, hl, hb, frs, h => by
      simp only [cliftF, fieldRows, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨g, hg, frs', hfrs', rfl⟩ := h
      have hlw : l ∈ written P := hl l (by simp [labelsF])
      have ht := eval_cs hty hrow t (fun k h => hl k (by simp [labelsF, h]))
        (fun b h => hb b (by simp [basesF, h])) hg
      have hr := fieldRows_cs hty hrow rest (fun k h => hl k (by
        simp [labelsF, h])) (fun b h => hb b (by simp [basesF, h])) hfrs'
      intro x hx
      rcases List.mem_cons.mp hx with rfl | hx
      · exact csRow_single hlw ht
      · exact hr x hx
end

/-- The pre-instance is cell-shaped. -/
theorem eta_cs {π : Pattern Label} :
    (∀ n, CS P C ((eta P π C).ty n)) ∧ ∀ r, CSRow P C ((eta P π C).row r) := by
  refine ⟨fun n => trivial, fun r => ⟨fun l hl => ?_, fun l => ?_, fun S => ?_⟩⟩
  · simp only [eta, etaRow] at hl
    split at hl
    · next h => exact h.1
    · exact absurd rfl hl
  · simp only [eta, etaRow]
    split <;> simp [CSO, CS, NonX]
  · simp only [eta, etaRow]
    split
    · next h => exact Or.inr ⟨h.1, r, h.2, rfl⟩
    · exact Or.inl rfl

end Composition.Typed
