/-
Values of the problem's expressions at a finite generic assignment are
finite; in particular those at the pre-instance.
-/
import Composition.Typed.UnifCSEval

namespace Composition.Typed

open Composition Composition.Syntax

variable {Label B : Type} [DecidableEq Label]

omit [DecidableEq Label] in
theorem finRec_union {x y : Row (CL Label) (CG Label B)}
    (hx : FinG (.record x)) (hy : FinG (.record y)) :
    FinG (.record (union x y)) := by
  have hx' := (finG_record x).mp hx
  have hy' := (finG_record y).mp hy
  obtain ⟨lx, hlx⟩ := hx'.1
  obtain ⟨ly, hly⟩ := hy'.1
  refine (finG_record _).mpr ⟨⟨lx ++ ly, fun j hj => ?_⟩, fun j => ?_⟩
  · simp only [union] at hj
    cases h : x j with
    | none => rw [h] at hj; exact List.mem_append_right _ (hly j hj)
    | some _ => exact List.mem_append_left _ (hlx j (by simp [h]))
  · simp only [union]
    cases h : x j with
    | none => exact hy'.2 j
    | some _ => have := hx'.2 j; rw [h] at this; exact this

omit [DecidableEq Label] in
theorem composeAll_fin :
    ∀ {xs : List (Row (CL Label) (CG Label B))}
      {v : Row (CL Label) (CG Label B)},
      (∀ x ∈ xs, FinG (.record x)) → composeAll xs = some v →
        FinG (.record v)
  | [], v, _, h => by
    simp only [composeAll, Option.some.injEq] at h
    subst h
    exact finG_emptyG
  | x :: xs, v, hx, h => by
    simp only [composeAll, Option.bind_eq_some_iff] at h
    obtain ⟨w, hw, hc⟩ := h
    obtain ⟨_, rfl⟩ := compose_eq_some.mp hc
    exact finRec_union (hx x (by simp))
      (composeAll_fin (fun y hy => hx y (by simp [hy])) hw)

theorem single_fin (l : CL Label) {g : CG Label B} (hg : FinG g) :
    FinG (.record (single l g)) := by
  refine (finG_record _).mpr ⟨⟨[l], fun j hj => ?_⟩, fun j => ?_⟩
  · by_cases h : j = l
    · simp [h]
    · exact absurd (by simp [single, h]) hj
  · by_cases h : j = l
    · subst h; simpa [single, FinO] using hg
    · simp [single, h, FinO]

mutual
  theorem eval_fin {Γ : CAssign Label B} (hΓ : FinAssign Γ) :
      ∀ (t : TExpr Label B) {g : CG Label B},
        evalT Γ (cliftT t) = some g → FinG g
    | .base _, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      trivial
    | .arrow t u, g, h => by
      simp only [cliftT, evalT, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨a, ha, c, hc, rfl⟩ := h
      exact ⟨eval_fin hΓ t ha, eval_fin hΓ u hc⟩
    | .tvar n, g, h => by
      simp only [cliftT, evalT, Option.some.injEq] at h
      subst h
      exact hΓ.1 n
    | .record fs tails, g, h => by
      simp only [cliftT] at h
      rw [evalT_record] at h
      simp only [Option.map_eq_some_iff, Option.bind_eq_some_iff] at h
      obtain ⟨v, ⟨frs, hfr, hv⟩, rfl⟩ := h
      refine composeAll_fin (fun x hx => ?_) hv
      rcases List.mem_append.mp hx with hx | hx
      · exact fieldRows_fin hΓ fs hfr x hx
      · obtain ⟨r, _, rfl⟩ := List.mem_map.mp hx
        exact hΓ.2 r

  theorem fieldRows_fin {Γ : CAssign Label B} (hΓ : FinAssign Γ) :
      ∀ (fs : Fields Label B) {frs : List (Row (CL Label) (CG Label B))},
        fieldRows Γ (cliftF fs) = some frs → ∀ x ∈ frs, FinG (.record x)
    | .nil, frs, h => by
      simp only [cliftF, fieldRows, Option.some.injEq] at h
      subst h
      simp
    | .cons l t rest, frs, h => by
      simp only [cliftF, fieldRows, Option.bind_eq_some_iff,
        Option.map_eq_some_iff] at h
      obtain ⟨g, hg, frs', hfrs', rfl⟩ := h
      intro x hx
      rcases List.mem_cons.mp hx with rfl | hx
      · exact single_fin _ (eval_fin hΓ t hg)
      · exact fieldRows_fin hΓ rest hfrs' x hx
end

/-- The pre-instance is finite. -/
theorem eta_finAssign {P : SigProblem Label B} {π : Pattern Label}
    {C : List Cell} : FinAssign (eta P π C) :=
  ⟨fun _ => trivial, fun r => eta_fin r⟩

end Composition.Typed
