/-
Facts about single unifier steps, used by soundness and completeness:
elimination (in both directions, through the binding equation
`x = t`), the proper occurs check, arrow decomposition, and constructor
clashes.
-/
import Composition.Unify.Algo

namespace Composition.Syntax

open Composition

variable {Label B : Type} [DecidableEq Label]

theorem sat_cons {θ : Assign Label B} {a : Atom Label B}
    {rest : Problem Label B} : Sat θ (a :: rest) ↔ Holds θ a ∧ Sat θ rest := by
  simp [Sat]

theorem allWfEq_cons {t u : TExpr Label B} {rest : Problem Label B}
    (h : AllWfEq (.eq t u :: rest)) :
    wfT t = true ∧ wfT u = true ∧ AllWfEq rest := by
  obtain ⟨p, q, he, hp, hq⟩ := h (.eq t u) (by simp)
  simp only [Atom.eq.injEq] at he
  obtain ⟨rfl, rfl⟩ := he
  exact ⟨hp, hq, fun a ha => h a (by simp [ha])⟩

/-- Some assignment: every type variable the empty record. -/
def anyAssign : Assign Label B :=
  ⟨fun _ => .record fun _ => none, fun _ _ => none⟩

omit [DecidableEq Label] in
theorem eqs_elim (x : Nat) (t : TExpr Label B) :
    eqs (elimSubst x t) = [.eq (.tvar x) t] := by
  simp [eqs, elimSubst]

/-- Soundness of elimination: a solution of the substituted rest, with
`x` set to `t`'s value, solves `x = t` and the rest. -/
theorem elim_sound {x : Nat} {t : TExpr Label B} {rest : Problem Label B}
    (ht : wfT t = true) (hx : x ∉ tyVarsT t) {θ' : Assign Label B}
    (h' : Sat θ' (substProblem (elimSubst x t) rest)) :
    ∃ θ, Holds θ (.eq (.tvar x) t) ∧ Sat θ rest := by
  obtain ⟨v, hv⟩ := wf_defined (θ := θ') t ht
  let θ : Assign Label B :=
    ⟨fun n => if n = x then v else θ'.ty n, θ'.row⟩
  have hagree : ∀ n, n ≠ x → θ.ty n = θ'.ty n := fun n hn => by
    simp [θ, hn]
  have htv : evalT θ t = some v := by
    rw [evalT_congr (θ' := θ') t
      (fun n hn => hagree n (fun h => hx (h ▸ hn))) (fun _ _ => rfl), hv]
  have hhead : Holds θ (.eq (.tvar x) t) :=
    ⟨v, by simp [evalT, θ], htv⟩
  have he : Sat θ (eqs (elimSubst x t)) := by
    rw [eqs_elim]
    exact sat_cons.mpr ⟨hhead, by simp [Sat]⟩
  have hs : Sat θ (substProblem (elimSubst x t) rest) :=
    (sat_congr (θ := θ') (θ' := θ)
      (fun n hn => by
        rcases tyVarsOf_elim_gen hn with ⟨_, h2⟩ | h
        · exact (hagree n h2).symm
        · exact (hagree n (fun e => hx (e ▸ h))).symm)
      (fun _ _ => rfl)).mp h'
  exact ⟨θ, hhead, (subst_sat he rest).mpr hs⟩

/-- Completeness of elimination: a solution of `x = t` and the rest
solves the substituted rest. -/
theorem elim_complete {x : Nat} {t : TExpr Label B} {rest : Problem Label B}
    {θ : Assign Label B} (hh : Holds θ (.eq (.tvar x) t))
    (hs : Sat θ rest) : Sat θ (substProblem (elimSubst x t) rest) := by
  have he : Sat θ (eqs (elimSubst x t)) := by
    rw [eqs_elim]
    exact sat_cons.mpr ⟨hh, by simp [Sat]⟩
  exact (subst_sat he rest).mp hs

theorem holds_swap {θ : Assign Label B} {a b : TExpr Label B} :
    Holds θ (.eq a b) ↔ Holds θ (.eq b a) := by
  simp only [Holds]
  exact ⟨fun ⟨g, h1, h2⟩ => ⟨g, h2, h1⟩, fun ⟨g, h1, h2⟩ => ⟨g, h2, h1⟩⟩

/-- A variable inside an expression that is not itself a variable
denotes a proper part of the expression's value. -/
theorem proper_occurs {θ : Assign Label B} {x : Nat} {t : TExpr Label B}
    (hnv : ∀ y, t = .tvar y → False) (hx : x ∈ tyVarsT t) {g : G Label B}
    (h : evalT θ t = some g) : Relation.TransGen Part (θ.ty x) g := by
  cases t with
  | base _ => simp [tyVarsT] at hx
  | tvar y => exact (hnv y rfl).elim
  | arrow a c =>
    simp only [evalT, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
    obtain ⟨va, ha, vc, hc, rfl⟩ := h
    simp only [tyVarsT, List.mem_append] at hx
    rcases hx with hx | hx
    · exact (occurs_part a hx ha).tail (.arrowL va vc)
    · exact (occurs_part c hx hc).tail (.arrowR va vc)
  | record fs tails =>
    simp only [tyVarsT] at hx
    rw [evalT] at h
    simp only [Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
    obtain ⟨fr, hf, v, hv, rfl⟩ := h
    obtain ⟨l, w, hw, hpart⟩ := occurs_partF fs hx hf
    have hvl : v l = some w := by
      simp only [composeAll, Option.bind_eq_some_iff] at hv
      obtain ⟨u, _, hc⟩ := hv
      obtain ⟨_, rfl⟩ := compose_eq_some.mp hc
      exact union_of_some hw
    exact hpart.tail (.field v l w hvl)

/-- The occurs check: `x = t` has no solution if `x` occurs in `t` and
`t` is not a variable. -/
theorem occurs_unsat {θ : Assign Label B} {x : Nat} {t : TExpr Label B}
    (hnv : ∀ y, t = .tvar y → False) (hx : x ∈ tyVarsT t) :
    ¬ Holds θ (.eq (.tvar x) t) := by
  rintro ⟨g, h1, h2⟩
  simp only [evalT, Option.some.injEq] at h1
  have := proper_occurs hnv hx h2
  rw [h1] at this
  exact not_part_self g this

theorem holds_arrow_iff {θ : Assign Label B} {a c a' c' : TExpr Label B}
    (ha : wfT a = true) (hc : wfT c = true) (ha' : wfT a' = true)
    (hc' : wfT c' = true) :
    Holds θ (.eq (.arrow a c) (.arrow a' c')) ↔
      Holds θ (.eq a a') ∧ Holds θ (.eq c c') := by
  rw [holds_eq_iff (by simp [wfT, ha, hc]) (by simp [wfT, ha', hc']),
    holds_eq_iff ha ha', holds_eq_iff hc hc']
  obtain ⟨va, hva⟩ := wf_defined (θ := θ) a ha
  obtain ⟨vc, hvc⟩ := wf_defined (θ := θ) c hc
  obtain ⟨va', hva'⟩ := wf_defined (θ := θ) a' ha'
  obtain ⟨vc', hvc'⟩ := wf_defined (θ := θ) c' hc'
  simp [evalT, hva, hvc, hva', hvc']

/-- The outermost constructor, for clashes. -/
def headT : TExpr Label B → Nat
  | .base _ => 0
  | .arrow _ _ => 1
  | .record _ _ => 2
  | .tvar _ => 3

def headG : G Label B → Nat
  | .base _ => 0
  | .arrow _ _ => 1
  | .record _ => 2

theorem head_eval {θ : Assign Label B} {t : TExpr Label B} {g : G Label B}
    (hnv : ∀ y, t = .tvar y → False) (h : evalT θ t = some g) :
    headG g = headT t := by
  cases t with
  | base _ =>
    simp [evalT] at h
    subst h
    rfl
  | tvar y => exact (hnv y rfl).elim
  | arrow a c =>
    simp only [evalT, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
    obtain ⟨_, _, _, _, rfl⟩ := h
    rfl
  | record fs tails =>
    simp only [evalT, Option.bind_eq_some_iff, Option.map_eq_some_iff] at h
    obtain ⟨_, _, _, _, rfl⟩ := h
    rfl

theorem clash_unsat {θ : Assign Label B} {t u : TExpr Label B}
    (ht : ∀ y, t = .tvar y → False) (hu : ∀ y, u = .tvar y → False)
    (hd : headT t ≠ headT u) : ¬ Holds θ (.eq t u) := by
  rintro ⟨g, h1, h2⟩
  exact hd ((head_eval ht h1).symm.trans (head_eval hu h2))

theorem record_step_wf {l : Label} {t u : TExpr Label B}
    {r fs' rest' : Fields Label B}
    (h1 : wfT (.record (.cons l t r) []) = true)
    (h2 : wfT (.record fs' []) = true)
    (hr : removeField l fs' = some (u, rest')) :
    wfT t = true ∧ wfT u = true ∧ wfT (.record r []) = true ∧
      wfT (.record rest' []) = true := by
  have ⟨ht, hrr, _⟩ := wf_record_cons h1
  simp only [wfT, List.isEmpty_nil, Bool.true_and, Bool.and_eq_true] at h2
  have ⟨hu, hrest⟩ := removeField_wf hr h2.2
  refine ⟨ht, hu, hrr, ?_⟩
  have hn : rest'.labels.Nodup := by
    rw [removeField_labels hr]
    exact ((noDupB_iff _).mp h2.1).erase l
  simp [wfT, (noDupB_iff _).mpr hn, hrest]

end Composition.Syntax
