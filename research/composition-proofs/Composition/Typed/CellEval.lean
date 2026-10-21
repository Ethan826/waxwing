/-
Projection and evaluation, both directions (for `CellIndependence`).
Forward: a defined value projects to the projected assignment's value.
Backward: if a value of a problem expression is undefined at `Γ`, whose
rows hold only cells of `C`, then it is undefined in the written
projection or in some single-cell projection, because an undefined
composition has one overlapping label and that label survives one of
those projections.
-/
import Composition.Typed.CellPr

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

mutual
  theorem pr_evalT (L : List Cell) :
      ∀ (t : TExpr Label B) {Γ : CAssign Label B} {g : CG Label B},
        evalT Γ (cliftT t) = some g →
          evalT (prAssign L Γ) (cliftT t) = some (pr L g)
    | .base b, Γ, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      rfl
    | .arrow t u, Γ, g, h => by
      simp only [cliftT, evalT, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨a, ha, c, hc, rfl⟩ := h
      simp [cliftT, evalT, pr_evalT L t ha, pr_evalT L u hc, pr]
    | .tvar n, Γ, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      rfl
    | .record fs tails, Γ, g, h => by
      simp only [cliftT] at h ⊢
      rw [evalT_record] at h
      simp only [Option.map_eq_some_iff, Option.bind_eq_some_iff] at h
      obtain ⟨v, ⟨frs, hfr, hv⟩, rfl⟩ := h
      rw [evalT_record, pr_fieldRows L fs hfr]
      have hmap : (frs.map (prRow L) ++ tails.map (prAssign L Γ).row) =
          (frs ++ tails.map Γ.row).map (prRow L) := by
        simp [prAssign, List.map_append, List.map_map, Function.comp_def]
      simp only [Option.bind_some, hmap, composeAll_hom (prRow_hom L) hv,
        Option.map_some, pr_record]

  theorem pr_fieldRows (L : List Cell) :
      ∀ (fs : Fields Label B) {Γ : CAssign Label B}
        {frs : List (Row (CL Label) (CG Label B))},
        fieldRows Γ (cliftF fs) = some frs →
          fieldRows (prAssign L Γ) (cliftF fs) = some (frs.map (prRow L))
    | .nil, Γ, frs, h => by
      simp only [cliftF, fieldRows, Option.some.injEq] at h
      subst h
      rfl
    | .cons l t rest, Γ, frs, h => by
      simp only [cliftF, fieldRows, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨g, hg, frs', hfrs', rfl⟩ := h
      simp [cliftF, fieldRows, pr_evalT L t hg, pr_fieldRows L rest hfrs',
        prRow_single]
end

omit [DecidableEq Label] in
theorem mem_Ls {C L : List Cell} (h : L ∈ Ls C) :
    L = [] ∨ ∃ S ∈ C, L = [S] := by
  rcases List.mem_cons.mp h with h | h
  · exact Or.inl h
  · obtain ⟨S, hS, rfl⟩ := List.mem_map.mp h
    exact Or.inr ⟨S, hS, rfl⟩

theorem fieldRows_inl :
    ∀ (fs : Fields Label B) {Γ : CAssign Label B}
      {frs : List (Row (CL Label) (CG Label B))},
      fieldRows Γ (cliftF fs) = some frs → ∀ x ∈ frs, ∀ S, x (.inr S) = none
  | .nil, Γ, frs, h => by
    simp only [cliftF, fieldRows, Option.some.injEq] at h
    subst h
    simp
  | .cons l t rest, Γ, frs, h => by
    simp only [cliftF, fieldRows, Option.bind_eq_some_iff,
      Option.map_eq_some_iff] at h
    obtain ⟨g, _, frs', hfrs', rfl⟩ := h
    intro x hx S
    rcases List.mem_cons.mp hx with rfl | hx
    · simp [single]
    · exact fieldRows_inl rest hfrs' x hx S

/-- The projection keeping a label `j` (with its cell, if `j` is one). -/
def keepOf : CL Label → List Cell
  | .inl _ => []
  | .inr S => [S]

omit [DecidableEq Label] in
theorem keepOf_pres (j : CL Label) (x : Row (CL Label) (CG Label B)) :
    prRow (keepOf j) x j = none ↔ x j = none := by
  cases j <;> simp [keepOf, prRow, prO_none_iff]

variable {C : List Cell} {Γ : CAssign Label B}

omit [DecidableEq Label] in
theorem composeAll_proj (hC : ∀ r S, Γ.row r (.inr S) ≠ none → S ∈ C)
    {frs : List (Row (CL Label) (CG Label B))} (hf : ∀ x ∈ frs, ∀ S,
      x (.inr S) = none) {tails : List Nat}
    (h : composeAll (frs ++ tails.map Γ.row) = none) :
    ∃ L ∈ Ls C, composeAll ((frs ++ tails.map Γ.row).map (prRow L)) = none := by
  obtain ⟨j, ⟨x, hx, hxj⟩, hj⟩ := composeAll_conflict h
  refine ⟨keepOf j, ?_, hj _ (prRow_hom _) (keepOf_pres j)⟩
  cases j with
  | inl l => exact nil_mem_Ls C
  | inr S =>
    refine single_mem_Ls ?_
    rcases List.mem_append.mp hx with hx | hx
    · exact absurd (hf x hx S) hxj
    · obtain ⟨r, _, rfl⟩ := List.mem_map.mp hx
      exact hC r S hxj

end Composition.Typed
