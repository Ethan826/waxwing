/-
Variable elimination `[x ↦ t]`: the variables of the result come from
the original (other than `x`) or from `t`, and well-formedness is kept.
-/
import Composition.Unify.Measure

namespace Composition.Syntax

open Composition

variable {Label B : Type}

theorem substT_elim_record (x : Nat) (t : TExpr Label B)
    (fs : Fields Label B) (tails : List Nat) :
    substT (elimSubst x t) (.record fs tails) =
      .record (substF (elimSubst x t) fs) tails := by
  simp [substT, expandTails_elim, append_nil]

theorem lookup_elim (x m : Nat) (t : TExpr Label B) :
    (elimSubst x t).ty.lookup m = if m = x then some t else none := by
  by_cases h : m = x
  · simp [elimSubst, h]
  · have hb : (m == x) = false := by simpa using h
    simp [elimSubst, List.lookup, hb, h]

mutual
    theorem substT_elim_vars {x n : Nat} {t : TExpr Label B} :
      ∀ e : TExpr Label B, n ∈ tyVarsT (substT (elimSubst x t) e) →
        (n ∈ tyVarsT e ∧ n ≠ x) ∨ n ∈ tyVarsT t
    | .base _, h => by simp [substT, tyVarsT] at h
    | .tvar m, h => by
      simp only [substT, lookup_elim] at h
      by_cases hm : m = x
      · simp [hm] at h
        exact Or.inr h
      · simp [hm, tyVarsT] at h
        subst h
        exact Or.inl ⟨by simp [tyVarsT], hm⟩
    | .arrow a c, h => by
      simp only [substT, tyVarsT, List.mem_append] at h ⊢
      rcases h with h | h
      · rcases substT_elim_vars a h with ⟨h1, h2⟩ | h
        · exact Or.inl ⟨Or.inl h1, h2⟩
        · exact Or.inr h
      · rcases substT_elim_vars c h with ⟨h1, h2⟩ | h
        · exact Or.inl ⟨Or.inr h1, h2⟩
        · exact Or.inr h
    | .record fs tails, h => by
      rw [substT_elim_record] at h
      simp only [tyVarsT] at h ⊢
      exact substF_elim_vars fs h

    theorem substF_elim_vars {x n : Nat} {t : TExpr Label B} :
      ∀ fs : Fields Label B, n ∈ tyVarsF (substF (elimSubst x t) fs) →
        (n ∈ tyVarsF fs ∧ n ≠ x) ∨ n ∈ tyVarsT t
    | .nil, h => by simp [substF, tyVarsF] at h
    | .cons l e rest, h => by
      simp only [substF, tyVarsF, List.mem_append] at h ⊢
      rcases h with h | h
      · rcases substT_elim_vars e h with ⟨h1, h2⟩ | h
        · exact Or.inl ⟨Or.inl h1, h2⟩
        · exact Or.inr h
      · rcases substF_elim_vars rest h with ⟨h1, h2⟩ | h
        · exact Or.inl ⟨Or.inr h1, h2⟩
        · exact Or.inr h
end

variable [DecidableEq Label]

mutual
  theorem substT_elim_wf {x : Nat} {t : TExpr Label B} (ht : wfT t = true) :
      ∀ e : TExpr Label B, wfT e = true →
        wfT (substT (elimSubst x t) e) = true
    | .base _, _ => rfl
    | .tvar m, _ => by
      simp only [substT, lookup_elim]
      by_cases hm : m = x <;> simp [hm, ht, wfT]
    | .arrow a c, h => by
      simp only [wfT, Bool.and_eq_true] at h
      simp [substT, wfT, substT_elim_wf ht a h.1, substT_elim_wf ht c h.2]
    | .record fs tails, h => by
      rw [substT_elim_record]
      simp only [wfT, Bool.and_eq_true] at h ⊢
      exact ⟨⟨h.1.1, by rw [labels_substF]; exact h.1.2⟩,
        substF_elim_wf ht fs h.2⟩

  theorem substF_elim_wf {x : Nat} {t : TExpr Label B} (ht : wfT t = true) :
      ∀ fs : Fields Label B, wfF fs = true →
        wfF (substF (elimSubst x t) fs) = true
    | .nil, _ => rfl
    | .cons l e rest, h => by
      simp only [wfF, Bool.and_eq_true] at h
      simp [substF, wfF, substT_elim_wf ht e h.1, substF_elim_wf ht rest h.2]
end

/-- Every atom is an equation between well-formed sides. -/
def AllWfEq (E : Problem Label B) : Prop :=
  ∀ a ∈ E, ∃ t u, a = .eq t u ∧ wfT t = true ∧ wfT u = true

theorem substProblem_elim_eq (x : Nat) (t : TExpr Label B) (a b : TExpr Label B)
    (rest : Problem Label B) :
    substProblem (elimSubst x t) (.eq a b :: rest) =
      .eq (substT (elimSubst x t) a) (substT (elimSubst x t) b) ::
        substProblem (elimSubst x t) rest := by
  simp [substProblem, substAtom]

theorem allWfEq_elim {x : Nat} {t : TExpr Label B} (ht : wfT t = true) :
    ∀ {E : Problem Label B}, AllWfEq E →
      AllWfEq (substProblem (elimSubst x t) E)
  | [], _ => by simp [AllWfEq, substProblem]
  | a :: rest, h => by
    obtain ⟨p, q, rfl, hp, hq⟩ := h a (by simp)
    rw [substProblem_elim_eq]
    intro c hc
    rcases List.mem_cons.mp hc with rfl | hc
    · exact ⟨_, _, rfl, substT_elim_wf ht p hp, substT_elim_wf ht q hq⟩
    · exact allWfEq_elim ht (fun d hd => h d (by simp [hd])) c hc

omit [DecidableEq Label] in
theorem tyVarsOf_cons (a b : TExpr Label B) (rest : Problem Label B) :
    tyVarsOf (.eq a b :: rest) = tyVarsT a ++ tyVarsT b ++ tyVarsOf rest := by
  simp [tyVarsOf_eq, atomTyVars]

/-- The variables after eliminating `x`, for problems of equations. -/
theorem tyVarsOf_elim {x n : Nat} {t : TExpr Label B} :
    ∀ {E : Problem Label B}, AllWfEq E →
      n ∈ tyVarsOf (substProblem (elimSubst x t) E) →
        (n ∈ tyVarsOf E ∧ n ≠ x) ∨ n ∈ tyVarsT t
  | [], _, h => by simp [substProblem, tyVarsOf] at h
  | a :: rest, hE, h => by
    obtain ⟨p, q, rfl, _, _⟩ := hE a (by simp)
    rw [substProblem_elim_eq, tyVarsOf_cons] at h
    rw [tyVarsOf_cons]
    simp only [List.mem_append] at h ⊢
    rcases h with (h | h) | h
    · rcases substT_elim_vars p h with ⟨h1, h2⟩ | h
      · exact Or.inl ⟨Or.inl (Or.inl h1), h2⟩
      · exact Or.inr h
    · rcases substT_elim_vars q h with ⟨h1, h2⟩ | h
      · exact Or.inl ⟨Or.inl (Or.inr h1), h2⟩
      · exact Or.inr h
    · rcases tyVarsOf_elim (fun d hd => hE d (by simp [hd])) h with
        ⟨h1, h2⟩ | h
      · exact Or.inl ⟨Or.inr h1, h2⟩
      · exact Or.inr h

end Composition.Syntax
