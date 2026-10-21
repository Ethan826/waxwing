/-
U2, completeness: if equations between well-formed sides have a
solution, the unifier answers true. By induction on the unifier's own
recursion. Each step keeps a given solution (elimination through the
binding equation `x = t`, `elim_complete`), and each answer of false is
justified: the occurs check against the ground model (`occurs_unsat`),
a constructor clash, unequal base types, or a missing field.
-/
import Composition.Unify.Sound

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

theorem unify_complete :
    ∀ E : Problem Label B, AllWfEq E → (∃ θ, Sat θ E) → unify E = true := by
  intro E
  induction E using unify.induct with
  | case1 => intros; simp [unify]
  | case2 y rest ih =>
    rintro hw ⟨θ, hθ⟩
    simp only [unify, ite_true]
    exact ih (allWfEq_cons hw).2.2 ⟨θ, (sat_cons.mp hθ).2⟩
  | case3 x y rest hxy ih =>
    rintro hw ⟨θ, hθ⟩
    simp only [unify, hxy, ite_false]
    obtain ⟨_, ht, hr⟩ := allWfEq_cons hw
    exact ih (allWfEq_elim ht hr)
      ⟨θ, elim_complete (sat_cons.mp hθ).1 (sat_cons.mp hθ).2⟩
  | case4 x t rest hnv hx =>
    rintro _ ⟨θ, hθ⟩
    exact (occurs_unsat hnv hx (sat_cons.mp hθ).1).elim
  | case5 x t rest hnv hx ih =>
    rintro hw ⟨θ, hθ⟩
    rw [unify]
    · simp only [hx, ite_false]
      obtain ⟨_, ht, hr⟩ := allWfEq_cons hw
      exact ih (allWfEq_elim ht hr)
        ⟨θ, elim_complete (sat_cons.mp hθ).1 (sat_cons.mp hθ).2⟩
    · exact hnv
  | case6 t x rest hnv hx =>
    rintro _ ⟨θ, hθ⟩
    exact (occurs_unsat hnv hx (holds_swap.mp (sat_cons.mp hθ).1)).elim
  | case7 t x rest hnv hx ih =>
    rintro hw ⟨θ, hθ⟩
    rw [unify]
    · simp only [hx, ite_false]
      obtain ⟨ht, _, hr⟩ := allWfEq_cons hw
      exact ih (allWfEq_elim ht hr)
        ⟨θ, elim_complete (holds_swap.mp (sat_cons.mp hθ).1)
          (sat_cons.mp hθ).2⟩
    · exact hnv
  | case8 b rest ih =>
    rintro hw ⟨θ, hθ⟩
    simp only [unify, ite_true]
    exact ih (allWfEq_cons hw).2.2 ⟨θ, (sat_cons.mp hθ).2⟩
  | case9 b b' rest hb =>
    rintro _ ⟨θ, hθ⟩
    obtain ⟨g, h1, h2⟩ := (sat_cons.mp hθ).1
    simp only [evalT, Option.some.injEq] at h1 h2
    rw [← h1] at h2
    cases h2
    exact (hb rfl).elim
  | case10 a c a' c' rest ih =>
    rintro hw ⟨θ, hθ⟩
    simp only [unify]
    obtain ⟨hl, hr, hrest⟩ := allWfEq_cons hw
    simp only [wfT, Bool.and_eq_true] at hl hr
    have hw' : AllWfEq (.eq a a' :: .eq c c' :: rest) := by
      intro x hx
      simp only [List.mem_cons] at hx
      rcases hx with rfl | rfl | hx
      · exact ⟨a, a', rfl, hl.1, hr.1⟩
      · exact ⟨c, c', rfl, hl.2, hr.2⟩
      · exact hrest x hx
    obtain ⟨e1, e2⟩ := (holds_arrow_iff hl.1 hl.2 hr.1 hr.2).mp
      (sat_cons.mp hθ).1
    exact ih hw' ⟨θ, sat_cons.mpr ⟨e1, sat_cons.mpr ⟨e2,
      (sat_cons.mp hθ).2⟩⟩⟩
  | case11 rest ih =>
    rintro hw ⟨θ, hθ⟩
    simp only [unify]
    exact ih (allWfEq_cons hw).2.2 ⟨θ, (sat_cons.mp hθ).2⟩
  | case12 l t r fs' rest hr =>
    rintro hw ⟨θ, hθ⟩
    obtain ⟨h1, h2, _⟩ := allWfEq_cons hw
    have := (holds_eq_iff h1 h2).mp (sat_cons.mp hθ).1
    obtain ⟨u, rest', hr', _⟩ := (record_step h1 h2).mp this
    rw [hr] at hr'
    cases hr'
  | case13 l t r fs' rest u rest' hr ih =>
    rintro hw ⟨θ, hθ⟩
    simp only [unify]
    split
    · rename_i heq
      rw [hr] at heq
      cases heq
    rename_i u2 rest2 heq
    rw [hr] at heq
    simp only [Option.some.injEq, Prod.mk.injEq] at heq
    obtain ⟨rfl, rfl⟩ := heq
    obtain ⟨h1, h2, hrest⟩ := allWfEq_cons hw
    obtain ⟨ht, hu, hrr, hrr'⟩ := record_step_wf h1 h2 hr
    have hw' : AllWfEq (.eq t u :: .eq (.record r []) (.record rest' []) ::
        rest) := by
      intro x hx
      simp only [List.mem_cons] at hx
      rcases hx with rfl | rfl | hx
      · exact ⟨t, u, rfl, ht, hu⟩
      · exact ⟨_, _, rfl, hrr, hrr'⟩
      · exact hrest x hx
    have := (holds_eq_iff h1 h2).mp (sat_cons.mp hθ).1
    obtain ⟨u3, rest3, hr3, e1, e2⟩ := (record_step h1 h2).mp this
    rw [hr] at hr3
    simp only [Option.some.injEq, Prod.mk.injEq] at hr3
    obtain ⟨rfl, rfl⟩ := hr3
    exact ih hw' ⟨θ, sat_cons.mpr ⟨(holds_eq_iff ht hu).mpr e1,
      sat_cons.mpr ⟨(holds_eq_iff hrr hrr').mpr e2, (sat_cons.mp hθ).2⟩⟩⟩
  | case14 E h1 h2 h3 h4 h5 h6 h7 h8 =>
    rintro hw ⟨θ, hθ⟩
    exfalso
    match E, hw, hθ, h1, h2, h3, h4, h5, h6, h7, h8 with
    | [], _, _, h1, _, _, _, _, _, _, _ => exact h1 rfl
    | a :: rest, hw, hθ, _, _, h3, h4, h5, h6, h7, h8 =>
      obtain ⟨t, u, rfl, ht, hu⟩ := hw a (by simp)
      have hh := (sat_cons.mp hθ).1
      have nt : ∀ y, t = .tvar y → False := fun y e =>
        h3 y u rest (by rw [e])
      have nu : ∀ y, u = .tvar y → False := fun y e =>
        h4 t y rest (by rw [e])
      cases t with
      | tvar y => exact nt y rfl
      | base b =>
        cases u with
        | base b' => exact h5 b b' rest rfl
        | tvar y => exact nu y rfl
        | _ => exact clash_unsat nt nu (by simp [headT]) hh
      | arrow a c =>
        cases u with
        | arrow a' c' => exact h6 a c a' c' rest rfl
        | tvar y => exact nu y rfl
        | _ => exact clash_unsat nt nu (by simp [headT]) hh
      | record fs tails =>
        cases u with
        | tvar y => exact nu y rfl
        | record fs' tails' =>
          have e1 : tails = [] := by
            simp only [wfT, Bool.and_eq_true, List.isEmpty_iff] at ht
            exact ht.1.1
          have e2 : tails' = [] := by
            simp only [wfT, Bool.and_eq_true, List.isEmpty_iff] at hu
            exact hu.1.1
          subst e1 e2
          cases fs with
          | nil =>
            cases fs' with
            | nil => exact h7 rest rfl
            | cons l t' r =>
              exact record_nil_ne hu ((holds_eq_iff ht hu).mp hh)
          | cons l t' r => exact h8 l t' r fs' rest rfl
        | _ => exact clash_unsat nt nu (by simp [headT]) hh

end Composition.Syntax
