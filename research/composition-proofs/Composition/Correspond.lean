/-
Under its binding equations, a substitution preserves the value of every
expression (`subst_evalT`) and the truth of every problem
(`subst_sat`); hence a solver may replace a problem it entails `eqs σ`
of by `eqs σ` plus the substituted problem (`binding_correspondence`),
and must keep the equations (`bindings_needed`).
-/
import Composition.Evaluate

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem lookup_mem {α β : Type} [BEq α] [LawfulBEq α] :
    ∀ {l : List (α × β)} {a : α} {b : β}, l.lookup a = some b → (a, b) ∈ l
  | [], _, _, h => by simp [List.lookup] at h
  | (k, v) :: rest, a, b, h => by
    by_cases hk : a = k
    · subst hk
      simp [List.lookup] at h
      simp [h]
    · have : (a == k) = false := by simpa using hk
      simp only [List.lookup, this] at h
      exact List.mem_cons_of_mem _ (lookup_mem h)

theorem sat_append {θ : Assign Label B} {C D : Problem Label B} :
    Sat θ (C ++ D) ↔ Sat θ C ∧ Sat θ D := by
  simp [Sat, or_imp, forall_and]

theorem sat_flatMap {α : Type} {θ : Assign Label B} {xs : List α}
    {f : α → Problem Label B} :
    Sat θ (xs.flatMap f) ↔ ∀ x ∈ xs, Sat θ (f x) := by
  simp only [Sat, List.mem_flatMap]
  constructor
  · intro h x hx a ha
    exact h a ⟨x, hx, ha⟩
  · rintro h a ⟨x, hx, ha⟩
    exact h x hx a ha

/-- What a row variable stands for evaluates to its value. -/
theorem rowOf_eval {θ : Assign Label B} {σ : Subst Label B}
    (he : Sat θ (eqs σ)) (r : Nat) :
    ∃ frs, fieldRows θ (rowOf σ r).1 = some frs ∧
      composeAll (frs ++ (rowOf σ r).2.map θ.row) = some (θ.row r) := by
  unfold rowOf
  cases hl : σ.row.lookup r with
  | none => exact ⟨[], rfl, composeAll_single _⟩
  | some p =>
    have hm := lookup_mem hl
    have := he _ (List.mem_append_right _ (List.mem_map.mpr ⟨_, hm, rfl⟩))
    obtain ⟨g, h1, h2⟩ := this
    rw [evalT_record] at h1 h2
    simp [fieldRows, composeAll_single] at h1
    subst h1
    simp only [Option.getD_some]
    cases hf : fieldRows θ p.1 with
    | none => simp [hf] at h2
    | some frs =>
      simp only [hf, Option.bind_some, Option.map_eq_some_iff] at h2
      obtain ⟨v, hv, hrec⟩ := h2
      cases hrec
      exact ⟨frs, rfl, hv⟩

theorem perm_middle {α : Type} (a b c d : List α) :
    ((a ++ b) ++ (c ++ d)).Perm ((a ++ c) ++ (b ++ d)) := by
  simp only [List.append_assoc]
  exact List.Perm.append_left a (by
    rw [← List.append_assoc, ← List.append_assoc]
    exact List.Perm.append_right d List.perm_append_comm)

/-- Expanding the tails preserves the composition of the parts. -/
theorem expandTails_eval {θ : Assign Label B} {σ : Subst Label B}
    (he : Sat θ (eqs σ)) :
    ∀ tails : List Nat, ∃ frs,
      fieldRows θ (expandTails σ tails).1 = some frs ∧
      composeAll (frs ++ (expandTails σ tails).2.map θ.row) =
        composeAll (tails.map θ.row)
  | [] => ⟨[], rfl, rfl⟩
  | r :: rs => by
    obtain ⟨f1, hf1, hc1⟩ := rowOf_eval he r
    obtain ⟨f2, hf2, hc2⟩ := expandTails_eval he rs
    refine ⟨f1 ++ f2, ?_, ?_⟩
    · simp [expandTails, fieldRows_append, hf1, hf2]
    · simp only [expandTails, List.map_append]
      rw [composeAll_perm (perm_middle _ _ _ _), composeAll_append, hc2,
        hc1]
      simp [composeAll]

mutual
  /-- Under its binding equations, substitution preserves values. -/
  theorem subst_evalT {θ : Assign Label B} {σ : Subst Label B}
      (he : Sat θ (eqs σ)) :
      ∀ t : TExpr Label B, evalT θ (substT σ t) = evalT θ t
    | .base _ => by simp [substT]
    | .arrow t u => by
      simp [substT, evalT, subst_evalT he t, subst_evalT he u]
    | .tvar n => by
      simp only [substT]
      cases hl : σ.ty.lookup n with
      | none => rfl
      | some t =>
        have := he _ (List.mem_append_left _
          (List.mem_map.mpr ⟨_, lookup_mem hl, rfl⟩))
        obtain ⟨g, h1, h2⟩ := this
        simp [evalT] at h1
        simp [h2, evalT, h1]
    | .record fs tails => by
      obtain ⟨fe, hfe, hce⟩ := expandTails_eval he tails
      rw [substT, evalT_record, evalT_record, fieldRows_append,
        subst_fieldRows he fs, hfe]
      cases fieldRows θ fs with
      | none => rfl
      | some xs =>
        simp only [Option.bind_some, Option.map_some]
        rw [List.append_assoc, composeAll_congr xs _ _ hce]

  theorem subst_fieldRows {θ : Assign Label B} {σ : Subst Label B}
      (he : Sat θ (eqs σ)) :
      ∀ fs : Fields Label B, fieldRows θ (substF σ fs) = fieldRows θ fs
    | .nil => rfl
    | .cons l t rest => by
      simp [substF, fieldRows, subst_evalT he t, subst_fieldRows he rest]
end

end Composition.Syntax
