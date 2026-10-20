/-
U1, soundness: if the unifier answers true on equations between
well-formed sides, they have a solution. By induction on the unifier's
own recursion. Eliminated variables are recovered as the recursion
returns (`elim_sound`): the solution of the substituted rest is
extended with `x` set to the value of `t` under it, so a chain such as
`x = y, y = Bool` resolves `y` first and then `x`.
-/
import Composition.Unify.Facts

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label] [DecidableEq B]

theorem unify_sound :
    ∀ E : Problem Label B, AllWfEq E → unify E = true → ∃ θ, Sat θ E := by
  intro E
  induction E using unify.induct with
  | case1 => exact fun _ _ => ⟨anyAssign, by simp [Sat]⟩
  | case2 y rest ih =>
    intro hw h
    simp only [unify, ite_true] at h
    obtain ⟨θ, hθ⟩ := ih (allWfEq_cons hw).2.2 h
    exact ⟨θ, sat_cons.mpr ⟨⟨θ.ty y, rfl, rfl⟩, hθ⟩⟩
  | case3 x y rest hxy ih =>
    intro hw h
    simp only [unify, hxy, ite_false] at h
    obtain ⟨_, ht, hr⟩ := allWfEq_cons hw
    obtain ⟨θ', hθ'⟩ := ih (allWfEq_elim ht hr) h
    obtain ⟨θ, hh, hs⟩ := elim_sound (rest := rest) ht
      (by simpa [tyVarsT] using hxy) hθ'
    exact ⟨θ, sat_cons.mpr ⟨hh, hs⟩⟩
  | case4 x t rest hnv hx =>
    intro _ h
    rw [unify] at h
    · simp [hx] at h
    · exact hnv
  | case5 x t rest hnv hx ih =>
    intro hw h
    rw [unify] at h
    · simp only [hx, ite_false] at h
      obtain ⟨_, ht, hr⟩ := allWfEq_cons hw
      obtain ⟨θ', hθ'⟩ := ih (allWfEq_elim ht hr) h
      obtain ⟨θ, hh, hs⟩ := elim_sound (rest := rest) ht hx hθ'
      exact ⟨θ, sat_cons.mpr ⟨hh, hs⟩⟩
    · exact hnv
  | case6 t x rest hnv hx =>
    intro _ h
    rw [unify] at h
    · simp [hx] at h
    · exact hnv
  | case7 t x rest hnv hx ih =>
    intro hw h
    rw [unify] at h
    · simp only [hx, ite_false] at h
      obtain ⟨ht, _, hr⟩ := allWfEq_cons hw
      obtain ⟨θ', hθ'⟩ := ih (allWfEq_elim ht hr) h
      obtain ⟨θ, hh, hs⟩ := elim_sound (rest := rest) ht hx hθ'
      exact ⟨θ, sat_cons.mpr ⟨holds_swap.mp hh, hs⟩⟩
    · exact hnv
  | case8 b rest ih =>
    intro hw h
    simp only [unify, ite_true] at h
    obtain ⟨θ, hθ⟩ := ih (allWfEq_cons hw).2.2 h
    exact ⟨θ, sat_cons.mpr ⟨⟨_, rfl, rfl⟩, hθ⟩⟩
  | case9 b b' rest hb =>
    intro _ h
    simp [unify, hb] at h
  | case10 a c a' c' rest ih =>
    intro hw h
    simp only [unify] at h
    obtain ⟨hl, hr, hrest⟩ := allWfEq_cons hw
    simp only [wfT, Bool.and_eq_true] at hl hr
    have hw' : AllWfEq (.eq a a' :: .eq c c' :: rest) := by
      intro x hx
      simp only [List.mem_cons] at hx
      rcases hx with rfl | rfl | hx
      · exact ⟨a, a', rfl, hl.1, hr.1⟩
      · exact ⟨c, c', rfl, hl.2, hr.2⟩
      · exact hrest x hx
    obtain ⟨θ, hθ⟩ := ih hw' h
    obtain ⟨h1, h2, h3⟩ := (by simpa [Sat] using hθ :
      Holds θ (.eq a a') ∧ Holds θ (.eq c c') ∧ Sat θ rest)
    exact ⟨θ, sat_cons.mpr
      ⟨(holds_arrow_iff hl.1 hl.2 hr.1 hr.2).mpr ⟨h1, h2⟩, h3⟩⟩
  | case11 rest ih =>
    intro hw h
    simp only [unify] at h
    obtain ⟨θ, hθ⟩ := ih (allWfEq_cons hw).2.2 h
    refine ⟨θ, sat_cons.mpr ⟨?_, hθ⟩⟩
    exact ⟨.record Row.empty, by simp [evalT_closedRecord, evalF], by
      simp [evalT_closedRecord, evalF]⟩
  | case12 l t r fs' rest hr =>
    intro _ h
    simp only [unify] at h
    split at h
    · cases h
    · rename_i heq
      rw [hr] at heq
      cases heq
  | case13 l t r fs' rest u rest' hr ih =>
    intro hw h
    simp only [unify] at h
    split at h
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
    obtain ⟨θ, hθ⟩ := ih hw' h
    obtain ⟨e1, e2, e3⟩ := (by simpa [Sat] using hθ :
      Holds θ (.eq t u) ∧ Holds θ (.eq (.record r []) (.record rest' [])) ∧
        Sat θ rest)
    refine ⟨θ, sat_cons.mpr ⟨?_, e3⟩⟩
    rw [holds_eq_iff h1 h2, record_step h1 h2]
    exact ⟨u, rest', hr, (holds_eq_iff ht hu).mp e1,
      (holds_eq_iff hrr hrr').mp e2⟩
  | case14 E h1 h2 h3 h4 h5 h6 h7 h8 =>
    intro _ h
    rw [unify] at h
    all_goals first
      | simp at h
      | assumption
      | (intro; simp_all)

end Composition.Syntax
